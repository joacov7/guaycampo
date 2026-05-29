'use client';

import { useQuery } from '@tanstack/react-query';
import { FileSignature } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Contract, ContractStatus } from '@/hooks/use-contracts';

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

function formatDate(dateStr: string) {
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: es });
  } catch {
    return dateStr;
  }
}

function formatTon(n: number | string) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(Number(n));
}

export default function MisContratosPage() {
  const { data: contracts = [], isLoading } = useQuery<Contract[]>({
    queryKey: ['portal-mis-contratos'],
    queryFn: () => api.get<Contract[]>('/contracts'),
    staleTime: 60_000,
  });

  const activos = contracts.filter((c) => c.status === 'activo');
  const tonComprometidas = activos.reduce((s, c) => s + Number(c.quantityTon), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Mis Contratos</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Contratos de compra/venta de granos
        </p>
      </div>

      {/* Summary */}
      {!isLoading && contracts.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Contratos activos</p>
            <p className="text-xl font-bold text-gray-900">{activos.length}</p>
          </div>
          <div className="bg-guay-50 rounded-xl border border-guay-200 p-4 text-center">
            <p className="text-xs text-guay-600 mb-1 font-medium">Ton comprometidas</p>
            <p className="text-xl font-bold text-guay-700">
              {formatTon(tonComprometidas)}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-12">
            <FileSignature className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Sin contratos</p>
            <p className="text-sm text-gray-400 mt-1">
              Los contratos asignados aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-3 font-medium text-gray-500 whitespace-nowrap">Número</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500">Producto</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 hidden sm:table-cell">Tipo</th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 whitespace-nowrap">Cantidad</th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 whitespace-nowrap hidden sm:table-cell">Cumplido</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 hidden md:table-cell whitespace-nowrap">Desde</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 hidden md:table-cell whitespace-nowrap">Hasta</th>
                  <th className="text-center py-3 px-3 font-medium text-gray-500">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50">
                    <td className="py-3 px-3 font-mono font-medium text-gray-900 whitespace-nowrap">
                      {contract.contractNumber}
                    </td>
                    <td className="py-3 px-3 text-gray-700">{contract.commodity.name}</td>
                    <td className="py-3 px-3 text-gray-600 hidden sm:table-cell">
                      {CONTRACT_TYPE_LABELS[contract.contractType] ?? contract.contractType}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-700 whitespace-nowrap">
                      {formatTon(contract.quantityTon)} tn
                    </td>
                    <td className="py-3 px-3 text-right text-gray-600 whitespace-nowrap hidden sm:table-cell">
                      {formatTon(contract.fulfilledTon)} tn
                      <span className="text-xs text-gray-400 ml-1">({contract.fulfillmentPct}%)</span>
                    </td>
                    <td className="py-3 px-3 text-gray-500 hidden md:table-cell whitespace-nowrap">
                      {formatDate(contract.fromDate)}
                    </td>
                    <td className="py-3 px-3 text-gray-500 hidden md:table-cell whitespace-nowrap">
                      {formatDate(contract.toDate)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          STATUS_BADGE[contract.status as ContractStatus],
                        )}
                      >
                        {STATUS_LABELS[contract.status as ContractStatus]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
