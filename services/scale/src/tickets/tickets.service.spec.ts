// =============================================================================
// Tests unitarios — TicketsService
// Ciclo de vida de tickets de balanza: creación, peso bruto, tara, finalización
// =============================================================================

import { TicketsService } from './tickets.service';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ScaleStatus } from '@guaycampo/shared-types';

// ---------------------------------------------------------------------------
// Mocks de módulos externos
// ---------------------------------------------------------------------------
jest.mock('@guaycampo/database', () => ({
  prisma: {
    scaleTicket: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    siloMovement: {
      create: jest.fn(),
    },
    silo: {
      update: jest.fn(),
    },
  },
}));

jest.mock('@guaycampo/shared-events', () => ({
  createEvent: jest.fn((type: string, tenantId: string, payload: unknown) => ({
    type,
    tenantId,
    payload,
  })),
}));

import { prisma } from '@guaycampo/database';
import type { ScaleTicket } from '@guaycampo/database';

// ---------------------------------------------------------------------------
// Constantes de test
// ---------------------------------------------------------------------------
const TENANT_ID = 'tenant-test-1';
const TICKET_ID = 'ticket-1';
const VEHICLE_ID = 'vehicle-1';
const DRIVER_ID = 'driver-1';
const CLIENT_ID = 'client-1';
const COMMODITY_ID = 'commodity-soja';
const OPERATOR_ID = 'operator-1';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildRedisMock() {
  return {
    incr: jest.fn().mockResolvedValue(1),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    expire: jest.fn().mockResolvedValue(1),
  };
}

function buildScaleGatewayMock() {
  return {
    broadcastTicketUpdate: jest.fn(),
    broadcastWeight: jest.fn(),
    broadcastError: jest.fn(),
    broadcastWeightStable: jest.fn(),
  };
}

function buildModbusServiceMock() {
  return {
    startWeighing: jest.fn().mockResolvedValue(undefined),
    stopWeighing: jest.fn().mockResolvedValue(undefined),
    readWeight: jest.fn().mockResolvedValue(0),
  };
}

function buildPdfServiceMock() {
  return {
    generateScaleTicket: jest.fn().mockResolvedValue(Buffer.from('pdf')),
  };
}

function buildEventEmitter(): jest.Mocked<EventEmitter2> {
  return {
    emit: jest.fn(),
    emitAsync: jest.fn().mockResolvedValue([]),
    on: jest.fn(),
    off: jest.fn(),
  } as unknown as jest.Mocked<EventEmitter2>;
}

const makeTicket = (overrides = {}): Partial<ScaleTicket> & Record<string, unknown> => ({
  id: TICKET_ID,
  ticketNumber: '2025-000001',
  vehicleId: VEHICLE_ID,
  driverId: DRIVER_ID,
  clientId: CLIENT_ID,
  commodityId: COMMODITY_ID,
  truckShiftId: null,
  status: ScaleStatus.PESADA_BRUTA,
  grossWeight: null,
  grossAt: null,
  tareWeight: null,
  tareAt: null,
  netWeight: null,
  plateDetected: null,
  plateConfirmed: null,
  ocrConfidence: null,
  grossPhotoUrl: null,
  tarePhotoUrl: null,
  observations: null,
  tenantId: TENANT_ID,
  vehicle: { id: VEHICLE_ID, plate: 'ABC123' },
  driver: { id: DRIVER_ID, fullName: 'Juan Pérez' },
  client: { id: CLIENT_ID, name: 'Acopio SA' },
  ...overrides,
});

