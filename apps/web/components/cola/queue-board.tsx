'use client';

import { useQueueRealtime } from '@/hooks/use-queue';
import { QueuePositionCard } from '@/components/cola/queue-position-card';
import { CallNextButton } from '@/components/cola/call-next-button';
import { ListOrdered, Loader2 } from 'lucide-react';
import type { QueuePositionWithDetails } from '@/types';

export function QueueBoard() {
  const { positions, metrics, isConnected, isLoading } = useQueueRealtime();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-guay-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricBox label="Total en cola" value={metrics.total} />
          <MetricBox label="Esp. promedio" value={`${metrics.avgWaitMinutes}m`} />
          <MetricBox label="En báscula" value={metrics.currentlyInScale} accent />
          <MetricBox label="Llamados hoy" value={metrics.calledToday} />
        </div>
      )}

      {/* Header + Call button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListOrdered className="w-5 h-5 text-guay-600" />
          <h2 className="font-semibold text-gray-900">
            Cola actual
          </h2>
          <span className="text-xs text-gray-400">
            ({positions.length} camiones)
          </span>
        </div>
        <CallNextButton queueLength={positions.length} />
      </div>

      {/* Connection status */}
      <div className={`flex items-center gap-2 text-xs ${isConnected ? 'text-green-600' : 'text-gray-400'}`}>
        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
        {isConnected ? 'Actualización en tiempo real activa' : 'Sin conexión en tiempo real'}
      </div>

      {/* Queue list */}
      {positions.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <ListOrdered className="w-12 h-12 text-gray-200 mx-auto" />
          <p className="text-gray-500 font-medium">Cola vacía</p>
          <p className="text-sm text-gray-400">
            No hay camiones en espera en este momento
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {positions.map((position: QueuePositionWithDetails) => (
            <QueuePositionCard
              key={position.id}
              position={position}
              isCalled={position.calledAt !== undefined && position.calledAt !== null && !position.enteredAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MetricBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 text-center ${
        accent
          ? 'bg-guay-50 border-guay-200'
          : 'bg-white border-gray-200'
      }`}
    >
      <p className={`text-2xl font-bold ${accent ? 'text-guay-700' : 'text-gray-900'}`}>
        {value}
      </p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
