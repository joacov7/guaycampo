'use client';

import { useState } from 'react';
import { Award, Plus, Download, Eye, XCircle, Filter, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  useCertificates,
  useCreateCertificate,
  useRevokeCertificate,
  type QualityCertificate,
  type CertificateFilters,
  type CertificateStatus,
} from '@/hooks/use-certificates';
import type { ICommodity } from '@guaycampo/shared-types';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusBadge(status: CertificateStatus, validUntil?: string) {
  const today = new Date();
  const expiry = validUntil ? new Date(validUntil) : null;
  const daysLeft = expiry ? differenceInDays(expiry, today) : null;

  if (status === 'anulado') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <XCircle className="w-3 h-3" />
        Anulado
      </span>
    );
  }

  if (status === 'borrador') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        <Clock className="w-3 h-3" />
        Borrador
      </span>
    );
  }

  // emitido
  if (expiry && daysLeft !== null && daysLeft < 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
        <AlertCircle className="w-3 h-3" />
        Vencido
      </span>
    );
  }

  if (expiry && daysLeft !== null && daysLeft <= 30) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        <Clock className="w-3 h-3" />
        Vence en {daysLeft}d
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      <CheckCircle className="w-3 h-3" />
      Emitido
    </span>
  );
}

function fmtNum(v: unknown, decimals = 2): string {
  if (v == null) return '-';
  return Number(v).toFixed(decimals);
}

// ---------------------------------------------------------------------------
// Detail Dialog
// ---------------------------------------------------------------------------

interface DetailDialogProps {
  cert: QualityCertificate;
  tenantId: string;
  onClose: () => void;
  onRevoke: () => void;
  revoking: boolean;
}

