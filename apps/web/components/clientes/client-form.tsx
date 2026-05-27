'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClientType, IvaCondition } from '@guaycampo/shared-types';

const clientSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  cuit: z
    .string()
    .min(11, 'El CUIT debe tener 11 dígitos')
    .max(13, 'CUIT inválido')
    .regex(/^\d{2}-?\d{8}-?\d$/, 'Formato inválido. Ej: 20-12345678-9'),
  clientType: z.nativeEnum(ClientType).optional(),
  address: z.string().optional(),
  locality: z.string().optional(),
  province: z.string().optional(),
  ivaCondition: z.nativeEnum(IvaCondition).optional(),
  creditLimit: z.coerce.number().min(0).optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
});

export type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientFormProps {
  defaultValues?: Partial<ClientFormValues>;
  onSubmit: (values: ClientFormValues) => void;
  isLoading?: boolean;
  isEditMode?: boolean;
}

const clientTypeOptions: { value: ClientType; label: string }[] = [
  { value: ClientType.PRODUCTOR, label: 'Productor' },
  { value: ClientType.ACOPIADOR, label: 'Acopiador' },
  { value: ClientType.EXPORTADOR, label: 'Exportador' },
  { value: ClientType.INDUSTRIA, label: 'Industria' },
  { value: ClientType.OTRO, label: 'Otro' },
];

const ivaOptions: { value: IvaCondition; label: string }[] = [
  { value: IvaCondition.RESPONSABLE_INSCRIPTO, label: 'Responsable Inscripto' },
  { value: IvaCondition.MONOTRIBUTO, label: 'Monotributo' },
  { value: IvaCondition.EXENTO, label: 'Exento' },
  { value: IvaCondition.CONSUMIDOR_FINAL, label: 'Consumidor Final' },
];

const ARGENTINIAN_PROVINCES = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
  'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán',
];

export function ClientForm({ defaultValues, onSubmit, isLoading, isEditMode }: ClientFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: defaultValues ?? {},
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Datos principales */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Datos principales</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="name">Nombre o Razón Social *</Label>
            <Input
              id="name"
              placeholder="Ej: Juan Pérez o Agropecuaria El Campo S.A."
              {...register('name')}
              className={errors.name ? 'border-red-400' : ''}
            />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cuit">CUIT *</Label>
            <Input
              id="cuit"
              placeholder="20-12345678-9"
              {...register('cuit')}
              className={errors.cuit ? 'border-red-400' : ''}
            />
            {errors.cuit && <p className="text-xs text-red-600">{errors.cuit.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="clientType">Tipo de cliente</Label>
            <select
              id="clientType"
              {...register('clientType')}
              className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
            >
              <option value="">— Seleccionar —</option>
              {clientTypeOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ivaCondition">Condición IVA</Label>
            <select
              id="ivaCondition"
              {...register('ivaCondition')}
              className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
            >
              <option value="">— Seleccionar —</option>
              {ivaOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="creditLimit">Límite de crédito ($)</Label>
            <Input
              id="creditLimit"
              type="number"
              min={0}
              step={1000}
              placeholder="0"
              {...register('creditLimit')}
            />
          </div>
        </div>
      </div>

      {/* Contacto */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Contacto</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" type="tel" placeholder="+54 9 11 1234-5678" {...register('phone')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="contacto@campo.com"
              {...register('email')}
              className={errors.email ? 'border-red-400' : ''}
            />
            {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
          </div>
        </div>
      </div>

      {/* Domicilio */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Domicilio</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" placeholder="Calle y número" {...register('address')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="locality">Localidad</Label>
            <Input id="locality" placeholder="Ej: Rosario" {...register('locality')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="province">Provincia</Label>
            <select
              id="province"
              {...register('province')}
              className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
            >
              <option value="">— Seleccionar —</option>
              {ARGENTINIAN_PROVINCES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="px-5 py-2 bg-guay-600 hover:bg-guay-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Guardando...' : isEditMode ? 'Guardar cambios' : 'Crear cliente'}
        </button>
      </div>
    </form>
  );
}
