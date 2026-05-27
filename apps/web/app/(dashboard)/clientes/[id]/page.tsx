'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  useClient,
  useClientTickets,
  useClientAccount,
  useClientLiquidations,
  useUpdateClient,
  type UpdateClientDto,
} from '@/hooks/use-clients';
import { ClientForm, type ClientFormValues } from '@/components/clientes/client-form';
import { AccountBalance } from '@/components/clientes/account-balance';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ScaleStatus } from '@guaycampo/shared-types';
import type { IScaleTicket } from '@guaycampo/shared-types';

type Tab = 'datos' | 'tickets' | 'liquidaciones' | 'cuenta' | 'turnos';

const TABS: { id: Tab; label: string }[] = [
  { id: 'datos', label: 'Datos' },
  { id: 'tickets', label: 'Tickets' },
  { id: 'liquidaciones', label: 'Liquidaciones' },
  { id: 'cuenta', label: 'Cuenta Corriente' },
  { id: 'turnos', label: 'Turnos' },
];

const scaleStatusLabels: Partial<Record<ScaleStatus, string>> = {
  [ScaleStatus.PENDIENTE]: 'Pendiente',
  [ScaleStatus.PESADA_BRUTA]: 'Bruto',
  [ScaleStatus.PESADA_TARA]: 'Tara',
  [ScaleStatus.COMPLETADO]: 'Completado',
  [ScaleStatus.ANULADO]: 'Anulado',
};

const scaleStatusStyles: Partial<Record<ScaleStatus, string>> = {
  [ScaleStatus.COMPLETADO]: 'bg-green-50 text-green-700',
  [ScaleStatus.ANULADO]: 'bg-red-50 text-red-700',
  [ScaleStatus.PENDIENTE]: 'bg-yellow-50 text-yellow-700',
};

function TicketsTab({ clientId }: { clientId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useClientTickets(clientId, page);
  const tickets: IScaleTicket[] = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)}
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-400 text-sm">Sin tickets registrados</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide">Ticket</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide hidden sm:table-cell">Fecha</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide">Neto (kg)</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide hidden md:table-cell">Patente</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">#{ticket.ticketNumber}</td>
                <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">
                  {ticket.grossAt ? format(new Date(ticket.grossAt), "d 'de' MMM yyyy", { locale: es }) : '—'}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">
                  {ticket.netWeight ? ticket.netWeight.toLocaleString('es-AR') : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden md:table-cell">
                  {ticket.plateConfirmed ?? ticket.plateDetected ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    scaleStatusStyles[ticket.status] ?? 'bg-gray-100 text-gray-600',
                  )}>
                    {scaleStatusLabels[ticket.status] ?? ticket.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(data?.totalPages ?? 1) > 1 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className="px-3 py-1.5 rounded border text-sm disabled:opacity-40">Anterior</button>
          <span className="text-sm text-gray-500 py-1.5">Pág. {page} / {data?.totalPages}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= (data?.totalPages ?? 1)} className="px-3 py-1.5 rounded border text-sm disabled:opacity-40">Siguiente</button>
        </div>
      )}
    </div>
  );
}

function LiquidacionesTab({ clientId }: { clientId: string }) {
  const { data, isLoading } = useClientLiquidations(clientId);
  const items = data?.data ?? [];

  if (isLoading) {
    return <Skeleton className="h-32 w-full rounded-xl" />;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-400 text-sm">Sin liquidaciones registradas</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={String(item.id)} className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-900">Liquidación #{String(item.id).slice(-6)}</p>
        </div>
      ))}
    </div>
  );
}

function TurnosTab({ clientId }: { clientId: string }) {
  const { data, isLoading } = useClientTickets(clientId);
  if (isLoading) return <Skeleton className="h-24 w-full rounded-xl" />;
  return (
    <div className="text-center py-10">
      <p className="text-gray-400 text-sm">Historial de turnos del cliente</p>
      <p className="text-xs text-gray-300 mt-1">Próximamente</p>
    </div>
  );
}

export default function ClienteDetallePage() {
  const params = useParams<{ id: string }>();
  const clientId = params.id;
  const [activeTab, setActiveTab] = useState<Tab>('datos');
  const [saved, setSaved] = useState(false);

  const { data: client, isLoading } = useClient(clientId);
  const updateClient = useUpdateClient();
  const { data: accountData, isLoading: accountLoading } = useClientAccount(clientId);

  function handleSubmit(values: ClientFormValues) {
    const data: UpdateClientDto = {
      ...values,
      email: values.email || undefined,
    };
    updateClient.mutate(
      { id: clientId, data },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
        },
      },
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/clientes"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Clientes
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-900 font-medium">
          {isLoading ? '...' : client?.name ?? 'Cliente'}
        </span>
      </div>

      {/* Header card */}
      {isLoading ? (
        <Skeleton className="h-20 w-full rounded-xl" />
      ) : client && (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{client.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5 font-mono">{client.cuit}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Saldo CC</p>
            <p className={cn(
              'text-lg font-bold',
              client.currentAccount >= 0 ? 'text-green-700' : 'text-red-600',
            )}>
              {client.currentAccount >= 0 ? '+' : ''}
              {client.currentAccount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0',
                activeTab === tab.id
                  ? 'text-guay-700 border-b-2 border-guay-600 bg-guay-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'datos' && (
            <div>
              {saved && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                  Cambios guardados correctamente
                </div>
              )}
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : client && (
                <ClientForm
                  defaultValues={{
                    name: client.name,
                    cuit: client.cuit,
                    clientType: client.clientType,
                    address: client.address,
                    locality: client.locality,
                    province: client.province,
                    ivaCondition: client.ivaCondition,
                    creditLimit: client.creditLimit,
                  }}
                  onSubmit={handleSubmit}
                  isLoading={updateClient.isPending}
                  isEditMode
                />
              )}
            </div>
          )}

          {activeTab === 'tickets' && <TicketsTab clientId={clientId} />}
          {activeTab === 'liquidaciones' && <LiquidacionesTab clientId={clientId} />}
          {activeTab === 'cuenta' && (
            <AccountBalance
              balance={accountData?.balance}
              movements={accountData?.movements}
              isLoading={accountLoading}
            />
          )}
          {activeTab === 'turnos' && <TurnosTab clientId={clientId} />}
        </div>
      </div>
    </div>
  );
}
