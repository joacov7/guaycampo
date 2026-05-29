'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, X, Loader2, FileText, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { useContract, useCancelContract, useLinkTicket } from '@/hooks/use-contracts';
import { cn } from '@/lib/utils';

type ContractStatus = 'borrador' | 'activo' | 'cumplido' | 'vencido' | 'cancelado';

const STATUS_LABELS: Record<ContractStatus, string> = {
  borrador: 'Borrador',
  activo: 'Activo',
  cumplido: 'Cumplido',
  vencido: 'Vencido',
  cancelado: 'Cancelado',
};

const STATUS_BADGE: Record<ContractStatus, string> = {
  activo: 'bg-green-100 text-green-700',
  cumplido: 'bg-blue-100 text-blue-700',
  vencido: 'bg-red-100 text-red-700',
  cancelado: 'bg-gray-100 text-gray-600',
  borrador: 'bg-yellow-100 text-yellow-700',
};

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  compra: 'Compra',
  venta: 'Venta',
  canje: 'Canje',
  deposito: 'Depósito',
};

const PRICE_CONDITION_LABELS: Record<string, string> = {
  fijado: 'Fijado',
  a_fijar: 'A fijar',
  canje: 'Canje',
  mercado: 'Mercado',
};

function StatusBadge({ status }: { status: ContractStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
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

function formatMoney(amount: number | null | undefined, currency = 'ARS') {
  if (amount == null) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
}

function formatTon(n: number | string) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(Number(n));
}

function LinkTicketModal({
  contractId,
  onClose,
}: {
  contractId: string;
  onClose: () => void;
}) {
  const [ticketId, setTicketId] = useState('');
  const linkTicket = useLinkTicket();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ticketId.trim()) return;
    linkTicket.mutate(
      { contractId, ticketId: ticketId.trim() },
      {
        onSuccess: () => onClose(),
      },
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Vincular ticket de balanza</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID del ticket
            </label>
            <input
              type="text"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              placeholder="Ingresá el ID del ticket..."
              className="w-full px-3 h-9 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
              autoFocus
            />
          </div>

          {linkTicket.isError && (
            <p className="text-sm text-red-600">
              Error al vincular el ticket. Verificá que el ID sea correcto.
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 hover:border-gray-300 rounded-lg text-sm text-gray-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!ticketId.trim() || linkTicket.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-guay-600 hover:bg-guay-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
            >
              {linkTicket.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Vincular
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ContratoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: contract, isLoading } = useContract(id);
  const cancelContract = useCancelContract();
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-guay-500" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500">Contrato no encontrado</p>
        <Link href="/dashboard/contratos" className="text-guay-600 hover:underline text-sm mt-2 block">
          Volver a contratos
        </Link>
      </div>
    );
  }

  const status = contract.status as ContractStatus;
  const pct = contract.fulfillmentPct;
  const quantityTon = Number(contract.quantityTon);
  const fulfilledTon = Number(contract.fulfilledTon);
  const remainingTon = quantityTon - fulfilledTon;

  // Warning: active and expires in less than 7 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const toDate = new Date(contract.toDate);
  const daysLeft = Math.ceil((toDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const showExpiryWarning = status === 'activo' && daysLeft <= 7 && daysLeft >= 0;

  const canCancel =
    status !== 'cancelado' && status !== 'cumplido' && !cancelContract.isPending;

  function handleCancel() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    cancelContract.mutate(id, {
      onSettled: () => setConfirming(false),
    });
  }

  const tickets = contract.scaleTickets ?? [];

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/contratos"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Contratos
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-900 font-medium">{contract.contractNumber}</span>
      </div>

      {/* Expiry warning */}
      {showExpiryWarning && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-medium">Próximo a vencer:</span> este contrato vence en {daysLeft} día{daysLeft !== 1 ? 's' : ''}.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900 font-mono">
                {contract.contractNumber}
              </h1>
              <StatusBadge status={status} />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {contract.client.name} · {contract.commodity.name}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {status === 'activo' && (
              <button
                onClick={() => setShowLinkModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:border-gray-300 rounded-lg text-sm text-gray-600 transition-colors"
              >
                <Link2 className="w-4 h-4" />
                <span className="hidden sm:inline">Vincular ticket</span>
              </button>
            )}
            {canCancel && (
              <button
                onClick={handleCancel}
                disabled={cancelContract.isPending}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  confirming
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'border border-gray-200 hover:border-red-300 text-red-600 hover:bg-red-50',
                )}
              >
                {cancelContract.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {confirming ? 'Confirmar cancelación' : 'Cancelar'}
              </button>
            )}
            {confirming && !cancelContract.isPending && (
              <button
                onClick={() => setConfirming(false)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                No
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Datos del contrato</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500">Cliente</p>
            <p className="text-sm font-medium text-gray-900 mt-0.5">{contract.client.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Producto</p>
            <p className="text-sm font-medium text-gray-900 mt-0.5">{contract.commodity.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Tipo</p>
            <p className="text-sm font-medium text-gray-900 mt-0.5">
              {CONTRACT_TYPE_LABELS[contract.contractType] ?? contract.contractType}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Condición de precio</p>
            <p className="text-sm font-medium text-gray-900 mt-0.5">
              {PRICE_CONDITION_LABELS[contract.priceCondition] ?? contract.priceCondition}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Precio por tonelada</p>
            <p className="text-sm font-medium text-gray-900 mt-0.5">
              {formatMoney(contract.pricePerTon ? Number(contract.pricePerTon) : null, contract.currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Cantidad</p>
            <p className="text-sm font-medium text-gray-900 mt-0.5">{formatTon(contract.quantityTon)} tn</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Fecha de inicio</p>
            <p className="text-sm font-medium text-gray-900 mt-0.5">{formatDate(contract.fromDate)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Fecha de fin</p>
            <p className="text-sm font-medium text-gray-900 mt-0.5">{formatDate(contract.toDate)}</p>
          </div>
          {contract.notes && (
            <div className="col-span-2 lg:col-span-3">
              <p className="text-xs text-gray-500">Notas</p>
              <p className="text-sm text-gray-700 mt-0.5">{contract.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Cumplimiento</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {formatTon(fulfilledTon)} tn entregadas de {formatTon(quantityTon)} tn
            </span>
            <span className="font-bold text-gray-900">{pct}%</span>
          </div>
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                pct >= 100 ? 'bg-blue-500' : pct >= 70 ? 'bg-green-500' : 'bg-guay-500',
              )}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Cumplido: {formatTon(fulfilledTon)} tn</span>
            <span>Pendiente: {formatTon(Math.max(0, remainingTon))} tn</span>
          </div>
        </div>
      </div>

      {/* Tickets table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            Tickets vinculados
            {tickets.length > 0 && (
              <span className="ml-2 text-xs font-normal text-gray-400">({tickets.length})</span>
            )}
          </h2>
          {status === 'activo' && (
            <button
              onClick={() => setShowLinkModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-guay-600 hover:text-guay-700 border border-guay-200 hover:border-guay-300 rounded-lg transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" />
              Vincular ticket
            </button>
          )}
        </div>

        {tickets.length === 0 ? (
          <div className="text-center py-10">
            <FileText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Sin tickets vinculados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left py-2.5 px-4 font-medium text-gray-500">Ticket #</th>
                  <th className="text-left py-2.5 px-4 font-medium text-gray-500">Fecha</th>
                  <th className="text-right py-2.5 px-4 font-medium text-gray-500">Peso neto (kg)</th>
                  <th className="text-center py-2.5 px-4 font-medium text-gray-500">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono text-gray-900">{ticket.ticketNumber}</td>
                    <td className="py-3 px-4 text-gray-600">{formatDate(ticket.createdAt)}</td>
                    <td className="py-3 px-4 text-right text-gray-700">
                      {ticket.netWeight != null
                        ? new Intl.NumberFormat('es-AR').format(Number(ticket.netWeight))
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {ticket.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showLinkModal && (
        <LinkTicketModal contractId={id} onClose={() => setShowLinkModal(false)} />
      )}
    </div>
  );
}
