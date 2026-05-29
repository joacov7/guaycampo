'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Flame, Plus, CheckCircle, XCircle, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import {
  useDryingBatches,
  useDryingStats,
  useDryers,
  useCreateDryingBatch,
  useFinishDryingBatch,
  useCancelDryingBatch,
} from '@/hooks/use-drying';
import type { DryingBatch } from '@/hooks/use-drying';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import type { IClient, ICommodity } from '@guaycampo/shared-types';

// -----------------------------------------------------------------------------
// Number formatter
// -----------------------------------------------------------------------------

const numFmt = new Intl.NumberFormat('es-AR');
const numFmt2 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// -----------------------------------------------------------------------------
// Zod schemas
// -----------------------------------------------------------------------------

const createBatchSchema = z.object({
  dryerId: z.string().optional(),
  scaleTicketId: z.string().optional(),
  clientId: z.string().min(1, 'Requerido'),
  commodityId: z.string().min(1, 'Requerido'),
  inputWeightKg: z.coerce.number().min(0, 'Debe ser mayor a 0'),
  inputHumidityPct: z.coerce.number().min(0).max(50, 'Entre 0 y 50'),
  targetHumidityPct: z.coerce.number().min(0).max(50).optional(),
  costPerTon: z.coerce.number().optional(),
  notes: z.string().optional(),
});

const finishBatchSchema = z.object({
  outputWeightKg: z.coerce.number().min(0, 'Debe ser mayor a 0'),
  outputHumidityPct: z.coerce.number().min(0).max(50, 'Entre 0 y 50'),
  costPerTon: z.coerce.number().optional(),
});

type CreateBatchFormValues = z.infer<typeof createBatchSchema>;
type FinishBatchFormValues = z.infer<typeof finishBatchSchema>;

// -----------------------------------------------------------------------------
// Status badge
// -----------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  if (status === 'en_proceso') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">
        <Clock className="w-3 h-3" />
        En proceso
      </span>
    );
  }
  if (status === 'completado') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
        <CheckCircle className="w-3 h-3" />
        Completado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
      <XCircle className="w-3 h-3" />
      Cancelado
    </span>
  );
}

