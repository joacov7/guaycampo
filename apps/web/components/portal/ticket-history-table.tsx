'use client';

import Link from 'next/link';
import { FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { IScaleTicket } from '@guaycampo/shared-types';
import { ScaleStatus } from '@guaycampo/shared-types';

const statusLabel: Record<ScaleStatus, string> = {
  [ScaleStatus.PENDIENTE]: 'Pendiente',
  [ScaleStatus.PESADA_BRUTA]: 'En proceso',
  [ScaleStatus.PESADA_TARA]: 'En proceso',
  [ScaleStatus.COMPLETADO]: 'Aprobado',
  [ScaleStatus.ANULADO]: 'Anulado',
};

const statusStyle: Record<ScaleStatus, string> = {
  [ScaleStatus.PENDIENTE]: 'bg-yellow-50 text-yellow-700',
  [ScaleStatus.PESADA_BRUTA]: 'bg-blue-50 text-blue-700',
  [ScaleStatus.PESADA_TARA]: 'bg-blue-50 text-blue-700',
  [ScaleStatus.COMPLETADO]: 'bg-green-50 text-green-700',
  [ScaleStatus.ANULADO]: 'bg-red-50 text-red-700',
};

interface TicketRow extends Pick<
  IScaleTicket,
  'id' | 'ticketNumber' | 'grossWeight' | 'tareWeight' | 'netWeight' | 'status' | 'grossAt'
> {
  commodityName?: string;
  vehiclePlate?: string;
  grade?: string;
  netAdjustment?: number;
}

interface TicketHistoryTableProps {
  tickets: TicketRow[];
  loading?: boolean;
}

function kgToTon(kg: number) {
  return (kg / 1000).toFixed(2);
}

export function TicketHistoryTable({ tickets, loading = false }: TicketHistoryTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No hay tickets registrados</p>
        <p className="text-sm text-gray-400 mt-1">Los tickets de pesaje aparecerán aquí</p>
      </div>
    );
  }

  const totalNeto = tickets.reduce((sum, t) => sum + (t.netWeight ?? 0), 0);
  const adjustments = tickets
    .filter((t) => t.netAdjustment !== undefined)
    .map((t) => t.netAdjustment as number);
  const avgAdjustment =
    adjustments.length > 0
      ? adjustments.reduce((a, b) => a + b, 0) / adjustments.length
      : null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-3 font-medium text-gray-500 whitespace-nowrap">Fecha</th>
            <th className="text-left py-3 px-3 font-medium text-gray-500 whitespace-nowrap"># Ticket</th>
            <th className="text-left py-3 px-3 font-medium text-gray-500 whitespace-nowrap">Cultivo</th>
            <th className="text-left py-3 px-3 font-medium text-gray-500 whitespace-nowrap hidden md:table-cell">Camión</th>
            <th className="text-right py-3 px-3 font-medium text-gray-500 whitespace-nowrap hidden sm:table-cell">Bruto kg</th>
            <th className="text-right py-3 px-3 font-medium text-gray-500 whitespace-nowrap hidden sm:table-cell">Tara kg</th>
            <th className="text-right py-3 px-3 font-medium text-gray-500 whitespace-nowrap">Neto kg</th>
            <th className="text-center py-3 px-3 font-medium text-gray-500 whitespace-nowrap hidden lg:table-cell">Grado</th>
            <th className="text-right py-3 px-3 font-medium text-gray-500 whitespace-nowrap hidden lg:table-cell">Ajuste %</th>
            <th className="text-center py-3 px-3 font-medium text-gray-500">Estado</th>
            <th className="py-3 px-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {tickets.map((ticket) => (
            <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
              <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                {ticket.grossAt
                  ? format(new Date(ticket.grossAt), 'dd/MM/yy', { locale: es })
                  : '—'}
              </td>
              <td className="py-3 px-3 font-medium text-gray-900 whitespace-nowrap">
                {ticket.ticketNumber}
              </td>
              <td className="py-3 px-3 text-gray-600">{ticket.commodityName ?? '—'}</td>
              <td className="py-3 px-3 text-gray-600 hidden md:table-cell">{ticket.vehiclePlate ?? '—'}</td>
              <td className="py-3 px-3 text-right text-gray-600 hidden sm:table-cell">
                {ticket.grossWeight ? ticket.grossWeight.toLocaleString('es-AR') : '—'}
              </td>
              <td className="py-3 px-3 text-right text-gray-600 hidden sm:table-cell">
                {ticket.tareWeight ? ticket.tareWeight.toLocaleString('es-AR') : '—'}
              </td>
              <td className="py-3 px-3 text-right font-semibold text-gray-900">
                {ticket.netWeight ? ticket.netWeight.toLocaleString('es-AR') : '—'}
              </td>
              <td className="py-3 px-3 text-center text-gray-600 hidden lg:table-cell">
                {ticket.grade ?? '—'}
              </td>
              <td className="py-3 px-3 text-right hidden lg:table-cell">
                {ticket.netAdjustment !== undefined ? (
                  <span className={cn(
                    'text-sm font-medium',
                    ticket.netAdjustment >= 0 ? 'text-green-600' : 'text-red-600',
                  )}>
                    {ticket.netAdjustment >= 0 ? '+' : ''}
                    {ticket.netAdjustment.toFixed(2)}%
                  </span>
                ) : '—'}
              </td>
              <td className="py-3 px-3 text-center">
                <span className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                  statusStyle[ticket.status as ScaleStatus] ?? 'bg-gray-100 text-gray-700',
                )}>
                  {statusLabel[ticket.status as ScaleStatus] ?? ticket.status}
                </span>
              </td>
              <td className="py-3 px-3">
                <div className="flex items-center gap-1">
                  <Link
                    href={`/portal/mis-tickets/${ticket.id}`}
                    className="text-guay-600 hover:text-guay-700 p-1 rounded"
                    title="Ver detalle"
                  >
                    <FileText className="w-4 h-4" />
                  </Link>
                  <button
                    className="text-gray-400 hover:text-gray-600 p-1 rounded"
                    title="Descargar PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        {/* Totals footer */}
        <tfoot>
          <tr className="border-t-2 border-gray-200 bg-gray-50">
            <td colSpan={6} className="py-3 px-3 font-semibold text-gray-700 hidden sm:table-cell">
              Total ({tickets.length} tickets)
            </td>
            <td colSpan={3} className="py-3 px-3 font-semibold text-gray-700 sm:hidden">
              Total
            </td>
            <td className="py-3 px-3 text-right font-bold text-gray-900">
              {totalNeto.toLocaleString('es-AR')} kg
              <span className="block text-xs font-normal text-gray-500">
                {kgToTon(totalNeto)} tn
              </span>
            </td>
            <td className="py-3 px-3 text-center hidden lg:table-cell"></td>
            <td className="py-3 px-3 text-right hidden lg:table-cell">
              {avgAdjustment !== null ? (
                <span className={cn(
                  'text-sm font-medium',
                  avgAdjustment >= 0 ? 'text-green-600' : 'text-red-600',
                )}>
                  {avgAdjustment >= 0 ? '+' : ''}{avgAdjustment.toFixed(2)}%
                </span>
              ) : '—'}
            </td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
