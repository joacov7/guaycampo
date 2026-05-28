'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Download, Wallet, AlertTriangle, Users, TrendingUp } from 'lucide-react';
import { useAging, type AgingRow } from '@/hooks/use-accounts';
import { cn } from '@/lib/utils';

const ARS = (amount: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);

function SummaryCard({
  label,
  value,
  icon: Icon,
  accent = 'gray',
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: 'gray' | 'red' | 'green' | 'blue';
}) {
  const accentClasses = {
    gray: 'bg-white border-gray-200 text-gray-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
  };
  const iconClasses = {
    gray: 'text-gray-400',
    red: 'text-red-500',
    green: 'text-green-500',
    blue: 'text-blue-500',
  };

  return (
    <div className={cn('rounded-xl border p-5 space-y-3', accentClasses[accent])}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        <Icon className={cn('w-5 h-5', iconClasses[accent])} />
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function exportAgingCsv(rows: AgingRow[]) {
  const headers = ['Cliente', 'Corriente (0-30d)', '31-60d', '61-90d', '>90d', 'Saldo Total'];
  const csvRows = [
    headers.join(','),
    ...rows.map((r) =>
      [
        `"${r.clientName}"`,
        r.current.toFixed(2),
        r.days31to60.toFixed(2),
        r.days61to90.toFixed(2),
        r.over90.toFixed(2),
        r.total.toFixed(2),
      ].join(','),
    ),
  ];
  const csv = csvRows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aging-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CuentasCorrientesPage() {
  const router = useRouter();
  const { data: rows = [], isLoading } = useAging();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => r.clientName.toLowerCase().includes(q));
  }, [rows, search]);

  const totalDeudor = rows.reduce((s, r) => s + (r.total < 0 ? Math.abs(r.total) : 0), 0);
  const over90Total = rows.reduce((s, r) => s + r.over90, 0);
  const clientesPositivos = rows.filter((r) => r.total > 0).length;
  const clientesSinMovs = rows.filter(
    (r) => r.current === 0 && r.days31to60 === 0 && r.days61to90 === 0 && r.over90 === 0,
  ).length;

  return (
    <div className="space-y-5 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Cuentas Corrientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Aging de saldos — {rows.length} clientes con saldo
          </p>
        </div>
        <button
          onClick={() => exportAgingCsv(filtered)}
          className="flex items-center gap-2 px-3 py-2 border border-gray-200 hover:border-gray-300 rounded-lg text-sm text-gray-600 transition-colors"
          title="Exportar a CSV"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Exportar</span>
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Total saldo deudor"
          value={ARS(totalDeudor)}
          icon={TrendingUp}
          accent="blue"
        />
        <SummaryCard
          label="Saldo a cobrar >90d"
          value={ARS(over90Total)}
          icon={AlertTriangle}
          accent={over90Total > 0 ? 'red' : 'gray'}
        />
        <SummaryCard
          label="Clientes con saldo positivo"
          value={String(clientesPositivos)}
          icon={Users}
          accent="green"
        />
        <SummaryCard
          label="Sin movimientos recientes"
          value={String(clientesSinMovs)}
          icon={Wallet}
          accent="gray"
        />
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre de cliente..."
            className="w-full pl-9 pr-4 h-9 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
          />
        </div>
      </div>

      {/* Aging table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Cargando aging...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            {search ? 'Sin resultados para la búsqueda' : 'Sin clientes con saldo'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Cliente
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Corriente (0-30d)
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide hidden md:table-cell">
                    31-60d
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide hidden md:table-cell">
                    61-90d
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    &gt;90d
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Saldo Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((row) => (
                  <tr
                    key={row.clientId}
                    onClick={() => router.push(`/dashboard/cuentas-corrientes/${row.clientId}`)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{row.clientName}</td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {row.current > 0 ? ARS(row.current) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 hidden md:table-cell">
                      {row.days31to60 > 0 ? ARS(row.days31to60) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 hidden md:table-cell">
                      {row.days61to90 > 0 ? ARS(row.days61to90) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(row.over90 > 0 ? 'text-red-600 font-semibold' : 'text-gray-700')}>
                        {row.over90 > 0 ? ARS(row.over90) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      <span
                        className={cn(
                          row.total < 0 ? 'text-red-600' : row.total > 0 ? 'text-green-600' : 'text-gray-500',
                        )}
                      >
                        {ARS(row.total)}
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
