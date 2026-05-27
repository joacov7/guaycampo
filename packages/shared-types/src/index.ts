// =============================================================================
// GuayCampo - Shared TypeScript Types
// =============================================================================

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

export enum TenantPlan {
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
}

export enum VehicleType {
  CAMION = 'camion',
  CAMION_ACOPLADO = 'camion_acoplado',
  CAMION_SEMIRREMOLQUE = 'camion_semirremolque',
  BATEA = 'batea',
  ACOPLADO = 'acoplado',
}

export enum DriverStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export enum ShiftScheduleStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TruckShiftStatus {
  PENDIENTE = 'pendiente',
  CONFIRMADO = 'confirmado',
  EN_CAMINO = 'en_camino',
  EN_PLANTA = 'en_planta',
  EN_BALANZA = 'en_balanza',
  EN_LABORATORIO = 'en_laboratorio',
  EN_DESCARGA = 'en_descarga',
  COMPLETADO = 'completado',
  RECHAZADO = 'rechazado',
  CANCELADO = 'cancelado',
}

export enum ScaleStatus {
  PENDIENTE = 'pendiente',
  PESADA_BRUTA = 'pesada_bruta',
  PESADA_TARA = 'pesada_tara',
  COMPLETADO = 'completado',
  ANULADO = 'anulado',
}

export enum LabStatus {
  PENDIENTE = 'pendiente',
  EN_PROCESO = 'en_proceso',
  APROBADO = 'aprobado',
  RECHAZADO = 'rechazado',
  CONDICIONAL = 'condicional',
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency',
}

export enum AlertType {
  CAPACIDAD = 'capacidad',
  TEMPERATURA = 'temperatura',
  HUMEDAD = 'humedad',
  INFESTACION = 'infestacion',
  AIREACION = 'aireacion',
  CALIDAD = 'calidad',
}

export enum SiloStatus {
  OPERATIVO = 'operativo',
  MANTENIMIENTO = 'mantenimiento',
  FUERA_DE_SERVICIO = 'fuera_de_servicio',
}

export enum SiloType {
  BOLSON = 'bolson',
  METALICO = 'metalico',
  CEMENTO = 'cemento',
  PLANO = 'plano',
}

export enum MovementType {
  ENTRADA = 'entrada',
  SALIDA = 'salida',
  MERMA = 'merma',
  AJUSTE = 'ajuste',
  TRANSFERENCIA = 'transferencia',
}

export enum OperationType {
  COMPRA = 'compra',
  ACOPIO = 'acopio',
  CANJE = 'canje',
  REMITO = 'remito',
}

export enum IvaCondition {
  RESPONSABLE_INSCRIPTO = 'responsable_inscripto',
  MONOTRIBUTO = 'monotributo',
  EXENTO = 'exento',
  CONSUMIDOR_FINAL = 'consumidor_final',
}

export enum ClientType {
  PRODUCTOR = 'productor',
  ACOPIADOR = 'acopiador',
  EXPORTADOR = 'exportador',
  INDUSTRIA = 'industria',
  OTRO = 'otro',
}

// -----------------------------------------------------------------------------
// Base Interfaces
// -----------------------------------------------------------------------------

