'use client';

import { useState } from 'react';
import { Scale, AlertCircle } from 'lucide-react';
import { ScaleLiveDisplay } from '@/components/balanza/scale-live-display';
import { ActiveTicketCard } from '@/components/balanza/active-ticket-card';
import { TicketList } from '@/components/balanza/ticket-list';
import { useActiveTicket, useConfirmWeight, useScaleDevices } from '@/hooks/use-scale';
import { useQueueStore } from '@/lib/store';
import { Skeleton } from '@/components/ui/skeleton';
import type { IScaleTicket } from '@guaycampo/shared-types';

interface TicketWithDetails extends IScaleTicket {
  vehicle?: { plate: string };
  driver?: { fullName: string };
  client?: { name: string };
  commodity?: { name: string };
}

export default function BalanzaPage() {
  const { data: devicesData, isLoading: devicesLoading } = useScaleDevices();
  const { data: activeTicket, isLoading: ticketLoading } = useActiveTicket();
  const confirmWeight = useConfirmWeight();
  const { positions } = useQueueStore();

  const devices = devicesData ?? [];
  const firstDevice = devices[0];

  // Next 5 in queue for scale
  const nextInQueue = positions.slice(0, 5);

  const ticket = activeTicket as TicketWithDetails | null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-50 rounded-lg">
          <Scale className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Balanza</h1>
          <p className="text-sm text-gray-500 mt-0.5">Operación de báscula en tiempo real</p>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column: Scale display + active ticket */}
        <div className="lg:col-span-2 space-y-5">
          {devicesLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : firstDevice ? (
            <ScaleLiveDisplay
              deviceId={firstDevice.id}
              deviceName={firstDevice.name}
              ticketStatus={ticket?.status}
              onConfirmGross={(weight) => {
                if (ticket) {
                  confirmWeight.mutate({ id: ticket.id, type: 'gross', weight });
                }
              }}
              onConfirmTare={(weight) => {
                if (ticket) {
                  confirmWeight.mutate({ id: ticket.id, type: 'tare', weight });
                }
              }}
              isPending={confirmWeight.isPending}
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Sin dispositivos de báscula configurados</p>
            </div>
          )}

          {ticketLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : ticket ? (
            <ActiveTicketCard
              ticket={ticket}
              isPending={confirmWeight.isPending}
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <Scale className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Sin ticket activo en báscula</p>
            </div>
          )}
        </div>

        {/* Right column: queue */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Cola para báscula</h2>
              <span className="text-xs bg-guay-50 text-guay-700 font-medium px-2 py-0.5 rounded-full">
                {nextInQueue.length} próximos
              </span>
            </div>

            {nextInQueue.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">Cola vacía</p>
              </div>
            ) : (
              <div className="space-y-2">
                {nextInQueue.map((pos) => (
                  <div
                    key={pos.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="w-7 h-7 rounded-full bg-guay-100 text-guay-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {pos.position}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 font-mono">
                        {pos.truckShift?.vehicle?.plate ?? 'N/D'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {pos.truckShift?.commodity?.name ?? ''}
                      </p>
                    </div>
                    {pos.estimatedWait !== undefined && (
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        ~{pos.estimatedWait}min
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ticket list */}
      <TicketList />
    </div>
  );
}
