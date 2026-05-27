// =============================================================================
// Tests unitarios — SamplesService
// CRUD de muestras de laboratorio + flujo de análisis/aprobación/rechazo
// =============================================================================

import { SamplesService } from './samples.service';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// ---------------------------------------------------------------------------
// Mocks de módulos externos
// ---------------------------------------------------------------------------
jest.mock('@guaycampo/database', () => ({
  prisma: {
    labSample: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    scaleTicket: {
      findFirst: jest.fn(),
    },
    commodity: {
      findFirst: jest.fn(),
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
import type { LabSample } from '@guaycampo/database';
import type { QualityService } from '../quality/quality.service';

// ---------------------------------------------------------------------------
// Constantes de test
// ---------------------------------------------------------------------------
const TENANT_ID = 'tenant-test-1';
const SAMPLE_ID = 'sample-1';
const TICKET_ID = 'ticket-1';
const COMMODITY_ID = 'commodity-soja';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildRedisMock() {
  return {
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
  };
}

function buildLabGatewayMock() {
  return {
    broadcastNewSample: jest.fn(),
    broadcastSampleResult: jest.fn(),
    broadcastSampleRejection: jest.fn(),
  };
}

function buildQualityServiceMock() {
  return {
    calculateAdjustments: jest.fn().mockResolvedValue({
      adjustments: [],
      totalAdjustmentPct: 0,
      grade: 'Grado 1',
      status: 'aprobado',
      rejectionReasons: [],
      summary: 'Ajuste total: +0.00%',
    }),
  } as unknown as jest.Mocked<QualityService>;
}

function buildEventEmitter(): jest.Mocked<EventEmitter2> {
  return {
    emit: jest.fn(),
    emitAsync: jest.fn().mockResolvedValue([]),
    on: jest.fn(),
    off: jest.fn(),
  } as unknown as jest.Mocked<EventEmitter2>;
}

const makeSample = (overrides = {}): Partial<LabSample> & Record<string, unknown> => ({
  id: SAMPLE_ID,
  sampleNumber: 'LAB-2025-000001',
  scaleTicketId: TICKET_ID,
  status: 'pendiente',
  takenAt: new Date(),
  tenantId: TENANT_ID,
  humidity: null,
  protein: null,
  grade: null,
  netAdjustment: null,
  rejectionCause: null,
  rawData: null,
  bonuses: [],
  discounts: [],
  ...overrides,
});

// ---------------------------------------------------------------------------
// Suite principal
// ---------------------------------------------------------------------------
describe('SamplesService', () => {
  let service: SamplesService;
  let redis: ReturnType<typeof buildRedisMock>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let labGateway: ReturnType<typeof buildLabGatewayMock>;
  let qualityService: jest.Mocked<QualityService>;
  const prismaMock = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    redis = buildRedisMock();
    eventEmitter = buildEventEmitter();
    labGateway = buildLabGatewayMock();
    qualityService = buildQualityServiceMock();

    service = new SamplesService(
      eventEmitter,
      qualityService,
      labGateway as unknown as import('../websocket/lab.gateway').LabGateway,
      redis as unknown as import('ioredis').default,
    );
  });

  // =========================================================================
  // generateSampleNumber
  // =========================================================================
  describe('generateSampleNumber', () => {
    it('debería generar número de muestra con formato LAB-YYYY-000001', async () => {
      redis.incr.mockResolvedValue(1);

      const number = await service.generateSampleNumber(TENANT_ID);

      const year = new Date().getFullYear();
      expect(number).toBe(`LAB-${year}-000001`);
    });

    it('debería incrementar secuencialmente', async () => {
      redis.incr.mockResolvedValueOnce(5).mockResolvedValueOnce(6);

      const n1 = await service.generateSampleNumber(TENANT_ID);
      const n2 = await service.generateSampleNumber(TENANT_ID);

      expect(n1).not.toBe(n2);
    });

    it('debería usar la clave Redis correcta (lab:seq:tenant:year)', async () => {
      redis.incr.mockResolvedValue(1);

      await service.generateSampleNumber(TENANT_ID);

      const year = new Date().getFullYear();
      expect(redis.incr).toHaveBeenCalledWith(`lab:seq:${TENANT_ID}:${year}`);
    });
  });

  // =========================================================================
  // create
  // =========================================================================
  describe('create', () => {
    it('debería crear una muestra con status pendiente', async () => {
      const ticket = {
        id: TICKET_ID,
        ticketNumber: '2025-000001',
        vehicle: { plate: 'ABC123' },
        driver: { fullName: 'Juan Pérez' },
        tenantId: TENANT_ID,
      };
      const sample = makeSample({ status: 'pendiente' });

      (prismaMock.scaleTicket.findFirst as jest.Mock).mockResolvedValue(ticket);
      (prismaMock.labSample.create as jest.Mock).mockResolvedValue(sample);

      const result = await service.create({ scaleTicketId: TICKET_ID }, TENANT_ID);

      expect(result.status).toBe('pendiente');
      expect(prismaMock.labSample.create).toHaveBeenCalled();
    });

    it('debería rechazar si el ticket de balanza no existe', async () => {
      (prismaMock.scaleTicket.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create({ scaleTicketId: 'inexistente' }, TENANT_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería notificar al laboratorista via WebSocket', async () => {
      const ticket = {
        id: TICKET_ID,
        ticketNumber: '2025-000001',
        vehicle: { plate: 'ABC123' },
        driver: { fullName: 'Juan Pérez' },
        tenantId: TENANT_ID,
      };
      const sample = makeSample();

      (prismaMock.scaleTicket.findFirst as jest.Mock).mockResolvedValue(ticket);
      (prismaMock.labSample.create as jest.Mock).mockResolvedValue(sample);

      await service.create({ scaleTicketId: TICKET_ID }, TENANT_ID);

      expect(labGateway.broadcastNewSample).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({ sampleId: SAMPLE_ID }),
      );
    });

    it('debería emitir evento lab.sample.taken', async () => {
      const ticket = {
        id: TICKET_ID,
        ticketNumber: '2025-000001',
        vehicle: { plate: 'ABC123' },
        driver: { fullName: 'Juan Pérez' },
        tenantId: TENANT_ID,
      };
      const sample = makeSample();

      (prismaMock.scaleTicket.findFirst as jest.Mock).mockResolvedValue(ticket);
      (prismaMock.labSample.create as jest.Mock).mockResolvedValue(sample);

      await service.create({ scaleTicketId: TICKET_ID }, TENANT_ID);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'lab.sample.taken',
        expect.objectContaining({ type: 'lab.sample.taken' }),
      );
    });
  });

  // =========================================================================
  // submitResults
  // =========================================================================
  describe('submitResults', () => {
    const dto = {
      humidity: 13.0,
      protein: 34.5,
      damagedGrains: 0.5,
      foreignMatter: 1.5,
      brokenGrains: 3.0,
    };

    it('debería actualizar la muestra con los resultados analíticos', async () => {
      const sample = makeSample({ status: 'pendiente' });
      const ticket = {
        id: TICKET_ID,
        commodityId: COMMODITY_ID,
        driver: { phone: '+5491112345678' },
        tenantId: TENANT_ID,
      };
      const commodity = { id: COMMODITY_ID, code: 'SOJ', name: 'Soja' };
      const updatedSample = makeSample({
        status: 'aprobado',
        humidity: 13.0,
        grade: 'Grado 1',
        netAdjustment: 0,
      });

      (prismaMock.labSample.findFirst as jest.Mock).mockResolvedValue(sample);
      (prismaMock.scaleTicket.findFirst as jest.Mock).mockResolvedValue(ticket);
      (prismaMock.commodity.findFirst as jest.Mock).mockResolvedValue(commodity);
      (prismaMock.labSample.update as jest.Mock).mockResolvedValue(updatedSample);

      const result = await service.submitResults(SAMPLE_ID, dto, TENANT_ID);

      expect(result.status).toBe('aprobado');
      expect(qualityService.calculateAdjustments).toHaveBeenCalledWith(
        expect.objectContaining({ humidity: 13.0, protein: 34.5 }),
        'SOJ',
        TENANT_ID,
      );
    });

    it('debería rechazar si la muestra ya está aprobada', async () => {
      const sample = makeSample({ status: 'aprobado' });
      (prismaMock.labSample.findFirst as jest.Mock).mockResolvedValue(sample);

      await expect(service.submitResults(SAMPLE_ID, dto, TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debería rechazar si la muestra ya está rechazada', async () => {
      const sample = makeSample({ status: 'rechazado' });
      (prismaMock.labSample.findFirst as jest.Mock).mockResolvedValue(sample);

      await expect(service.submitResults(SAMPLE_ID, dto, TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debería emitir evento lab.sample.analyzed', async () => {
      const sample = makeSample({ status: 'pendiente' });
      const ticket = {
        id: TICKET_ID,
        commodityId: COMMODITY_ID,
        driver: { phone: '+5491112345678' },
      };
      const commodity = { id: COMMODITY_ID, code: 'SOJ' };
      const updatedSample = makeSample({ status: 'aprobado', grade: 'Grado 1' });

      (prismaMock.labSample.findFirst as jest.Mock).mockResolvedValue(sample);
      (prismaMock.scaleTicket.findFirst as jest.Mock).mockResolvedValue(ticket);
      (prismaMock.commodity.findFirst as jest.Mock).mockResolvedValue(commodity);
      (prismaMock.labSample.update as jest.Mock).mockResolvedValue(updatedSample);

      await service.submitResults(SAMPLE_ID, dto, TENANT_ID);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'lab.sample.analyzed',
        expect.objectContaining({ type: 'lab.sample.analyzed' }),
      );
    });

    it('debería emitir evento lab.sample.rejected cuando el motor rechaza la muestra', async () => {
      const sample = makeSample({ status: 'pendiente' });
      const ticket = {
        id: TICKET_ID,
        commodityId: COMMODITY_ID,
        driver: { phone: '+5491112345678' },
      };
      const commodity = { id: COMMODITY_ID, code: 'SOJ' };
      const rejectedSample = makeSample({ status: 'rechazado' });

      (prismaMock.labSample.findFirst as jest.Mock).mockResolvedValue(sample);
      (prismaMock.scaleTicket.findFirst as jest.Mock).mockResolvedValue(ticket);
      (prismaMock.commodity.findFirst as jest.Mock).mockResolvedValue(commodity);
      (prismaMock.labSample.update as jest.Mock).mockResolvedValue(rejectedSample);

      // Forzar rechazo del motor de calidad
      qualityService.calculateAdjustments.mockResolvedValueOnce({
        adjustments: [],
        totalAdjustmentPct: 0,
        grade: 'Fuera de Grado',
        status: 'rechazado',
        rejectionReasons: ['Humedad: 16.0% supera máximo de rechazo 15.5%'],
        summary: 'RECHAZADO: ...',
      });

      await service.submitResults(SAMPLE_ID, { humidity: 16.0 }, TENANT_ID);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'lab.sample.rejected',
        expect.objectContaining({ type: 'lab.sample.rejected' }),
      );
    });
  });

  // =========================================================================
  // approve (aprobación manual)
  // =========================================================================
  describe('approve', () => {
    it('debería aprobar manualmente una muestra rechazada', async () => {
      const sample = makeSample({ status: 'rechazado' });
      const approvedSample = makeSample({ status: 'aprobado' });

      (prismaMock.labSample.findFirst as jest.Mock).mockResolvedValue(sample);
      (prismaMock.labSample.update as jest.Mock).mockResolvedValue(approvedSample);

      const result = await service.approve(
        SAMPLE_ID,
        'supervisor-1',
        'Aprobación de emergencia',
        TENANT_ID,
      );

      expect(result.status).toBe('aprobado');
      expect(labGateway.broadcastSampleResult).toHaveBeenCalled();
    });

    it('debería rechazar si la muestra ya está aprobada', async () => {
      const sample = makeSample({ status: 'aprobado' });
      (prismaMock.labSample.findFirst as jest.Mock).mockResolvedValue(sample);

      await expect(
        service.approve(SAMPLE_ID, 'supervisor-1', 'motivo', TENANT_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería rechazar si la muestra está pendiente (sin resultados)', async () => {
      const sample = makeSample({ status: 'pendiente' });
      (prismaMock.labSample.findFirst as jest.Mock).mockResolvedValue(sample);

      await expect(
        service.approve(SAMPLE_ID, 'supervisor-1', 'motivo', TENANT_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // reject (rechazo manual)
  // =========================================================================
  describe('reject', () => {
    it('debería rechazar manualmente una muestra aprobada', async () => {
      const sample = makeSample({ status: 'aprobado' });
      const rejectedSample = makeSample({ status: 'rechazado', rejectionCause: 'Contaminación' });

      (prismaMock.labSample.findFirst as jest.Mock).mockResolvedValue(sample);
      (prismaMock.labSample.update as jest.Mock).mockResolvedValue(rejectedSample);

      const result = await service.reject(
        SAMPLE_ID,
        'supervisor-1',
        'Contaminación',
        TENANT_ID,
      );

      expect(result.status).toBe('rechazado');
    });

    it('debería rechazar si la muestra ya está rechazada', async () => {
      const sample = makeSample({ status: 'rechazado' });
      (prismaMock.labSample.findFirst as jest.Mock).mockResolvedValue(sample);

      await expect(
        service.reject(SAMPLE_ID, 'supervisor-1', 'motivo', TENANT_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // findOne
  // =========================================================================
  describe('findOne', () => {
    it('debería retornar la muestra existente', async () => {
      const sample = makeSample();
      (prismaMock.labSample.findFirst as jest.Mock).mockResolvedValue(sample);

      const result = await service.findOne(SAMPLE_ID, TENANT_ID);

      expect(result.id).toBe(SAMPLE_ID);
    });

    it('debería lanzar NotFoundException si la muestra no existe', async () => {
      (prismaMock.labSample.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('inexistente', TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // getPending
  // =========================================================================
  describe('getPending', () => {
    it('debería retornar muestras con status pendiente y en_proceso', async () => {
      const samples = [
        makeSample({ status: 'pendiente' }),
        makeSample({ id: 'sample-2', status: 'en_proceso' }),
      ];
      (prismaMock.labSample.findMany as jest.Mock).mockResolvedValue(samples);

      const result = await service.getPending(TENANT_ID);

      expect(result).toHaveLength(2);
    });
  });
});
