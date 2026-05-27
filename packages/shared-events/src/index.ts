// =============================================================================
// GuayCampo - Shared Event Types (Kafka/Messaging)
// =============================================================================

import type {
  TruckShiftStatus,
  ScaleStatus,
  LabStatus,
  AlertSeverity,
  AlertType,
  MovementType,
} from '@guaycampo/shared-types';

// -----------------------------------------------------------------------------
// Base Event
// -----------------------------------------------------------------------------

export interface BaseEvent {
  eventId: string;
  eventType: string;
  tenantId: string;
  timestamp: string; // ISO 8601
  version: string;
  correlationId?: string;
  causationId?: string;
}

// -----------------------------------------------------------------------------
// Auth Events
// -----------------------------------------------------------------------------

export interface UserRegisteredEvent extends BaseEvent {
  eventType: 'auth.user.registered';
  payload: {
    userId: string;
    email: string;
    fullName: string;
    tenantId: string;
    roleId?: string;
  };
}

export interface UserLoggedInEvent extends BaseEvent {
  eventType: 'auth.user.logged_in';
  payload: {
    userId: string;
    email: string;
    tenantId: string;
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface UserPasswordChangedEvent extends BaseEvent {
  eventType: 'auth.user.password_changed';
  payload: {
    userId: string;
    tenantId: string;
  };
}

// -----------------------------------------------------------------------------
// Shift Events
// -----------------------------------------------------------------------------

export interface ShiftCreatedEvent extends BaseEvent {
  eventType: 'shifts.schedule.created';
  payload: {
    shiftId: string;
    date: string;
    commodityId: string;
    commodityName: string;
    operationType: string;
    totalSlots: number;
    timeFrom?: string;
    timeTo?: string;
  };
}

export interface ShiftClosedEvent extends BaseEvent {
  eventType: 'shifts.schedule.closed';
  payload: {
    shiftId: string;
    date: string;
    totalSlots: number;
    usedSlots: number;
  };
}

export interface TruckCheckedInEvent extends BaseEvent {
  eventType: 'shifts.truck.checked_in';
  payload: {
    truckShiftId: string;
    shiftId: string;
    vehiclePlate: string;
    vehicleId: string;
    driverId: string;
    driverName: string;
    clientId: string;
    clientName: string;
    commodityId: string;
    checkinAt: string;
  };
}

export interface TruckStatusChangedEvent extends BaseEvent {
  eventType: 'shifts.truck.status_changed';
  payload: {
    truckShiftId: string;
    vehiclePlate: string;
    previousStatus: TruckShiftStatus;
    newStatus: TruckShiftStatus;
    changedAt: string;
    changedBy?: string;
  };
}

export interface TruckCheckedOutEvent extends BaseEvent {
  eventType: 'shifts.truck.checked_out';
  payload: {
    truckShiftId: string;
    vehiclePlate: string;
    checkoutAt: string;
    totalTimeMinutes: number;
  };
}

// -----------------------------------------------------------------------------
// Queue Events
// -----------------------------------------------------------------------------

export interface TruckAddedToQueueEvent extends BaseEvent {
  eventType: 'queue.truck.added';
  payload: {
    queuePositionId: string;
    truckShiftId: string;
    vehiclePlate: string;
    position: number;
    parkingZone?: string;
    estimatedWait?: number;
  };
}

export interface TruckCalledFromQueueEvent extends BaseEvent {
  eventType: 'queue.truck.called';
  payload: {
    queuePositionId: string;
    truckShiftId: string;
    vehiclePlate: string;
    driverPhone: string;
    position: number;
    calledAt: string;
  };
}

export interface QueuePositionUpdatedEvent extends BaseEvent {
  eventType: 'queue.position.updated';
  payload: {
    truckShiftId: string;
    vehiclePlate: string;
    previousPosition: number;
    newPosition: number;
    estimatedWait?: number;
  };
}

// -----------------------------------------------------------------------------
// Scale Events
// -----------------------------------------------------------------------------

export interface ScaleTicketCreatedEvent extends BaseEvent {
  eventType: 'scale.ticket.created';
  payload: {
    ticketId: string;
    ticketNumber: string;
    truckShiftId?: string;
    vehiclePlate: string;
    vehicleId: string;
    driverId: string;
    clientId: string;
    commodityId: string;
  };
}

export interface GrossWeightRecordedEvent extends BaseEvent {
  eventType: 'scale.ticket.gross_weight_recorded';
  payload: {
    ticketId: string;
    ticketNumber: string;
    vehiclePlate: string;
    grossWeight: number;
    grossAt: string;
    plateDetected?: string;
    ocrConfidence?: number;
  };
}

export interface TareWeightRecordedEvent extends BaseEvent {
  eventType: 'scale.ticket.tare_weight_recorded';
  payload: {
    ticketId: string;
    ticketNumber: string;
    vehiclePlate: string;
    tareWeight: number;
    netWeight: number;
    tareAt: string;
  };
}

export interface WeighingCompletedEvent extends BaseEvent {
  eventType: 'scale.ticket.completed';
  payload: {
    ticketId: string;
    ticketNumber: string;
    vehiclePlate: string;
    grossWeight: number;
    tareWeight: number;
    netWeight: number;
    commodityId: string;
    clientId: string;
    status: ScaleStatus;
  };
}

// -----------------------------------------------------------------------------
// Lab Events
// -----------------------------------------------------------------------------

export interface LabSampleTakenEvent extends BaseEvent {
  eventType: 'lab.sample.taken';
  payload: {
    sampleId: string;
    sampleNumber: string;
    scaleTicketId: string;
    ticketNumber: string;
    takenAt: string;
  };
}

export interface LabSampleAnalyzedEvent extends BaseEvent {
  eventType: 'lab.sample.analyzed';
  payload: {
    sampleId: string;
    sampleNumber: string;
    scaleTicketId: string;
    humidity?: number;
    protein?: number;
    gluten?: number;
    fallingNumber?: number;
    testWeight?: number;
    grade?: string;
    netAdjustment?: number;
  };
}

export interface LabSampleApprovedEvent extends BaseEvent {
  eventType: 'lab.sample.approved';
  payload: {
    sampleId: string;
    sampleNumber: string;
    scaleTicketId: string;
    grade: string;
    netAdjustment: number;
    approvedBy: string;
    approvedAt: string;
    status: LabStatus;
  };
}

export interface LabSampleRejectedEvent extends BaseEvent {
  eventType: 'lab.sample.rejected';
  payload: {
    sampleId: string;
    sampleNumber: string;
    scaleTicketId: string;
    rejectionCause: string;
    rejectedBy: string;
    rejectedAt: string;
  };
}

// -----------------------------------------------------------------------------
// Silo Events
// -----------------------------------------------------------------------------

export interface SiloAlertTriggeredEvent extends BaseEvent {
  eventType: 'silo.alert.triggered';
  payload: {
    alertId: string;
    siloId: string;
    siloName: string;
    alertType: AlertType;
    severity: AlertSeverity;
    message: string;
    value?: number;
    threshold?: number;
    triggeredAt: string;
  };
}

export interface SiloAlertResolvedEvent extends BaseEvent {
  eventType: 'silo.alert.resolved';
  payload: {
    alertId: string;
    siloId: string;
    siloName: string;
    resolvedBy: string;
    resolvedAt: string;
  };
}

export interface SiloMovementCreatedEvent extends BaseEvent {
  eventType: 'silo.movement.created';
  payload: {
    movementId: string;
    siloId: string;
    siloName: string;
    movementType: MovementType;
    quantityKg: number;
    scaleTicketId?: string;
    newStock: number;
    capacityPercent: number;
  };
}

// -----------------------------------------------------------------------------
// Notification Events
// -----------------------------------------------------------------------------

export interface WhatsAppNotificationEvent extends BaseEvent {
  eventType: 'notification.whatsapp.send';
  payload: {
    to: string;
    templateName: string;
    templateParams: Record<string, string>;
    relatedEntityType?: string;
    relatedEntityId?: string;
  };
}

export interface PushNotificationEvent extends BaseEvent {
  eventType: 'notification.push.send';
  payload: {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    priority?: 'normal' | 'high';
  };
}

// -----------------------------------------------------------------------------
// Union Type
// -----------------------------------------------------------------------------

export type GuayCampoEvent =
  | UserRegisteredEvent
  | UserLoggedInEvent
  | UserPasswordChangedEvent
  | ShiftCreatedEvent
  | ShiftClosedEvent
  | TruckCheckedInEvent
  | TruckStatusChangedEvent
  | TruckCheckedOutEvent
  | TruckAddedToQueueEvent
  | TruckCalledFromQueueEvent
  | QueuePositionUpdatedEvent
  | ScaleTicketCreatedEvent
  | GrossWeightRecordedEvent
  | TareWeightRecordedEvent
  | WeighingCompletedEvent
  | LabSampleTakenEvent
  | LabSampleAnalyzedEvent
  | LabSampleApprovedEvent
  | LabSampleRejectedEvent
  | SiloAlertTriggeredEvent
  | SiloAlertResolvedEvent
  | SiloMovementCreatedEvent
  | WhatsAppNotificationEvent
  | PushNotificationEvent;

// -----------------------------------------------------------------------------
// Kafka Topics
// -----------------------------------------------------------------------------

export const KAFKA_TOPICS = {
  AUTH: 'guaycampo.auth',
  SHIFTS: 'guaycampo.shifts',
  QUEUE: 'guaycampo.queue',
  SCALE: 'guaycampo.scale',
  LAB: 'guaycampo.lab',
  SILO: 'guaycampo.silo',
  NOTIFICATIONS: 'guaycampo.notifications',
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];

// -----------------------------------------------------------------------------
// Event factory helper
// -----------------------------------------------------------------------------

export function createEvent<T extends GuayCampoEvent>(
  eventType: T['eventType'],
  tenantId: string,
  payload: T['payload'],
  options?: Partial<Pick<BaseEvent, 'correlationId' | 'causationId'>>,
): T {
  return {
    eventId: crypto.randomUUID(),
    eventType,
    tenantId,
    timestamp: new Date().toISOString(),
    version: '1.0',
    ...options,
    payload,
  } as T;
}