function DetailDialog({ cert, tenantId, onClose, onRevoke, revoking }: DetailDialogProps) {
  const verifyUrl = cert.qrToken ? `https://guaycampo.com/verificar/${cert.qrToken}` : '-';
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';
  const pdfUrl = `${apiBase}/lab/certificates/${cert.id}/pdf?tenantId=${tenantId}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Award className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{cert.certificateNumber}</h2>
              <p className="text-xs text-gray-500">Certificado de Análisis de Calidad</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Status + dates */}
          <div className="flex flex-wrap gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Estado</p>
              {statusBadge(cert.status, cert.validUntil)}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Fecha emisión</p>
              <p className="text-sm font-medium text-gray-900">
                {cert.issueDate ? format(new Date(cert.issueDate), 'dd/MM/yyyy') : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Válido hasta</p>
              <p className="text-sm font-medium text-gray-900">
                {cert.validUntil ? format(new Date(cert.validUntil), 'dd/MM/yyyy') : '-'}
              </p>
            </div>
          </div>

          {/* Client + commodity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Cliente</p>
              <p className="text-sm font-medium text-gray-900">{cert.client?.name ?? '-'}</p>
              <p className="text-xs text-gray-400">{cert.client?.cuit ?? ''}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Cultivo</p>
              <p className="text-sm font-medium text-gray-900">
                {cert.commodity?.name ?? '-'} ({cert.commodity?.code ?? '-'})
              </p>
              <p className="text-xs text-gray-400">Grado: {cert.grade ?? 'S/C'}</p>
            </div>
          </div>

          {/* Weights */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Peso bruto</p>
              <p className="text-sm font-medium text-gray-900">{fmtNum(cert.grossWeightKg)} kg</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Peso neto</p>
              <p className="text-sm font-medium text-gray-900">{fmtNum(cert.netWeightKg)} kg</p>
            </div>
          </div>

          {/* Quality params table */}
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Parámetros de Calidad</p>
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Parámetro</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Valor</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Base SENASA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { label: 'Humedad', value: cert.humidityPct != null ? `${fmtNum(cert.humidityPct)}%` : '-', base: '13.5%' },
                  { label: 'Proteína', value: cert.proteinPct != null ? `${fmtNum(cert.proteinPct)}%` : '-', base: '—' },
                  { label: 'Aceite', value: cert.oilPct != null ? `${fmtNum(cert.oilPct)}%` : '-', base: '—' },
                  { label: 'Peso hectolítrico', value: cert.testWeightKgHl != null ? `${fmtNum(cert.testWeightKgHl)} kg/hl` : '-', base: '—' },
                  { label: 'Granos dañados', value: cert.damagedGrainsPct != null ? `${fmtNum(cert.damagedGrainsPct)}%` : '-', base: '—' },
                  { label: 'Materias extrañas', value: cert.foreignMatterPct != null ? `${fmtNum(cert.foreignMatterPct)}%` : '-', base: '—' },
                ].map((row) => (
                  <tr key={row.label} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-700">{row.label}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">{row.value}</td>
                    <td className="px-3 py-2 text-right text-gray-400">{row.base}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-700">Ajuste neto</td>
                  <td colSpan={2} className="px-3 py-2 text-right font-semibold text-gray-900">
                    {cert.netAdjustmentPct != null
                      ? `${Number(cert.netAdjustmentPct) >= 0 ? '+' : ''}${fmtNum(cert.netAdjustmentPct, 4)}%`
                      : '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Notes */}
          {cert.notes && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Observaciones</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{cert.notes}</p>
            </div>
          )}

          {/* Issuer + QR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Emitido por</p>
              <p className="text-sm font-medium text-gray-900">{cert.issuerName ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Token QR</p>
              <p className="text-xs font-mono text-gray-500 break-all">{cert.qrToken ?? '-'}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1">URL de verificación</p>
            <p className="text-xs text-indigo-600 break-all">{verifyUrl}</p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-200">
          {cert.status === 'emitido' && (
            <button
              onClick={onRevoke}
              disabled={revoking}
              className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              {revoking ? 'Anulando...' : 'Anular certificado'}
            </button>
          )}
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Descargar PDF
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Emit Dialog — select approved lab sample
// ---------------------------------------------------------------------------

interface LabSampleOption {
  id: string;
  sampleNumber: string;
  status: string;
  grade?: string;
  humidity?: number;
  takenAt: string;
  scaleTicket?: {
    ticketNumber: string;
    client?: { name: string };
    commodity?: { name: string };
  };
}

interface EmitDialogProps {
  onClose: () => void;
  onEmit: (labSampleId: string) => void;
  emitting: boolean;
}

function EmitDialog({ onClose, onEmit, emitting }: EmitDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ data: LabSampleOption[] }>({
    queryKey: ['lab', 'approved-no-cert'],
    queryFn: () =>
      api.get('/lab/samples', { params: { status: 'aprobado', limit: 100 } }),
  });

  const samples = (data?.data ?? []).filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.sampleNumber.toLowerCase().includes(q) ||
      s.scaleTicket?.client?.name.toLowerCase().includes(q) ||
      s.scaleTicket?.ticketNumber.toLowerCase().includes(q) ||
      false
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Emitir Certificado</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">
            Seleccioná una muestra aprobada para emitir su certificado de calidad.
          </p>

          <input
            type="text"
            placeholder="Buscar por número, cliente o ticket..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-guay-500 transition"
          />

          <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-gray-500">Cargando muestras...</div>
            ) : samples.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No hay muestras aprobadas disponibles
              </div>
            ) : (
              samples.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={cn(
                    'w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors',
                    selectedId === s.id && 'bg-guay-50 border-l-2 border-guay-600',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{s.sampleNumber}</p>
                      <p className="text-xs text-gray-500">
                        {s.scaleTicket?.client?.name ?? 'Sin cliente'} ·{' '}
                        {s.scaleTicket?.commodity?.name ?? 'Sin cultivo'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-emerald-600 font-medium">{s.grade ?? 'S/C'}</span>
                      <p className="text-xs text-gray-400">
                        {format(new Date(s.takenAt), 'dd/MM/yy')}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => selectedId && onEmit(selectedId)}
            disabled={!selectedId || emitting}
            className="px-4 py-2 bg-guay-600 text-white rounded-lg text-sm hover:bg-guay-700 transition-colors disabled:opacity-50"
          >
            {emitting ? 'Emitiendo...' : 'Emitir Certificado'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary card
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', color)}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function CertificadosPage() {
  const [filters, setFilters] = useState<CertificateFilters>({
    page: 1,
    limit: 20,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showEmitDialog, setShowEmitDialog] = useState(false);
  const [selectedCert, setSelectedCert] = useState<QualityCertificate | null>(null);

  const { data, isLoading } = useCertificates(filters);
  const { data: commodities } = useQuery<ICommodity[]>({
    queryKey: ['commodities'],
    queryFn: () => api.get<ICommodity[]>('/commodities'),
    staleTime: 300_000,
  });

  const createCertificate = useCreateCertificate();
  const revokeCertificate = useRevokeCertificate();

  // Summary data (fetch per status)
  const today = new Date();
  const firstOfMonth = format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd');
  const { data: emitidosMes } = useCertificates({ status: 'emitido', dateFrom: firstOfMonth, limit: 1 });
  const { data: vigentes } = useCertificates({ status: 'emitido', limit: 1 });
  const { data: anulados } = useCertificates({ status: 'anulado', limit: 1 });

  // Vencidos: emitidos with validUntil < today — approximate from list
  const certsList = data?.data ?? [];
  const vencidosCount = certsList.filter((c) => {
    if (c.status !== 'emitido') return false;
    if (!c.validUntil) return false;
    return differenceInDays(new Date(c.validUntil), today) < 0;
  }).length;

  function setFilter<K extends keyof CertificateFilters>(key: K, value: CertificateFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <Award className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Certificados</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Certificados de Análisis de Calidad
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
          <button
            onClick={() => setShowEmitDialog(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-guay-600 text-white rounded-lg text-sm hover:bg-guay-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Emitir certificado
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Emitidos este mes"
          value={emitidosMes?.total ?? 0}
          icon={Award}
          color="bg-green-50 text-green-600"
        />
        <SummaryCard
          label="Vigentes"
          value={vigentes?.total ?? 0}
          icon={CheckCircle}
          color="bg-blue-50 text-blue-600"
        />
        <SummaryCard
          label="Vencidos (vista actual)"
          value={vencidosCount}
          icon={AlertCircle}
          color="bg-orange-50 text-orange-600"
        />
        <SummaryCard
          label="Anulados"
          value={anulados?.total ?? 0}
          icon={XCircle}
          color="bg-red-50 text-red-600"
        />
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">Estado</label>
              <select
                value={filters.status ?? ''}
                onChange={(e) => setFilter('status', e.target.value as CertificateStatus | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-guay-500 transition bg-white"
              >
                <option value="">Todos</option>
                <option value="emitido">Emitido</option>
                <option value="borrador">Borrador</option>
                <option value="anulado">Anulado</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">Cultivo</label>
              <select
                value={filters.commodityId ?? ''}
                onChange={(e) => setFilter('commodityId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-guay-500 transition bg-white"
              >
                <option value="">Todos</option>
                {(commodities ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">Desde</label>
              <input
                type="date"
                value={filters.dateFrom ?? ''}
                onChange={(e) => setFilter('dateFrom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-guay-500 transition"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">Hasta</label>
              <input
                type="date"
                value={filters.dateTo ?? ''}
                onChange={(e) => setFilter('dateTo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-guay-500 transition"
              />
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
            Cargando certificados...
          </div>
        ) : certsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <Award className="w-12 h-12 text-gray-200" />
            <p className="text-sm font-medium">No hay certificados</p>
            <p className="text-xs">Emití tu primer certificado desde el botón superior</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Número</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Producto</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600">Grado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600">Peso neto</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600">Humedad</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600">Fecha</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600">Vence</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {certsList.map((cert) => (
                  <tr key={cert.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">
                      {cert.certificateNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{cert.client?.name ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{cert.commodity?.name ?? '-'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{cert.grade ?? 'S/C'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {cert.netWeightKg != null ? `${fmtNum(cert.netWeightKg)} kg` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {cert.humidityPct != null ? `${fmtNum(cert.humidityPct)}%` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs">
                      {cert.issueDate ? format(new Date(cert.issueDate), 'dd/MM/yy') : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs">
                      {cert.validUntil ? format(new Date(cert.validUntil), 'dd/MM/yy') : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {statusBadge(cert.status, cert.validUntil)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedCert(cert)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <a
                          href={`${apiBase}/lab/certificates/${cert.id}/pdf?tenantId=${cert.tenantId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Descargar PDF"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        {cert.status === 'emitido' && (
                          <button
                            onClick={() =>
                              revokeCertificate.mutate(cert.id)
                            }
                            disabled={revokeCertificate.isPending}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Revocar certificado"
                          >
                            <XCircle className="w-4 h-4" />
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

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Página {data.page} de {data.totalPages} ({data.total} certificados)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('page', (filters.page ?? 1) - 1)}
              disabled={(filters.page ?? 1) <= 1}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={() => setFilter('page', (filters.page ?? 1) + 1)}
              disabled={(filters.page ?? 1) >= data.totalPages}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Detail dialog */}
      {selectedCert && (
        <DetailDialog
          cert={selectedCert}
          tenantId={selectedCert.tenantId}
          onClose={() => setSelectedCert(null)}
          onRevoke={() => {
            revokeCertificate.mutate(selectedCert.id, {
              onSuccess: () => setSelectedCert(null),
            });
          }}
          revoking={revokeCertificate.isPending}
        />
      )}

      {/* Emit dialog */}
      {showEmitDialog && (
        <EmitDialog
          onClose={() => setShowEmitDialog(false)}
          onEmit={(labSampleId) => {
            createCertificate.mutate(
              { labSampleId },
              { onSuccess: () => setShowEmitDialog(false) },
            );
          }}
          emitting={createCertificate.isPending}
        />
      )}
    </div>
  );
}
