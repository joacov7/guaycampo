'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Loader2, Clock, Package, Calendar } from 'lucide-react';
import { useShift, useTruckShifts } from '@/hooks/use-shifts';
import { TruckShiftRow } from '@/components/turnos/truck-shift-row';
import { StatusBadge } from '@/components/turnos/status-badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ITruckShift } from '@guaycampo/shared-types';

interface ShiftDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ShiftDetailPage({ params }: ShiftDetailPageProps) {
  const { id } = use(params);
  const { data: shift, isLoading: shiftLoading } = useShift(id);
  const { data: trucks, isLoading: trucksLoading } = useTruckShifts(id);

  const isLoading = shiftLoading || trucksLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-guay-500" />
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-gray-600 font-medium">Turno no encontrado</p>
        <Link href="/dashboard/turnos" className="text-sm text-guay-600 hover:underline">
          Volver a Turnos
        </Link>
      </div>
    );
  }

  const pct = shift.totalSlots > 0
    ? Math.round((shift.usedSlots / shift.totalSlots) * 100)
    : 0;

  const dateFormatted = (() => {
    try {
      return format(new Date(shift.date), "EEEE d 'de' MMMM yyyy", { locale: es });
    } catch {
      return String(shift.date);
    }
  })();

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Back */}
      <Link
        href="/dashboard/turnos"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Turnos
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-gray-900">
              {shift.commodity?.name ?? 'Turno'}
            </h1>
            <p className="text-sm text-gray-500 capitalize">{shift.operationType}</p>
          </div>
          <StatusBadge status={shift.status} />
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700 capitalize">{dateFormatted}</span>
          </div>
          {(shift.timeFrom ?? shift.timeTo) && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-700">
                {shift.timeFrom} {shift.timeTo ? `— ${shift.timeTo}` : ''}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Package className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700">
              {shift.usedSlots} / {shift.totalSlots} slots
            </span>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Capacidad utilizada</span>
            <span className="font-medium text-gray-700">{pct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-guay-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Trucks section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">
            Camiones ({trucks?.length ?? 0})
          </h2>
          <Button
            size="sm"
            className="bg-guay-600 hover:bg-guay-700 gap-1.5"
            disabled
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar camión
          </Button>
        </div>

        {(trucks?.length ?? 0) === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-gray-200 space-y-2">
            <p className="text-gray-500 font-medium">Sin camiones asignados</p>
            <p className="text-sm text-gray-400">
              Agregue camiones a este turno para comenzar
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {trucks?.map((ts: ITruckShift) => (
              <TruckShiftRow key={ts.id} truckShift={ts} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
