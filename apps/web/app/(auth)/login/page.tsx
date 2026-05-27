'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        },
      );

      if (!res.ok) {
        const data = await res.json() as { message?: string };
        setError(data.message ?? 'Credenciales incorrectas');
        return;
      }

      const data = await res.json() as { accessToken: string; refreshToken: string };
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      router.push('/dashboard');
    } catch {
      setError('Error de conexión. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-guay-50 to-guay-100">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-guay-600 text-white text-2xl font-bold">
            GC
          </div>
          <h1 className="text-2xl font-bold text-gray-900">GuayCampo</h1>
          <p className="text-sm text-gray-500">
            Sistema de gestión de acopio
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="usuario@empresa.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-guay-500 focus:border-transparent transition"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-guay-500 focus:border-transparent transition"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-guay-600 hover:bg-guay-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400">
          GuayCampo &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
