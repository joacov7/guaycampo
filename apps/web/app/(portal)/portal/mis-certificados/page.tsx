'use client';

import { useState } from 'react';
import { Award, Download, Filter, ChevronLeft, ChevronRight, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useCertificates, type CertificateStatus, type CertificateFilters } from '@/hooks/use-certificates';
import { cn } from '@/lib/utils';

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
      Vigente
    </span>
  );
}

const PAGE_SIZE = 20;

export default function MisCertificadosPage() {
  const [filters, setFilters] = useState<CertificateFilters>({
    page: 1,
    limit: PAGE_SIZE,
  });
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useCertificates(filters);
  const certs = data?.data ?? [];
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';

  function setFilter<K extends keyof CertificateFilters>(key: K, value: CertificateFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mis Certificados</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Certificados de Análisis de Calidad emitidos
          </p>
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            'inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors',
            showFilters
              ? 'border-guay-600 text-guay-700 bg-guay-50'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50',
          )}
        >
          <Filter className="w-4 h-4" />
          Filtros
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">Estado</label>
              <select
                value={filters.status ?? ''}
                onChange={(e) => setFilter('status', e.target.value as CertificateStatus | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-guay-500 transition bg-white"
              >
                <option value="">Todos</option>
                <option value="emitido">Vigente</option>
                <option value="anulado">Anulado</option>
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
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">
            Cargando certificados...
          </div>
        ) : certs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <Award className="w-10 h-10 text-gray-200" />
            <p className="text-sm font-medium">No tenés certificados todavía</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Número</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Producto</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600">Grado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600">Humedad</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600">Peso neto</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600">Fecha</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600">Vence</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {certs.map((cert) => (
                  <tr key={cert.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">
                      {cert.certificateNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {cert.commodity?.name ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {cert.grade ?? 'S/C'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {cert.humidityPct != null ? `${Number(cert.humidityPct).toFixed(1)}%` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {cert.netWeightKg != null
                        ? `${Number(cert.netWeightKg).toLocaleString('es-AR')} kg`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">
                      {cert.issueDate ? format(new Date(cert.issueDate), 'dd/MM/yyyy') : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">
                      {cert.validUntil ? format(new Date(cert.validUntil), 'dd/MM/yyyy') : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {statusBadge(cert.status, cert.validUntil)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={`${apiBase}/lab/certificates/${cert.id}/pdf?tenantId=${cert.tenantId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Página {filters.page ?? 1} de {totalPages}
            {data && (
              <span className="ml-2 text-gray-400">({data.total} certificados)</span>
            )}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setFilters((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
              disabled={(filters.page ?? 1) <= 1}
              className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setFilters((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
              disabled={(filters.page ?? 1) >= totalPages}
              className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