// -----------------------------------------------------------------------------
// Stat card
// -----------------------------------------------------------------------------

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default function SecadoPage() {
  // Filters state
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [clientFilter, setClientFilter] = useState<string>('');
  const [commodityFilter, setCommodityFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [finishBatch, setFinishBatch] = useState<DryingBatch | null>(null);

  // Data
  const { data: batches, isLoading: batchesLoading } = useDryingBatches({
    status: statusFilter || undefined,
    clientId: clientFilter || undefined,
    commodityId: commodityFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });
  const { data: stats, isLoading: statsLoading } = useDryingStats();
  const { data: dryers } = useDryers();
  const { data: clients } = useQuery<IClient[]>({
    queryKey: ['clients-all'],
    queryFn: () => api.get<IClient[]>('/clients', { params: { limit: 200 } }).then(
      (res: unknown) => {
        if (res && typeof res === 'object' && 'data' in res) {
          return (res as { data: IClient[] }).data;
        }
        return res as IClient[];
      }
    ),
    staleTime: 5 * 60_000,
  });
  const { data: commodities } = useQuery<ICommodity[]>({
    queryKey: ['commodities'],
    queryFn: () => api.get<ICommodity[]>('/commodities'),
    staleTime: 5 * 60_000,
  });

  const createMutation = useCreateDryingBatch();
  const finishMutation = useFinishDryingBatch();
  const cancelMutation = useCancelDryingBatch();

  // Create form
  const createForm = useForm<CreateBatchFormValues>({
    resolver: zodResolver(createBatchSchema),
    defaultValues: { targetHumidityPct: 14 },
  });

  // Finish form
  const finishForm = useForm<FinishBatchFormValues>({
    resolver: zodResolver(finishBatchSchema),
  });

  // Watch for merma preview in finish modal
  const watchedOutput = finishForm.watch('outputWeightKg');
  const mermaPreview =
    finishBatch && watchedOutput && Number(finishBatch.input_weight_kg) > 0
      ? (((Number(finishBatch.input_weight_kg) - watchedOutput) /
          Number(finishBatch.input_weight_kg)) *
          100)
      : null;

  // Reset finish form when batch changes
  useEffect(() => {
    finishForm.reset();
  }, [finishBatch, finishForm]);

  // Handlers
  function handleCreateSubmit(values: CreateBatchFormValues) {
    createMutation.mutate(
      {
        dryerId: values.dryerId || undefined,
        scaleTicketId: values.scaleTicketId || undefined,
        clientId: values.clientId,
        commodityId: values.commodityId,
        inputWeightKg: values.inputWeightKg,
        inputHumidityPct: values.inputHumidityPct,
        targetHumidityPct: values.targetHumidityPct,
        costPerTon: values.costPerTon,
        notes: values.notes,
      },
      {
        onSuccess: () => {
          setShowCreateModal(false);
          createForm.reset();
        },
      },
    );
  }

  function handleFinishSubmit(values: FinishBatchFormValues) {
    if (!finishBatch) return;
    finishMutation.mutate(
      {
        id: finishBatch.id,
        payload: {
          outputWeightKg: values.outputWeightKg,
          outputHumidityPct: values.outputHumidityPct,
          costPerTon: values.costPerTon,
        },
      },
      {
        onSuccess: () => {
          setFinishBatch(null);
          finishForm.reset();
        },
      },
    );
  }

  function handleCancel(id: string) {
    cancelMutation.mutate(id);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-50 rounded-lg">
            <Flame className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Secado</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gestión de lotes de secado de granos</p>
          </div>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo lote
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))
        ) : (
          <>
            <StatCard label="Lotes hoy" value={stats?.batchesToday ?? 0} />
            <StatCard
              label="Merma promedio"
              value={
                stats?.avgShrinkagePct != null
                  ? `${numFmt2.format(stats.avgShrinkagePct)} %`
                  : '—'
              }
              sub="sobre lotes completados"
            />
            <StatCard
              label="Kg procesados (30d)"
              value={numFmt.format(Math.round(stats?.totalKgProcessed30d ?? 0))}
              sub="kg entrada"
            />
            <StatCard
              label="Lotes en proceso"
              value={stats?.activeBatches ?? 0}
            />
          </>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3">
          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los estados</SelectItem>
              <SelectItem value="en_proceso">En proceso</SelectItem>
              <SelectItem value="completado">Completado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          {/* Client filter */}
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Todos los clientes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los clientes</SelectItem>
              {clients?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Commodity filter */}
          <Select value={commodityFilter} onValueChange={setCommodityFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Todos los productos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los productos</SelectItem>
              {commodities?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-36 text-sm"
              placeholder="Desde"
            />
            <span className="text-gray-400 text-sm">—</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-36 text-sm"
              placeholder="Hasta"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {batchesLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !batches || batches.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Flame className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="text-sm">No hay lotes de secado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Lote</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Secadora</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Producto</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Kg entrada</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Humedad entrada → salida</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Merma %</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {batches.map((batch) => (
                  <tr
                    key={batch.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-medium text-gray-900">
                      {batch.batch_number}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {batch.dryer_name ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{batch.client_name}</td>
                    <td className="px-4 py-3 text-gray-700">{batch.commodity_name}</td>
                    <td className="px-4 py-3 text-right text-gray-700 font-medium">
                      {numFmt.format(Number(batch.input_weight_kg))}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {numFmt2.format(Number(batch.input_humidity_pct))}%
                      {batch.output_humidity_pct != null ? (
                        <> → {numFmt2.format(Number(batch.output_humidity_pct))}%</>
                      ) : (
                        <span className="text-gray-300"> → —</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {batch.shrinkage_pct != null ? (
                        <span className={Number(batch.shrinkage_pct) > 5 ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                          {numFmt2.format(Number(batch.shrinkage_pct))}%
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={batch.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(batch.started_at).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-4 py-3">
                      {batch.status === 'en_proceso' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setFinishBatch(batch)}
                            className="text-xs text-green-600 hover:text-green-800 font-medium transition-colors"
                          >
                            Finalizar
                          </button>
                          <button
                            onClick={() => handleCancel(batch.id)}
                            disabled={cancelMutation.isPending}
                            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Modal: Nuevo lote                                                   */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo lote de secado</DialogTitle>
          </DialogHeader>

          <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
            {/* Secadora */}
            <div className="space-y-1">
              <Label>Secadora</Label>
              <Select
                onValueChange={(v) => createForm.setValue('dryerId', v || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin secadora asignada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin asignar</SelectItem>
                  {dryers?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cliente */}
            <div className="space-y-1">
              <Label>Cliente *</Label>
              <Select onValueChange={(v) => createForm.setValue('clientId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {createForm.formState.errors.clientId && (
                <p className="text-xs text-red-500">
                  {createForm.formState.errors.clientId.message}
                </p>
              )}
            </div>

            {/* Producto */}
            <div className="space-y-1">
              <Label>Producto *</Label>
              <Select onValueChange={(v) => createForm.setValue('commodityId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent>
                  {commodities?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {createForm.formState.errors.commodityId && (
                <p className="text-xs text-red-500">
                  {createForm.formState.errors.commodityId.message}
                </p>
              )}
            </div>

            {/* Ticket de báscula (opcional) */}
            <div className="space-y-1">
              <Label>Ticket de báscula (opcional)</Label>
              <Input
                placeholder="ID del ticket"
                {...createForm.register('scaleTicketId')}
              />
            </div>

            {/* Peso entrada / Humedad entrada */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Peso entrada (kg) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...createForm.register('inputWeightKg')}
                />
                {createForm.formState.errors.inputWeightKg && (
                  <p className="text-xs text-red-500">
                    {createForm.formState.errors.inputWeightKg.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Humedad entrada (%) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...createForm.register('inputHumidityPct')}
                />
                {createForm.formState.errors.inputHumidityPct && (
                  <p className="text-xs text-red-500">
                    {createForm.formState.errors.inputHumidityPct.message}
                  </p>
                )}
              </div>
            </div>

            {/* Humedad objetivo / Costo */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Humedad objetivo (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="14.00"
                  {...createForm.register('targetHumidityPct')}
                />
              </div>
              <div className="space-y-1">
                <Label>Costo por tonelada ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...createForm.register('costPerTon')}
                />
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-1">
              <Label>Notas</Label>
              <Input placeholder="Observaciones opcionales" {...createForm.register('notes')} />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  createForm.reset();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Guardando...' : 'Crear lote'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Modal: Finalizar lote                                               */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={!!finishBatch} onOpenChange={(open) => { if (!open) setFinishBatch(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Finalizar lote {finishBatch?.batch_number}</DialogTitle>
          </DialogHeader>

          {finishBatch && (
            <form
              onSubmit={finishForm.handleSubmit(handleFinishSubmit)}
              className="space-y-4"
            >
              {/* Info summary */}
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Peso entrada</span>
                  <span className="font-medium">
                    {numFmt.format(Number(finishBatch.input_weight_kg))} kg
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Humedad entrada</span>
                  <span className="font-medium">
                    {numFmt2.format(Number(finishBatch.input_humidity_pct))}%
                  </span>
                </div>
              </div>

              {/* Peso salida */}
              <div className="space-y-1">
                <Label>Peso salida (kg) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...finishForm.register('outputWeightKg')}
                />
                {finishForm.formState.errors.outputWeightKg && (
                  <p className="text-xs text-red-500">
                    {finishForm.formState.errors.outputWeightKg.message}
                  </p>
                )}
              </div>

              {/* Humedad salida */}
              <div className="space-y-1">
                <Label>Humedad salida (%) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...finishForm.register('outputHumidityPct')}
                />
                {finishForm.formState.errors.outputHumidityPct && (
                  <p className="text-xs text-red-500">
                    {finishForm.formState.errors.outputHumidityPct.message}
                  </p>
                )}
              </div>

              {/* Costo por tonelada */}
              <div className="space-y-1">
                <Label>Costo por tonelada ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={finishBatch.cost_per_ton ? String(finishBatch.cost_per_ton) : '0.00'}
                  {...finishForm.register('costPerTon')}
                />
              </div>

              {/* Merma preview */}
              {mermaPreview !== null && (
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-orange-700 font-medium">Merma estimada</span>
                    <span className={`text-lg font-bold ${mermaPreview > 5 ? 'text-red-600' : 'text-orange-700'}`}>
                      {numFmt2.format(mermaPreview)}%
                    </span>
                  </div>
                  <p className="text-xs text-orange-600 mt-0.5">
                    {numFmt.format(Math.round(Number(finishBatch.input_weight_kg) - watchedOutput))} kg de merma
                  </p>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFinishBatch(null);
                    finishForm.reset();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={finishMutation.isPending}>
                  {finishMutation.isPending ? 'Guardando...' : 'Finalizar lote'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