// ---------------------------------------------------------------------------
// Suite principal
// ---------------------------------------------------------------------------
describe('TicketsService', () => {
  let service: TicketsService;
  let redis: ReturnType<typeof buildRedisMock>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let scaleGateway: ReturnType<typeof buildScaleGatewayMock>;
  let modbusService: ReturnType<typeof buildModbusServiceMock>;
  let pdfService: ReturnType<typeof buildPdfServiceMock>;
  const prismaMock = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    redis = buildRedisMock();
    eventEmitter = buildEventEmitter();
    scaleGateway = buildScaleGatewayMock();
    modbusService = buildModbusServiceMock();
    pdfService = buildPdfServiceMock();

    service = new TicketsService(
      eventEmitter,
      scaleGateway as unknown as import('../websocket/scale.gateway').ScaleGateway,
      modbusService as unknown as import('../modbus/modbus.service').ModbusService,
      pdfService as unknown as import('./pdf.service').PdfService,
      redis as unknown as import('ioredis').default,
    );
  });

  // =========================================================================
  // generateTicketNumber
  // =========================================================================
  describe('generateTicketNumber', () => {
    it('debería generar número con formato año-secuencia de 6 dígitos', async () => {
      redis.incr.mockResolvedValue(123);

      const number = await service.generateTicketNumber(TENANT_ID);

      const year = new Date().getFullYear();
      expect(number).toBe(`${year}-000123`);
    });

    it('debería rellenar con ceros hasta 6 dígitos', async () => {
      redis.incr.mockResolvedValue(1);

      const number = await service.generateTicketNumber(TENANT_ID);

      const year = new Date().getFullYear();
      expect(number).toBe(`${year}-000001`);
    });

    it('debería ser secuencial entre llamadas', async () => {
      redis.incr.mockResolvedValueOnce(1).mockResolvedValueOnce(2);

      const n1 = await service.generateTicketNumber(TENANT_ID);
      const n2 = await service.generateTicketNumber(TENANT_ID);

      expect(n1).not.toBe(n2);
    });

    it('debería incluir el año corriente en el número de ticket', async () => {
      redis.incr.mockResolvedValue(500);

      const number = await service.generateTicketNumber(TENANT_ID);

      const expectedYear = new Date().getFullYear().toString();
      expect(number.startsWith(expectedYear)).toBe(true);
    });

    it('debería usar la clave Redis correcta con tenant y año', async () => {
      redis.incr.mockResolvedValue(1);

      await service.generateTicketNumber(TENANT_ID);

      const year = new Date().getFullYear();
      expect(redis.incr).toHaveBeenCalledWith(`ticket_seq:${TENANT_ID}:${year}`);
    });
  });

  // =========================================================================
  // startEntry
  // =========================================================================
  describe('startEntry', () => {
    it('debería crear un ticket y retornarlo con status pesada_bruta', async () => {
      const ticket = makeTicket({ status: ScaleStatus.PESADA_BRUTA });
      (prismaMock.scaleTicket.create as jest.Mock).mockResolvedValue(ticket);

      const result = await service.startEntry(
        {
          vehicleId: VEHICLE_ID,
          driverId: DRIVER_ID,
          clientId: CLIENT_ID,
          commodityId: COMMODITY_ID,
        },
        TENANT_ID,
      );

      expect(result.status).toBe(ScaleStatus.PESADA_BRUTA);
      expect(prismaMock.scaleTicket.create).toHaveBeenCalled();
    });

    it('debería emitir evento scale.ticket.created', async () => {
      const ticket = makeTicket();
      (prismaMock.scaleTicket.create as jest.Mock).mockResolvedValue(ticket);

      await service.startEntry(
        {
          vehicleId: VEHICLE_ID,
          driverId: DRIVER_ID,
          clientId: CLIENT_ID,
          commodityId: COMMODITY_ID,
        },
        TENANT_ID,
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'scale.ticket.created',
        expect.objectContaining({ type: 'scale.ticket.created' }),
      );
    });

    it('debería transmitir actualización de ticket por WebSocket', async () => {
      const ticket = makeTicket();
      (prismaMock.scaleTicket.create as jest.Mock).mockResolvedValue(ticket);

      await service.startEntry(
        { vehicleId: VEHICLE_ID, driverId: DRIVER_ID, clientId: CLIENT_ID, commodityId: COMMODITY_ID },
        TENANT_ID,
      );

      expect(scaleGateway.broadcastTicketUpdate).toHaveBeenCalledWith(TENANT_ID, ticket);
    });
  });

  // =========================================================================
  // confirmGrossWeight
  // =========================================================================
  describe('confirmGrossWeight', () => {
    it('debería registrar peso bruto y cambiar status a pesada_tara', async () => {
      const existingTicket = makeTicket({ status: ScaleStatus.PESADA_BRUTA });
      const updatedTicket = makeTicket({
        status: ScaleStatus.PESADA_TARA,
        grossWeight: 28500,
        grossAt: new Date(),
      });

      (prismaMock.scaleTicket.findFirst as jest.Mock).mockResolvedValue(existingTicket);
      (prismaMock.scaleTicket.update as jest.Mock).mockResolvedValue(updatedTicket);

      const result = await service.confirmGrossWeight(
        TICKET_ID,
        { grossWeightKg: 28500 },
        TENANT_ID,
        OPERATOR_ID,
      );

      expect(result.grossWeight).toBe(28500);
      expect(result.status).toBe(ScaleStatus.PESADA_TARA);
      expect(result.grossAt).toBeDefined();
    });

    it('debería rechazar si el ticket no está en estado pesada_bruta', async () => {
      const ticket = makeTicket({ status: ScaleStatus.PESADA_TARA });
      (prismaMock.scaleTicket.findFirst as jest.Mock).mockResolvedValue(ticket);

      await expect(
        service.confirmGrossWeight(
          TICKET_ID,
          { grossWeightKg: 28500 },
          TENANT_ID,
          OPERATOR_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería rechazar si el ticket no existe', async () => {
      (prismaMock.scaleTicket.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.confirmGrossWeight(
          'inexistente',
          { grossWeightKg: 28500 },
          TENANT_ID,
          OPERATOR_ID,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería emitir evento scale.ticket.gross_weight_recorded', async () => {
      const existingTicket = makeTicket({ status: ScaleStatus.PESADA_BRUTA });
      const updatedTicket = makeTicket({
        status: ScaleStatus.PESADA_TARA,
        grossWeight: 28500,
        grossAt: new Date(),
      });

      (prismaMock.scaleTicket.findFirst as jest.Mock).mockResolvedValue(existingTicket);
      (prismaMock.scaleTicket.update as jest.Mock).mockResolvedValue(updatedTicket);

      await service.confirmGrossWeight(
        TICKET_ID,
        { grossWeightKg: 28500 },
        TENANT_ID,
        OPERATOR_ID,
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'scale.ticket.gross_weight_recorded',
        expect.objectContaining({ type: 'scale.ticket.gross_weight_recorded' }),
      );
    });
  });

  // =========================================================================
  // confirmTareWeight
  // =========================================================================
  describe('confirmTareWeight', () => {
    it('debería calcular peso neto correctamente (bruto - tara)', async () => {
      const ticketWithGross = makeTicket({
        status: ScaleStatus.PESADA_TARA,
        grossWeight: 28500,
        grossAt: new Date(),
      });
      const finalTicket = makeTicket({
        status: ScaleStatus.COMPLETADO,
        grossWeight: 28500,
        tareWeight: 16200,
        netWeight: 12300,
        tareAt: new Date(),
      });

      (prismaMock.scaleTicket.findFirst as jest.Mock).mockResolvedValue(ticketWithGross);
      (prismaMock.scaleTicket.update as jest.Mock).mockResolvedValue(finalTicket);

      const result = await service.confirmTareWeight(
        TICKET_ID,
        { tareWeightKg: 16200 },
        TENANT_ID,
        OPERATOR_ID,
      );

      expect(result.netWeight).toBe(12300); // 28500 - 16200
      expect(result.status).toBe(ScaleStatus.COMPLETADO);
    });

    it('debería rechazar si la tara es mayor que el bruto (peso neto negativo)', async () => {
      const ticket = makeTicket({
        status: ScaleStatus.PESADA_TARA,
        grossWeight: 16000,
        grossAt: new Date(),
      });

      (prismaMock.scaleTicket.findFirst as jest.Mock).mockResolvedValue(ticket);

      await expect(
        service.confirmTareWeight(
          TICKET_ID,
          { tareWeightKg: 16500 }, // tara > bruto → imposible
          TENANT_ID,
          OPERATOR_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería rechazar si la tara es igual al bruto (peso neto = 0)', async () => {
      const ticket = makeTicket({
        status: ScaleStatus.PESADA_TARA,
        grossWeight: 16000,
        grossAt: new Date(),
      });

      (prismaMock.scaleTicket.findFirst as jest.Mock).mockResolvedValue(ticket);

      await expect(
        service.confirmTareWeight(
          TICKET_ID,
          { tareWeightKg: 16000 }, // igual al bruto → neto = 0
          TENANT_ID,
          OPERATOR_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería rechazar si el ticket no está en estado pesada_tara', async () => {
      const ticket = makeTicket({ status: ScaleStatus.PESADA_BRUTA });
      (prismaMock.scaleTicket.findFirst as jest.Mock).mockResolvedValue(ticket);

      await expect(
        service.confirmTareWeight(
          TICKET_ID,
          { tareWeightKg: 5000 },
          TENANT_ID,
          OPERATOR_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería rechazar si no se registró el peso bruto', async () => {
      const ticket = makeTicket({
        status: ScaleStatus.PESADA_TARA,
        grossWeight: null, // sin peso bruto
      });

      (prismaMock.scaleTicket.findFirst as jest.Mock).mockResolvedValue(ticket);

      await expect(
        service.confirmTareWeight(
          TICKET_ID,
          { tareWeightKg: 5000 },
          TENANT_ID,
          OPERATOR_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería emitir eventos de tara y completado', async () => {
      const ticket = makeTicket({
        status: ScaleStatus.PESADA_TARA,
        grossWeight: 28500,
        grossAt: new Date(),
      });
      const finalTicket = makeTicket({
        status: ScaleStatus.COMPLETADO,
        grossWeight: 28500,
        tareWeight: 16200,
        netWeight: 12300,
      });

      (prismaMock.scaleTicket.findFirst as jest.Mock).mockResolvedValue(ticket);
      (prismaMock.scaleTicket.update as jest.Mock).mockResolvedValue(finalTicket);

      await service.confirmTareWeight(
        TICKET_ID,
        { tareWeightKg: 16200 },
        TENANT_ID,
        OPERATOR_ID,
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'scale.ticket.tare_weight_recorded',
        expect.objectContaining({ type: 'scale.ticket.tare_weight_recorded' }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'scale.ticket.completed',
        expect.objectContaining({ type: 'scale.ticket.completed' }),
      );
    });

    it('debería actualizar stock de silo cuando se especifica siloId', async () => {
      const ticket = makeTicket({
        status: ScaleStatus.PESADA_TARA,
        grossWeight: 28500,
        grossAt: new Date(),
      });
      const finalTicket = makeTicket({
        status: ScaleStatus.COMPLETADO,
        grossWeight: 28500,
        tareWeight: 16200,
        netWeight: 12300,
      });

      (prismaMock.scaleTicket.findFirst as jest.Mock).mockResolvedValue(ticket);
      (prismaMock.scaleTicket.update as jest.Mock).mockResolvedValue(finalTicket);
      (prismaMock.siloMovement.create as jest.Mock).mockResolvedValue({});
      (prismaMock.silo.update as jest.Mock).mockResolvedValue({});

      await service.confirmTareWeight(
        TICKET_ID,
        { tareWeightKg: 16200, siloId: 'silo-1' },
        TENANT_ID,
        OPERATOR_ID,
      );

      expect(prismaMock.siloMovement.create).toHaveBeenCalled();
      expect(prismaMock.silo.update).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // reject
  // =========================================================================
  describe('reject', () => {
    it('debería rechazar el ticket con status anulado', async () => {
      const ticket = makeTicket({ status: ScaleStatus.PESADA_BRUTA });
      const rejectedTicket = makeTicket({
        status: ScaleStatus.ANULADO,
        observations: 'Exceso de humedad',
      });

      (prismaMock.scaleTicket.findFirst as jest.Mock).mockResolvedValue(ticket);
      (prismaMock.scaleTicket.update as jest.Mock).mockResolvedValue(rejectedTicket);

      const result = await service.reject(
        TICKET_ID,
        { reason: 'Exceso de humedad' },
        TENANT_ID,
      );

      expect(result.status).toBe(ScaleStatus.ANULADO);
    });

    it('debería rechazar si el ticket ya está completado', async () => {
      const ticket = makeTicket({ status: ScaleStatus.COMPLETADO });
      (prismaMock.scaleTicket.findFirst as jest.Mock).mockResolvedValue(ticket);

      await expect(
        service.reject(TICKET_ID, { reason: 'motivo' }, TENANT_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería rechazar si el ticket ya está anulado', async () => {
      const ticket = makeTicket({ status: ScaleStatus.ANULADO });
      (prismaMock.scaleTicket.findFirst as jest.Mock).mockResolvedValue(ticket);

      await expect(
        service.reject(TICKET_ID, { reason: 'motivo' }, TENANT_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // findOne
  // =========================================================================
  describe('findOne', () => {
    it('debería retornar el ticket existente', async () => {
      const ticket = makeTicket();
      (prismaMock.scaleTicket.findFirst as jest.Mock).mockResolvedValue(ticket);

      const result = await service.findOne(TICKET_ID, TENANT_ID);

      expect(result.id).toBe(TICKET_ID);
    });

    it('debería lanzar NotFoundException si el ticket no existe', async () => {
      (prismaMock.scaleTicket.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('inexistente', TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
