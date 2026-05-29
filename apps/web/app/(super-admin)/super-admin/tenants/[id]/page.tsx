'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, Users, Ticket, AlertTriangle } from 'lucide-react';
import { useTenantDetail, useUpdateTenant, useImpersonateTenant } from '@/hooks/use-super-admin';

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

const PLANS = ['starter', 'professional', 'enterprise'];

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface ImpersonateDialogProps {
  tenantId: string;
  users: Array<{ id: string; email: string; fullName: string; role: { name: string } | null }>;
  onClose: () => void;
}

function ImpersonateDialog({ tenantId, users, onClose }: ImpersonateDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [toast, setToast] = useState('');
  const impersonate = useImpersonateTenant();

  async function handleImpersonate() {
    if (!selectedUserId) return;
    try {
      const res = await impersonate.mutateAsync({ tenantId, userId: selectedUserId });
      const user = users.find((u) => u.id === selectedUserId);
      localStorage.setItem('impersonation_token', res.token);
      setToast(`Abriendo sesion como ${user?.fullName ?? user?.email}...`);
      setTimeout(() => {
        window.open('/dashboard', '_blank');
        onClose();
      }, 1200);
    } catch {
      setToast('Error al generar el token de impersonacion');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Impersonar usuario</h2>
          <p className="text-xs text-slate-500 mt-0.5">Selecciona un usuario para acceder como el</p>
        </div>
        <div className="p-6 space-y-4">
          {toast ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-800">
              {toast}
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">Usuario</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="">Seleccionar usuario...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.email}) — {u.role?.name ?? 'sin rol'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-orange-700">
                  Esta accion generara un token de acceso temporal (1h) y abrira el dashboard en una nueva pestana.
                </p>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 border border-slate-300 text-slate-700 font-medium rounded-lg text-sm hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleImpersonate}
                  disabled={!selectedUserId || impersonate.isPending}
                  className="flex-1 py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg text-sm transition disabled:opacity-50"
                >
                  {impersonate.isPending ? 'Generando...' : 'Impersonar'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;

  const { data, isLoading, error } = useTenantDetail(tenantId);
  const updateTenant = useUpdateTenant();

  const [planDropdownOpen, setPlanDropdownOpen] = useState(false);
  const [impersonateOpen, setImpersonateOpen] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  async function handlePlanChange(newPlan: string) {
    setPlanDropdownOpen(false);
    try {
      await updateTenant.mutateAsync({ id: tenantId, data: { plan: newPlan } });
      setActionMsg(`Plan actualizado a ${newPlan}`);
    } catch {
      setActionMsg('Error al actualizar el plan');
    }
  }

  async function handleStatusToggle() {
    const current = data?.tenant.status;
    const newStatus = current === 'active' || current === 'trial' ? 'suspended' : 'active';
    try {
      await updateTenant.mutateAsync({ id: tenantId, data: { status: newStatus } });
      setActionMsg(`Estado actualizado a ${STATUS_LABEL[newStatus] ?? newStatus}`);
    } catch {
      setActionMsg('Error al actualizar el estado');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Cargando...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">Error al cargar el tenant</p>
      </div>
    );
  }

  const { tenant, metrics, recentTickets, activeUsers } = data;
  const isSuspended = tenant.status === 'suspended' || tenant.status === 'inactive';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.push('/super-admin/tenants')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a tenants
      </button>

      {/* Tenant Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900">{tenant.name}</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${PLAN_BADGE[tenant.plan] ?? 'bg-slate-100 text-slate-600'}`}
              >
                {tenant.plan}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[tenant.status] ?? 'bg-slate-100 text-slate-500'}`}
              >
                {STATUS_LABEL[tenant.status] ?? tenant.status}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              {tenant.slug} &middot; CUIT: {tenant.cuit}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Plan dropdown */}
            <div className="relative">
              <button
                onClick={() => setPlanDropdownOpen((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition"
              >
                Cambiar Plan
                <ChevronDown className="w-4 h-4" />
              </button>
              {planDropdownOpen && (
                <div className="absolute right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[140px]">
                  {PLANS.map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePlanChange(p)}
                      className={`w-full text-left px-4 py-2 text-sm capitalize hover:bg-slate-50 transition ${p === tenant.plan ? 'font-semibold text-slate-900' : 'text-slate-700'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Status toggle */}
            <button
              onClick={handleStatusToggle}
              disabled={updateTenant.isPending}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition disabled:opacity-50 ${
                isSuspended
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-orange-600 hover:bg-orange-700 text-white'
              }`}
            >
              {isSuspended ? 'Activar' : 'Suspender'}
            </button>

            {/* Impersonate */}
            <button
              onClick={() => setImpersonateOpen(true)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition"
            >
              Impersonar usuario
            </button>
          </div>
        </div>

        {actionMsg && (
          <div className="mt-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            {actionMsg}
          </div>
        )}
      </div>

      {/* Info + Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Info grid */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Informacion</h2>
          <dl className="space-y-3">
            {[
              { label: 'Slug', value: tenant.slug },
              { label: 'CUIT', value: tenant.cuit },
              { label: 'Plan', value: tenant.plan },
              { label: 'Estado', value: STATUS_LABEL[tenant.status] ?? tenant.status },
              { label: 'Creado', value: formatDate(tenant.createdAt) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center">
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="text-sm font-medium text-slate-900 capitalize">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Usage metrics */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Metricas de uso</h2>
          {metrics ? (
            <dl className="space-y-3">
              {[
                { label: 'Usuarios activos', value: metrics.activeUsers },
                { label: 'Tickets (7d)', value: metrics.ticketsLast7d },
                { label: 'Tickets (30d)', value: metrics.ticketsLast30d },
                { label: 'Tickets total', value: metrics.ticketsTotal },
                { label: 'Toneladas (30d)', value: `${metrics.tonsLast30d.toFixed(1)} tn` },
                { label: 'Ultimo ticket', value: formatDate(metrics.lastTicketAt) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="text-sm font-medium text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-slate-400">Sin metricas disponibles</p>
          )}
        </div>
      </div>

      {/* Active Users Table */}
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">Usuarios activos</h2>
          <span className="text-xs text-slate-400">({activeUsers.length})</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nombre</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rol</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Ultimo acceso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-400">
                    Sin usuarios activos
                  </td>
                </tr>
              ) : (
                activeUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-900">{u.fullName}</td>
                    <td className="px-5 py-3 text-slate-600">{u.email}</td>
                    <td className="px-5 py-3 text-slate-500 capitalize">{u.role?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(u.lastLogin)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Scale Tickets */}
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
          <Ticket className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">Tickets recientes</h2>
          <span className="text-xs text-slate-400">(ultimos 10)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">N° Ticket</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Camion</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Chofer</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    Sin tickets recientes
                  </td>
                </tr>
              ) : (
                recentTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-slate-700">{t.ticketNumber}</td>
                    <td className="px-5 py-3 font-medium text-slate-900">{t.vehicle.plate}</td>
                    <td className="px-5 py-3 text-slate-600">{t.driver.fullName}</td>
                    <td className="px-5 py-3 text-slate-600">{t.client.name}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 capitalize">
                        {t.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(t.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Impersonate Modal */}
      {impersonateOpen && (
        <ImpersonateDialog
          tenantId={tenantId}
          users={activeUsers}
          onClose={() => setImpersonateOpen(false)}
        />
      )}
    </div>
  );
}
