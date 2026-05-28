'use client';

import { Building2, Users, Ticket, Wheat } from 'lucide-react';
import { useGlobalStats, useTenants } from '@/hooks/use-super-admin';

function StatCard({
  label,
  value,
  icon: Icon,
  accent = 'blue',
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: 'blue' | 'green' | 'orange' | 'purple';
}) {
  const accentClasses = {
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-emerald-500/10 text-emerald-400',
    orange: 'bg-orange-500/10 text-orange-400',
    purple: 'bg-purple-500/10 text-purple-400',
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accentClasses[accent]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-slate-600 text-slate-200',
  professional: 'bg-blue-600 text-blue-100',
  enterprise: 'bg-purple-600 text-purple-100',
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function SuperAdminDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useGlobalStats();
  const { data: tenants, isLoading: tenantsLoading } = useTenants();

  const recentlyActive = (tenants ?? [])
    .filter((t) => t.lastTicketAt)
    .sort((a, b) => {
      const da = a.lastTicketAt ? new Date(a.lastTicketAt).getTime() : 0;
      const db = b.lastTicketAt ? new Date(b.lastTicketAt).getTime() : 0;
      return db - da;
    })
    .slice(0, 5);

  const planBreakdown = stats?.planBreakdown ?? {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Global</h1>
        <p className="text-sm text-slate-500 mt-0.5">Métricas de toda la plataforma</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-slate-500">Total Tenants</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {statsLoading ? '—' : stats?.totalTenants ?? 0}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm text-slate-500">Tenants Activos</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {statsLoading ? '—' : stats?.activeTenants ?? 0}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
              <Ticket className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-sm text-slate-500">Tickets (30d)</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {statsLoading ? '—' : stats?.totalTickets30d ?? 0}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
              <Wheat className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-slate-500">Toneladas (30d)</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {statsLoading ? '—' : `${(stats?.totalTons30d ?? 0).toFixed(0)} tn`}
          </p>
        </div>
      </div>

      {/* Plan Breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Distribución por plan</h2>
        {statsLoading ? (
          <p className="text-slate-400 text-sm">Cargando...</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {Object.entries(planBreakdown).map(([plan, count]) => (
              <div key={plan} className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${PLAN_COLORS[plan] ?? 'bg-slate-100 text-slate-700'}`}
                >
                  {plan}
                </span>
                <span className="text-lg font-bold text-slate-900">{count}</span>
                <span className="text-sm text-slate-500">
                  tenant{count !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
            {Object.keys(planBreakdown).length === 0 && (
              <p className="text-slate-400 text-sm">Sin datos</p>
            )}
          </div>
        )}
      </div>

      {/* Recently Active Tenants */}
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">Tenants más activos recientemente</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Tenant</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Plan</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Tickets 7d</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Tickets 30d</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Tons 30d</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Último ticket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenantsLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    Cargando...
                  </td>
                </tr>
              ) : recentlyActive.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    Sin actividad reciente
                  </td>
                </tr>
              ) : (
                recentlyActive.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">{t.name}</p>
                      <p className="text-xs text-slate-400">{t.slug}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PLAN_COLORS[t.plan] ?? 'bg-slate-100 text-slate-700'}`}
                      >
                        {t.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{t.ticketsLast7d}</td>
                    <td className="px-5 py-3 text-slate-700">{t.ticketsLast30d}</td>
                    <td className="px-5 py-3 text-slate-700">{t.tonsLast30d.toFixed(1)} tn</td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(t.lastTicketAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
