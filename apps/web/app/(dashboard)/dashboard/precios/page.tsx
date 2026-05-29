'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import {
  TrendingUp,
  Plus,
  RefreshCw,
  Loader2,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  usePrices,
  useCurrentPrices,
  usePriceHistory,
  useCreatePrice,
  useUpdatePrice,
  useDeactivatePrice,
  type Price,
  type PriceCondition,
  type PriceCurrency,
} from '@/hooks/use-prices';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Commodity {
  id: string;
  name: string;
  code: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CONDITION_LABELS: Record<PriceCondition, string> = {
  pizarra: 'Pizarra',
  forward: 'Forward',
  spot: 'Spot',
  canje: 'Canje',
  fijacion: 'Fijación',
};

const CONDITION_COLORS: Record<PriceCondition, string> = {
  pizarra: '#16a34a',
  forward: '#2563eb',
  spot: '#d97706',
  canje: '#7c3aed',
  fijacion: '#dc2626',
};

const ALL_CONDITIONS: Array<{ value: PriceCondition | ''; label: string }> = [
  { value: '', label: 'Todas las condiciones' },
  { value: 'pizarra', label: 'Pizarra' },
  { value: 'forward', label: 'Forward' },
  { value: 'spot', label: 'Spot' },
  { value: 'canje', label: 'Canje' },
  { value: 'fijacion', label: 'Fijación' },
];

// ─── Zod schema ──────────────────────────────────────────────────────────────

const createPriceSchema = z.object({
  commodityId: z.string().min(1, 'Seleccioná un producto'),
  condition: z.enum(['pizarra', 'forward', 'spot', 'canje', 'fijacion'], {
    required_error: 'Seleccioná una condición',
  }),
  pricePerTon: z.coerce.number().min(0.01, 'El precio debe ser mayor a 0'),
  currency: z.enum(['ARS', 'USD']),
  validFrom: z.string().min(1, 'Ingresá la fecha de inicio'),
  validUntil: z.string().optional(),
  deliveryMonths: z.string().optional(),
  notes: z.string().optional(),
});

type CreatePriceFormValues = z.infer<typeof createPriceSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | Date) {
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: es });
  } catch {
    return String(dateStr);
  }
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

// ─── Pizarra Cards ────────────────────────────────────────────────────────────

