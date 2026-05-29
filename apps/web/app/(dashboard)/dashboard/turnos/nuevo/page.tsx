'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ShiftForm } from '@/components/turnos/shift-form';
import { api } from '@/lib/api';
import type { CreateShiftFormValues } from '@/lib/validations';

export default function NuevoTurnoPage() {
  const router = useRouter();

  async function handleSubmit(data: CreateShiftFormValues) {
    await api.post('/shifts', {
      date: data.date,
      commodityId: data.commodityId,
      operationType: data.operationType,
      totalSlots: data.totalSlots,
      timeFrom: data.timeFrom || undefined,
      timeTo: data.timeTo || undefined,
    });
    router.push('/dashboard/turnos');
    router.refresh();
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      {/* Back button */}
      <div>
        <Link
          href="/dashboard/turnos"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Turnos
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Nuevo Turno</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Configure el turno para el día y cultivo
        </p>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <ShiftForm onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
