'use client';

import { useState, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import {
  Plus,
  FileOutput,
  Loader2,
  FileDown,
  PenLine,
  Ban,
  X,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useRemitos,
  useCreateRemito,
  useSignRemito,
  useCancelRemito,
  type RemitoType,
  type RemitoStatus,
  type Remito,
} from '@/hooks/use-remitos';
import { useClients } from '@/hooks/use-clients';
import type { IClient } from '@guaycampo/shared-types';
import { cn } from '@/lib/utils';

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<RemitoType, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  transferencia: 'Transferencia',
};

const TYPE_BADGE: Record<RemitoType, string> = {
  entrada: 'bg-blue-100 text-blue-700',
  salida: 'bg-orange-100 text-orange-700',
  transferencia: 'bg-purple-100 text-purple-700',
};

const STATUS_LABELS: Record<RemitoStatus, string> = {
  borrador: 'Borrador',
  emitido: 'Emitido',
  firmado: 'Firmado',
  anulado: 'Anulado',
};

const STATUS_BADGE: Record<RemitoStatus, string> = {
  borrador: 'bg-gray-100 text-gray-600',
  emitido: 'bg-yellow-100 text-yellow-700',
  firmado: 'bg-green-100 text-green-700',
  anulado: 'bg-red-100 text-red-700',
};

const ALL_TYPES: Array<{ value: RemitoType | ''; label: string }> = [
  { value: '', label: 'Todos los tipos' },
  { value: 'entrada', label: 'Entrada' },
  { value: 'salida', label: 'Salida' },
  { value: 'transferencia', label: 'Transferencia' },
];

const ALL_STATUSES: Array<{ value: RemitoStatus | ''; label: string }> = [
  { value: '', label: 'Todos los estados' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'emitido', label: 'Emitido' },
  { value: 'firmado', label: 'Firmado' },
  { value: 'anulado', label: 'Anulado' },
];

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createRemitoSchema = z.object({
  remitoType: z.enum(['entrada', 'salida', 'transferencia']),
  clientId: z.string().min(1, 'Seleccioná un cliente'),
  commodityId: z.string().min(1, 'Seleccioná un producto'),
  vehicleId: z.string().optional(),
  driverId: z.string().optional(),
  scaleTicketId: z.string().optional(),
  grossWeightKg: z.coerce.number().min(0).optional(),
  tareWeightKg: z.coerce.number().min(0).optional(),
  netWeightKg: z.coerce.number().min(0).optional(),
  origin: z.string().optional(),
  destination: z.string().optional(),
  notes: z.string().optional(),
});
type CreateRemitoForm = z.infer<typeof createRemitoSchema>;

const signRemitoSchema = z.object({
  signerName: z.string().min(1, 'Ingresá el nombre del firmante'),
});
type SignRemitoForm = z.infer<typeof signRemitoSchema>;

// ─── Helper components ────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: RemitoType }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        TYPE_BADGE[type],
      )}
    >
      {TYPE_LABELS[type]}
    </span>
  );
}

function StatusBadge({ status }: { status: RemitoStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        STATUS_BADGE[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function formatDate(dateStr: string) {
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: es });
  } catch {
    return dateStr;
  }
}

