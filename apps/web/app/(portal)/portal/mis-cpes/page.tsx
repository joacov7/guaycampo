'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileText, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { PaginatedResponse } from '@guaycampo/shared-types';

type CpeStatus = 'borrador' | 'emitido' | 'confirmado' | 'rechazado' | 'anulado';

interface CpeItem {
  id: string;
  cpeNumber?: string;
  date: string;
  plate?: string;
  commodityName?: string;
  estimatedKg?: number;
  destination?: string;
  status: CpeStatus;
  afipStatus?: string;
}

const STATUS_LABELS: Record<CpeStatus, string> = {
  borrador: 'Borrador',
  emitido: 'Emitido',
  confirmado: 'Confirmado',
  rechazado: 'Rechazado',
  anulado: 'Anulado',
};

const STATUS_STYLES: Record<CpeStatus, string> = {
  borrador: 'bg-gray-100 text-gray-600',
  emitido: 'bg-blue-50 text-blue-700',
  confirmado: 'bg-green-50 text-green-700',
  rechazado: 'bg-red-50 text-red-700',
  anulado: 'bg-orange-50 text-orange-700',
};

function CpeSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="divide-y divide-gray-100">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 animate-pulse flex gap-3">
            <div className="h-4 w-24 bg-gray-100 rounded" />
            <div className="h-4 w-16 bg-gray-100 rounded" />
            <div className="h-4 w-20 bg-gray-100 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MisCpesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CpeStatus | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['portal-mis-cpes', search, statusFilter, page],
    queryFn: () =>
      api.get<PaginatedResponse<CpeItem>>('/trucks/shifts/cpes', {
        params: {
          mine: true,
          search: search || undefined,
          status: statusFilter || undefined,
          page,
          limit: 20,
        },
      }),
    staleTime: 30_000,
  });

  const cpes = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mis Cartas de Porte</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Tus CPE electrónicas registradas ante AFIP
          </p>
        </div>
        <Link
          href="/portal/mis-cpes/nueva"
          className="inline-flex items-center gap-2 px-4 py-2 bg-guay-600 hover:bg-guay-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nueva CPE</span>
          <span className="sm:hidden">Nueva</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por N° CPE o patente..."
              className="w-full pl-9 pr-4 h-9 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
            />
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => { setStatusFilter(''); setPage(1); }}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
              statusFilter === '' ? 'bg-guay-600 text-white border-guay-600' : 'border-gray-200 text-gray-500 hover:border-gray-300',
            )}
          >
            Todas
          </button>
          {(Object.keys(STATUS_LABELS) as CpeStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
                statusFilter === s ? 'bg-guay-600 text-white border-guay-600' : 'border-gray-200 text-gray-500 hover:border-gray-300',
              )}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <CpeSkeleton />
      ) : cpes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-14">
          <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No tenés cartas de porte</p>
          <p className="text-sm text-gray-400 mt-1">Las CPE se generan al confirmar un turno</p>
          <Link
            href="/portal/mis-cpes/nueva"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-guay-600 hover:text-guay-700 font-medium"
          >
            <Plus className="w-4 h-4" />
            Solicitar una CPE
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">N° CPE</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Camión</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Cultivo</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Kg</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide hidden lg:table-cell">Destino</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cpes.map((cpe) => (
                  <tr key={cpe.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-guay-700">
                      {cpe.cpeNumber ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {format(new Date(cpe.date), "d 'de' MMM yyyy", { locale: es })}
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                      {cpe.plate ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {cpe.commodityName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {cpe.estimatedKg ? cpe.estimatedKg.toLocaleString('es-AR') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">
                      {cpe.destination ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        STATUS_STYLES[cpe.status] ?? 'bg-gray-100 text-gray-600',
                      )}>
                        {STATUS_LABELS[cpe.status] ?? cpe.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className="sm:hidden divide-y divide-gray-100">
            {cpes.map((cpe) => (
              <div key={cpe.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-guay-700">
                        {cpe.cpeNumber ?? 'Borrador'}
                      </span>
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        STATUS_STYLES[cpe.status],
                      )}>
                        {STATUS_LABELS[cpe.status]}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {cpe.commodityName ?? '—'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {format(new Date(cpe.date), "d 'de' MMM yyyy", { locale: es })}
                      {cpe.plate && ` · ${cpe.plate}`}
                    </p>
                  </div>
                  {cpe.estimatedKg && (
                    <span className="text-sm font-semibold text-gray-700 flex-shrink-0">
                      {cpe.estimatedKg.toLocaleString('es-AR')} kg
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
