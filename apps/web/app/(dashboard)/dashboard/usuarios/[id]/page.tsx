'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, KeyRound, Copy, CheckCircle } from 'lucide-react';
import { UserForm, type UserFormValues } from '@/components/usuarios/user-form';
import { useUser, useUpdateUser, useResetPassword } from '@/hooks/use-users';
import { Skeleton } from '@/components/ui/skeleton';
import type { UpdateUserDto } from '@/hooks/use-users';

export default function EditarUsuarioPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const userId = params.id;

  const { data: user, isLoading } = useUser(userId);
  const updateUser = useUpdateUser();
  const resetPassword = useResetPassword();

  const [saved, setSaved] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleSubmit(values: UserFormValues) {
    const data: UpdateUserDto = {
      fullName: values.fullName,
      phone: values.phone,
      roleName: values.roleName,
      status: values.status,
    };
    updateUser.mutate(
      { id: userId, data },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
        },
      },
    );
  }

  function handleResetPassword() {
    if (!user) return;
    if (confirm(`¿Resetear la contraseña de ${user.fullName}?`)) {
      resetPassword.mutate(userId, {
        onSuccess: (result) => {
          setTempPassword(result.temporaryPassword);
        },
      });
    }
  }

  function handleCopy() {
    if (!tempPassword) return;
    void navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/usuarios"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Usuarios
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-900 font-medium">
          {isLoading ? '...' : user?.fullName ?? 'Usuario'}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Editar usuario</h1>
            {user && (
              <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
            )}
          </div>
          <button
            onClick={handleResetPassword}
            disabled={resetPassword.isPending}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <KeyRound className="w-4 h-4" />
            <span className="hidden sm:inline">Resetear contraseña</span>
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : user ? (
            <>
              {saved && (
                <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  Cambios guardados correctamente
                </div>
              )}
              {updateUser.isError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  Error al guardar los cambios. Intenta de nuevo.
                </div>
              )}
              <UserForm
                defaultValues={{
                  fullName: user.fullName,
                  email: user.email,
                  phone: user.phone,
                  roleName: user.role?.name ?? '',
                  status: user.status,
                }}
                onSubmit={handleSubmit}
                isLoading={updateUser.isPending}
                isEditMode
              />
            </>
          ) : (
            <p className="text-center text-gray-400 py-8">Usuario no encontrado</p>
          )}
        </div>
      </div>

      {/* Temp password modal */}
      {tempPassword && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 text-center">
            <h3 className="font-semibold text-gray-900">Contraseña temporal generada</h3>
            <p className="text-sm text-gray-500">
              Esta contraseña solo se muestra una vez. El usuario deberá cambiarla al ingresar.
            </p>
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-base text-gray-800 select-all">
                  {tempPassword}
                </code>
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                >
                  {copied ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={() => { setTempPassword(null); router.push('/dashboard/usuarios'); }}
              className="w-full py-2 bg-guay-600 text-white rounded-lg text-sm font-medium hover:bg-guay-700 transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
