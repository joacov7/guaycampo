// =============================================================================
// Tests unitarios — QueueService
// Cola virtual de camiones en Redis (sorted set por score/timestamp)
// =============================================================================

import { QueueService } from './queue.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, BadRequestException } from '@nestjs/common';

// ---------------------------------------------------------------------------
// Mocks de módulos externos
// ---------------------------------------------------------------------------
jest.mock('@guaycampo/database', () => ({
  prisma: {
    truckShift: {
      findFirst: jest.fn(),
    },
    queuePosition: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
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

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------
const TENANT_ID = 'tenant-test-1';
const TODAY = new Date().toISOString().split('T')[0];
const QUEUE_KEY = `queue:${TENANT_ID}:${TODAY}`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildRedisMock() {
  return {
    zadd: jest.fn().mockResolvedValue(1),
    zrank: jest.fn().mockResolvedValue(0),
    zrange: jest.fn().mockResolvedValue([]),
    zcard: jest.fn().mockResolvedValue(0),
    zrem: jest.fn().mockResolvedValue(1),
    zpopmin: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    expire: jest.fn().mockResolvedValue(1),
    incr: jest.fn(),
    decr: jest.fn(),
  };
}

function buildEventEmitter(): jest.Mocked<EventEmitter2> {
  return {
    emit: jest.fn(),
    emitAsync: jest.fn().mockResolvedValue([]),
    on: jest.fn(),
    off: jest.fn(),
    removeAllListeners: jest.fn(),
  } as unknown as jest.Mocked<EventEmitter2>;
}

// ---------------------------------------------------------------------------
// Suite principal
// ---------------------------------------------------------------------------
describe('QueueService', () => {
  let service: QueueService;
  let redis: ReturnType<typeof buildRedisMock>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  const prismaMock = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    redis = buildRedisMock();
    eventEmitter = buildEventEmitter();
    service = new QueueService(eventEmitter, redis as unknown as import('ioredis').default);
  });

  // =========================================================================
  // addToQueue
  // =========================================================================
  describe('addToQueue', () => {
    it('debería agregar camión con score basado en timestamp', async () => {
      const truckShift = {
        id: 'shift-1',
        tenantId: TENANT_ID,
        vehicle: { plate: 'ABC123' },
        driver: { fullName: 'Juan Pérez' },
      };
      const queuePos = {
        id: 'qp-1',
        truckShiftId: 'shift-1',
        position: 1,
        estimatedWait: 15,
        priority: 0,
        tenantId: TENANT_ID,
        truckShift: { vehicle: { plate: 'ABC123' }, driver: { fullName: 'Juan Pérez' } },
      };

      (prismaMock.truckShift.findFirst as jest.Mock).mockResolvedValue(truckShift);
      (prismaMock.queuePosition.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaMock.queuePosition.create as jest.Mock).mockResolvedValue(queuePos);
      redis.zrank.mockResolvedValue(0);

      const before = Date.now();
      await service.addToQueue('shift-1', TENANT_ID, 0);
      const after = Date.now();

      expect(redis.zadd).toHaveBeenCalledWith(
        expect.stringContaining(TENANT_ID),
        expect.any(Number),
        'shift-1',
      );

      const score = (redis.zadd as jest.Mock).mock.calls[0][1] as number;
      expect(score).toBeGreaterThanOrEqual(before);
      expect(score).toBeLessThanOrEqual(after);
    });

    it('debería asignar score menor a camiones prioritarios', async () => {
      const truckShift = {
        id: 'shift-1',
        tenantId: TENANT_ID,
        vehicle: { plate: 'ABC123' },
        driver: { fullName: 'Juan Pérez' },
      };
      const queuePos = {
        id: 'qp-1',
        truckShiftId: 'shift-1',
        position: 1,
        estimatedWait: 15,
        priority: 0,
        tenantId: TENANT_ID,
        truckShift: { vehicle: { plate: 'ABC123' }, driver: { fullName: 'Juan Pérez' } },
      };

      (prismaMock.truckShift.findFirst as jest.Mock).mockResolvedValue(truckShift);
      (prismaMock.queuePosition.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaMock.queuePosition.create as jest.Mock).mockResolvedValue(queuePos);
      redis.zrank.mockResolvedValue(0);

      await service.addToQueue('normal', TENANT_ID, 0);
      await service.addToQueue('priority', TENANT_ID, 1);

      const normalScore = (redis.zadd as jest.Mock).mock.calls[0][1] as number;
      const priorityScore = (redis.zadd as jest.Mock).mock.calls[1][1] as number;
      // score = Date.now() - priority * 1_000_000 → prioridad más alta = score menor
      expect(priorityScore).toBeLessThan(normalScore);
    });

    it('debería lanzar NotFoundException si el truckShift no existe', async () => {
      (prismaMock.truckShift.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.addToQueue('inexistente', TENANT_ID, 0)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debería lanzar BadRequestException si el camión ya está en cola', async () => {
      const truckShift = {
        id: 'shift-1',
        tenantId: TENANT_ID,
        vehicle: { plate: 'ABC123' },
        driver: { fullName: 'Juan Pérez' },
      };

      (prismaMock.truckShift.findFirst as jest.Mock).mockResolvedValue(truckShift);
      (prismaMock.queuePosition.findUnique as jest.Mock).mockResolvedValue({ id: 'existing-pos' });

      await expect(service.addToQueue('shift-1', TENANT_ID, 0)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debería emitir evento queue.truck.added al agregar camión', async () => {
      const truckShift = {
        id: 'shift-1',
        tenantId: TENANT_ID,
        vehicle: { plate: 'ABC123' },
        driver: { fullName: 'Juan Pérez' },
      };
      const queuePos = {
        id: 'qp-1',
        truckShiftId: 'shift-1',
        position: 1,
        estimatedWait: 15,
        priority: 0,
        tenantId: TENANT_ID,
        truckShift: { vehicle: { plate: 'ABC123' }, driver: { fullName: 'Juan Pérez' } },
      };

      (prismaMock.truckShift.findFirst as jest.Mock).mockResolvedValue(truckShift);
      (prismaMock.queuePosition.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaMock.queuePosition.create as jest.Mock).mockResolvedValue(queuePos);
      redis.zrank.mockResolvedValue(0);

      await service.addToQueue('shift-1', TENANT_ID, 0);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'queue.truck.added',
        expect.objectContaining({ type: 'queue.truck.added' }),
      );
    });
  });

  // =========================================================================
  // getPosition
  // =========================================================================
  describe('getPosition', () => {
    it('debería retornar 1 para el primer camión en cola (rank 0)', async () => {
      redis.zrank.mockResolvedValue(0);

      const position = await service.getPosition('shift-1', TENANT_ID);

      expect(position).toBe(1);
    });

    it('debería retornar 3 para el camión en rank 2', async () => {
      redis.zrank.mockResolvedValue(2);

      const position = await service.getPosition('shift-1', TENANT_ID);

      expect(position).toBe(3);
    });

    it('debería consultar DB como fallback si el camión no está en Redis', async () => {
      redis.zrank.mockResolvedValue(null);
      (prismaMock.queuePosition.findFirst as jest.Mock).mockResolvedValue({
        id: 'qp-1',
        position: 5,
        tenantId: TENANT_ID,
      });

      const position = await service.getPosition('shift-1', TENANT_ID);

      expect(position).toBe(5);
      expect(prismaMock.queuePosition.findFirst).toHaveBeenCalled();
    });

    it('debería lanzar NotFoundException si el camión no está en Redis ni en DB', async () => {
      redis.zrank.mockResolvedValue(null);
      (prismaMock.queuePosition.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.getPosition('shift-X', TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // estimateWaitTime
  // =========================================================================
  describe('estimateWaitTime', () => {
    it('debería retornar 0 para posición 0', async () => {
      const wait = await service.estimateWaitTime(0, TENANT_ID);

      expect(wait).toBe(0);
    });

    it('debería usar el tiempo promedio almacenado en Redis', async () => {
      redis.get.mockResolvedValue('25'); // 25 minutos promedio

      const wait = await service.estimateWaitTime(3, TENANT_ID);

      // 3 posiciones * 25 minutos = 75 minutos
      expect(wait).toBe(75);
    });

    it('debería usar valor default (15 min) si no hay historial en Redis', async () => {
      redis.get.mockResolvedValue(null);

      const wait = await service.estimateWaitTime(2, TENANT_ID);

      // Default = 15 min/camión * 2 posiciones = 30
      expect(wait).toBeGreaterThan(0);
      expect(wait).toBe(30); // 2 * DEFAULT_AVG_PROCESS_MINUTES(15)
    });

    it('debería retornar valor entero (redondeado)', async () => {
      redis.get.mockResolvedValue('12.7');

      const wait = await service.estimateWaitTime(2, TENANT_ID);

      expect(Number.isInteger(wait)).toBe(true);
    });
  });

  // =========================================================================
  // popNext
  // =========================================================================
  describe('popNext', () => {
    it('debería remover y retornar el primer elemento de la cola', async () => {
      redis.zpopmin.mockResolvedValue(['shift-1', '1700000000000']);

      const next = await service.popNext(TENANT_ID);

      expect(next).toBe('shift-1');
      expect(redis.zpopmin).toHaveBeenCalledWith(
        expect.stringContaining(TENANT_ID),
        1,
      );
    });

    it('debería retornar null si la cola está vacía', async () => {
      redis.zpopmin.mockResolvedValue([]);

      const next = await service.popNext(TENANT_ID);

      expect(next).toBeNull();
    });

    it('debería retornar null si zpopmin devuelve solo un elemento', async () => {
      // resultado inválido (par de 2 esperado: [member, score])
      redis.zpopmin.mockResolvedValue(['shift-1']);

      const next = await service.popNext(TENANT_ID);

      expect(next).toBeNull();
    });
  });

  // =========================================================================
  // peekNext
  // =========================================================================
  describe('peekNext', () => {
    it('debería retornar el primer camión sin removerlo', async () => {
      redis.zrange.mockResolvedValue(['shift-1']);

      const next = await service.peekNext(TENANT_ID);

      expect(next).toBe('shift-1');
      expect(redis.zrem).not.toHaveBeenCalled();
    });

    it('debería retornar null si la cola está vacía', async () => {
      redis.zrange.mockResolvedValue([]);

      const next = await service.peekNext(TENANT_ID);

      expect(next).toBeNull();
    });
  });

  // =========================================================================
  // removeFromQueue
  // =========================================================================
  describe('removeFromQueue', () => {
    it('debería eliminar de Redis y de DB', async () => {
      (prismaMock.queuePosition.findFirst as jest.Mock).mockResolvedValue({
        id: 'qp-1',
        truckShiftId: 'shift-1',
        tenantId: TENANT_ID,
      });
      (prismaMock.queuePosition.delete as jest.Mock).mockResolvedValue({});

      await service.removeFromQueue('shift-1', TENANT_ID);

      expect(redis.zrem).toHaveBeenCalledWith(
        expect.stringContaining(TENANT_ID),
        'shift-1',
      );
      expect(prismaMock.queuePosition.delete).toHaveBeenCalled();
    });

    it('debería lanzar NotFoundException si no existe posición en cola', async () => {
      (prismaMock.queuePosition.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.removeFromQueue('shift-X', TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================================
  // getQueueMetrics
  // =========================================================================
  describe('getQueueMetrics', () => {
    it('debería retornar métricas correctas', async () => {
      redis.zcard.mockResolvedValue(5);
      redis.get.mockResolvedValue('20'); // 20 min promedio
      (prismaMock.queuePosition.count as jest.Mock).mockResolvedValue(2);

      const metrics = await service.getQueueMetrics(TENANT_ID);

      expect(metrics.total).toBe(5);
      expect(metrics.avgWaitMin).toBe(20);
      expect(metrics.maxWaitMin).toBe(100); // 5 * 20
      expect(metrics.processingNow).toBe(2);
    });

    it('debería retornar maxWaitMin de 0 si la cola está vacía', async () => {
      redis.zcard.mockResolvedValue(0);
      redis.get.mockResolvedValue(null);
      (prismaMock.queuePosition.count as jest.Mock).mockResolvedValue(0);

      const metrics = await service.getQueueMetrics(TENANT_ID);

      expect(metrics.maxWaitMin).toBe(0);
    });
  });
});
