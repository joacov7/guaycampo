// =============================================================================
// Tests unitarios — TrucksService
// Ciclo de vida de camiones: registro, check-in, llamado, cancelación
// =============================================================================

import { TrucksService } from './trucks.service';
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
    truckShift: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    shiftSchedule: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    vehicle: { findFirst: jest.fn() },
    driver: { findFirst: jest.fn() },
    client: { findFirst: jest.fn() },
    $transaction: jest.fn(),
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
import type { TruckShift } from '@guaycampo/database';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------
const TENANT_ID = 'tenant-test-1';
const SHIFT_ID = 'shift-1';
const TRUCK_SHIFT_ID = 'truck-shift-1';
const VEHICLE_ID = 'vehicle-1';
const DRIVER_ID = 'driver-1';
const CLIENT_ID = 'client-1';
const COMMODITY_ID = 'commodity-soja';

// ---------------------------------------------------------------------------
// Helpers y mocks de dependencias
// ---------------------------------------------------------------------------
function buildMockNotificationsService() {
  return {
    sendShiftConfirmation: jest.fn().mockResolvedValue(undefined),
    sendQueuePosition: jest.fn().mockResolvedValue(undefined),
    sendDriverCalled: jest.fn().mockResolvedValue(undefined),
  };
}

function buildMockQueueService() {
  return {
    addToQueue: jest.fn().mockResolvedValue({ id: 'qp-1', position: 1 }),
    getPosition: jest.fn().mockResolvedValue(1),
    estimateWaitTime: jest.fn().mockResolvedValue(15),
    removeFromQueue: jest.fn().mockResolvedValue(undefined),
    callNext: jest.fn().mockResolvedValue(null),
    confirmEntry: jest.fn().mockResolvedValue({}),
    getQueueState: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  };
}

function buildMockShiftsService() {
  return {
    decrementSlot: jest.fn().mockResolvedValue(19),
    incrementSlot: jest.fn().mockResolvedValue(20),
    findOne: jest.fn(),
  };
}

