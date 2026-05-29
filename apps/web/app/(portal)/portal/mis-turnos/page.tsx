'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { format, isPast, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays, Plus, QrCode, X, Clock, CheckCircle, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ITruckShift } from '@guaycampo/shared-types';
import { TruckShiftStatus } from '@guaycampo/shared-types';

interface TruckShiftWithDetails extends ITruckShift {
  shift?: {
    id: string;
    date: Date | string;
    timeFrom?: string;
    timeTo?: string;
    commodity?: { name: string };
  };
  vehicle?: { plate: string };
  driver?: { fullName: string };
  commodity?: { name: string };
}

const statusLabel: Partial<Record<TruckShiftStatus, string>> = {
  [TruckShiftStatus.PENDIENTE]: 'Pendiente',
  [TruckShiftStatus.CONFIRMADO]: 'Confirmado',
  [TruckShiftStatus.EN_CAMINO]: 'En camino',
  [TruckShiftStatus.EN_PLANTA]: 'En planta',
  [TruckShiftStatus.EN_BALANZA]: 'En balanza',
  [TruckShiftStatus.COMPLETADO]: 'Completado',
  [TruckShiftStatus.CANCELADO]: 'Cancelado',
  [TruckShiftStatus.RECHAZADO]: 'Rechazado',
};

const statusStyle: Partial<Record<TruckShiftStatus, string>> = {
  [TruckShiftStatus.PENDIENTE]: 'bg-yellow-50 text-yellow-700',
  [TruckShiftStatus.CONFIRMADO]: 'bg-guay-50 text-guay-700',
  [TruckShiftStatus.EN_CAMINO]: 'bg-blue-50 text-blue-700',
  [TruckShiftStatus.EN_PLANTA]: 'bg-blue-50 text-blue-700',
  [TruckShiftStatus.EN_BALANZA]: 'bg-purple-50 text-purple-700',
  [TruckShiftStatus.COMPLETADO]: 'bg-green-50 text-green-700',
  [TruckShiftStatus.CANCELADO]: 'bg-gray-100 text-gray-500',
  [TruckShiftStatus.RECHAZADO]: 'bg-red-50 text-red-700',
};

const UPCOMING_STATUSES = [
  TruckShiftStatus.PENDIENTE,
  TruckShiftStatus.CONFIRMADO,
  TruckShiftStatus.EN_CAMINO,
  TruckShiftStatus.EN_PLANTA,
  TruckShiftStatus.EN_BALANZA,
  TruckShiftStatus.EN_LABORATORIO,
  TruckShiftStatus.EN_DESCARGA,
];

function QRModal({ qrCode, onClose }: { qrCode: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-xs w-full space-y-4 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Código QR del turno</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-center">
          {/* Mostrar QR como imagen o texto según el formato */}
          {qrCode.startsWith('data:image') ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrCode} alt="QR Code" className="w-48 h-48" />
          ) : (
            <div className="font-mono text-xs text-center break-all select-all text-gray-700 p-2">
              {qrCode}
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Mostrá este código al ingresar a la planta
        </p>
      </div>
    </div>
  );
}

