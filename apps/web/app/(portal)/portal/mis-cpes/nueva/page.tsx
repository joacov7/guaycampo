'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, AlertTriangle, Copy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ITruckShift } from '@guaycampo/shared-types';

const CULTIVOS = ['Soja', 'Maíz', 'Trigo', 'Girasol', 'Sorgo', 'Cebada', 'Otro'];
const COSECHAS = ['2024/25', '2023/24', '2022/23', '2021/22'];

const CPE_TYPES = [
  { value: 'primaria', label: 'Primaria', description: 'Del campo al primer destino' },
  { value: 'secundaria', label: 'Secundaria', description: 'Del acopio al destino final' },
  { value: 'retiro', label: 'Retiro de planta', description: 'Retiro desde el acopio' },
] as const;

const cpeSchema = z.object({
  cpeType: z.enum(['primaria', 'secundaria', 'retiro']),
  plate: z.string().min(6, 'Patente inválida').max(8),
  transporterName: z.string().min(2, 'Ingresá el nombre del transportista'),
  transporterCuit: z.string().min(11, 'CUIT inválido').max(13),
  origin: z.string().min(2, 'Ingresá el origen'),
  destination: z.string().min(2, 'Ingresá el destino'),
  destinationCuit: z.string().min(11, 'CUIT del destinatario inválido').max(13),
  commodity: z.string().min(1, 'Seleccioná el cultivo'),
  harvest: z.string().min(1, 'Seleccioná la cosecha'),
  estimatedKg: z.coerce.number().min(100, 'Peso mínimo 100 kg').max(60000, 'Peso máximo 60.000 kg'),
  shiftId: z.string().optional(),
});

type CpeFormValues = z.infer<typeof cpeSchema>;

interface CpeCreatedResult {
  id: string;
  cpeNumber: string;
  status: string;
}