function buildMockShiftsGateway() {
  return {
    broadcastQueueUpdate: jest.fn(),
    broadcastDriverCalled: jest.fn(),
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

const makeTruckShift = (overrides = {}) => ({
  id: TRUCK_SHIFT_ID,
  shiftId: SHIFT_ID,
  vehicleId: VEHICLE_ID,
  driverId: DRIVER_ID,
  clientId: CLIENT_ID,
  commodityId: COMMODITY_ID,
  status: 'confirmado',
  qrCode: 'test-qr-code',
  checkinAt: null,
  checkoutAt: null,
  tenantId: TENANT_ID,
  vehicle: { id: VEHICLE_ID, plate: 'ABC123' },
  driver: { id: DRIVER_ID, fullName: 'Juan Pérez', phone: '+5491112345678' },
  client: { id: CLIENT_ID, name: 'Acopio SA' },
  commodity: { id: COMMODITY_ID, name: 'Soja', code: 'SOJ' },
  shift: {
    id: SHIFT_ID,
    date: new Date('2025-06-15'),
    timeFrom: null, // sin ventana de tiempo para simplificar tests
    commodity: { name: 'Soja' },
  },
  queuePosition: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Suite principal
// ---------------------------------------------------------------------------
describe('TrucksService', () => {
  let service: TrucksService;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let notificationsService: ReturnType<typeof buildMockNotificationsService>;
  let queueService: ReturnType<typeof buildMockQueueService>;
  let shiftsService: ReturnType<typeof buildMockShiftsService>;
  let shiftsGateway: ReturnType<typeof buildMockShiftsGateway>;
  const prismaMock = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    eventEmitter = buildEventEmitter();
    notificationsService = buildMockNotificationsService();
    queueService = buildMockQueueService();
    shiftsService = buildMockShiftsService();
    shiftsGateway = buildMockShiftsGateway();

    service = new TrucksService(
      eventEmitter,
      notificationsService as unknown as import('../notifications/notifications.service').NotificationsService,
      queueService as unknown as import('../queue/queue.service').QueueService,
      shiftsService as unknown as import('../shifts/shifts.service').ShiftsService,
      shiftsGateway as unknown as import('../websocket/shifts.gateway').ShiftsGateway,
    );
  });

  // =========================================================================
  // createTruckShift
  // =========================================================================
  describe('createTruckShift', () => {
    const dto = {
      shiftId: SHIFT_ID,
      vehicleId: VEHICLE_ID,
      driverId: DRIVER_ID,
      clientId: CLIENT_ID,
      commodityId: COMMODITY_ID,
    };

    it('debería crear un turno de camión correctamente', async () => {
      const shiftMock = {
        id: SHIFT_ID,
        status: 'open',
        date: new Date('2025-06-15'),
        timeFrom: '07:00',
        commodity: { name: 'Soja' },
      };
      const truckShift = makeTruckShift();

      (prismaMock.shiftSchedule.findFirst as jest.Mock).mockResolvedValue(shiftMock);
      (prismaMock.vehicle.findFirst as jest.Mock).mockResolvedValue({
        id: VEHICLE_ID,
        plate: 'ABC123',
      });
      (prismaMock.driver.findFirst as jest.Mock).mockResolvedValue({
        id: DRIVER_ID,
        fullName: 'Juan Pérez',
        phone: '+5491112345678',
      });
      (prismaMock.client.findFirst as jest.Mock).mockResolvedValue({
        id: CLIENT_ID,
        name: 'Acopio SA',
      });
      (prismaMock.$transaction as jest.Mock).mockResolvedValue([truckShift, {}]);

      const result = await service.createTruckShift(dto, TENANT_ID);

      expect(result).toBeDefined();
      expect(result.status).toBe('confirmado');
      expect(shiftsService.decrementSlot).toHaveBeenCalledWith(SHIFT_ID, TENANT_ID);
    });

    it('debería rechazar si el turno no está abierto', async () => {
      (prismaMock.shiftSchedule.findFirst as jest.Mock).mockResolvedValue({
        id: SHIFT_ID,
        status: 'closed',
        commodity: { name: 'Soja' },
      });

      await expect(service.createTruckShift(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('debería hacer rollback del slot si el vehículo no existe', async () => {
      (prismaMock.shiftSchedule.findFirst as jest.Mock).mockResolvedValue({
        id: SHIFT_ID,
        status: 'open',
        date: new Date(),
        timeFrom: null,
        commodity: { name: 'Soja' },
      });
      (prismaMock.vehicle.findFirst as jest.Mock).mockResolvedValue(null); // vehículo no existe
      (prismaMock.driver.findFirst as jest.Mock).mockResolvedValue({
        id: DRIVER_ID,
        fullName: 'Juan Pérez',
        phone: '+5491112345678',
      });
      (prismaMock.client.findFirst as jest.Mock).mockResolvedValue({
        id: CLIENT_ID,
        name: 'Acopio SA',
      });

      await expect(service.createTruckShift(dto, TENANT_ID)).rejects.toThrow(NotFoundException);
      expect(shiftsService.incrementSlot).toHaveBeenCalled(); // rollback
    });

    it('debería lanzar NotFoundException si el turno no existe', async () => {
      (prismaMock.shiftSchedule.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.createTruckShift(dto, TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // checkIn
  // =========================================================================
  describe('checkIn', () => {
    it('debería hacer check-in y agregar a la cola', async () => {
      const truckShift = makeTruckShift({ status: 'confirmado' });
      const updatedTruckShift = makeTruckShift({
        status: 'en_planta',
        checkinAt: new Date(),
      });

      (prismaMock.truckShift.findFirst as jest.Mock).mockResolvedValue(truckShift);
      (prismaMock.truckShift.update as jest.Mock).mockResolvedValue(updatedTruckShift);

      const result = await service.checkIn('test-qr-code', TENANT_ID);

      expect(result.status).toBe('en_planta');
      expect(queueService.addToQueue).toHaveBeenCalledWith(
        truckShift.id,
        TENANT_ID,
        0,
      );
    });

    it('debería rechazar check-in de camión cancelado', async () => {
      const truckShift = makeTruckShift({ status: 'cancelado' });
      (prismaMock.truckShift.findFirst as jest.Mock).mockResolvedValue(truckShift);

      await expect(service.checkIn('test-qr-code', TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debería rechazar check-in duplicado', async () => {
      const truckShift = makeTruckShift({
        status: 'en_planta',
        checkinAt: new Date(),
      });
      (prismaMock.truckShift.findFirst as jest.Mock).mockResolvedValue(truckShift);

      await expect(service.checkIn('test-qr-code', TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debería lanzar NotFoundException con QR inválido', async () => {
      (prismaMock.truckShift.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.checkIn('qr-invalido', TENANT_ID)).rejects.toThrow(NotFoundException);
    });

    it('debería emitir evento shifts.truck.checked_in', async () => {
      const truckShift = makeTruckShift({ status: 'confirmado' });
      const updatedTruckShift = makeTruckShift({ status: 'en_planta', checkinAt: new Date() });

      (prismaMock.truckShift.findFirst as jest.Mock).mockResolvedValue(truckShift);
      (prismaMock.truckShift.update as jest.Mock).mockResolvedValue(updatedTruckShift);

      await service.checkIn('test-qr-code', TENANT_ID);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'shifts.truck.checked_in',
        expect.objectContaining({ type: 'shifts.truck.checked_in' }),
      );
    });
  });

  // =========================================================================
  // cancel
  // =========================================================================
  describe('cancel', () => {
    it('debería cancelar el turno y devolver el slot', async () => {
      const truckShift = makeTruckShift({ status: 'confirmado' });
      const cancelledTruckShift = makeTruckShift({ status: 'cancelado' });

      // findOne internamente usa findFirst con includes
      (prismaMock.truckShift.findFirst as jest.Mock).mockResolvedValue(truckShift);
      (prismaMock.$transaction as jest.Mock).mockResolvedValue(cancelledTruckShift);

      const result = await service.cancel(TRUCK_SHIFT_ID, TENANT_ID);

      expect(shiftsService.incrementSlot).toHaveBeenCalledWith(SHIFT_ID, TENANT_ID);
    });

    it('debería rechazar cancelación de turno ya cancelado', async () => {
      const truckShift = makeTruckShift({ status: 'cancelado' });
      (prismaMock.truckShift.findFirst as jest.Mock).mockResolvedValue(truckShift);

      await expect(service.cancel(TRUCK_SHIFT_ID, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('debería rechazar cancelación de turno completado', async () => {
      const truckShift = makeTruckShift({ status: 'completado' });
      (prismaMock.truckShift.findFirst as jest.Mock).mockResolvedValue(truckShift);

      await expect(service.cancel(TRUCK_SHIFT_ID, TENANT_ID)).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // findOne
  // =========================================================================
  describe('findOne', () => {
    it('debería retornar el truckShift existente', async () => {
      const truckShift = makeTruckShift();
      (prismaMock.truckShift.findFirst as jest.Mock).mockResolvedValue(truckShift);

      const result = await service.findOne(TRUCK_SHIFT_ID, TENANT_ID);

      expect(result.id).toBe(TRUCK_SHIFT_ID);
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      (prismaMock.truckShift.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('inexistente', TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // confirmEntry
  // =========================================================================
  describe('confirmEntry', () => {
    it('debería confirmar la entrada del camión a la balanza', async () => {
      const updatedTruckShift = makeTruckShift({ status: 'en_balanza' });
      (prismaMock.truckShift.update as jest.Mock).mockResolvedValue(updatedTruckShift);

      const result = await service.confirmEntry(TRUCK_SHIFT_ID, TENANT_ID);

      expect(queueService.confirmEntry).toHaveBeenCalledWith(TRUCK_SHIFT_ID, TENANT_ID);
      expect(result.status).toBe('en_balanza');
    });
  });
});
