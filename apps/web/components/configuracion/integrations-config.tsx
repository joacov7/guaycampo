'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, MessageCircle, Bell, Mail, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const integrationsSchema = z.object({
  whatsappProvider: z.enum(['evolution_api', 'twilio', 'none']),
  whatsappUrl: z.string().optional(),
  whatsappToken: z.string().optional(),
  whatsappNumber: z.string().optional(),
  firebaseProjectId: z.string().optional(),
  emailProvider: z.enum(['resend', 'smtp', 'none']),
  emailApiKey: z.string().optional(),
  emailSmtpHost: z.string().optional(),
  emailSmtpPort: z.coerce.number().optional(),
  emailSmtpUser: z.string().optional(),
  emailSmtpPassword: z.string().optional(),
  emailFrom: z.string().email('Email inválido').optional().or(z.literal('')),
});

type IntegrationsValues = z.infer<typeof integrationsSchema>;

interface IntegrationsData {
  whatsappProvider?: string;
  whatsappUrl?: string;
  whatsappNumber?: string;
  firebaseProjectId?: string;
  emailProvider?: string;
  emailSmtpHost?: string;
  emailSmtpPort?: number;
  emailSmtpUser?: string;
  emailFrom?: string;
}

export function IntegrationsConfig() {
  const [saved, setSaved] = useState(false);
  const [whatsappTestSent, setWhatsappTestSent] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['integrations-config'],
    queryFn: () => api.get<IntegrationsData>('/auth/tenant/integrations'),
    staleTime: 60_000,
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<IntegrationsValues>({
    resolver: zodResolver(integrationsSchema),
    values: {
      whatsappProvider: (data?.whatsappProvider as IntegrationsValues['whatsappProvider']) ?? 'none',
      whatsappUrl: data?.whatsappUrl ?? '',
      whatsappToken: '',
      whatsappNumber: data?.whatsappNumber ?? '',
      firebaseProjectId: data?.firebaseProjectId ?? '',
      emailProvider: (data?.emailProvider as IntegrationsValues['emailProvider']) ?? 'none',
      emailApiKey: '',
      emailSmtpHost: data?.emailSmtpHost ?? '',
      emailSmtpPort: data?.emailSmtpPort ?? 587,
      emailSmtpUser: data?.emailSmtpUser ?? '',
      emailSmtpPassword: '',
      emailFrom: data?.emailFrom ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: IntegrationsValues) => api.patch('/auth/tenant/integrations', values),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const testWhatsappMutation = useMutation({
    mutationFn: () => api.post('/auth/tenant/integrations/whatsapp-test', {}),
    onSuccess: () => {
      setWhatsappTestSent(true);
      setTimeout(() => setWhatsappTestSent(false), 5000);
    },
  });

  const whatsappProvider = watch('whatsappProvider');
  const emailProvider = watch('emailProvider');

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
      {/* WhatsApp */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-green-600" />
          <h3 className="text-sm font-semibold text-gray-900">WhatsApp</h3>
        </div>

        <div className="space-y-1.5">
          <Label>Proveedor</Label>
          <div className="flex gap-2 flex-wrap">
            {(['none', 'evolution_api', 'twilio'] as const).map((p) => (
              <label
                key={p}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors',
                  watch('whatsappProvider') === p
                    ? 'border-guay-400 bg-guay-50 text-guay-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                )}
              >
                <input
                  type="radio"
                  value={p}
                  {...register('whatsappProvider')}
                  className="sr-only"
                />
                {p === 'none' ? 'Deshabilitado' : p === 'evolution_api' ? 'Evolution API' : 'Twilio'}
              </label>
            ))}
          </div>
        </div>

        {whatsappProvider !== 'none' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {whatsappProvider === 'evolution_api' && (
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="whatsappUrl">URL de Evolution API</Label>
                <Input
                  id="whatsappUrl"
                  placeholder="https://api.mi-servidor.com"
                  {...register('whatsappUrl')}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="whatsappToken">
                {whatsappProvider === 'twilio' ? 'Auth Token' : 'API Key'}
              </Label>
              <Input
                id="whatsappToken"
                type="password"
                placeholder="••••••••"
                {...register('whatsappToken')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="whatsappNumber">Número de WhatsApp de la planta</Label>
              <Input
                id="whatsappNumber"
                placeholder="+5493415000000"
                {...register('whatsappNumber')}
              />
            </div>
          </div>
        )}

        {whatsappProvider !== 'none' && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => testWhatsappMutation.mutate()}
              disabled={testWhatsappMutation.isPending}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', testWhatsappMutation.isPending && 'animate-spin')} />
              Enviar mensaje de prueba
            </button>
            {whatsappTestSent && (
              <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                <CheckCircle className="w-4 h-4" />
                Mensaje enviado
              </span>
            )}
          </div>
        )}
      </div>

      {/* Push notifications */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-900">Notificaciones Push</h3>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="firebaseProjectId">Firebase Project ID</Label>
          <Input
            id="firebaseProjectId"
            placeholder="mi-proyecto-12345"
            {...register('firebaseProjectId')}
          />
          <p className="text-xs text-gray-400">Requerido para notificaciones push en la app móvil</p>
        </div>
      </div>

      {/* Email */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-semibold text-gray-900">Email</h3>
        </div>

        <div className="space-y-1.5">
          <Label>Proveedor</Label>
          <div className="flex gap-2 flex-wrap">
            {(['none', 'resend', 'smtp'] as const).map((p) => (
              <label
                key={p}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors',
                  watch('emailProvider') === p
                    ? 'border-guay-400 bg-guay-50 text-guay-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                )}
              >
                <input
                  type="radio"
                  value={p}
                  {...register('emailProvider')}
                  className="sr-only"
                />
                {p === 'none' ? 'Deshabilitado' : p === 'resend' ? 'Resend' : 'SMTP'}
              </label>
            ))}
          </div>
        </div>

        {emailProvider === 'resend' && (
          <div className="space-y-1.5">
            <Label htmlFor="emailApiKey">API Key de Resend</Label>
            <Input
              id="emailApiKey"
              type="password"
              placeholder="re_••••••••"
              {...register('emailApiKey')}
            />
          </div>
        )}

        {emailProvider === 'smtp' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="emailSmtpHost">Host SMTP</Label>
              <Input id="emailSmtpHost" placeholder="smtp.ejemplo.com" {...register('emailSmtpHost')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emailSmtpPort">Puerto</Label>
              <Input id="emailSmtpPort" type="number" placeholder="587" {...register('emailSmtpPort')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emailSmtpUser">Usuario</Label>
              <Input id="emailSmtpUser" placeholder="usuario@smtp.com" {...register('emailSmtpUser')} />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="emailSmtpPassword">Contraseña</Label>
              <Input id="emailSmtpPassword" type="password" placeholder="••••••••" {...register('emailSmtpPassword')} />
            </div>
          </div>
        )}

        {emailProvider !== 'none' && (
          <div className="space-y-1.5">
            <Label htmlFor="emailFrom">Email remitente</Label>
            <Input
              id="emailFrom"
              type="email"
              placeholder="no-reply@miplanta.com.ar"
              {...register('emailFrom')}
              className={errors.emailFrom ? 'border-red-400' : ''}
            />
            {errors.emailFrom && <p className="text-xs text-red-600">{errors.emailFrom.message}</p>}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
            <CheckCircle className="w-4 h-4" />
            Guardado
          </span>
        )}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="px-5 py-2 bg-guay-600 hover:bg-guay-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {mutation.isPending ? 'Guardando...' : 'Guardar integraciones'}
        </button>
      </div>
    </form>
  );
}
