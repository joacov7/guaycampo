'use client';

import Link from 'next/link';
import { Package, Clock, ArrowRight } from 'lucide-react';
import { StatusBadge } from '@/components/turnos/status-badge';
import { TruckShiftRow } from '@/components/turnos/truck-shift-row';
import type { ShiftWithStats } from '@/types';

interface ShiftCardProps {
  shift: ShiftWithStats;
}

export function ShiftCard({ shift }: ShiftCardProps) {
  const pct = shift.totalSlots > 0
    ? Math.round((shift.usedSlots / shift.totalSlots) * 100)
    : 0;

  const visibleTrucks = (shift.truckShifts ?? []).slice(0, 3);
  const remaining = (shift.truckShifts?.length ?? 0) - visibleTrucks.length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-guay-50 flex items-center justify-center flex-shrink-0">
              <Package className="w-4.5 h-4.5 text-guay-600" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 truncate text-sm">
                {shift.commodity?.name ?? 'Sin cultivo'}
              </h3>
              <p className="text-xs text-gray-500 capitalize">{shift.operationType}</p>
            </div>
          </div>
          <StatusBadge status={shift.status} />
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 space-y-2">
        {/* Time */}
        {(shift.timeFrom ?? shift.timeTo) && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            {shift.timeFrom} {shift.timeTo ? `— ${shift.timeTo}` : ''}
          </div>
        )}

        {/* Slots progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Slots</span>
            <span className="font-medium text-gray-700">
              {shift.usedSlots} / {shift.totalSlots}
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-guay-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400">{pct}% ocupado</p>
        </div>

        {/* Truck list */}
        {visibleTrucks.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {visibleTrucks.map((ts) => (
              <TruckShiftRow key={ts.id} truckShift={ts} />
            ))}
            {remaining > 0 && (
              <p className="text-xs text-gray-400 text-center pt-1">
                +{remaining} camiones más
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
        <Link
          href={`/dashboard/turnos/${shift.id}`}
          className="flex items-center justify-between text-xs text-guay-600 hover:text-guay-700 font-medium"
        >
          Ver detalle
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
