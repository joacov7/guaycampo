'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { TicketHistoryTable } from '@/components/portal/ticket-history-table';
import type { PaginatedResponse, IScaleTicket, ICommodity } from '@guaycampo/shared-types';

const PAGE_SIZE = 20;

interface TicketFilters {
  dateFrom: string;
  dateTo: string;
  commodityId: string;
  status: string;
  plate: string;
  page: number;
}

export default function MisTicketsPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const threeMonthsAgo = format(
    new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    'yyyy-MM-dd',
  );

  const [filters, setFilters] = useState<TicketFilters>({
    dateFrom: threeMonthsAgo,
    dateTo: today,
    commodityId: '',
    status: '',
    plate: '',
    page: 1,
  });

  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useQuery<PaginatedResponse<IScaleTicket & {
    vehicle?: { plate: string };
    commodity?: { name: string };
    labSamples?: { grade?: string; netAdjustment?: number }[];
  }>>({
    queryKey: ['portal-tickets', filters],
    queryFn: () =>
      api.get('/tickets', {
        params: {
          mine: true,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
          commodityId: filters.commodityId || undefined,
          status: filters.status || undefined,
          plate: filters.plate || undefined,
          page: filters.page,
          limit: PAGE_SIZE,
        },
      }),
    staleTime: 30_000,
  });

  const { data: commodities } = useQuery<ICommodity[]>({
    queryKey: ['commodities'],
    queryFn: () => api.get<ICommodity[]>('/commodities'),
    staleTime: 300_000,
  });

  const tickets = (data?.data ?? []).map((t) => ({
    id: t.id,
    ticketNumber: t.ticketNumber,
    grossWeight: t.grossWeight,
    tareWeight: t.tareWeight,
    netWeight: t.netWeight,
    status: t.status,
    grossAt: t.grossAt,
    commodityName: t.commodity?.name,
    vehiclePlate: t.vehicle?.plate,
    grade: t.labSamples?.[0]?.grade,
    netAdjustment: t.labSamples?.[0]?.netAdjustment,
  }));

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  function setFilter<K extends keyof TicketFilters>(key: K, value: TicketFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mis Tickets</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Historial completo de pesajes
          </p>
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Filter className="w-4 h-4" />
          Filtros
        </button>
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">
                Desde
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilter('dateFrom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-guay-500 transition"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">
                Hasta
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilter('dateTo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-guay-500 transition"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">
                Cultivo
              </label>
              <select
                value={filters.commodityId}
                onChange={(e) => setFilter('commodityId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-guay-500 transition bg-white"
              >
                <option value="">Todos</option>
                {commodities?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">
                Estado
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilter('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-guay-500 transition bg-white"
              >
                <option value="">Todos</option>
                <option value="completado">Aprobados</option>
                <option value="anulado">Rechazados</option>
                <option value="pendiente">Pendientes</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">
                Buscar por patente
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="ABC123"
                  value={filters.plate}
                  onChange={(e) => setFilter('plate', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-guay-500 transition uppercase"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <TicketHistoryTable tickets={tickets} loading={isLoading} />
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Página {filters.page} de {totalPages}
            {data && (
              <span className="ml-2 text-gray-400">
                ({data.total} tickets en total)
              </span>
            )}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setFilters((p) => ({ ...p, page: p.page - 1 }))}
              disabled={filters.page === 1}
              className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}
              disabled={filters.page >= totalPages}
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
