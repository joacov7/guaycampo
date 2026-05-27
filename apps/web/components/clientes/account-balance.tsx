'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import type { AccountMovement } from '@/hooks/use-clients';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface AccountBalanceProps {
  balance: number | undefined;
  movements: AccountMovement[] | undefined;
  isLoading?: boolean;
}

function formatARS(value: number) {
  return value.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });
}

export function AccountBalance({ balance, movements, isLoading }: AccountBalanceProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const currentBalance = balance ?? 0;
  const isPositive = currentBalance >= 0;

  return (
    <div className="space-y-4">
      {/* Balance card */}
      <div
        className={cn(
          'rounded-xl p-5 border',
          isPositive
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200',
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              isPositive ? 'bg-green-100' : 'bg-red-100',
            )}
          >
            <DollarSign
              className={cn('w-5 h-5', isPositive ? 'text-green-700' : 'text-red-700')}
            />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Saldo Cuenta Corriente
            </p>
            <p
              className={cn(
                'text-2xl font-bold',
                isPositive ? 'text-green-700' : 'text-red-700',
              )}
            >
              {isPositive ? '+' : ''}
              {formatARS(currentBalance)}
            </p>
          </div>
          <div className="ml-auto">
            {isPositive ? (
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-100 px-2 py-1 rounded-full">
                <TrendingUp className="w-3 h-3" />
                A cobrar
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-red-600 font-medium bg-red-100 px-2 py-1 rounded-full">
                <TrendingDown className="w-3 h-3" />
                Deuda
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Movements */}
      {movements && movements.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Movimientos recientes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Fecha
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Concepto
                  </th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Monto
                  </th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide hidden sm:table-cell">
                    Saldo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {movements.map((movement) => {
                  const isCredit = movement.amount >= 0;
                  return (
                    <tr key={movement.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {format(new Date(movement.date), "d 'de' MMM yyyy", { locale: es })}
                      </td>
                      <td className="px-4 py-3 text-gray-800">
                        <div>
                          <span>{movement.concept}</span>
                          {movement.reference && (
                            <span className="text-xs text-gray-400 ml-2">#{movement.reference}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        <span className={isCredit ? 'text-green-700' : 'text-red-600'}>
                          {isCredit ? '+' : ''}
                          {formatARS(movement.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 hidden sm:table-cell">
                        {formatARS(movement.balance)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 text-sm">Sin movimientos registrados</p>
        </div>
      )}
    </div>
  );
}