export default function MisTurnosPage() {
  const [activeTab, setActiveTab] = useState<'proximos' | 'historial'>('proximos');
  const [qrVisible, setQrVisible] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: turnosRes, isLoading } = useQuery<{ data: TruckShiftWithDetails[] }>({
    queryKey: ['portal-mis-turnos', activeTab],
    queryFn: () =>
      api.get<{ data: TruckShiftWithDetails[] }>('/trucks/shifts', {
        params: {
          mine: true,
          tab: activeTab,
          limit: 50,
        },
      }),
    staleTime: 30_000,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/trucks/shifts/${id}/status`, { status: TruckShiftStatus.CANCELADO }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['portal-mis-turnos'] });
    },
  });

  const turnos = turnosRes?.data ?? [];

  const proximos = turnos.filter((t) => UPCOMING_STATUSES.includes(t.status as TruckShiftStatus));
  const historial = turnos.filter((t) => !UPCOMING_STATUSES.includes(t.status as TruckShiftStatus));

  const displayList = activeTab === 'proximos' ? proximos : historial;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mis Turnos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gestioná tus turnos de descarga
          </p>
        </div>
        <Link
          href="/portal/mis-turnos/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-guay-600 hover:bg-guay-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Reservar turno</span>
          <span className="sm:hidden">Nuevo</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('proximos')}
            className={cn(
              'flex-1 py-3 text-sm font-medium transition-colors',
              activeTab === 'proximos'
                ? 'text-guay-700 border-b-2 border-guay-600 bg-guay-50'
                : 'text-gray-500 hover:text-gray-800',
            )}
          >
            Próximos
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={cn(
              'flex-1 py-3 text-sm font-medium transition-colors',
              activeTab === 'historial'
                ? 'text-guay-700 border-b-2 border-guay-600 bg-guay-50'
                : 'text-gray-500 hover:text-gray-800',
            )}
          >
            Historial
          </button>
        </div>

        {/* Lista */}
        <div className="divide-y divide-gray-100">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 animate-pulse">
                <div className="h-4 w-40 bg-gray-100 rounded mb-2" />
                <div className="h-3 w-28 bg-gray-100 rounded" />
              </div>
            ))
          ) : displayList.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">
                {activeTab === 'proximos' ? 'No tenés turnos próximos' : 'Sin historial de turnos'}
              </p>
              {activeTab === 'proximos' && (
                <Link
                  href="/portal/mis-turnos/nuevo"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm text-guay-600 hover:text-guay-700 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Reservar un turno
                </Link>
              )}
            </div>
          ) : (
            displayList.map((turno) => {
              const shiftDate = turno.shift?.date ? new Date(turno.shift.date) : null;
              const isUpcoming = shiftDate && !isPast(shiftDate);
              const commodity = turno.commodity?.name ?? turno.shift?.commodity?.name ?? '—';

              return (
                <div key={turno.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">
                          {commodity}
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                            statusStyle[turno.status as TruckShiftStatus] ?? 'bg-gray-100 text-gray-600',
                          )}
                        >
                          {statusLabel[turno.status as TruckShiftStatus] ?? turno.status}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                        {shiftDate && (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {format(shiftDate, "d 'de' MMMM yyyy", { locale: es })}
                            {turno.shift?.timeFrom && ` · ${turno.shift.timeFrom}`}
                          </span>
                        )}
                        {turno.vehicle?.plate && (
                          <span>Camión: {turno.vehicle.plate}</span>
                        )}
                        {turno.driver?.fullName && (
                          <span className="hidden sm:inline">Chofer: {turno.driver.fullName}</span>
                        )}
                        {turno.estimatedQty && (
                          <span>~{turno.estimatedQty.toLocaleString('es-AR')} kg</span>
                        )}
                      </div>

                      {isUpcoming && shiftDate && (
                        <p className="text-xs text-guay-600 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(shiftDate, { addSuffix: true, locale: es })}
                        </p>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {turno.qrCode && (
                        <button
                          onClick={() => setQrVisible(turno.qrCode!)}
                          className="flex items-center gap-1 text-xs text-guay-600 hover:text-guay-700 bg-guay-50 hover:bg-guay-100 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Ver QR</span>
                        </button>
                      )}
                      {turno.status === TruckShiftStatus.PENDIENTE && (
                        <button
                          onClick={() => {
                            if (confirm('¿Cancelar este turno?')) {
                              cancelMutation.mutate(turno.id);
                            }
                          }}
                          disabled={cancelMutation.isPending}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          title="Cancelar turno"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                      {turno.status === TruckShiftStatus.COMPLETADO && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal QR */}
      {qrVisible && (
        <QRModal qrCode={qrVisible} onClose={() => setQrVisible(null)} />
      )}
    </div>
  );
}
