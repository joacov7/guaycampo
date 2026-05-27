'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Download, ChevronDown, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useTicketsToday } from '@/hooks/use-scale';
import { ScaleStatus } from '@guaycampo/shared-types';
import type { IScaleTicket } from '@guaycampo/shared-types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type TabKey = 'all' | 'active' | 'completed' | 'rejected';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'En curso' },
  { key: 'completed', label: 'Finalizados' },
  { key: 'rejected', label: 'Rechazados' },
];

const statusFilterMap: Record<TabKey, ScaleStatus[]> = {
  all: [],
  active: [ScaleStatus.PENDIENTE, ScaleStatus.PESADA_BRUTA, ScaleStatus.PESADA_TARA],
  completed: [ScaleStatus.COMPLETADO],
  rejected: [ScaleStatus.ANULADO],
};

const statusBadge: Record<ScaleStatus, { label: string; className: string }> = {
  [ScaleStatus.PENDIENTE]: { label: 'Pendiente', className: 'bg-gray-100 text-gray-600' },
  [ScaleStatus.PESADA_BRUTA]: { label: 'Bruto', className: 'bg-yellow-100 text-yellow-700' },
  [ScaleStatus.PESADA_TARA]: { label: 'Tara', className: 'bg-blue-100 text-blue-700' },
  [ScaleStatus.COMPLETADO]: { label: 'Completado', className: 'bg-green-100 text-green-700' },
  [ScaleStatus.ANULADO]: { label: 'Anulado', className: 'bg-red-100 text-red-700' },
};

interface TicketRow extends Omit<IScaleTicket, 'vehicle' | 'driver' | 'client'> {
  vehicle?: { plate: string };
  driver?: { fullName: string };
  commodity?: { name: string };
  client?: { name: string };
}

export function TicketList() {
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useTicketsToday();

  const tickets: TicketRow[] = (data?.data ?? []) as TicketRow[];
  const statusFilter = statusFilterMap[activeTab];

  const filtered =
    statusFilter.length > 0
      ? tickets.filter((t) => statusFilter.includes(t.status))
      : tickets;

  const handleExport = () => {
    // Genera CSV simple en el cliente
    const headers = ['#', 'Patente', 'Cultivo', 'Bruto (kg)', 'Tara (kg)', 'Neto (kg)', 'Estado', 'Hora'];
    const rows = filtered.map((t) => [
      t.ticketNumber,
      t.vehicle?.plate ?? t.plateConfirmed ?? '',
      t.commodity?.name ?? '',
      t.grossWeight ?? '',
      t.tareWeight ?? '',
      t.netWeight ?? '',
      statusBadge[t.status]?.label ?? t.status,
      t.grossAt ? format(new Date(t.grossAt), 'HH:mm', { locale: es }) : '',
    ]);

    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tickets-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-900">Tickets del día</h2>
          {!isLoading && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
              {filtered.length}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-xs self-start sm:self-auto"
          onClick={handleExport}
          disabled={isLoading || filtered.length === 0}
        >
          <Download className="w-3.5 h-3.5" />
          Exportar CSV
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-5 pt-4 border-b border-gray-100 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-t-md whitespace-nowrap border-b-2 transition-colors',
              activeTab === tab.key
                ? 'border-guay-600 text-guay-700 bg-guay-50'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="p-5 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
          <AlertCircle className="w-8 h-8" />
          <p className="text-sm">Error al cargar tickets</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Sin tickets en esta categoría</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 uppercase tracking-wide text-left border-b border-gray-100">
                <th className="px-5 py-3 font-medium">Ticket</th>
                <th className="px-3 py-3 font-medium">Patente</th>
                <th className="px-3 py-3 font-medium hidden sm:table-cell">Cultivo</th>
                <th className="px-3 py-3 font-medium hidden md:table-cell text-right">Bruto</th>
                <th className="px-3 py-3 font-medium hidden md:table-cell text-right">Tara</th>
                <th className="px-3 py-3 font-medium text-right">Neto</th>
                <th className="px-3 py-3 font-medium">Estado</th>
                <th className="px-3 py-3 font-medium hidden sm:table-cell">Hora</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((ticket) => {
                const badge = statusBadge[ticket.status];
                const isExpanded = expandedId === ticket.id;

                return (
                  <>
                    <tr
                      key={ticket.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                    >
                      <td className="px-5 py-3 font-semibold text-gray-800">
                        #{ticket.ticketNumber}
                      </td>
                      <td className="px-3 py-3 font-mono font-bold text-gray-900">
                        {ticket.vehicle?.plate ?? ticket.plateConfirmed ?? 'N/D'}
                      </td>
                      <td className="px-3 py-3 text-gray-600 hidden sm:table-cell">
                        {ticket.commodity?.name ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-600 hidden md:table-cell">
                        {ticket.grossWeight?.toLocaleString('es-AR') ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-600 hidden md:table-cell">
                        {ticket.tareWeight?.toLocaleString('es-AR') ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-guay-700">
                        {ticket.netWeight?.toLocaleString('es-AR') ?? '—'}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            'text-xs font-semibold px-2 py-0.5 rounded-full',
                            badge?.className,
                          )}
                        >
                          {badge?.label ?? ticket.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-400 hidden sm:table-cell">
                        {ticket.grossAt
                          ? format(new Date(ticket.grossAt), 'HH:mm', { locale: es })
                          : '—'}
                      </td>
                      <td className="px-3 py-3 text-gray-400">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr key={`${ticket.id}-detail`} className="bg-gray-50">
                        <td colSpan={9} className="px-5 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div>
                              <p className="text-gray-400 mb-0.5">Chofer</p>
                              <p className="font-medium text-gray-800">
                                {ticket.driver?.fullName ?? 'N/D'}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400 mb-0.5">Cliente</p>
                              <p className="font-medium text-gray-800">
                                {ticket.client?.name ?? 'N/D'}
                              </p>
                            </div>
                            {ticket.observations && (
                              <div className="col-span-2">
                                <p className="text-gray-400 mb-0.5">Observaciones</p>
                                <p className="font-medium text-gray-800">{ticket.observations}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
