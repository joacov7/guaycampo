'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus } from 'lucide-react';
import { useTenants } from '@/hooks/use-super-admin';
import { NewTenantDialog } from './new-tenant-dialog';

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  trial: 'bg-yellow-100 text-yellow-700',
  suspended: 'bg-orange-100 text-orange-700',
  inactive: 'bg-slate-100 text-slate-500',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Activo',
  trial: 'Trial',
  suspended: 'Suspendido',
  inactive: 'Inactivo',
};

const PLAN_BADGE: Record<string, string> = {
  starter: 'bg-slate-100 text-slate-600',
  professional: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
};

const PLANS = ['', 'starter', 'professional', 'enterprise'];
const STATUSES = ['', 'active', 'trial', 'suspended', 'inactive'];

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function TenantsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState('');
  const [status, setStatus] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: tenants, isLoading } = useTenants({
    search: search || undefined,
    plan: plan || undefined,
    status: status || undefined,
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tenants</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isLoading ? 'Cargando...' : `${tenants?.length ?? 0} tenants`}
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          Nuevo Tenant
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, slug o CUIT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
        </div>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
        >
          <option value="">Todos los planes</option>
          {PLANS.filter(Boolean).map((p) => (
            <option key={p} value={p} className="capitalize">
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
        >
          <option value="">Todos los estados</option>
          {STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s] ?? s}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Nombre</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">CUIT</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Plan</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Usuarios</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Tickets (30d)</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Tons (30d)</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Último ticket</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-slate-400">
                    Cargando...
                  </td>
                </tr>
              ) : !tenants || tenants.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-slate-400">
                    No se encontraron tenants
                  </td>
                </tr>
              ) : (
                tenants.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => router.push(`/super-admin/tenants/${t.id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">{t.name}</p>
                      <p className="text-xs text-slate-400">{t.slug}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600 font-mono text-xs">{t.cuit}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PLAN_BADGE[t.plan] ?? 'bg-slate-100 text-slate-600'}`}
                      >
                        {t.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[t.status] ?? 'bg-slate-100 text-slate-500'}`}
                      >
                        {STATUS_LABEL[t.status] ?? t.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{t.activeUsers}</td>
                    <td className="px-5 py-3 text-slate-700">{t.ticketsLast30d}</td>
                    <td className="px-5 py-3 text-slate-700">{t.tonsLast30d.toFixed(1)} tn</td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(t.lastTicketAt)}</td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(t.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewTenantDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
