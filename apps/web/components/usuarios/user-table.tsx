'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MoreHorizontal, Pencil, KeyRound, UserX } from 'lucide-react';
import { UserStatus } from '@guaycampo/shared-types';
import type { IUser } from '@guaycampo/shared-types';
import { RoleBadge } from './role-selector';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface UserTableProps {
  users: IUser[];
  isLoading?: boolean;
  onEdit: (user: IUser) => void;
  onDeactivate: (user: IUser) => void;
  onResetPassword: (user: IUser) => void;
}

function StatusBadge({ status }: { status: UserStatus }) {
  const styles = {
    [UserStatus.ACTIVE]: 'bg-green-50 text-green-700',
    [UserStatus.INACTIVE]: 'bg-gray-100 text-gray-500',
    [UserStatus.BLOCKED]: 'bg-red-50 text-red-700',
  };
  const labels = {
    [UserStatus.ACTIVE]: 'Activo',
    [UserStatus.INACTIVE]: 'Inactivo',
    [UserStatus.BLOCKED]: 'Suspendido',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        styles[status] ?? 'bg-gray-100 text-gray-500',
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}

function ActionMenu({
  user,
  onEdit,
  onDeactivate,
  onResetPassword,
}: {
  user: IUser;
  onEdit: () => void;
  onDeactivate: () => void;
  onResetPassword: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
            <button
              onClick={() => { onEdit(); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Editar
            </button>
            <button
              onClick={() => { onResetPassword(); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Resetear contraseña
            </button>
            {user.status === UserStatus.ACTIVE && (
              <button
                onClick={() => { onDeactivate(); setOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <UserX className="w-3.5 h-3.5" />
                Desactivar
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function UserTable({
  users,
  isLoading,
  onEdit,
  onDeactivate,
  onResetPassword,
}: UserTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
        <p className="text-gray-400 text-sm">No se encontraron usuarios</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                Nombre
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                Email
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide hidden sm:table-cell">
                Rol
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                Estado
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide hidden md:table-cell">
                Último acceso
              </th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-guay-100 flex items-center justify-center text-guay-700 text-xs font-semibold flex-shrink-0">
                      {user.fullName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                    <span className="font-medium text-gray-900">{user.fullName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{user.email}</td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <RoleBadge role={user.role?.name ?? ''} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={user.status} />
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                  {user.lastLogin
                    ? format(new Date(user.lastLogin), "d 'de' MMM, HH:mm", { locale: es })
                    : 'Nunca'}
                </td>
                <td className="px-4 py-3">
                  <ActionMenu
                    user={user}
                    onEdit={() => onEdit(user)}
                    onDeactivate={() => onDeactivate(user)}
                    onResetPassword={() => onResetPassword(user)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
