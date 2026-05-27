import { z } from 'zod';

// -----------------------------------------------------------------------------
// Auth
// -----------------------------------------------------------------------------

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo es requerido')
    .email('Ingrese un correo válido'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
  tenantSlug: z.string().optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

// -----------------------------------------------------------------------------
// Turnos
// -----------------------------------------------------------------------------

export const createShiftSchema = z.object({
  date: z.string().min(1, 'La fecha es requerida'),
  commodityId: z.string().min(1, 'El cultivo es requerido'),
  operationType: z.enum(['compra', 'acopio', 'canje', 'remito'], {
    errorMap: () => ({ message: 'Seleccione un tipo de operación' }),
  }),
  totalSlots: z
    .number({ invalid_type_error: 'Ingrese un número válido' })
    .int()
    .min(1, 'Mínimo 1 slot')
    .max(500, 'Máximo 500 slots'),
  timeFrom: z.string().optional(),
  timeTo: z.string().optional(),
});

export type CreateShiftFormValues = z.infer<typeof createShiftSchema>;

export const createTruckShiftSchema = z.object({
  shiftId: z.string().min(1, 'El turno es requerido'),
  vehicleId: z.string().min(1, 'El vehículo es requerido'),
  driverId: z.string().min(1, 'El conductor es requerido'),
  clientId: z.string().min(1, 'El cliente es requerido'),
  commodityId: z.string().min(1, 'El cultivo es requerido'),
  estimatedQty: z
    .number({ invalid_type_error: 'Ingrese un número válido' })
    .positive('Debe ser positivo')
    .optional(),
  cpeNumber: z.string().optional(),
});

export type CreateTruckShiftFormValues = z.infer<typeof createTruckShiftSchema>;
