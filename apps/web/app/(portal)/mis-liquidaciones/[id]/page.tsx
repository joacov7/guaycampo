'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronLeft,
  Download,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface TicketLine {
  ticketId: string;
  ticketNumber: string;
  date: string;
  grossWeight: number;
  netWeight: number;
  commodityName: string;
}

interface LiquidationDetail {
  id: string;
  liquidationNumber: string;
  period: string;
  commodityName: string;
  clientName: string;
  // Kg y precio
  netKg: number;
  basePrice: number;
  qualityAdjustmentPct: number;
  finalPrice: number;
  grossAmount: number;
  // Retenciones
  vatPct: number;
  vatAmount: number;
  ingresosBrutosPct: number;
  ingresosBrutosAmount: number;
  gananciasPct: number;
  gananciasAmount: number;
  otherRetentions: number;
  totalRetentions: number;
  // Resultado
  netAmount: number;
  status: 'pendiente' | 'pagado';
  paidAt?: string;
  // Tickets incluidos
  tickets: TicketLine[];
}

export default function LiquidacionDetailPage() {
  const params = useParams<{ id: string }>();
  const [ticketsExpanded, setTicketsExpanded] = useState(false);

  const { data: liq, isLoading } = useQuery<LiquidationDetail>({
    queryKey: ['portal-liquidacion', params.id],
    queryFn: () => api.get<LiquidationDetail>(`/liquidaciones/${params.id}`),
    enabled: Boolean(params.id),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-8 w-56 bg-gray-100 rounded animate-pulse" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!liq) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Liquidación no encontrada</p>
        <Link
          href="/portal/mis-liquidaciones"
          className="mt-4 text-guay-600 hover:underline text-sm"
        >
          Volver a liquidaciones
        </Link>
      </div>
    );
  }

  const isPaid = liq.status === 'pagado';

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/portal/mis-liquidaciones"
            className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">
                Liquidación {liq.liquidationNumber}
              </h1>
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
                  isPaid
                    ? 'bg-green-50 text-green-700'
                    : 'bg-yellow-50 text-yellow-700',
                )}
              >
                {isPaid ? (
                  <><CheckCircle className="w-3 h-3" /> Pagada</>
                ) : (
                  <><Clock className="w-3 h-3" /> Pendiente de pago</>
                )}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {liq.period} · {liq.commodityName}
              {isPaid && liq.paidAt && (
                <span className="ml-2">
                  · Pagado el {format(new Date(liq.paidAt), 'dd/MM/yyyy', { locale: es })}
                </span>
              )}
            </p>
          </div>
        </div>
        <button className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors flex-shrink-0">
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Descargar PDF</span>
        </button>
      </div>

      {/* Tickets incluidos */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setTicketsExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div>
            <h2 className="text-sm font-semibold text-gray-900 text-left">
              Tickets incluidos
            </h2>
            <p className="text-xs text-gray-500 mt-0.5 text-left">
              {liq.tickets.length} pesajes ·{' '}
              {liq.netKg.toLocaleString('es-AR')} kg netos
            </p>
          </div>
          {ticketsExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {ticketsExpanded && (
          <div className="border-t border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">
                    Fecha
                  </th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">
                    # Ticket
                  </th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500 hidden sm:table-cell">
                    Cultivo
                  </th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium text-gray-500 hidden md:table-cell">
                    Bruto kg
                  </th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium text-gray-500">
                    Neto kg
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {liq.tickets.map((t) => (
                  <tr key={t.ticketId} className="hover:bg-gray-50">
                    <td className="py-2.5 px-4 text-gray-600">
                      {format(new Date(t.date), 'dd/MM/yy', { locale: es })}
                    </td>
                    <td className="py-2.5 px-4">
                      <Link
                        href={`/portal/mis-tickets/${t.ticketId}`}
                        className="font-medium text-guay-600 hover:text-guay-700"
                      >
                        {t.ticketNumber}
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 text-gray-600 hidden sm:table-cell">
                      {t.commodityName}
                    </td>
                    <td className="py-2.5 px-4 text-right text-gray-600 hidden md:table-cell">
                      {t.grossWeight.toLocaleString('es-AR')}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-gray-900">
                      {t.netWeight.toLocaleString('es-AR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cálculo de precio */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Cálculo del precio</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Precio base</span>
            <span className="font-medium text-gray-900">
              ${liq.basePrice.toLocaleString('es-AR')} / tn
            </span>
          </div>
          {liq.qualityAdjustmentPct !== 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Ajuste por calidad</span>
              <span
                className={cn(
                  'font-medium',
                  liq.qualityAdjustmentPct > 0 ? 'text-green-600' : 'text-red-600',
                )}
              >
                {liq.qualityAdjustmentPct > 0 ? '+' : ''}
                {liq.qualityAdjustmentPct.toFixed(2)}%
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-100 pt-2 mt-2">
            <span className="font-semibold text-gray-700">Precio final</span>
            <span className="font-bold text-gray-900">
              ${liq.finalPrice.toLocaleString('es-AR')} / tn
            </span>
          </div>
          <div className="flex justify-between text-gray-500 text-xs">
            <span>{liq.netKg.toLocaleString('es-AR')} kg × ${liq.finalPrice.toLocaleString('es-AR')} / tn</span>
            <span className="font-medium text-gray-700">
              ${liq.grossAmount.toLocaleString('es-AR')}
            </span>
          </div>
        </div>
      </div>

      {/* Retenciones */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Retenciones</h2>
        <div className="space-y-2 text-sm">
          {liq.vatAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">IVA ({liq.vatPct}%)</span>
              <span className="text-red-600">-${liq.vatAmount.toLocaleString('es-AR')}</span>
            </div>
          )}
          {liq.ingresosBrutosAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">
                Ingresos brutos ({liq.ingresosBrutosPct}%)
              </span>
              <span className="text-red-600">
                -${liq.ingresosBrutosAmount.toLocaleString('es-AR')}
              </span>
            </div>
          )}
          {liq.gananciasAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">
                Ganancias ({liq.gananciasPct}%)
              </span>
              <span className="text-red-600">
                -${liq.gananciasAmount.toLocaleString('es-AR')}
              </span>
            </div>
          )}
          {liq.otherRetentions > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Otras retenciones</span>
              <span className="text-red-600">
                -${liq.otherRetentions.toLocaleString('es-AR')}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-100 pt-2 mt-2">
            <span className="font-semibold text-gray-700">Total retenciones</span>
            <span className="font-bold text-red-600">
              -${liq.totalRetentions.toLocaleString('es-AR')}
            </span>
          </div>
        </div>
      </div>

      {/* Total a cobrar */}
      <div className="bg-guay-50 rounded-xl border border-guay-200 p-5">
        <div className="flex items-baseline justify-between">
          <span className="text-base font-semibold text-guay-800">
            {isPaid ? 'Total cobrado' : 'Total a cobrar'}
          </span>
          <span className="text-3xl font-bold text-guay-700">
            ${liq.netAmount.toLocaleString('es-AR')}
          </span>
        </div>
        {isPaid && liq.paidAt && (
          <p className="text-sm text-guay-600 mt-2 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4" />
            Acreditado el{' '}
            {format(new Date(liq.paidAt), "d 'de' MMMM yyyy", { locale: es })}
          </p>
        )}
        {!isPaid && (
          <p className="text-sm text-guay-600 mt-2">
            Pendiente de acreditación
          </p>
        )}
      </div>
    </div>
  );
}