function PizarraSection({ onRefresh }: { onRefresh: () => void }) {
  const { data: groups = [], isLoading, isRefetching } = useCurrentPrices();

  const allPrices = groups.flatMap((g) => g.prices);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Pizarra actual
        </h2>
        <button
          onClick={onRefresh}
          disabled={isRefetching}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-guay-600 transition-colors"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isRefetching && 'animate-spin')} />
          Actualizar
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : allPrices.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <TrendingUp className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Sin precios configurados</p>
          <p className="text-sm text-gray-400 mt-1">Cargá la primera cotización para comenzar</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {allPrices.map((price) => (
            <div
              key={price.id}
              className="bg-white rounded-xl border border-gray-200 p-4 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500 truncate">
                  {price.commodityName}
                </p>
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: `${CONDITION_COLORS[price.condition as PriceCondition]}20`,
                    color: CONDITION_COLORS[price.condition as PriceCondition],
                  }}
                >
                  {CONDITION_LABELS[price.condition as PriceCondition]}
                </span>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {formatPrice(price.pricePerTon, price.currency)}
              </p>
              <p className="text-xs text-gray-400">/ tn &bull; {price.currency}</p>
              <p className="text-xs text-gray-400">
                Vigente desde {formatDate(price.validFrom)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── History chart ────────────────────────────────────────────────────────────

function HistoryChart({ commodities }: { commodities: Commodity[] }) {
  const [selectedCommodityId, setSelectedCommodityId] = useState<string>(
    commodities[0]?.id ?? '',
  );
  const [days, setDays] = useState<number>(30);

  const { data: history = [], isLoading } = usePriceHistory(selectedCommodityId, days);

  // Build chart data — one row per date, one key per condition
  const chartData = history.reduce<Record<string, Record<string, unknown>>>((acc, point) => {
    const dateKey = format(new Date(point.recordedAt), 'dd/MM');
    if (!acc[dateKey]) acc[dateKey] = { date: dateKey };
    acc[dateKey][point.condition] = point.pricePerTon;
    return acc;
  }, {});

  const chartRows = Object.values(chartData);
  const conditions = [...new Set(history.map((h) => h.condition))];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Evolución de precios
        </h2>
        <div className="flex gap-2">
          <select
            value={selectedCommodityId}
            onChange={(e) => setSelectedCommodityId(e.target.value)}
            className="h-8 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
          >
            {commodities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="h-8 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
          >
            <option value={30}>Últimos 30 días</option>
            <option value={60}>Últimos 60 días</option>
            <option value={90}>Últimos 90 días</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-guay-500" />
        </div>
      ) : chartRows.length === 0 ? (
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-400 text-sm">Sin historial para el período seleccionado</p>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartRows} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) =>
                  new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(v)
                }
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatPrice(value, 'ARS'),
                  CONDITION_LABELS[name as PriceCondition] ?? name,
                ]}
              />
              <Legend
                formatter={(value: string) =>
                  CONDITION_LABELS[value as PriceCondition] ?? value
                }
              />
              {conditions.map((cond) => (
                <Line
                  key={cond}
                  type="monotone"
                  dataKey={cond}
                  stroke={CONDITION_COLORS[cond as PriceCondition] ?? '#6b7280'}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Create price modal ───────────────────────────────────────────────────────

function CreatePriceModal({
  commodities,
  onClose,
}: {
  commodities: Commodity[];
  onClose: () => void;
}) {
  const createPrice = useCreatePrice();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreatePriceFormValues>({
    resolver: zodResolver(createPriceSchema),
    defaultValues: {
      currency: 'ARS',
      condition: 'pizarra',
      validFrom: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  const condition = watch('condition');

  async function onSubmit(values: CreatePriceFormValues) {
    await createPrice.mutateAsync({
      commodityId: values.commodityId,
      condition: values.condition,
      pricePerTon: values.pricePerTon,
      currency: values.currency as PriceCurrency,
      validFrom: values.validFrom,
      validUntil: values.validUntil || undefined,
      deliveryMonths: values.deliveryMonths || undefined,
      notes: values.notes || undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Nueva cotización</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {/* Producto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
            <select
              {...register('commodityId')}
              className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
            >
              <option value="">Seleccioná un producto</option>
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

          {/* Condición */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Condición</label>
            <select
              {...register('condition')}
              className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
            >
              <option value="pizarra">Pizarra</option>
              <option value="forward">Forward</option>
              <option value="spot">Spot</option>
              <option value="canje">Canje</option>
              <option value="fijacion">Fijación</option>
            </select>
            {errors.condition && (
              <p className="mt-1 text-xs text-red-600">{errors.condition.message}</p>
            )}
          </div>

          {/* Precio + Moneda */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio por tonelada
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('pricePerTon')}
                placeholder="0.00"
                className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
              />
              {errors.pricePerTon && (
                <p className="mt-1 text-xs text-red-600">{errors.pricePerTon.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
              <select
                {...register('currency')}
                className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Válido desde</label>
              <input
                type="date"
                {...register('validFrom')}
                className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
              />
              {errors.validFrom && (
                <p className="mt-1 text-xs text-red-600">{errors.validFrom.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Válido hasta <span className="text-gray-400">(opcional)</span>
              </label>
              <input
                type="date"
                {...register('validUntil')}
                className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
              />
            </div>
          </div>

          {/* Meses de entrega (solo forward) */}
          {condition === 'forward' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meses de entrega
              </label>
              <input
                type="text"
                {...register('deliveryMonths')}
                placeholder="Ej: Julio 2025, Agosto 2025"
                className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
              />
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas <span className="text-gray-400">(opcional)</span>
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Observaciones adicionales..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500 resize-none"
            />
          </div>

          {/* Error message */}
          {createPrice.isError && (
            <p className="text-sm text-red-600">
              Error al crear la cotización. Intentá de nuevo.
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || createPrice.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-guay-600 hover:bg-guay-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
            >
              {(isSubmitting || createPrice.isPending) && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Guardar cotización
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit price modal ─────────────────────────────────────────────────────────

function EditPriceModal({
  price,
  onClose,
}: {
  price: Price;
  onClose: () => void;
}) {
  const updatePrice = useUpdatePrice();

  const editSchema = z.object({
    pricePerTon: z.coerce.number().min(0.01, 'El precio debe ser mayor a 0'),
    validUntil: z.string().optional(),
    notes: z.string().optional(),
  });

  type EditFormValues = z.infer<typeof editSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      pricePerTon: price.pricePerTon,
      validUntil: price.validUntil
        ? format(new Date(price.validUntil), 'yyyy-MM-dd')
        : '',
      notes: price.notes ?? '',
    },
  });

  async function onSubmit(values: EditFormValues) {
    await updatePrice.mutateAsync({
      id: price.id,
      data: {
        pricePerTon: values.pricePerTon,
        validUntil: values.validUntil || undefined,
        notes: values.notes || undefined,
      },
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Editar precio</h2>
            <p className="text-sm text-gray-500">
              {price.commodityName} &bull; {CONDITION_LABELS[price.condition as PriceCondition]}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Precio por tonelada ({price.currency})
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('pricePerTon')}
              className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
            />
            {errors.pricePerTon && (
              <p className="mt-1 text-xs text-red-600">{errors.pricePerTon.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Válido hasta <span className="text-gray-400">(opcional)</span>
            </label>
            <input
              type="date"
              {...register('validUntil')}
              className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas <span className="text-gray-400">(opcional)</span>
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500 resize-none"
            />
          </div>

          {updatePrice.isError && (
            <p className="text-sm text-red-600">Error al actualizar. Intentá de nuevo.</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || updatePrice.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-guay-600 hover:bg-guay-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
            >
              {(isSubmitting || updatePrice.isPending) && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Price table ──────────────────────────────────────────────────────────────

function PriceTable({
  commodities,
  onNew,
}: {
  commodities: Commodity[];
  onNew: () => void;
}) {
  const [conditionFilter, setConditionFilter] = useState<PriceCondition | ''>('');
  const [editingPrice, setEditingPrice] = useState<Price | null>(null);
  const deactivate = useDeactivatePrice();

  const { data: prices = [], isLoading } = usePrices({
    condition: conditionFilter || undefined,
  });

  async function handleDeactivate(id: string) {
    if (!confirm('¿Desactivar este precio?')) return;
    await deactivate.mutateAsync(id);
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Listado de precios
          </h2>
          <div className="flex gap-2">
            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value as PriceCondition | '')}
              className="h-8 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
            >
              {ALL_CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <button
              onClick={onNew}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-guay-600 hover:bg-guay-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nueva cotización</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-guay-500" />
          </div>
        ) : prices.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <TrendingUp className="w-10 h-10 text-gray-200 mx-auto" />
            <div>
              <p className="text-gray-600 font-medium">Sin cotizaciones</p>
              <p className="text-sm text-gray-400 mt-1">Cargá la primera cotización</p>
            </div>
            <button
              onClick={onNew}
              className="inline-flex items-center gap-2 px-4 py-2 bg-guay-600 hover:bg-guay-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nueva cotización
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-3 font-medium text-gray-500">Producto</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500">Condición</th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 whitespace-nowrap">
                    Precio / tn
                  </th>
                  <th className="text-center py-3 px-3 font-medium text-gray-500">Moneda</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 hidden md:table-cell whitespace-nowrap">
                    Válido desde
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 hidden md:table-cell whitespace-nowrap">
                    Válido hasta
                  </th>
                  <th className="text-center py-3 px-3 font-medium text-gray-500 hidden sm:table-cell">
                    Activo
                  </th>
                  <th className="text-center py-3 px-3 font-medium text-gray-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {prices.map((price) => (
                  <tr key={price.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-3 font-medium text-gray-900">{price.commodityName}</td>
                    <td className="py-3 px-3">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${CONDITION_COLORS[price.condition as PriceCondition]}20`,
                          color: CONDITION_COLORS[price.condition as PriceCondition],
                        }}
                      >
                        {CONDITION_LABELS[price.condition as PriceCondition]}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                      {new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(
                        price.pricePerTon,
                      )}
                    </td>
                    <td className="py-3 px-3 text-center text-gray-600">{price.currency}</td>
                    <td className="py-3 px-3 text-gray-500 hidden md:table-cell whitespace-nowrap">
                      {formatDate(price.validFrom)}
                    </td>
                    <td className="py-3 px-3 text-gray-500 hidden md:table-cell whitespace-nowrap">
                      {price.validUntil ? formatDate(price.validUntil) : '—'}
                    </td>
                    <td className="py-3 px-3 text-center hidden sm:table-cell">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          price.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500',
                        )}
                      >
                        {price.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingPrice(price)}
                          className="text-xs text-guay-600 hover:text-guay-800 font-medium px-2 py-1 hover:bg-guay-50 rounded transition-colors"
                        >
                          Editar
                        </button>
                        {price.isActive && (
                          <button
                            onClick={() => handleDeactivate(price.id)}
                            disabled={deactivate.isPending}
                            className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 hover:bg-red-50 rounded transition-colors"
                          >
                            Desactivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingPrice && (
        <EditPriceModal price={editingPrice} onClose={() => setEditingPrice(null)} />
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PreciosPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: commodities = [] } = useQuery<Commodity[]>({
    queryKey: ['commodities'],
    queryFn: () => api.get<Commodity[]>('/commodities'),
    staleTime: 300_000,
  });

  const { refetch: refetchCurrent } = useCurrentPrices();

  function handleRefresh() {
    void refetchCurrent();
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Precios y Cotizaciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gestión de pizarra de precios por commodity
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-guay-600 hover:bg-guay-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nueva cotización</span>
          <span className="sm:hidden">Nueva</span>
        </button>
      </div>

      {/* Pizarra actual */}
      <PizarraSection onRefresh={handleRefresh} />

      {/* History chart */}
      {commodities.length > 0 && <HistoryChart commodities={commodities} />}

      {/* Price list table */}
      <PriceTable commodities={commodities} onNew={() => setShowCreateModal(true)} />

      {/* Create modal */}
      {showCreateModal && (
        <CreatePriceModal
          commodities={commodities}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
