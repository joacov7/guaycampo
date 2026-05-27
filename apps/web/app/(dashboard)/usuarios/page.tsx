'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Plus, Search, SlidersHorizontal } from 'lucide-react';
import { UserTable } from '@/components/usuarios/user-table';
import {
  useUsers,
  useDeactivateUser,
  useResetPassword,
  type UserFilters,
} from '@/hooks/use-users';
import { UserStatus } from '@guaycampo/shared-types';
import type { IUser } from '@guaycampo/shared-types';
import { cn } from '@/lib/utils';
import { ROLE_DESCRIPTIONS } from '@/components/usuarios/role-selector';

const ALLOWED_ROLES = ['tenant_admin', 'jefe_operaciones'];

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

export default function UsuariosPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('');
  const [page, setPage] = useState(1);

  const userRole = session?.user?.role ?? '';
  const canManage = ALLOWED_ROLES.includes(userRole);

  const filters: UserFilters = {
    search: search || undefined,
    role: roleFilter || undefined,
    status: statusFilter || undefined,
    page,
    limit: 20,
  };

  const { data, isLoading } = useUsers(filters);
  const deactivateMutation = useDeactivateUser();
  const resetPasswordMutation = useResetPassword();

  const [resetPasswordResult, setResetPasswordResult] = useState<{
    userId: string;
    password: string;
  } | null>(null);

  const users = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  function handleEdit(user: IUser) {
    router.push(`/dashboard/usuarios/${user.id}`);
  }

  function handleDeactivate(user: IUser) {
    if (confirm(`¿Desactivar a ${user.fullName}? El usuario no podrá acceder al sistema.`)) {
      deactivateMutation.mutate(user.id);
    }
  }

  function handleResetPassword(user: IUser) {
    if (confirm(`¿Resetear la contraseña de ${user.fullName}? Se generará una contraseña temporal.`)) {
      resetPasswordMutation.mutate(user.id, {
        onSuccess: (result) => {
          setResetPasswordResult({ userId: user.id, password: result.temporaryPassword });
        },
      });
    }
  }

  if (!canManage) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <p className="text-gray-500 font-medium">Acceso restringido</p>
          <p className="text-sm text-gray-400 mt-1">No tenés permisos para gestionar usuarios</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data?.total ?? 0} usuarios registrados en este tenant
          </p>
        </div>
        <Link
          href="/dashboard/usuarios/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-guay-600 hover:bg-guay-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo usuario</span>
          <span className="sm:hidden">Nuevo</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nombre o email..."
            className="w-full pl-9 pr-4 h-9 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
          />
        </div>

        {/* Role filter */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
          >
            <option value="">Todos los roles</option>
            {Object.entries(ROLE_DESCRIPTIONS).map(([key, role]) => (
              <option key={key} value={key}>{role.label}</option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div className="flex gap-1.5">
          {(['', UserStatus.ACTIVE, UserStatus.INACTIVE, UserStatus.BLOCKED] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                statusFilter === s
                  ? 'bg-guay-600 text-white border-guay-600'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300',
              )}
            >
              {s === '' ? 'Todos' : s === UserStatus.ACTIVE ? 'Activos' : s === UserStatus.INACTIVE ? 'Inactivos' : 'Suspendidos'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <UserTable
        users={users}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDeactivate={handleDeactivate}
        onResetPassword={handleResetPassword}
      />

      <Pagination page={page} totalPages={totalPages} onPage={setPage} />

      {/* Reset password modal */}
      {resetPasswordResult && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-semibold text-gray-900">Contraseña temporal generada</h3>
            <p className="text-sm text-gray-500">
              Copiá esta contraseña y enviasela al usuario. Solo se muestra una vez.
            </p>
            <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm text-center break-all select-all text-gray-800 border border-gray-200">
              {resetPasswordResult.password}
            </div>
            <button
              onClick={() => setResetPasswordResult(null)}
              className="w-full py-2 bg-guay-600 text-white rounded-lg text-sm font-medium hover:bg-guay-700 transition-colors"
            >
              Entendido, ya la copié
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
