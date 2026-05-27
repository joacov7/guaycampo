'use client';

import { useQuery } from '@tanstack/react-query';
import { DollarSign } from 'lucide-react';
import { api } from '@/lib/api';
import { LiquidationRow, type LiquidationRowData } from '@/components/portal/liquidation-row';
import type { PaginatedResponse } from '@guaycampo/shared-types';

export default function MisLiquidacionesPage() {
  const { data, isLoading } = useQuery<PaginatedResponse<LiquidationRowData>>({
    queryKey: ['portal-liquidaciones'],
    queryFn: () =>
      api.get<PaginatedResponse<LiquidationRowData>>('/liquidaciones', {
        params: { mine: true, limit: 50 },
      }),
    staleTime: 60_000,
  });

  const liquidaciones = data?.data ?? [];

  const totalNeto = liquidaciones.reduce((s, l) => s + l.netAmount, 0);
  const totalBruto = liquidaciones.reduce((s, l) => s + l.grossAmount, 0);
  const totalRetenciones = liquidaciones.reduce((s, l) => s + l.retentions, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Mis Liquidaciones</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Historial de liquidaciones de granos
        </p>
      </div>

      {/* Resumen */}
      {!isLoading && liquidaciones.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Total bruto</p>
            <p className="text-base font-bold text-gray-900">
              ${totalBruto.toLocaleString('es-AR')}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Retenciones</p>
            <p className="text-base font-bold text-red-600">
              -${totalRetenciones.toLocaleString('es-AR')}
            </p>
          </div>
          <div className="bg-guay-50 rounded-xl border border-guay-200 p-4 text-center">
            <p className="text-xs text-guay-600 mb-1 font-medium">Neto total</p>
            <p className="text-base font-bold text-guay-700">
              ${totalNeto.toLocaleString('es-AR')}
            </p>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : liquidaciones.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Sin liquidaciones</p>
            <p className="text-sm text-gray-400 mt-1">
              Las liquidaciones emitidas aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-3 font-medium text-gray-500 whitespace-nowrap">
                    Período
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 whitespace-nowrap">
                    # Liq.
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500">
                    Cultivo
                  </th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 hidden sm:table-cell whitespace-nowrap">
                    Kg netos
                  </th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 hidden md:table-cell whitespace-nowrap">
                    Precio/tn
                  </th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 hidden lg:table-cell whitespace-nowrap">
                    Bruto
                  </th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 hidden lg:table-cell whitespace-nowrap">
                    Retenciones
                  </th>
                  <th className="text-right py-3 px-3 font-medium text-gray-900 whitespace-nowrap">
                    Neto a cobrar
                  </th>
                  <th className="text-center py-3 px-3 font-medium text-gray-500">
                    Estado
                  </th>
                  <th className="py-3 px-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {liquidaciones.map((liq) => (
                  <LiquidationRow key={liq.id} liquidation={liq} />
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td
                    colSpan={7}
                    className="py-3 px-3 font-semibold text-gray-700 hidden lg:table-cell"
                  >
                    Total ({liquidaciones.length} liquidaciones)
                  </td>
                  <td
                    colSpan={2}
                    className="py-3 px-3 font-semibold text-gray-700 lg:hidden"
                  >
                    Total
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-guay-700">
                    ${totalNeto.toLocaleString('es-AR')}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
