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
import { cn } from '@/lib/utils';

const operatingParamsSchema = z.object({
  maxQueueWaitMinutes: z.coerce.number().min(1).max(1440),
  qrCheckinWindowMinutes: z.coerce.number().min(5).max(120),
  maxScaleSessionHours: z.coerce.number().min(1).max(48),
  maxTrucksInPlant: z.coerce.number().min(1).max(500),
  moduleLab: z.boolean(),
  moduleSilosIot: z.boolean(),
  moduleAfip: z.boolean(),
  moduleWhatsapp: z.boolean(),
  operatingDays: z.object({
    monday: z.boolean(),
    tuesday: z.boolean(),
    wednesday: z.boolean(),
    thursday: z.boolean(),
    friday: z.boolean(),
    saturday: z.boolean(),
    sunday: z.boolean(),
  }),
  operatingHoursFrom: z.string(),
  operatingHoursTo: z.string(),
});

type OperatingParamsValues = z.infer<typeof operatingParamsSchema>;

const DAY_LABELS: { key: keyof OperatingParamsValues['operatingDays']; label: string; short: string }[] = [
  { key: 'monday', label: 'Lunes', short: 'L' },
  { key: 'tuesday', label: 'Martes', short: 'M' },
  { key: 'wednesday', label: 'Miércoles', short: 'X' },
  { key: 'thursday', label: 'Jueves', short: 'J' },
  { key: 'friday', label: 'Viernes', short: 'V' },
  { key: 'saturday', label: 'Sábado', short: 'S' },
  { key: 'sunday', label: 'Domingo', short: 'D' },
];

const MODULE_OPTIONS: { key: keyof Pick<OperatingParamsValues, 'moduleLab' | 'moduleSilosIot' | 'moduleAfip' | 'moduleWhatsapp'>; label: string; description: string }[] = [
  { key: 'moduleLab', label: 'Laboratorio', description: 'Análisis de calidad en cada pesaje' },
  { key: 'moduleSilosIot', label: 'Silos IoT', description: 'Monitoreo de temperatura y humedad' },
  { key: 'moduleAfip', label: 'AFIP / CPE', description: 'Carta de Porte Electrónica automática' },
  { key: 'moduleWhatsapp', label: 'WhatsApp', description: 'Notificaciones a conductores y productores' },
];

interface OperatingConfig {
  maxQueueWaitMinutes?: number;
  qrCheckinWindowMinutes?: number;
  maxScaleSessionHours?: number;
  maxTrucksInPlant?: number;
  moduleLab?: boolean;
  moduleSilosIot?: boolean;
  moduleAfip?: boolean;
  moduleWhatsapp?: boolean;
  operatingDays?: Partial<OperatingParamsValues['operatingDays']>;
  operatingHoursFrom?: string;
  operatingHoursTo?: string;
}

export function OperatingParams() {
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['operating-params'],
    queryFn: () => api.get<OperatingConfig>('/auth/tenant/config'),
    staleTime: 60_000,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OperatingParamsValues>({
    resolver: zodResolver(operatingParamsSchema),
    values: {
      maxQueueWaitMinutes: data?.maxQueueWaitMinutes ?? 30,
      qrCheckinWindowMinutes: data?.qrCheckinWindowMinutes ?? 30,
      maxScaleSessionHours: data?.maxScaleSessionHours ?? 8,
      maxTrucksInPlant: data?.maxTrucksInPlant ?? 20,
      moduleLab: data?.moduleLab ?? true,
      moduleSilosIot: data?.moduleSilosIot ?? false,
      moduleAfip: data?.moduleAfip ?? true,
      moduleWhatsapp: data?.moduleWhatsapp ?? false,
      operatingDays: {
        monday: data?.operatingDays?.monday ?? true,
        tuesday: data?.operatingDays?.tuesday ?? true,
        wednesday: data?.operatingDays?.wednesday ?? true,
        thursday: data?.operatingDays?.thursday ?? true,
        friday: data?.operatingDays?.friday ?? true,
        saturday: data?.operatingDays?.saturday ?? false,
        sunday: data?.operatingDays?.sunday ?? false,
      },
      operatingHoursFrom: data?.operatingHoursFrom ?? '07:00',
      operatingHoursTo: data?.operatingHoursTo ?? '18:00',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: OperatingParamsValues) => api.patch('/auth/tenant/config', values),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const operatingDays = watch('operatingDays');

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
      {/* Tiempos */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Tiempos operativos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="maxQueueWaitMinutes">Alerta de espera en cola (minutos)</Label>
            <Input
              id="maxQueueWaitMinutes"
              type="number"
              min={1}
              max={1440}
              {...register('maxQueueWaitMinutes')}
              className={errors.maxQueueWaitMinutes ? 'border-red-400' : ''}
            />
            <p className="text-xs text-gray-400">Si un camión espera más de este tiempo, se genera una alerta</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qrCheckinWindowMinutes">Ventana de check-in QR (±minutos)</Label>
            <Input
              id="qrCheckinWindowMinutes"
              type="number"
              min={5}
              max={120}
              {...register('qrCheckinWindowMinutes')}
            />
            <p className="text-xs text-gray-400">Margen de tiempo antes y después del horario del turno</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="maxScaleSessionHours">Tiempo máximo entre pesajes (horas)</Label>
            <Input
              id="maxScaleSessionHours"
              type="number"
              min={1}
              max={48}
              {...register('maxScaleSessionHours')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="maxTrucksInPlant">Capacidad máxima en planta (camiones)</Label>
            <Input
              id="maxTrucksInPlant"
              type="number"
              min={1}
              max={500}
              {...register('maxTrucksInPlant')}
            />
          </div>
        </div>
      </div>

      {/* Módulos */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Módulos habilitados</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MODULE_OPTIONS.map((mod) => {
            const value = watch(mod.key);
            return (
              <div
                key={mod.key}
                className={cn(
                  'flex items-start justify-between p-3 rounded-lg border transition-colors',
                  value ? 'border-guay-200 bg-guay-50' : 'border-gray-200 bg-gray-50',
                )}
              >
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-sm font-medium text-gray-900">{mod.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{mod.description}</p>
                </div>
                <label className="relative flex-shrink-0 cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    {...register(mod.key)}
                  />
                  <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-guay-500 transition-colors" />
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {/* Días y horarios */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Días y horarios de operación</h3>
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {DAY_LABELS.map((day) => {
              const isActive = operatingDays?.[day.key] ?? false;
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => setValue(`operatingDays.${day.key}`, !isActive)}
                  className={cn(
                    'w-10 h-10 rounded-full text-sm font-semibold transition-colors',
                    isActive
                      ? 'bg-guay-600 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
                  )}
                  title={day.label}
                >
                  {day.short}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <div className="space-y-1">
              <Label htmlFor="operatingHoursFrom">Desde</Label>
              <Input
                id="operatingHoursFrom"
                type="time"
                {...register('operatingHoursFrom')}
                className="w-32"
              />
            </div>
            <span className="text-gray-400 mt-5">—</span>
            <div className="space-y-1">
              <Label htmlFor="operatingHoursTo">Hasta</Label>
              <Input
                id="operatingHoursTo"
                type="time"
                {...register('operatingHoursTo')}
                className="w-32"
              />
            </div>
          </div>
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
          {mutation.isPending ? 'Guardando...' : 'Guardar parámetros'}
        </button>
      </div>
    </form>
  );
}
