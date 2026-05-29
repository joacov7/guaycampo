'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ClientForm, type ClientFormValues } from '@/components/clientes/client-form';
import { useCreateClient } from '@/hooks/use-clients';

export default function NuevoClientePage() {
  const router = useRouter();
  const createClient = useCreateClient();

  function handleSubmit(values: ClientFormValues) {
    createClient.mutate(
      {
        ...values,
        email: values.email || undefined,
      },
      {
        onSuccess: (client) => {
          router.push(`/dashboard/clientes/${client.id}`);
        },
      },
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/clientes"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Clientes
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-900 font-medium">Nuevo cliente</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-900">Crear cliente</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Completá los datos del productor o cliente del acopio.
          </p>
        </div>
        <div className="p-6">
          {createClient.isError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              Error al crear el cliente. Verificá que el CUIT no esté ya registrado.
            </div>
          )}
          <ClientForm
            onSubmit={handleSubmit}
            isLoading={createClient.isPending}
            isEditMode={false}
          />
        </div>
      </div>
    </div>
  );
}
