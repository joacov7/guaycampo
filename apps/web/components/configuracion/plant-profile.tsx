'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle } from 'lucide-react';
import { useState } from 'react';

const plantProfileSchema = z.object({
  name: z.string().min(2, 'Requerido'),
  cuit: z.string().min(11, 'CUIT inválido').max(13),
  address: z.string().optional(),
  locality: z.string().optional(),
  province: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  timezone: z.string(),
});

type PlantProfileValues = z.infer<typeof plantProfileSchema>;

interface TenantConfig {
  name: string;
  cuit: string;
  address?: string;
  locality?: string;
  province?: string;
  phone?: string;
  email?: string;
  timezone?: string;
}

const ARGENTINIAN_PROVINCES = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
  'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán',
];

export function PlantProfile() {
  const [saved, setSaved] = useState(false);

  const { data: tenantData, isLoading } = useQuery({
    queryKey: ['tenant-config'],
    queryFn: () => api.get<TenantConfig>('/auth/tenant'),
    staleTime: 60_000,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PlantProfileValues>({
    resolver: zodResolver(plantProfileSchema),
    values: {
      name: tenantData?.name ?? '',
      cuit: tenantData?.cuit ?? '',
      address: tenantData?.address ?? '',
      locality: tenantData?.locality ?? '',
      province: tenantData?.province ?? '',
      phone: tenantData?.phone ?? '',
      email: tenantData?.email ?? '',
      timezone: tenantData?.timezone ?? 'America/Argentina/Buenos_Aires',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: PlantProfileValues) => api.patch('/auth/tenant', data),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="name">Nombre de la planta *</Label>
          <Input
            id="name"
            placeholder="Ej: Acopio Los Alamos"
            {...register('name')}
            className={errors.name ? 'border-red-400' : ''}
          />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cuit">CUIT *</Label>
          <Input
            id="cuit"
            placeholder="30-12345678-9"
            {...register('cuit')}
            className={errors.cuit ? 'border-red-400' : ''}
          />
          {errors.cuit && <p className="text-xs text-red-600">{errors.cuit.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="timezone">Zona horaria</Label>
          <select
            id="timezone"
            {...register('timezone')}
            className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
          >
            <option value="America/Argentina/Buenos_Aires">Argentina (UTC-3)</option>
            <option value="America/Argentina/Cordoba">Córdoba (UTC-3)</option>
            <option value="America/Argentina/Mendoza">Mendoza (UTC-3)</option>
          </select>
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="address">Domicilio fiscal</Label>
          <Input id="address" placeholder="Calle y número" {...register('address')} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="locality">Localidad</Label>
          <Input id="locality" placeholder="Ej: Pergamino" {...register('locality')} />
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

        <div className="space-y-1.5">
          <Label htmlFor="phone">Teléfono de contacto</Label>
          <Input id="phone" type="tel" placeholder="+54 9 341 500-0000" {...register('phone')} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email de contacto</Label>
          <Input
            id="email"
            type="email"
            placeholder="info@planta.com.ar"
            {...register('email')}
            className={errors.email ? 'border-red-400' : ''}
          />
          {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
            <CheckCircle className="w-4 h-4" />
            Guardado
          </span>
        )}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="px-5 py-2 bg-guay-600 hover:bg-guay-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {mutation.isPending ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
