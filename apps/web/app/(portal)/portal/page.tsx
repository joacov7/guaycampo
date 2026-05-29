'use client';

import { useQuery } from '@tanstack/react-query';
import { Warehouse, CalendarDays, FileText, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { SummaryCard } from '@/components/portal/summary-card';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ITruckShift, IScaleTicket } from '@guaycampo/shared-types';
import type { StockCommodityItem } from '@/components/portal/stock-by-commodity';
import Link from 'next/link';

interface MyBalance {
  balance: number;
}

function formatKgTon(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)} tn`;
  }
  return `${kg.toLocaleString('es-AR')} kg`;
}

export default function PortalHomePage() {
  const { data: stock, isLoading: stockLoading } = useQuery<StockCommodityItem[]>({
    queryKey: ['portal-stock-summary'],
    queryFn: () => api.get<StockCommodityItem[]>('/stock/my'),
    staleTime: 60_000,
  });

  const { data: shifts, isLoading: shiftsLoading } = useQuery<{ data: ITruckShift[] }>({
    queryKey: ['portal-shifts-pending'],
    queryFn: () =>
      api.get<{ data: ITruckShift[] }>('/trucks/shifts', {
        params: { mine: true, status: 'pendiente', limit: 3 },
      }),
    staleTime: 30_000,
  });

  const { data: lastTicketRes, isLoading: ticketLoading } = useQuery<{ data: IScaleTicket[] }>({
    queryKey: ['portal-last-ticket'],
    queryFn: () =>
      api.get<{ data: IScaleTicket[] }>('/tickets', {
        params: { mine: true, limit: 1 },
      }),
    staleTime: 30_000,
  });

  const { data: balance, isLoading: balanceLoading } = useQuery<MyBalance>({
    queryKey: ['portal-balance'],
    queryFn: () => api.get<MyBalance>('/account/my/balance'),
    staleTime: 60_000,
  });

  const totalStockKg = stock?.reduce((s, i) => s + i.totalKg, 0) ?? 0;
  const pendingShiftsCount = shifts?.data?.length ?? 0;
  const nextShift = shifts?.data?.[0];
  const lastTicket = lastTicketRes?.data?.[0];
  const balanceValue = balance?.balance ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Mi resumen</h1>
        <p className="text-sm text-gray-500 mt-0.5 capitalize">
          {new Date().toLocaleDateString('es-AR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Stock actual */}
        <Link href="/portal/mi-stock" className="block">
          <SummaryCard
            title="Mi stock en planta"
            value={totalStockKg > 0 ? formatKgTon(totalStockKg) : '—'}
            subtitle={
              stock && stock.length > 0
                ? stock.map((i) => i.commodityName).join(', ')
                : 'Sin stock registrado'
            }
            icon={Warehouse}
            accent="green"
            loading={stockLoading}
          />
        </Link>

        {/* Turnos pendientes */}
        <Link href="/portal/mis-turnos" className="block">
          <SummaryCard
            title="Próximos turnos"
            value={pendingShiftsCount > 0 ? pendingShiftsCount : '—'}
            subtitle={
              nextShift?.shift?.date
                ? `Próximo: ${format(new Date(nextShift.shift.date), "EEEE d 'de' MMMM", { locale: es })}`
                : 'Sin turnos pendientes'
            }
            icon={CalendarDays}
            accent="blue"
            loading={shiftsLoading}
          />
        </Link>

        {/* Último ticket */}
        <Link href="/portal/mis-tickets" className="block">
          <SummaryCard
            title="Último ticket"
            value={lastTicket?.ticketNumber ?? '—'}
            subtitle={
              lastTicket
                ? `${lastTicket.grossAt ? format(new Date(lastTicket.grossAt), 'dd/MM/yyyy', { locale: es }) : '—'} · ${lastTicket.netWeight ? formatKgTon(lastTicket.netWeight) : 'En proceso'}`
                : 'Sin tickets registrados'
            }
            icon={FileText}
            accent="purple"
            loading={ticketLoading}
          />
        </Link>

        {/* Cuenta corriente */}
        <Link href="/portal/mis-liquidaciones" className="block">
          <SummaryCard
            title="Cuenta corriente"
            value={
              !balanceLoading && balance !== undefined
                ? `$${Math.abs(balanceValue).toLocaleString('es-AR')}`
                : '—'
            }
            subtitle={
              balanceValue > 0
                ? 'Saldo a cobrar'
                : balanceValue < 0
                ? 'Saldo deudor'
                : 'Sin movimientos'
            }
            icon={DollarSign}
            accent={balanceValue >= 0 ? 'green' : 'orange'}
            loading={balanceLoading}
          >
            {!balanceLoading && balance !== undefined && balanceValue !== 0 && (
              <p className={cn(
                'text-xs font-medium mt-1',
                balanceValue > 0 ? 'text-green-600' : 'text-orange-600',
              )}>
                {balanceValue > 0 ? 'A su favor' : 'Deuda pendiente'}
              </p>
            )}
          </SummaryCard>
        </Link>
      </div>

      {/* Acceso rápido */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Acciones rápidas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/portal/mis-turnos/nuevo"
            className="flex flex-col items-center gap-2 p-4 bg-guay-50 hover:bg-guay-100 rounded-xl transition-colors text-center"
          >
            <CalendarDays className="w-6 h-6 text-guay-600" />
            <span className="text-xs font-medium text-guay-700">Reservar turno</span>
          </Link>
          <Link
            href="/portal/mis-tickets"
            className="flex flex-col items-center gap-2 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-center"
          >
            <FileText className="w-6 h-6 text-gray-500" />
            <span className="text-xs font-medium text-gray-700">Ver tickets</span>
          </Link>
          <Link
            href="/portal/mis-liquidaciones"
            className="flex flex-col items-center gap-2 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-center"
          >
            <DollarSign className="w-6 h-6 text-gray-500" />
            <span className="text-xs font-medium text-gray-700">Liquidaciones</span>
          </Link>
          <Link
            href="/portal/mi-stock"
            className="flex flex-col items-center gap-2 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-center"
          >
            <Warehouse className="w-6 h-6 text-gray-500" />
            <span className="text-xs font-medium text-gray-700">Mi stock</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
