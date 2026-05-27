-- =============================================================================
-- Migration 002: ENUM Types
-- =============================================================================

CREATE TYPE tenant_status AS ENUM ('active', 'suspended', 'trial', 'cancelled');
CREATE TYPE subscription_plan AS ENUM ('starter', 'professional', 'enterprise');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE vehicle_type AS ENUM ('camion', 'acoplado', 'semiremolque', 'balancin', 'rigido');
CREATE TYPE driver_status AS ENUM ('active', 'inactive', 'suspended', 'blocked');
CREATE TYPE client_type AS ENUM ('productor', 'acopiador', 'exportador', 'corredor', 'cooperativa');
CREATE TYPE operation_type AS ENUM ('descarga', 'carga', 'transito', 'acopio');
CREATE TYPE shift_status AS ENUM ('draft', 'open', 'closed', 'full', 'cancelled');
CREATE TYPE truck_shift_status AS ENUM (
  'pendiente', 'confirmado', 'en_camino', 'en_planta', 'esperando',
  'llamado', 'en_balanza', 'en_laboratorio', 'descargando',
  'finalizado', 'rechazado', 'ausente', 'cancelado'
);
CREATE TYPE scale_status AS ENUM ('pendiente', 'pesaje_entrada', 'en_laboratorio', 'pesaje_salida', 'finalizado', 'rechazado', 'error');
CREATE TYPE lab_status AS ENUM ('pendiente', 'en_analisis', 'aprobado', 'rechazado', 'condicionado');
CREATE TYPE silo_status AS ENUM ('operativo', 'mantenimiento', 'lleno', 'vacio', 'inactivo');
CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical', 'emergency');
CREATE TYPE movement_type AS ENUM ('ingreso', 'egreso', 'traslado_entrada', 'traslado_salida', 'ajuste');
CREATE TYPE cpe_status AS ENUM ('borrador', 'emitido', 'confirmado', 'rechazado', 'anulado');
CREATE TYPE liquidation_status AS ENUM ('borrador', 'pendiente', 'aprobada', 'pagada', 'anulada');
CREATE TYPE invoice_status AS ENUM ('borrador', 'emitida', 'pagada', 'anulada', 'vencida');
CREATE TYPE iva_condition AS ENUM ('responsable_inscripto', 'monotributo', 'exento', 'no_responsable', 'consumidor_final');
