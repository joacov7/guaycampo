'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useAccountBalance,
  useAccountStatement,
  useRegisterPayment,
} from '@/hooks/use-accounts';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const ARS = (amount: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);

const paymentSchema = z.object({
  amount: z.coerce.number().min(0.01, 'El monto debe ser mayor a 0'),
  description: z.string().optional(),
  documentNumber: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

function PaymentModal({
  clientId,
  onClose,
}: {
  clientId: string;
  onClose: () => void;
}) {
  const registerPayment = useRegisterPayment(clientId);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
  });

  async function onSubmit(values: PaymentFormValues) {
    setError(null);
    try {
      await registerPayment.mutateAsync({
        amount: values.amount,
        description: values.description || undefined,
        documentNumber: values.documentNumber || undefined,
      });
      onClose();
    } catch {
      setError('Error al registrar el pago. Intente nuevamente.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-md mx-4 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Registrar Pago</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
            aria-label="Cerrar"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Monto (ARS) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              {...register('amount')}
              placeholder="0.00"
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
            />
            {errors.amount && (
              <p className="text-xs text-red-600">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Descripción</label>
            <input
              type="text"
              {...register('description')}
              placeholder="Pago recibido"
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">N° de Recibo / Documento</label>
            <input
              type="text"
              {...register('documentNumber')}
              placeholder="REC-001"
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 px-4 border border-gray-200 hover:border-gray-300 rounded-lg text-sm text-gray-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || registerPayment.isPending}
              className="flex-1 h-10 px-4 bg-guay-600 hover:bg-guay-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {registerPayment.isPending ? 'Registrando...' : 'Registrar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CuentaClienteDetailPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;

  const today = new Date();
  const [from, setFrom] = useState(() => subDays(today, 90));
  const [to, setTo] = useState(() => today);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const { data: balance, isLoading: balanceLoading } = useAccountBalance(clientId);
  const { data: statement, isLoading: statementLoading } = useAccountStatement(clientId, from, to);

  function handleDownloadPdf() {
    const fromStr = from.toISOString().split('T')[0];
    const toStr = to.toISOString().split('T')[0];
    window.open(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002'}/billing/account/${clientId}/statement/pdf?from=${fromStr}&to=${toStr}`,
      '_blank',
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/cuentas-corrientes"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Cuentas Corrientes
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-900 font-medium">
          {balanceLoading ? '...' : balance?.clientName ?? 'Cliente'}
        </span>
      </div>

      {/* Header card */}
      {balanceLoading ? (
        <Skeleton className="h-20 w-full rounded-xl" />
      ) : balance && (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{balance.clientName}</h1>
            <p className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">Cuenta Corriente</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Saldo actual</p>
            <p
              className={cn(
                'text-2xl font-bold',
                balance.currentBalance > 0
                  ? 'text-green-600'
                  : balance.currentBalance < 0
                  ? 'text-red-600'
                  : 'text-gray-500',
              )}
            >
              {ARS(balance.currentBalance)}
            </p>
          </div>
        </div>
      )}

      {/* Date range + actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 whitespace-nowrap">Desde</label>
            <input
              type="date"
              value={from.toISOString().split('T')[0]}
              onChange={(e) => setFrom(new Date(e.target.value))}
              className="h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 whitespace-nowrap">Hasta</label>
            <input
              type="date"
              value={to.toISOString().split('T')[0]}
              onChange={(e) => setTo(new Date(e.target.value))}
              className="h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 hover:border-gray-300 rounded-lg text-sm text-gray-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-guay-600 hover:bg-guay-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <FileText className="w-4 h-4" />
            Registrar Pago
          </button>
        </div>
      </div>

      {/* Statement table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {statementLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded" />
            ))}
          </div>
        ) : !statement ? (
          <div className="p-8 text-center text-sm text-gray-400">Sin datos</div>
        ) : (
          <>
            {/* Opening balance */}
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Saldo inicial
              </span>
              <span className="text-sm font-semibold text-gray-700">
                {ARS(statement.openingBalance)}
              </span>
            </div>

            {statement.movements.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                Sin movimientos en el período seleccionado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide">
                        Fecha
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide hidden sm:table-cell">
                        Tipo
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide">
                        Descripción
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide hidden md:table-cell">
                        Doc. Nro
                      </th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide">
                        Débito
                      </th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide hidden sm:table-cell">
                        Crédito
                      </th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide">
                        Saldo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {statement.movements.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {format(new Date(m.movementDate), "d MMM yyyy", { locale: es })}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs capitalize hidden sm:table-cell">
                          {m.movementType}
                        </td>
                        <td className="px-4 py-3 text-gray-900 text-xs">
                          {m.description ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden md:table-cell">
                          {m.documentNumber ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-xs">
                          {m.debit > 0 ? (
                            <span className="text-red-600 font-medium">{ARS(m.debit)}</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-xs hidden sm:table-cell">
                          {m.credit > 0 ? (
                            <span className="text-green-600 font-medium">{ARS(m.credit)}</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-xs">
                          <span
                            className={cn(
                              m.balanceAfter < 0 ? 'text-red-600' : 'text-gray-900',
                            )}
                          >
                            {ARS(m.balanceAfter)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Closing balance */}
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                Saldo final
              </span>
              <span
                className={cn(
                  'text-base font-bold',
                  statement.closingBalance < 0
                    ? 'text-red-600'
                    : statement.closingBalance > 0
                    ? 'text-green-600'
                    : 'text-gray-500',
                )}
              >
                {ARS(statement.closingBalance)}
              </span>
            </div>
          </>
        )}
      </div>

      {showPaymentModal && (
        <PaymentModal clientId={clientId} onClose={() => setShowPaymentModal(false)} />
      )}
    </div>
  );
}
