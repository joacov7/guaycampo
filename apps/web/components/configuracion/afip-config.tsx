'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const afipSchema = z.object({
  cuit: z.string().min(11, 'CUIT inválido').max(13),
  puntoVenta: z.coerce.number().min(1).max(99999),
  ambiente: z.enum(['homologacion', 'produccion']),
  cbu: z.string().optional(),
  certPem: z.string().optional(),
  privateKey: z.string().optional(),
});

type AfipValues = z.infer<typeof afipSchema>;

interface AfipConfig {
  cuit?: string;
  puntoVenta?: number;
  ambiente?: 'homologacion' | 'produccion';
  cbu?: string;
  hasCert?: boolean;
  hasKey?: boolean;
}

interface TestResult {
  ok: boolean;
  message: string;
}

export function AfipConfig() {
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['afip-config'],
    queryFn: () => api.get<AfipConfig>('/auth/tenant/afip'),
    staleTime: 60_000,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AfipValues>({
    resolver: zodResolver(afipSchema),
    values: {
      cuit: data?.cuit ?? '',
      puntoVenta: data?.puntoVenta ?? 1,
      ambiente: data?.ambiente ?? 'homologacion',
      cbu: data?.cbu ?? '',
      certPem: '',
      privateKey: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: AfipValues) => api.patch('/auth/tenant/afip', values),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const testMutation = useMutation({
    mutationFn: () => api.post<TestResult>('/auth/tenant/afip/test', {}),
    onSuccess: (result) => {
      setTestResult(result);
    },
    onError: () => {
      setTestResult({ ok: false, message: 'No se pudo conectar con AFIP' });
    },
  });

  const selectedAmbiente = watch('ambiente');

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
      {/* Datos fiscales */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Datos fiscales</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="cuit">CUIT del emisor *</Label>
            <Input
              id="cuit"
              placeholder="30-12345678-9"
              {...register('cuit')}
              className={errors.cuit ? 'border-red-400' : ''}
            />
            {errors.cuit && <p className="text-xs text-red-600">{errors.cuit.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="puntoVenta">Punto de venta</Label>
            <Input
              id="puntoVenta"
              type="number"
              min={1}
              max={99999}
              {...register('puntoVenta')}
              className={errors.puntoVenta ? 'border-red-400' : ''}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cbu">CBU para FCE</Label>
            <Input
              id="cbu"
              placeholder="0000000000000000000000"
              maxLength={22}
              {...register('cbu')}
            />
            <p className="text-xs text-gray-400">Para Factura de Crédito Electrónica (FCE MiPyME)</p>
          </div>
        </div>
      </div>

      {/* Ambiente */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Ambiente</h3>
        <div className="flex gap-3">
          {(['homologacion', 'produccion'] as const).map((amb) => (
            <button
              key={amb}
              type="button"
              onClick={() => setValue('ambiente', amb)}
              className={cn(
                'flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors',
                selectedAmbiente === amb
                  ? amb === 'produccion'
                    ? 'border-green-400 bg-green-50 text-green-700'
                    : 'border-orange-300 bg-orange-50 text-orange-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300',
              )}
            >
              {amb === 'homologacion' ? 'Homologación (testing)' : 'Producción (real)'}
            </button>
          ))}
        </div>
        {selectedAmbiente === 'produccion' && (
          <p className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Ambiente de producción: las CPE emitidas son reales y tienen efecto legal.
          </p>
        )}
      </div>

      {/* Certificados */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Certificado digital</h3>
        {(data?.hasCert || data?.hasKey) && (
          <p className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
            Certificado cargado. Pegá el nuevo contenido solo si querés reemplazarlo.
          </p>
        )}
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="certPem">Certificado (.pem)</Label>
            <textarea
              id="certPem"
              placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
              rows={4}
              {...register('certPem')}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-guay-500 resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="privateKey">Clave privada (.key)</Label>
            <textarea
              id="privateKey"
              placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
              rows={4}
              {...register('privateKey')}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-guay-500 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Test connection */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <button
          type="button"
          onClick={() => { setTestResult(null); testMutation.mutate(); }}
          disabled={testMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', testMutation.isPending && 'animate-spin')} />
          {testMutation.isPending ? 'Probando...' : 'Probar conexión con AFIP'}
        </button>
        {testResult && (
          <span
            className={cn(
              'flex items-center gap-1.5 text-sm font-medium',
              testResult.ok ? 'text-green-600' : 'text-red-600',
            )}
          >
            {testResult.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {testResult.message}
          </span>
        )}
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
          {mutation.isPending ? 'Guardando...' : 'Guardar configuración AFIP'}
        </button>
      </div>
    </form>
  );
}