export interface BaseEntity {
  id: string;
  createdAt: Date;
  tenantId: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

// -----------------------------------------------------------------------------
// Tenant & Auth
// -----------------------------------------------------------------------------

export interface ITenant extends BaseEntity {
  slug: string;
  name: string;
  cuit: string;
  plan: TenantPlan;
  status: TenantStatus;
  config: Record<string, unknown>;
  users?: IUser[];
}

export interface IRole {
  id: string;
  name: string;
  permissions: IPermissions;
  isSystem: boolean;
  tenantId: string;
  users?: IUser[];
}

export interface IPermissions {
  shifts?: {
    read?: boolean;
    write?: boolean;
    delete?: boolean;
    manage?: boolean;
  };
  scale?: {
    read?: boolean;
    write?: boolean;
    manage?: boolean;
  };
  lab?: {
    read?: boolean;
    write?: boolean;
    approve?: boolean;
  };
  silo?: {
    read?: boolean;
    write?: boolean;
    manage?: boolean;
  };
  admin?: {
    users?: boolean;
    roles?: boolean;
    tenants?: boolean;
    reports?: boolean;
  };
}

export interface IUser extends BaseEntity {
  email: string;
  phone?: string;
  fullName: string;
  tenantId: string;
  tenant?: ITenant;
  roleId?: string;
  role?: IRole;
  status: UserStatus;
  lastLogin?: Date;
}

export interface IUserPublic extends Omit<IUser, 'tenant'> {
  tenant?: Pick<ITenant, 'id' | 'name' | 'slug'>;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// -----------------------------------------------------------------------------
// Transport
// -----------------------------------------------------------------------------

export interface ITransportCompany extends BaseEntity {
  name: string;
  cuit: string;
  address?: string;
  contactPhone?: string;
  status: string;
  vehicles?: IVehicle[];
  drivers?: IDriver[];
}

export interface IVehicle extends BaseEntity {
  plate: string;
  plateTrailer?: string;
  vehicleType: VehicleType;
  taraKg?: number;
  capacityKg?: number;
  brand?: string;
  model?: string;
  year?: number;
  insuranceExp?: Date;
  vtvExp?: Date;
  transportCompanyId?: string;
  transportCompany?: ITransportCompany;
  drivers?: IDriver[];
}

export interface IDriver extends BaseEntity {
  dni: string;
  fullName: string;
  phone: string;
  licenseNumber?: string;
  licenseExp?: Date;
  rating: number;
  status: DriverStatus;
  transportCompanyId?: string;
  transportCompany?: ITransportCompany;
  vehicleId?: string;
  vehicle?: IVehicle;
}

// -----------------------------------------------------------------------------
// Clients & Commodities
// -----------------------------------------------------------------------------

export interface IClient extends BaseEntity {
  name: string;
  cuit: string;
  clientType?: ClientType;
  address?: string;
  locality?: string;
  province?: string;
  ivaCondition?: IvaCondition;
  currentAccount: number;
  creditLimit?: number;
}

export interface ICommodity {
  id: string;
  name: string;
  code: string;
  qualityParams?: IQualityParams;
  unit: string;
  tenantId: string;
}

export interface IQualityParams {
  maxHumidity?: number;
  maxProtein?: number;
  minGluten?: number;
  minFallingNumber?: number;
  maxForeignMatter?: number;
  maxDamagedGrains?: number;
  [key: string]: number | undefined;
}

// -----------------------------------------------------------------------------
// Shifts & Queue
// -----------------------------------------------------------------------------

export interface IShiftSchedule extends BaseEntity {
  date: Date;
  commodityId: string;
  commodity?: ICommodity;
  operationType: OperationType;
  totalSlots: number;
  usedSlots: number;
  timeFrom?: string;
  timeTo?: string;
  status: ShiftScheduleStatus;
  truckShifts?: ITruckShift[];
}

export interface ITruckShift extends BaseEntity {
  shiftId: string;
  shift?: IShiftSchedule;
  vehicleId: string;
  vehicle?: IVehicle;
  driverId: string;
  driver?: IDriver;
  clientId: string;
  client?: IClient;
  commodityId: string;
  commodity?: ICommodity;
  estimatedQty?: number;
  cpeNumber?: string;
  status: TruckShiftStatus;
  qrCode?: string;
  checkinAt?: Date;
  checkoutAt?: Date;
  scaleTickets?: IScaleTicket[];
  queuePosition?: IQueuePosition;
}

export interface IQueuePosition extends BaseEntity {
  truckShiftId: string;
  truckShift?: ITruckShift;
  position: number;
  parkingZone?: string;
  calledAt?: Date;
  enteredAt?: Date;
  estimatedWait?: number;
  priority: number;
}

// -----------------------------------------------------------------------------
// Scale & Lab
// -----------------------------------------------------------------------------

export interface IScaleTicket extends BaseEntity {
  ticketNumber: string;
  truckShiftId?: string;
  truckShift?: ITruckShift;
  vehicleId: string;
  vehicle?: IVehicle;
  driverId: string;
  driver?: IDriver;
  clientId: string;
  client?: IClient;
  commodityId: string;
  grossWeight?: number;
  grossAt?: Date;
  grossPhotoUrl?: string;
  tareWeight?: number;
  tareAt?: Date;
  tarePhotoUrl?: string;
  netWeight?: number;
  plateDetected?: string;
  plateConfirmed?: string;
  ocrConfidence?: number;
  status: ScaleStatus;
  observations?: string;
  labSamples?: ILabSample[];
}

export interface ILabSample extends BaseEntity {
  sampleNumber: string;
  scaleTicketId: string;
  scaleTicket?: IScaleTicket;
  takenAt: Date;
  humidity?: number;
  protein?: number;
  gluten?: number;
  fallingNumber?: number;
  testWeight?: number;
  damagedGrains?: number;
  foreignMatter?: number;
  brokenGrains?: number;
  bonuses?: ILabAdjustment[];
  discounts?: ILabAdjustment[];
  netAdjustment?: number;
  grade?: string;
  status: LabStatus;
  rejectionCause?: string;
  rawData?: Record<string, unknown>;
}

export interface ILabAdjustment {
  concept: string;
  percentage: number;
  kg?: number;
}

// -----------------------------------------------------------------------------
// Silos
// -----------------------------------------------------------------------------

export interface ISilo extends BaseEntity {
  name: string;
  siloType: SiloType;
  capacityTon: number;
  currentStock: number;
  commodityId?: string;
  locationLat?: number;
  locationLng?: number;
  sector?: string;
  status: SiloStatus;
  alerts?: ISiloAlert[];
  movements?: ISiloMovement[];
}

export interface ISiloAlert {
  id: string;
  siloId: string;
  silo?: ISilo;
  alertType: AlertType;
  severity: AlertSeverity;
  message: string;
  value?: number;
  threshold?: number;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  tenantId: string;
}

export interface ISiloMovement {
  id: string;
  siloId: string;
  silo?: ISilo;
  movementType: MovementType;
  quantityKg: number;
  scaleTicketId?: string;
  observations?: string;
  tenantId: string;
  createdAt: Date;
}

// -----------------------------------------------------------------------------
// Dashboard & Reports
// -----------------------------------------------------------------------------

export interface IDashboardStats {
  date: Date;
  tenantId: string;
  shiftsToday: number;
  shiftsCompleted: number;
  shiftsPending: number;
  trucksInPlant: number;
  trucksInQueue: number;
  totalWeightToday: number;
  avgWaitTime: number;
  siloCapacityUsed: number;
  siloCapacityTotal: number;
  alertsActive: number;
}

export interface IReportFilter {
  dateFrom?: Date;
  dateTo?: Date;
  tenantId?: string;
  commodityId?: string;
  clientId?: string;
  status?: string;
  page?: number;
  limit?: number;
}
