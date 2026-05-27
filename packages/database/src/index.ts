// =============================================================================
// GuayCampo - Database Package
// Exports a configured PrismaClient instance
// =============================================================================

import { PrismaClient } from '@prisma/client';

// -----------------------------------------------------------------------------
// Prisma Client Singleton (prevents multiple instances in development)
// -----------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
    errorFormat: 'colorless',
  });
}

export const prisma: PrismaClient =
  global.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

// -----------------------------------------------------------------------------
// Graceful shutdown helper
// -----------------------------------------------------------------------------

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

// -----------------------------------------------------------------------------
// Re-export Prisma types
// -----------------------------------------------------------------------------

export { PrismaClient } from '@prisma/client';
export type {
  Tenant,
  User,
  Role,
  RefreshToken,
  Vehicle,
  Driver,
  TransportCompany,
  Client,
  Commodity,
  ShiftSchedule,
  TruckShift,
  QueuePosition,
  ScaleDevice,
  ScaleTicket,
  LabSample,
  Silo,
  SiloAlert,
  SiloMovement,
} from '@prisma/client';

export default prisma;
