'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormValues } from '@/lib/validations';

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      tenantSlug: '',
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setServerError('');
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        tenantSlug: data.tenantSlug ?? '',
        redirect: false,
      });

      if (result?.error) {
        setServerError('Credenciales incorrectas. Verifique su email y contraseña.');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setServerError('Error de conexión. Intente nuevamente.');
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
      {/* Logo */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-guay-600 text-white text-2xl font-bold">
          GC
        </div>
        <h1 className="text-2xl font-bold text-gray-900">GuayCampo</h1>
        <p className="text-sm text-gray-500">Sistema de gestión de acopio</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="usuario@empresa.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-guay-500 focus:border-transparent transition disabled:opacity-50"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-guay-500 focus:border-transparent transition disabled:opacity-50"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="tenantSlug" className="block text-sm font-medium text-gray-700">
            Empresa <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <input
            id="tenantSlug"
            type="text"
            autoComplete="organization"
            placeholder="mi-empresa"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-guay-500 focus:border-transparent transition disabled:opacity-50"
            {...register('tenantSlug')}
          />
          <p className="text-xs text-gray-400">
            Requerido solo si accede desde el dominio general
          </p>
        </div>

        {serverError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {serverError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 bg-guay-600 hover:bg-guay-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {isSubmitting ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>

      <p className="text-center text-xs text-gray-400">
        GuayCampo &copy; {new Date().getFullYear()}
      </p>
    </div>
  );
}
