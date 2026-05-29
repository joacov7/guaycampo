'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, FileSignature, Loader2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import {
  useContracts,
  useExpiringContracts,
  type ContractType,
  type ContractStatus,
  type Contract,
} from '@/hooks/use-contracts';
import { cn } from '@/lib/utils';

const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
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

const ALL_TYPES: Array<{ value: ContractType | ''; label: string }> = [
  { value: '', label: 'Todos los tipos' },
  { value: 'compra', label: 'Compra' },
  { value: 'venta', label: 'Venta' },
  { value: 'canje', label: 'Canje' },
  { value: 'deposito', label: 'Depósito' },
];

const ALL_STATUSES: Array<{ value: ContractStatus | ''; label: string }> = [
  { value: '', label: 'Todos los estados' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'activo', label: 'Activo' },
  { value: 'cumplido', label: 'Cumplido' },
  { value: 'vencido', label: 'Vencido' },
  { value: 'cancelado', label: 'Cancelado' },
];

function StatusBadge({ status }: { status: ContractStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        STATUS_BADGE[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function FulfillmentBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            clamped >= 100 ? 'bg-blue-500' : clamped >= 70 ? 'bg-green-500' : 'bg-guay-500',
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{clamped}%</span>
    </div>
  );
}

function SummaryCards({ contracts, expiringCount }: { contracts: Contract[]; expiringCount: number }) {
  const activos = contracts.filter((c) => c.status === 'activo');
  const tonComprometidas = activos.reduce((s, c) => s + Number(c.quantityTon), 0);
  const tonCumplidas = contracts.reduce((s, c) => s + Number(c.fulfilledTon), 0);

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs text-gray-500 mb-1">Contratos activos</p>
        <p className="text-2xl font-bold text-gray-900">{activos.length}</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs text-gray-500 mb-1">Ton comprometidas</p>
        <p className="text-2xl font-bold text-gray-900">{fmt(tonComprometidas)}</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs text-gray-500 mb-1">Ton cumplidas</p>
        <p className="text-2xl font-bold text-guay-700">{fmt(tonCumplidas)}</p>
      </div>
      <div className={cn('rounded-xl border p-4', expiringCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200')}>
        <p className={cn('text-xs mb-1', expiringCount > 0 ? 'text-amber-600' : 'text-gray-500')}>Por vencer (30d)</p>
        <p className={cn('text-2xl font-bold', expiringCount > 0 ? 'text-amber-700' : 'text-gray-900')}>{expiringCount}</p>
      </div>
    </div>
  );
}

export default function ContratosPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ContractType | ''>('');
  const [statusFilter, setStatusFilter] = useState<ContractStatus | ''>('');

  const { data: contracts = [], isLoading } = useContracts({
    search: search || undefined,
    status: statusFilter || undefined,
  });

  const { data: expiring = [] } = useExpiringContracts();

  // Client-side type filter (since backend doesn't support it as a separate param yet)
  const filtered = typeFilter
    ? contracts.filter((c) => c.contractType === typeFilter)
    : contracts;

  function formatDate(dateStr: string) {
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy', { locale: es });
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Contratos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gestión de contratos de compra/venta de granos
          </p>
        </div>
        <Link
          href="/dashboard/contratos/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-guay-600 hover:bg-guay-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo contrato</span>
          <span className="sm:hidden">Nuevo</span>
        </Link>
      </div>

      {/* Summary cards */}
      {!isLoading && (
        <SummaryCards contracts={contracts} expiringCount={expiring.length} />
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por número o cliente..."
              className="w-full pl-9 pr-4 h-9 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
            />
          </div>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ContractType | '')}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
          >
            {ALL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ContractStatus | '')}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
          >
            {ALL_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-guay-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <FileSignature className="w-12 h-12 text-gray-200 mx-auto" />
            <div>
              <p className="text-gray-600 font-medium">Sin contratos</p>
              <p className="text-sm text-gray-400 mt-1">
                Creá el primer contrato para comenzar
              </p>
            </div>
            <Link
              href="/dashboard/contratos/nuevo"
              className="inline-flex items-center gap-2 px-4 py-2 bg-guay-600 hover:bg-guay-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuevo contrato
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-3 font-medium text-gray-500 whitespace-nowrap">Número</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500">Cliente</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 hidden md:table-cell">Producto</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 hidden sm:table-cell">Tipo</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 hidden lg:table-cell">Cond. precio</th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 hidden sm:table-cell whitespace-nowrap">Qty (tn)</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 hidden md:table-cell" style={{ minWidth: 120 }}>Cumplido</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 hidden lg:table-cell whitespace-nowrap">Desde</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 hidden lg:table-cell whitespace-nowrap">Hasta</th>
                  <th className="text-center py-3 px-3 font-medium text-gray-500">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((contract) => (
                  <tr
                    key={contract.id}
                    onClick={() => router.push(`/dashboard/contratos/${contract.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 font-mono font-medium text-gray-900 whitespace-nowrap">
                      {contract.contractNumber}
                      {expiring.some((e) => e.id === contract.id) && (
                        <AlertTriangle className="inline w-3.5 h-3.5 text-amber-500 ml-1.5" />
                      )}
                    </td>
                    <td className="py-3 px-3 text-gray-700 max-w-[160px] truncate">
                      {contract.client.name}
                    </td>
                    <td className="py-3 px-3 text-gray-600 hidden md:table-cell">
                      {contract.commodity.name}
                    </td>
                    <td className="py-3 px-3 hidden sm:table-cell">
                      <span className="text-gray-600">
                        {CONTRACT_TYPE_LABELS[contract.contractType]}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-500 hidden lg:table-cell">
                      {PRICE_CONDITION_LABELS[contract.priceCondition] ?? contract.priceCondition}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-700 hidden sm:table-cell whitespace-nowrap">
                      {new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(
                        Number(contract.quantityTon),
                      )}
                    </td>
                    <td className="py-3 px-3 hidden md:table-cell" style={{ minWidth: 120 }}>
                      <FulfillmentBar pct={contract.fulfillmentPct} />
                    </td>
                    <td className="py-3 px-3 text-gray-500 hidden lg:table-cell whitespace-nowrap">
                      {formatDate(contract.fromDate)}
                    </td>
                    <td className="py-3 px-3 text-gray-500 hidden lg:table-cell whitespace-nowrap">
                      {formatDate(contract.toDate)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <StatusBadge status={contract.status} />
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
