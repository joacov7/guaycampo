'use client';

import { useGlobalStats, useTenants } from '@/hooks/use-super-admin';

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-slate-100 text-slate-700 border-slate-200',
  professional: 'bg-blue-50 text-blue-800 border-blue-200',
  enterprise: 'bg-purple-50 text-purple-800 border-purple-200',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  trial: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  suspended: 'bg-orange-50 text-orange-800 border-orange-200',
  inactive: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function StatsPage() {
  const { data: stats, isLoading: statsLoading } = useGlobalStats();
  const { data: tenants, isLoading: tenantsLoading } = useTenants();

  // Compute status breakdown from tenants
  const statusBreakdown: Record<string, number> = {};
  for (const t of tenants ?? []) {
    statusBreakdown[t.status] = (statusBreakdown[t.status] ?? 0) + 1;
  }

  // Top 10 by tickets last 30d
  const topByTickets = (tenants ?? [])
    .slice()
    .sort((a, b) => b.ticketsLast30d - a.ticketsLast30d)
    .slice(0, 10);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Estadisticas globales</h1>
        <p className="text-sm text-slate-500 mt-0.5">Vision completa de la plataforma</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statsLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 h-24 animate-pulse" />
          ))
        ) : (
          <>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500 mb-1">Total tenants</p>
              <p className="text-3xl font-bold text-slate-900">{stats?.totalTenants ?? 0}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500 mb-1">Tenants activos</p>
              <p className="text-3xl font-bold text-emerald-700">{stats?.activeTenants ?? 0}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500 mb-1">Usuarios activos totales</p>
              <p className="text-3xl font-bold text-blue-700">{stats?.totalUsers ?? 0}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500 mb-1">Tickets (30d) — global</p>
              <p className="text-3xl font-bold text-orange-700">{stats?.totalTickets30d ?? 0}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5 lg:col-span-2">
              <p className="text-xs text-slate-500 mb-1">Toneladas procesadas (30d)</p>
              <p className="text-3xl font-bold text-purple-700">
                {(stats?.totalTons30d ?? 0).toFixed(1)} tn
              </p>
            </div>
          </>
        )}
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By Plan */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Tenants por plan</h2>
          {statsLoading ? (
            <p className="text-slate-400 text-sm">Cargando...</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(stats?.planBreakdown ?? {}).map(([plan, count]) => (
                <div key={plan} className="flex items-center justify-between">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium capitalize border ${PLAN_COLORS[plan] ?? 'bg-slate-100 text-slate-700 border-slate-200'}`}
                  >
                    {plan}
                  </span>
                  <div className="flex items-center gap-3 flex-1 mx-4">
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-slate-700 rounded-full h-2"
                        style={{
                          width: `${stats?.totalTenants ? (count / stats.totalTenants) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-900 w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
              {Object.keys(stats?.planBreakdown ?? {}).length === 0 && (
                <p className="text-slate-400 text-sm">Sin datos</p>
              )}
            </div>
          )}
        </div>

        {/* By Status */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Tenants por estado</h2>
          {tenantsLoading ? (
            <p className="text-slate-400 text-sm">Cargando...</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(statusBreakdown).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-700 border-slate-200'}`}
                  >
                    {status}
                  </span>
                  <div className="flex items-center gap-3 flex-1 mx-4">
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-slate-700 rounded-full h-2"
                        style={{
                          width: `${(tenants?.length ?? 0) > 0 ? (count / (tenants?.length ?? 1)) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-900 w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
              {Object.keys(statusBreakdown).length === 0 && (
                <p className="text-slate-400 text-sm">Sin datos</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Top Tenants by tickets */}
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">Top 10 tenants por tickets (30d)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">#</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tenant</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Plan</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tickets (30d)</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tickets total</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tons (30d)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenantsLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">Cargando...</td>
                </tr>
              ) : topByTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">Sin datos</td>
                </tr>
              ) : (
                topByTickets.map((t, i) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-slate-400 font-mono text-xs">{i + 1}</td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">{t.name}</p>
                      <p className="text-xs text-slate-400">{t.slug}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize bg-slate-100 text-slate-700">
                        {t.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-900">{t.ticketsLast30d}</td>
                    <td className="px-5 py-3 text-slate-600">{t.ticketsTotal}</td>
                    <td className="px-5 py-3 text-slate-600">{t.tonsLast30d.toFixed(1)} tn</td>
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