function formatKg(val: number | null) {
  if (val === null || val === undefined) return '—';
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(Number(val));
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCards({ remitos }: { remitos: Remito[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = new Date().toISOString().slice(0, 7);

  const hoy = remitos.filter((r) => r.issueDate.slice(0, 10) === today).length;
  const firmadosMes = remitos.filter(
    (r) => r.status === 'firmado' && r.issueDate.slice(0, 7) === thisMonth,
  ).length;
  const anuladosMes = remitos.filter(
    (r) => r.status === 'anulado' && r.issueDate.slice(0, 7) === thisMonth,
  ).length;
  const pendFirma = remitos.filter((r) => r.status === 'emitido').length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs text-gray-500 mb-1">Remitos hoy</p>
        <p className="text-2xl font-bold text-gray-900">{hoy}</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs text-gray-500 mb-1">Firmados (mes)</p>
        <p className="text-2xl font-bold text-green-700">{firmadosMes}</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs text-gray-500 mb-1">Anulados (mes)</p>
        <p className="text-2xl font-bold text-red-700">{anuladosMes}</p>
      </div>
      <div
        className={cn(
          'rounded-xl border p-4',
          pendFirma > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200',
        )}
      >
        <p
          className={cn(
            'text-xs mb-1',
            pendFirma > 0 ? 'text-yellow-600' : 'text-gray-500',
          )}
        >
          Pendientes de firma
        </p>
        <p
          className={cn(
            'text-2xl font-bold',
            pendFirma > 0 ? 'text-yellow-700' : 'text-gray-900',
          )}
        >
          {pendFirma}
        </p>
      </div>
    </div>
  );
}

// ─── Create remito modal ──────────────────────────────────────────────────────

function CreateRemitoModal({ onClose }: { onClose: () => void }) {
  const { data: clientsPage } = useClients({ limit: 200 });
  const clients: IClient[] = clientsPage?.data ?? [];
  const createRemito = useCreateRemito();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateRemitoForm>({
    resolver: zodResolver(createRemitoSchema),
    defaultValues: { remitoType: 'salida' },
  });

  const onSubmit = async (data: CreateRemitoForm) => {
    const payload = {
      ...data,
      vehicleId: data.vehicleId || undefined,
      driverId: data.driverId || undefined,
      scaleTicketId: data.scaleTicketId || undefined,
      origin: data.origin || undefined,
      destination: data.destination || undefined,
      notes: data.notes || undefined,
    };
    await createRemito.mutateAsync(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Nuevo remito</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo <span className="text-red-500">*</span>
            </label>
            <select
              {...register('remitoType')}
              className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
            >
              <option value="entrada">Entrada</option>
              <option value="salida">Salida</option>
              <option value="transferencia">Transferencia</option>
            </select>
            {errors.remitoType && (
              <p className="text-xs text-red-500 mt-1">{errors.remitoType.message}</p>
            )}
          </div>

          {/* Client */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente <span className="text-red-500">*</span>
            </label>
            <select
              {...register('clientId')}
              className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
            >
              <option value="">Seleccionar cliente...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.clientId && (
              <p className="text-xs text-red-500 mt-1">{errors.clientId.message}</p>
            )}
          </div>

          {/* Commodity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Producto <span className="text-red-500">*</span>
            </label>
            <input
              {...register('commodityId')}
              placeholder="ID del producto"
              className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
            />
            {errors.commodityId && (
              <p className="text-xs text-red-500 mt-1">{errors.commodityId.message}</p>
            )}
          </div>

          {/* Vehicle + Driver */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehículo (opcional)
              </label>
              <input
                {...register('vehicleId')}
                placeholder="ID del vehículo"
                className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Conductor (opcional)
              </label>
              <input
                {...register('driverId')}
                placeholder="ID del conductor"
                className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
              />
            </div>
          </div>

          {/* Scale ticket */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ticket de báscula (opcional)
            </label>
            <input
              {...register('scaleTicketId')}
              placeholder="ID del ticket"
              className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
            />
          </div>

          {/* Weights */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Peso bruto (kg)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('grossWeightKg')}
                className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tara (kg)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('tareWeightKg')}
                className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Peso neto (kg)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('netWeightKg')}
                className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
              />
            </div>
          </div>

          {/* Origin + Destination */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Origen</label>
              <input
                {...register('origin')}
                placeholder="Origen"
                className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destino</label>
              <input
                {...register('destination')}
                placeholder="Destino"
                className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Observaciones..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500 resize-none"
            />
          </div>

          {createRemito.error && (
            <p className="text-sm text-red-600">
              {(createRemito.error as { message?: string })?.message ?? 'Error al crear remito'}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-9 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-9 rounded-lg bg-guay-600 hover:bg-guay-700 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear remito
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Sign remito modal ────────────────────────────────────────────────────────

function SignRemitoModal({
  remitoId,
  remitoNumber,
  onClose,
}: {
  remitoId: string;
  remitoNumber: string;
  onClose: () => void;
}) {
  const signRemito = useSignRemito();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignRemitoForm>({
    resolver: zodResolver(signRemitoSchema),
  });

  const getPos = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement,
  ) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      isDrawingRef.current = true;
      lastPosRef.current = getPos(e, canvas);
    },
    [],
  );

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const pos = getPos(e, canvas);
      if (lastPosRef.current) {
        ctx.beginPath();
        ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      lastPosRef.current = pos;
    },
    [],
  );

  const stopDrawing = useCallback(() => {
    isDrawingRef.current = false;
    lastPosRef.current = null;
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const onSubmit = async (data: SignRemitoForm) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const signatureData = canvas.toDataURL('image/png');
    await signRemito.mutateAsync({
      id: remitoId,
      data: { signatureData, signerName: data.signerName },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Firmar remito {remitoNumber}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del firmante <span className="text-red-500">*</span>
            </label>
            <input
              {...register('signerName')}
              placeholder="Nombre y apellido"
              className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
            />
            {errors.signerName && (
              <p className="text-xs text-red-500 mt-1">{errors.signerName.message}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Firma digital
              </label>
              <button
                type="button"
                onClick={clearCanvas}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Limpiar
              </button>
            </div>
            <canvas
              ref={canvasRef}
              width={380}
              height={140}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full border border-gray-300 rounded-lg bg-gray-50 cursor-crosshair touch-none"
              style={{ touchAction: 'none' }}
            />
            <p className="text-xs text-gray-400 mt-1">
              Dibujá la firma con el mouse o con el dedo (táctil)
            </p>
          </div>

          {signRemito.error && (
            <p className="text-sm text-red-600">
              {(signRemito.error as { message?: string })?.message ?? 'Error al firmar remito'}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-9 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-9 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Firmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RemitosPage() {
  const [typeFilter, setTypeFilter] = useState<RemitoType | ''>('');
  const [statusFilter, setStatusFilter] = useState<RemitoStatus | ''>('');
  const [clientFilter, setClientFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [signingRemito, setSigningRemito] = useState<Remito | null>(null);

  const cancelRemito = useCancelRemito();
  const { data: clientsPage } = useClients({ limit: 200 });
  const clients: IClient[] = clientsPage?.data ?? [];

  const { data: remitos = [], isLoading } = useRemitos({
    type: typeFilter || undefined,
    status: statusFilter || undefined,
    clientId: clientFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const handleDownloadPdf = async (remito: Remito) => {
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';
    const { getSession } = await import('next-auth/react');
    const session = await getSession();
    const token = session?.user?.accessToken ?? '';

    const res = await fetch(`${BASE_URL}/remitos/${remito.id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `remito-${remito.remitoNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCancel = async (id: string) => {
    if (!confirm('¿Anular este remito?')) return;
    await cancelRemito.mutateAsync(id);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Remitos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gestión de remitos digitales de ingreso y egreso
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-guay-600 hover:bg-guay-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo remito</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
      </div>

      {/* Summary cards */}
      {!isLoading && <SummaryCards remitos={remitos} />}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          {/* Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as RemitoType | '')}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
          >
            {ALL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as RemitoStatus | '')}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
          >
            {ALL_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Client */}
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
          >
            <option value="">Todos los clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
            />
            <span className="text-gray-400 text-sm">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-guay-500" />
          </div>
        ) : remitos.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <FileOutput className="w-12 h-12 text-gray-200 mx-auto" />
            <div>
              <p className="text-gray-600 font-medium">Sin remitos</p>
              <p className="text-sm text-gray-400 mt-1">
                Creá el primer remito para comenzar
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-guay-600 hover:bg-guay-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuevo remito
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-3 font-medium text-gray-500 whitespace-nowrap">
                    Número
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500">Tipo</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500">Cliente</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 hidden md:table-cell">
                    Vehículo
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 hidden sm:table-cell">
                    Producto
                  </th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 hidden lg:table-cell whitespace-nowrap">
                    Peso neto (kg)
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 hidden sm:table-cell whitespace-nowrap">
                    Fecha
                  </th>
                  <th className="text-center py-3 px-3 font-medium text-gray-500">Estado</th>
                  <th className="text-center py-3 px-3 font-medium text-gray-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {remitos.map((remito) => (
                  <tr key={remito.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-3 font-mono font-medium text-gray-900 whitespace-nowrap">
                      {remito.remitoNumber}
                    </td>
                    <td className="py-3 px-3">
                      <TypeBadge type={remito.remitoType} />
                    </td>
                    <td className="py-3 px-3 text-gray-700 max-w-[140px] truncate">
                      {remito.client.name}
                    </td>
                    <td className="py-3 px-3 text-gray-500 hidden md:table-cell">
                      {remito.vehicle?.plate ?? '—'}
                    </td>
                    <td className="py-3 px-3 text-gray-600 hidden sm:table-cell">
                      {remito.commodity.name}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-700 hidden lg:table-cell whitespace-nowrap">
                      {formatKg(remito.netWeightKg)}
                    </td>
                    <td className="py-3 px-3 text-gray-500 hidden sm:table-cell whitespace-nowrap">
                      {formatDate(remito.issueDate)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <StatusBadge status={remito.status} />
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center gap-1">
                        {/* PDF */}
                        <button
                          onClick={() => handleDownloadPdf(remito)}
                          title="Ver PDF"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <FileDown className="w-4 h-4" />
                        </button>
                        {/* Sign */}
                        {remito.status === 'emitido' && (
                          <button
                            onClick={() => setSigningRemito(remito)}
                            title="Firmar"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-green-700 hover:bg-green-50 transition-colors"
                          >
                            <PenLine className="w-4 h-4" />
                          </button>
                        )}
                        {/* Cancel */}
                        {remito.status !== 'anulado' && (
                          <button
                            onClick={() => handleCancel(remito.id)}
                            title="Anular"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Ban className="w-4 h-4" />
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

      {/* Modals */}
      {showCreateModal && <CreateRemitoModal onClose={() => setShowCreateModal(false)} />}
      {signingRemito && (
        <SignRemitoModal
          remitoId={signingRemito.id}
          remitoNumber={signingRemito.remitoNumber}
          onClose={() => setSigningRemito(null)}
        />
      )}
    </div>
  );
}
