'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, SlidersHorizontal, Download } from 'lucide-react';
import { ClientTable } from '@/components/clientes/client-table';
import { useClients, type ClientFilters } from '@/hooks/use-clients';
import { ClientType } from '@guaycampo/shared-types';
import { cn } from '@/lib/utils';

const ARGENTINIAN_PROVINCES = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
  'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán',
];

const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  [ClientType.PRODUCTOR]: 'Productor',
  [ClientType.ACOPIADOR]: 'Acopiador',
  [ClientType.EXPORTADOR]: 'Exportador',
  [ClientType.INDUSTRIA]: 'Industria',
  [ClientType.OTRO]: 'Otro',
};

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
      >
        Anterior
      </button>
      <span className="text-sm text-gray-500">
        Página {page} de {totalPages}
      </span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
      >
        Siguiente
      </button>
    </div>
  );
}

export default function ClientesPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ClientType | ''>('');
  const [provinceFilter, setProvinceFilter] = useState('');
  const [page, setPage] = useState(1);

  const filters: ClientFilters = {
    search: search || undefined,
    clientType: typeFilter || undefined,
    province: provinceFilter || undefined,
    page,
    limit: 20,
  };

  const { data, isLoading } = useClients(filters);
  const clients = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  function handleExport() {
    const csvRows = [
      ['Nombre', 'CUIT', 'Tipo', 'Localidad', 'Provincia', 'Saldo CC'],
      ...clients.map((c) => [
        c.name,
        c.cuit,
        c.clientType ?? '',
        c.locality ?? '',
        c.province ?? '',
        c.currentAccount.toString(),
      ]),
    ];
    const csv = csvRows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Clientes / Productores</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data?.total ?? 0} clientes registrados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 hover:border-gray-300 rounded-lg text-sm text-gray-600 transition-colors"
            title="Exportar a CSV"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
          <Link
            href="/dashboard/clientes/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2 bg-guay-600 hover:bg-guay-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo cliente</span>
            <span className="sm:hidden">Nuevo</span>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por nombre o CUIT..."
              className="w-full pl-9 pr-4 h-9 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
            />
          </div>

          {/* Province */}
          <select
            value={provinceFilter}
            onChange={(e) => { setProvinceFilter(e.target.value); setPage(1); }}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
          >
            <option value="">Todas las provincias</option>
            {ARGENTINIAN_PROVINCES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Type filter pills */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => { setTypeFilter(''); setPage(1); }}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
              typeFilter === ''
                ? 'bg-guay-600 text-white border-guay-600'
                : 'border-gray-200 text-gray-500 hover:border-gray-300',
            )}
          >
            Todos
          </button>
          {Object.entries(CLIENT_TYPE_LABELS).map(([type, label]) => (
            <button
              key={type}
              onClick={() => { setTypeFilter(type as ClientType); setPage(1); }}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
                typeFilter === type
                  ? 'bg-guay-600 text-white border-guay-600'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <ClientTable clients={clients} isLoading={isLoading} />

      <Pagination page={page} totalPages={totalPages} onPage={setPage} />
    </div>
  );
}
