'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Copy, CheckCircle } from 'lucide-react';
import { UserForm, type UserFormValues } from '@/components/usuarios/user-form';
import { useCreateUser } from '@/hooks/use-users';

export default function NuevoUsuarioPage() {
  const router = useRouter();
  const createUser = useCreateUser();
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleSubmit(values: UserFormValues) {
    createUser.mutate(values, {
      onSuccess: (result) => {
        setTempPassword(result.temporaryPassword);
      },
    });
  }

  function handleCopy() {
    if (!tempPassword) return;
    void navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (tempPassword) {
    return (
      <div className="max-w-lg mx-auto animate-fade-in">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle className="w-7 h-7 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Usuario creado</h2>
            <p className="text-sm text-gray-500 mt-1">
              La contraseña temporal se muestra una sola vez. Copiala antes de continuar.
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
              Contraseña temporal
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-base text-gray-800 text-center select-all">
                {tempPassword}
              </code>
              <button
                onClick={handleCopy}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/dashboard/usuarios/nuevo')}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Crear otro usuario
            </button>
            <button
              onClick={() => router.push('/dashboard/usuarios')}
              className="flex-1 py-2.5 bg-guay-600 text-white rounded-lg text-sm font-medium hover:bg-guay-700 transition-colors"
            >
              Ver todos los usuarios
            </button>
          </div>
        </div>
      </div>
    );
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
        <span className="text-sm text-gray-900 font-medium">Nuevo usuario</span>
      </div>

      {/* Card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-900">Crear usuario</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Se generará una contraseña temporal que deberás enviarle al usuario.
          </p>
        </div>
        <div className="p-6">
          <UserForm
            onSubmit={handleSubmit}
            isLoading={createUser.isPending}
            isEditMode={false}
          />
          {createUser.isError && (
            <p className="mt-3 text-sm text-red-600 text-center">
              Error al crear el usuario. Verificá que el email no esté ya registrado.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
