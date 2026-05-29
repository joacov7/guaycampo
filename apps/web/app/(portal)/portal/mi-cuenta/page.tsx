'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download } from 'lucide-react';
import { api } from '@/lib/api';
import type { AccountSummary, AccountStatement } from '@/hooks/use-accounts';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const ARS = (amount: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);

export default function MiCuentaPage() {
  const today = new Date();
  const [from, setFrom] = useState(() => subDays(today, 60));
  const [to, setTo] = useState(() => today);

  const fromStr = from.toISOString().split('T')[0];
  const toStr = to.toISOString().split('T')[0];

  const { data: balance, isLoading: balanceLoading } = useQuery<AccountSummary>({
    queryKey: ['portal-my-account-balance'],
    queryFn: () => api.get<AccountSummary>('/billing/account/my/balance'),
    staleTime: 30_000,
  });

  const { data: statement, isLoading: statementLoading } = useQuery<AccountStatement>({
    queryKey: ['portal-my-account-statement', fromStr, toStr],
    queryFn: () =>
      api.get<AccountStatement>('/billing/account/my/statement', {
        params: { from: fromStr, to: toStr },
      }),
    staleTime: 30_000,
  });

  function handleDownloadPdf() {
    window.open(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002'}/billing/account/my/statement/pdf?from=${fromStr}&to=${toStr}`,
      '_blank',
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Mi Cuenta Corriente</h1>
        <p className="text-sm text-gray-500 mt-0.5">Estado de cuenta e historial de movimientos</p>
      </div>

      {/* Balance card */}
      {balanceLoading ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : balance && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Saldo actual</p>
            <p
              className={cn(
                'text-3xl font-bold mt-1',
                balance.currentBalance > 0
                  ? 'text-green-600'
                  : balance.currentBalance < 0
                  ? 'text-red-600'
                  : 'text-gray-500',
              )}
            >
              {ARS(balance.currentBalance)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {balance.currentBalance > 0
                ? 'Saldo a su favor'
                : balance.currentBalance < 0
                ? 'Saldo deudor'
                : 'Sin movimientos'}
            </p>
          </div>
        </div>
      )}

      {/* Date range + PDF */}
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
        <button
          onClick={handleDownloadPdf}
          className="flex items-center gap-2 px-3 py-2 border border-gray-200 hover:border-gray-300 rounded-lg text-sm text-gray-600 transition-colors"
        >
          <Download className="w-4 h-4" />
          Descargar PDF
        </button>
      </div>

      {/* Movements table */}
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
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Saldo inicial del período
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

            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                Saldo al final del período
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
    </div>
  );
}