export default function NuevaCpePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shiftId = searchParams.get('shiftId') ?? undefined;

  const [result, setResult] = useState<CpeCreatedResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Pre-fill from shift if shiftId is provided
  const { data: shiftData } = useQuery({
    queryKey: ['shift-for-cpe', shiftId],
    queryFn: () => api.get<ITruckShift & { vehicle?: { plate: string } }>(`/trucks/shifts/${shiftId}`),
    enabled: Boolean(shiftId),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CpeFormValues>({
    resolver: zodResolver(cpeSchema),
    defaultValues: {
      cpeType: 'primaria',
      shiftId,
    },
    values: shiftData
      ? {
          cpeType: 'primaria',
          plate: shiftData.vehicle?.plate ?? '',
          transporterName: '',
          transporterCuit: '',
          origin: '',
          destination: '',
          destinationCuit: '',
          commodity: '',
          harvest: '',
          estimatedKg: shiftData.estimatedQty ?? 0,
          shiftId,
        }
      : undefined,
  });

  const createMutation = useMutation({
    mutationFn: (data: CpeFormValues) =>
      api.post<CpeCreatedResult>('/trucks/shifts/cpes', data),
    onSuccess: (res) => {
      setResult(res);
    },
  });

  const selectedCpeType = watch('cpeType');

  function handleCopyNumber() {
    if (!result) return;
    void navigator.clipboard.writeText(result.cpeNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (result) {
    return (
      <div className="max-w-md mx-auto animate-fade-in">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle className="w-7 h-7 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">CPE enviada a AFIP</h2>
            <p className="text-sm text-gray-500 mt-1">
              Tu carta de porte fue registrada. Guardá el número oficial.
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Número de CPE</p>
            <div className="flex items-center justify-center gap-2">
              <code className="font-mono text-lg font-bold text-gray-900">{result.cpeNumber}</code>
              <button
                onClick={handleCopyNumber}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Estado:{' '}
              <span className="font-medium text-blue-600 capitalize">{result.status}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setResult(null); router.push('/portal/mis-cpes/nueva'); }}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Nueva CPE
            </button>
            <button
              onClick={() => router.push('/portal/mis-cpes')}
              className="flex-1 py-2.5 bg-guay-600 text-white rounded-lg text-sm font-medium hover:bg-guay-700"
            >
              Ver mis CPEs
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          href="/portal/mis-cpes"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Mis CPEs
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-900 font-medium">Nueva CPE</span>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-2.5 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>
          La CPE será enviada a AFIP automáticamente al confirmar.
          Verificá todos los datos antes de continuar — no se puede modificar una vez emitida.
        </span>
      </div>

      <form
        onSubmit={handleSubmit((data) => createMutation.mutate(data))}
        className="space-y-5"
      >
        {/* Tipo de CPE */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Tipo de Carta de Porte</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {CPE_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setValue('cpeType', type.value)}
                className={cn(
                  'text-left p-3 rounded-lg border-2 transition-colors',
                  selectedCpeType === type.value
                    ? 'border-guay-500 bg-guay-50'
                    : 'border-gray-200 hover:border-gray-300',
                )}
              >
                <p className={cn(
                  'text-sm font-semibold',
                  selectedCpeType === type.value ? 'text-guay-700' : 'text-gray-900',
                )}>
                  {type.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{type.description}</p>
              </button>
            ))}
          </div>
          {errors.cpeType && <p className="text-xs text-red-600">{errors.cpeType.message}</p>}
        </div>

        {/* Transporte */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Datos del transporte</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="plate">Patente del camión *</Label>
              <Input
                id="plate"
                placeholder="ABC123 o AB123CD"
                {...register('plate')}
                className={errors.plate ? 'border-red-400' : ''}
              />
              {errors.plate && <p className="text-xs text-red-600">{errors.plate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="transporterName">Razón social del transportista *</Label>
              <Input
                id="transporterName"
                placeholder="Ej: Transportes García S.R.L."
                {...register('transporterName')}
                className={errors.transporterName ? 'border-red-400' : ''}
              />
              {errors.transporterName && <p className="text-xs text-red-600">{errors.transporterName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="transporterCuit">CUIT del transportista *</Label>
              <Input
                id="transporterCuit"
                placeholder="20-12345678-9"
                {...register('transporterCuit')}
                className={errors.transporterCuit ? 'border-red-400' : ''}
              />
              {errors.transporterCuit && <p className="text-xs text-red-600">{errors.transporterCuit.message}</p>}
            </div>
          </div>
        </div>

        {/* Origen y destino */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Origen y destino</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="origin">Origen *</Label>
              <Input
                id="origin"
                placeholder="Localidad / Establecimiento"
                {...register('origin')}
                className={errors.origin ? 'border-red-400' : ''}
              />
              {errors.origin && <p className="text-xs text-red-600">{errors.origin.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="destination">Destino *</Label>
              <Input
                id="destination"
                placeholder="Localidad / Empresa"
                {...register('destination')}
                className={errors.destination ? 'border-red-400' : ''}
              />
              {errors.destination && <p className="text-xs text-red-600">{errors.destination.message}</p>}
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="destinationCuit">CUIT del destinatario *</Label>
              <Input
                id="destinationCuit"
                placeholder="30-12345678-9"
                {...register('destinationCuit')}
                className={errors.destinationCuit ? 'border-red-400' : ''}
              />
              {errors.destinationCuit && <p className="text-xs text-red-600">{errors.destinationCuit.message}</p>}
            </div>
          </div>
        </div>

        {/* Grano */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Grano y cosecha</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="commodity">Cultivo *</Label>
              <select
                id="commodity"
                {...register('commodity')}
                className={cn(
                  'w-full h-10 rounded-md border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500',
                  errors.commodity ? 'border-red-400' : 'border-gray-200',
                )}
              >
                <option value="">— Seleccionar —</option>
                {CULTIVOS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {errors.commodity && <p className="text-xs text-red-600">{errors.commodity.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="harvest">Cosecha *</Label>
              <select
                id="harvest"
                {...register('harvest')}
                className={cn(
                  'w-full h-10 rounded-md border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500',
                  errors.harvest ? 'border-red-400' : 'border-gray-200',
                )}
              >
                <option value="">— Seleccionar —</option>
                {COSECHAS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {errors.harvest && <p className="text-xs text-red-600">{errors.harvest.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="estimatedKg">Kg estimados *</Label>
              <Input
                id="estimatedKg"
                type="number"
                min={100}
                max={60000}
                step={100}
                placeholder="Ej: 28000"
                {...register('estimatedKg')}
                className={errors.estimatedKg ? 'border-red-400' : ''}
              />
              {errors.estimatedKg && <p className="text-xs text-red-600">{errors.estimatedKg.message}</p>}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 justify-end">
          <Link
            href="/portal/mis-cpes"
            className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-6 py-2.5 bg-guay-600 hover:bg-guay-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {createMutation.isPending ? 'Enviando a AFIP...' : 'Confirmar y emitir CPE'}
          </button>
        </div>

        {createMutation.isError && (
          <p className="text-sm text-red-600 text-center">
            Error al emitir la CPE. Verificá los datos e intentá de nuevo.
          </p>
        )}
      </form>
    </div>
  );
}
