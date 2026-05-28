'use client';

import { useState } from 'react';
import { useCreateTenant } from '@/hooks/use-super-admin';

interface NewTenantDialogProps {
  open: boolean;
  onClose: () => void;
}

const PLANS = ['starter', 'professional', 'enterprise'];

export function NewTenantDialog({ open, onClose }: NewTenantDialogProps) {
  const createTenant = useCreateTenant();
  const [form, setForm] = useState({
    name: '',
    slug: '',
    cuit: '',
    plan: 'starter',
    adminEmail: '',
    adminName: '',
  });
  const [result, setResult] = useState<{ tempPassword: string; email: string } | null>(null);
  const [error, setError] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await createTenant.mutateAsync(form);
      setResult({ tempPassword: res.temporaryPassword, email: res.adminUser.email });
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr?.message ?? 'Error al crear el tenant');
    }
  }

  function handleClose() {
    setForm({ name: '', slug: '', cuit: '', plan: 'starter', adminEmail: '', adminName: '' });
    setResult(null);
    setError('');
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Nuevo Tenant</h2>
        </div>

        {result ? (
          <div className="p-6 space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-emerald-800">Tenant creado exitosamente</p>
              <p className="text-sm text-emerald-700">
                Usuario admin: <strong>{result.email}</strong>
              </p>
              <p className="text-sm text-emerald-700">
                Contrasena temporal:{' '}
                <code className="bg-emerald-100 px-2 py-0.5 rounded font-mono font-bold">
                  {result.tempPassword}
                </code>
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                Guarda esta contrasena — no se mostrara nuevamente.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg text-sm transition"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">Nombre</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="Mi Acopio SRL"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">Slug</label>
                <input
                  name="slug"
                  value={form.slug}
                  onChange={handleChange}
                  required
                  placeholder="mi-acopio"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">CUIT</label>
                <input
                  name="cuit"
                  value={form.cuit}
                  onChange={handleChange}
                  required
                  placeholder="30-12345678-9"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">Plan</label>
                <select
                  name="plan"
                  value={form.plan}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
                >
                  {PLANS.map((p) => (
                    <option key={p} value={p} className="capitalize">
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Email del admin</label>
              <input
                type="email"
                name="adminEmail"
                value={form.adminEmail}
                onChange={handleChange}
                required
                placeholder="admin@miacopio.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Nombre del admin</label>
              <input
                name="adminName"
                value={form.adminName}
                onChange={handleChange}
                required
                placeholder="Juan Perez"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 px-4 border border-slate-300 text-slate-700 font-medium rounded-lg text-sm hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createTenant.isPending}
                className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg text-sm transition disabled:opacity-50"
              >
                {createTenant.isPending ? 'Creando...' : 'Crear Tenant'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
