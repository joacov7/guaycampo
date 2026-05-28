// =============================================================================
// GuayCampo Web App — Local Types
// =============================================================================

import type {
  IShiftSchedule,
  ITruckShift,
  IQueuePosition,
  TruckShiftStatus,
  ShiftScheduleStatus,
} from '@guaycampo/shared-types';

// -----------------------------------------------------------------------------
// Auth / Session
// -----------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  role: string;
  isSuperAdmin?: boolean;
  accessToken: string;
  refreshToken: string;
}

// Augment next-auth types
declare module 'next-auth' {
  interface User extends AuthUser {}
  interface Session {
    user: AuthUser;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken: string;
    refreshToken: string;
    tenantId: string;
    tenantSlug: string;
    tenantName: string;
    role: string;
    isSuperAdmin?: boolean;
  }
}

// -----------------------------------------------------------------------------
// API
// -----------------------------------------------------------------------------

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: string[];
}

export interface ShiftFilters {
  date?: string;
  status?: ShiftScheduleStatus;
  commodityId?: string;
  page?: number;
  limit?: number;
}

export interface CreateTruckShiftDto {
  shiftId: string;
  vehicleId: string;
  driverId: string;
  clientId: string;
  commodityId: string;
  estimatedQty?: number;
  cpeNumber?: string;
}

// -----------------------------------------------------------------------------
// Queue / WebSocket
// -----------------------------------------------------------------------------

export interface QueueState {
  positions: QueuePositionWithDetails[];
  metrics: QueueMetrics;
}

export interface QueuePositionWithDetails extends IQueuePosition {
  truckShift: ITruckShift & {
    vehicle: { plate: string };
    driver: { fullName: string };
    commodity: { name: string };
  };
}

export interface QueueMetrics {
  total: number;
  avgWaitMinutes: number;
  currentlyInScale: number;
  calledToday: number;
}

// -----------------------------------------------------------------------------
// Dashboard
// -----------------------------------------------------------------------------

export interface DashboardStats {
  trucksInPlant: number;
  trucksInQueue: number;
  shiftsToday: number;
  shiftsCompleted: number;
  totalWeightToday: number;
  avgWaitTime: number;
  siloCapacityUsed: number;
  siloCapacityTotal: number;
  alertsActive: number;
}

export interface ActivityEvent {
  id: string;
  type: 'checkin' | 'called' | 'scale' | 'lab' | 'completed' | 'rejected';
  plate: string;
  driverName: string;
  commodityName: string;
  status: TruckShiftStatus;
  timestamp: string;
}

// -----------------------------------------------------------------------------
// UI
// -----------------------------------------------------------------------------

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  badge?: number;
  disabled?: boolean;
  comingSoon?: boolean;
};

export interface ShiftWithStats extends IShiftSchedule {
  commodity: { id: string; name: string; code: string; unit: string; tenantId: string };
  truckShifts?: (ITruckShift & {
    vehicle: { plate: string };
    driver: { fullName: string };
  })[];
}
