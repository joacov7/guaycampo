'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateContract } from '@/hooks/use-contracts';
import { useClients } from '@/hooks/use-clients';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const schema = z
  .object({
    clientId: z.string().min(1, 'Seleccioná un cliente'),
    commodityId: z.string().min(1, 'Seleccioná un producto'),
    contractType: z.enum(['compra', 'venta', 'canje', 'deposito']),
    priceCondition: z.enum(['fijado', 'a_fijar', 'canje', 'mercado']),
    pricePerTon: z.coerce.number().optional(),
    currency: z.string().default('ARS'),
    quantityTon: z.coerce.number().min(0.01, 'Debe ser mayor a 0'),
    fromDate: z.string().min(1, 'Ingresá la fecha de inicio'),
    toDate: z.string().min(1, 'Ingresá la fecha de fin'),
    notes: z.string().optional(),
  })
  .refine((d) => d.toDate >= d.fromDate, {
    message: 'La fecha de fin debe ser posterior a la fecha de inicio',
    path: ['toDate'],
  });

type FormValues = z.infer<typeof schema>;

interface Commodity {
  id: string;
  name: string;
  code: string;
}

export default function NuevoContratoPage() {
  const router = useRouter();
  const createContract = useCreateContract();

  const { data: clientsData } = useClients({ limit: 200 });
  const clients = clientsData?.data ?? [];

  const { data: commodities = [] } = useQuery<Commodity[]>({
    queryKey: ['commodities'],
    queryFn: () => api.get<Commodity[]>('/commodities'),
    staleTime: 300_000,
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      contractType: 'compra',
      priceCondition: 'fijado',
      currency: 'ARS',
    },
  });

  const priceCondition = watch('priceCondition');

  function onSubmit(values: FormValues) {
    createContract.mutate(
      {
        ...values,
        pricePerTon: values.pricePerTon || undefined,
        notes: values.notes || undefined,
      },
      {
        onSuccess: () => {
          router.push('/dashboard/contratos');
        },
      },
    );
  }

  const isLoading = isSubmitting || createContract.isPending;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/contratos"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Contratos
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-900 font-medium">Nuevo contrato</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-900">Crear contrato</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Completá los datos del contrato de compra/venta de granos.
          </p>
        </div>
        <div className="p-6">
          {createContract.isError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              Error al crear el contrato. Verificá los datos e intentá nuevamente.
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Cliente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente <span className="text-red-500">*</span>
              </label>
              <select
                {...register('clientId')}
                className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
              >
                <option value="">Seleccioná un cliente...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.cuit ? `(${c.cuit})` : ''}
                  </option>
                ))}
              </select>
              {errors.clientId && (
                <p className="mt-1 text-xs text-red-600">{errors.clientId.message}</p>
              )}
            </div>

            {/* Producto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Producto <span className="text-red-500">*</span>
              </label>
              <select
                {...register('commodityId')}
                className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
              >
                <option value="">Seleccioná un producto...</option>
                {commodities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
              {errors.commodityId && (
                <p className="mt-1 text-xs text-red-600">{errors.commodityId.message}</p>
              )}
            </div>

            {/* Tipo de contrato */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de contrato <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['compra', 'venta', 'canje', 'deposito'] as const).map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-guay-300 has-[:checked]:border-guay-500 has-[:checked]:bg-guay-50"
                  >
                    <input
                      type="radio"
                      value={type}
                      {...register('contractType')}
                      className="accent-guay-600"
                    />
                    <span className="text-sm capitalize">
                      {type === 'deposito' ? 'Depósito' : type.charAt(0).toUpperCase() + type.slice(1)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Condición de precio + Precio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condición de precio <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('priceCondition')}
                  className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
                >
                  <option value="fijado">Fijado</option>
                  <option value="a_fijar">A fijar</option>
                  <option value="canje">Canje</option>
                  <option value="mercado">Mercado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio por tonelada {priceCondition === 'fijado' && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('pricePerTon')}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 h-9 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
                  />
                </div>
              </div>
            </div>

            {/* Cantidad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad (toneladas) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...register('quantityTon')}
                  placeholder="0.00"
                  className="w-full px-3 h-9 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
                />
                {errors.quantityTon && (
                  <p className="mt-1 text-xs text-red-600">{errors.quantityTon.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Moneda
                </label>
                <select
                  {...register('currency')}
                  className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
                >
                  <option value="ARS">ARS — Peso argentino</option>
                  <option value="USD">USD — Dólar</option>
                </select>
              </div>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de inicio <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  {...register('fromDate')}
                  className="w-full px-3 h-9 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
                />
                {errors.fromDate && (
                  <p className="mt-1 text-xs text-red-600">{errors.fromDate.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de fin <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  {...register('toDate')}
                  className="w-full px-3 h-9 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
                />
                {errors.toDate && (
                  <p className="mt-1 text-xs text-red-600">{errors.toDate.message}</p>
                )}
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                placeholder="Observaciones adicionales..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Link
                href="/dashboard/contratos"
                className="px-4 py-2 border border-gray-200 hover:border-gray-300 rounded-lg text-sm text-gray-600 transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-guay-600 hover:bg-guay-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:pointer-events-none"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Crear contrato
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
