// =============================================================================
// Tests unitarios — ShiftsService
// Gestión de turnos de carga/descarga y slots de cupos (Redis + Prisma)
// =============================================================================

import { ShiftsService } from './shifts.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// ---------------------------------------------------------------------------
// Mocks de módulos externos
// ---------------------------------------------------------------------------
jest.mock('@guaycampo/database', () => ({
  prisma: {
    shiftSchedule: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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
import type { OperationType } from '@guaycampo/shared-types';

// ---------------------------------------------------------------------------
// Constantes de test
// ---------------------------------------------------------------------------
const TENANT_ID = 'tenant-test-1';
const COMMODITY_ID = 'commodity-soja';
const SHIFT_ID = 'shift-1';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildRedisMock() {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    incr: jest.fn().mockResolvedValue(1),
    decr: jest.fn().mockResolvedValue(19),
    pipeline: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    }),
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

const makeShift = (overrides = {}) => ({
  id: SHIFT_ID,
  date: new Date('2025-06-15'),
  commodityId: COMMODITY_ID,
  operationType: 'descarga',
  totalSlots: 20,
  usedSlots: 0,
  status: 'open',
  timeFrom: '07:00',
  timeTo: '17:00',
  tenantId: TENANT_ID,
  commodity: { id: COMMODITY_ID, name: 'Soja', code: 'SOJ' },
  ...overrides,
});

// ---------------------------------------------------------------------------
// Suite principal
// ---------------------------------------------------------------------------
describe('ShiftsService', () => {
  let service: ShiftsService;
  let redis: ReturnType<typeof buildRedisMock>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  const prismaMock = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    redis = buildRedisMock();
    eventEmitter = buildEventEmitter();
    service = new ShiftsService(eventEmitter, redis as unknown as import('ioredis').default);
  });

  // =========================================================================
  // create
  // =========================================================================
  describe('create', () => {
    const dto = {
      date: '2025-06-15',
      commodityId: COMMODITY_ID,
      operationType: 'descarga' as OperationType,
      totalSlots: 20,
      timeFrom: '07:00',
      timeTo: '17:00',
    };

    it('debería crear un turno correctamente', async () => {
      const createdShift = makeShift();
      (prismaMock.commodity.findFirst as jest.Mock).mockResolvedValue({
        id: COMMODITY_ID,
        name: 'Soja',
        code: 'SOJ',
      });
      (prismaMock.shiftSchedule.findFirst as jest.Mock).mockResolvedValue(null); // sin duplicado
      (prismaMock.shiftSchedule.create as jest.Mock).mockResolvedValue(createdShift);

      const result = await service.create(dto, TENANT_ID);

      expect(result.totalSlots).toBe(20);
      expect(result.usedSlots).toBe(0);
      expect(result.status).toBe('open');
      expect(prismaMock.shiftSchedule.create).toHaveBeenCalled();
    });

    it('debería inicializar el contador de slots en Redis al crear turno', async () => {
      const createdShift = makeShift();
      (prismaMock.commodity.findFirst as jest.Mock).mockResolvedValue({
        id: COMMODITY_ID,
        name: 'Soja',
        code: 'SOJ',
      });
      (prismaMock.shiftSchedule.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaMock.shiftSchedule.create as jest.Mock).mockResolvedValue(createdShift);

      await service.create(dto, TENANT_ID);

      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining(SHIFT_ID),
        20,
        'EX',
        expect.any(Number),
      );
    });

    it('debería rechazar con ConflictException por duplicado de fecha+cultivo+operación', async () => {
      (prismaMock.commodity.findFirst as jest.Mock).mockResolvedValue({
        id: COMMODITY_ID,
        name: 'Soja',
        code: 'SOJ',
      });
      (prismaMock.shiftSchedule.findFirst as jest.Mock).mockResolvedValue({ id: 'existing' });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(ConflictException);
    });

    it('debería rechazar con NotFoundException si el commodity no existe', async () => {
      (prismaMock.commodity.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(NotFoundException);
    });

    it('debería emitir evento shifts.schedule.created al crear turno', async () => {
      const createdShift = makeShift();
      (prismaMock.commodity.findFirst as jest.Mock).mockResolvedValue({
        id: COMMODITY_ID,
        name: 'Soja',
        code: 'SOJ',
      });
      (prismaMock.shiftSchedule.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaMock.shiftSchedule.create as jest.Mock).mockResolvedValue(createdShift);

      await service.create(dto, TENANT_ID);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'shifts.schedule.created',
        expect.objectContaining({ type: 'shifts.schedule.created' }),
      );
    });
  });

  // =========================================================================
  // findOne
  // =========================================================================
  describe('findOne', () => {
    it('debería retornar el turno con slots disponibles desde Redis', async () => {
      const shift = makeShift();
      (prismaMock.shiftSchedule.findFirst as jest.Mock).mockResolvedValue(shift);
      redis.get.mockResolvedValue('15'); // 15 slots en Redis

      const result = await service.findOne(SHIFT_ID, TENANT_ID);

      expect(result.availableSlots).toBe(15);
    });

    it('debería calcular slots disponibles desde DB cuando Redis no tiene el dato', async () => {
      const shift = makeShift({ totalSlots: 20, usedSlots: 5 });
      (prismaMock.shiftSchedule.findFirst as jest.Mock).mockResolvedValue(shift);
      redis.get.mockResolvedValue(null); // sin caché

      const result = await service.findOne(SHIFT_ID, TENANT_ID);

      expect(result.availableSlots).toBe(15); // 20 - 5
    });

    it('debería lanzar NotFoundException si el turno no existe', async () => {
      (prismaMock.shiftSchedule.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('inexistente', TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // decrementSlot
  // =========================================================================
  describe('decrementSlot', () => {
    it('debería decrementar el slot en Redis y retornar el nuevo valor', async () => {
      redis.get.mockResolvedValue('20'); // 20 slots disponibles
      redis.decr.mockResolvedValue(19);  // quedan 19

      const result = await service.decrementSlot(SHIFT_ID, TENANT_ID);

      expect(redis.decr).toHaveBeenCalled();
      expect(result).toBe(19);
    });

    it('debería lanzar BadRequestException y hacer rollback si no hay cupos', async () => {
      redis.get.mockResolvedValue('0');
      redis.decr.mockResolvedValue(-1); // sin cupos

      await expect(service.decrementSlot(SHIFT_ID, TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
      // Debe hacer rollback del decrement
      expect(redis.incr).toHaveBeenCalled();
    });

    it('debería sembrar el contador desde DB si no existe en Redis', async () => {
      redis.get.mockResolvedValue(null); // no existe en Redis
      const shift = makeShift({ totalSlots: 15, usedSlots: 3 });
      (prismaMock.shiftSchedule.findFirst as jest.Mock).mockResolvedValue(shift);
      redis.decr.mockResolvedValue(11);

      await service.decrementSlot(SHIFT_ID, TENANT_ID);

      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining(SHIFT_ID),
        12, // 15 - 3
        'EX',
        expect.any(Number),
      );
      expect(redis.decr).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // incrementSlot
  // =========================================================================
  describe('incrementSlot', () => {
    it('debería incrementar el slot cuando existe en Redis', async () => {
      redis.get.mockResolvedValue('10');
      redis.incr.mockResolvedValue(11);

      const result = await service.incrementSlot(SHIFT_ID, TENANT_ID);

      expect(redis.incr).toHaveBeenCalled();
      expect(result).toBe(11);
    });

    it('debería sembrar desde DB y sumar 1 si el slot no existe en Redis', async () => {
      redis.get.mockResolvedValue(null);
      const shift = makeShift({ totalSlots: 10, usedSlots: 8 });
      (prismaMock.shiftSchedule.findFirst as jest.Mock).mockResolvedValue(shift);

      const result = await service.incrementSlot(SHIFT_ID, TENANT_ID);

      // available = 10 - 8 = 2, +1 = 3
      expect(result).toBe(3);
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining(SHIFT_ID),
        3,
        'EX',
        expect.any(Number),
      );
    });
  });

  // =========================================================================
  // remove
  // =========================================================================
  describe('remove', () => {
    it('debería eliminar el turno y limpiar Redis', async () => {
      const shift = makeShift({ usedSlots: 0 });
      // findOne internamente llama findFirst + redis.get
      (prismaMock.shiftSchedule.findFirst as jest.Mock).mockResolvedValue(shift);
      redis.get.mockResolvedValue('20');
      (prismaMock.shiftSchedule.delete as jest.Mock).mockResolvedValue(shift);

      await service.remove(SHIFT_ID, TENANT_ID);

      expect(prismaMock.shiftSchedule.delete).toHaveBeenCalledWith({
        where: { id: SHIFT_ID },
      });
      expect(redis.del).toHaveBeenCalled();
    });

    it('debería rechazar eliminación si hay camiones registrados', async () => {
      const shift = makeShift({ usedSlots: 3 }); // 3 camiones registrados
      (prismaMock.shiftSchedule.findFirst as jest.Mock).mockResolvedValue(shift);
      redis.get.mockResolvedValue('17');

      await expect(service.remove(SHIFT_ID, TENANT_ID)).rejects.toThrow(BadRequestException);
      expect(prismaMock.shiftSchedule.delete).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // getAvailableSlots
  // =========================================================================
  describe('getAvailableSlots', () => {
    it('debería retornar slots disponibles por turno', async () => {
      const shifts = [makeShift({ id: 'shift-1' }), makeShift({ id: 'shift-2' })];
      (prismaMock.shiftSchedule.findMany as jest.Mock).mockResolvedValue(shifts);
      redis.get
        .mockResolvedValueOnce('15') // shift-1: 15 disponibles
        .mockResolvedValueOnce(null); // shift-2: calcular desde DB

      const results = await service.getAvailableSlots(
        '2025-06-15',
        COMMODITY_ID,
        'descarga',
        TENANT_ID,
      );

      expect(results).toHaveLength(2);
      expect(results[0].availableSlots).toBe(15);
      expect(results[1].availableSlots).toBe(20); // totalSlots(20) - usedSlots(0)
    });
  });

  // =========================================================================
  // openForToday
  // =========================================================================
  describe('openForToday', () => {
    it('debería inicializar contadores Redis para turnos de hoy', async () => {
      const shifts = [
        makeShift({ id: 'shift-1', totalSlots: 20, usedSlots: 2 }),
        makeShift({ id: 'shift-2', totalSlots: 15, usedSlots: 0 }),
      ];
      (prismaMock.shiftSchedule.findMany as jest.Mock).mockResolvedValue(shifts);

      const results = await service.openForToday(TENANT_ID);

      expect(results).toHaveLength(2);
      // Pipeline debe haberse ejecutado
      expect(redis.pipeline).toHaveBeenCalled();
    });
  });
});
