'use client';

import { cn } from '@/lib/utils';
import { WifiOff, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useActiveTicker } from '@/hooks/use-scale';
import type { ScaleStatus } from '@guaycampo/shared-types';

interface ScaleLiveDisplayProps {
  deviceId: string;
  deviceName?: string;
  ticketStatus?: ScaleStatus;
  onConfirmGross?: (weight: number) => void;
  onConfirmTare?: (weight: number) => void;
  isPending?: boolean;
}

function formatWeight(kg: number): string {
  return kg.toLocaleString('es-AR', { minimumFractionDigits: 0 }) + ' kg';
}

export function ScaleLiveDisplay({
  deviceId,
  deviceName = 'Báscula 1',
  ticketStatus,
  onConfirmGross,
  onConfirmTare,
  isPending = false,
}: ScaleLiveDisplayProps) {
  const { liveWeight, isStable, isOnline } = useActiveTicker(deviceId);

  const scaleStatusLabel = !isOnline
    ? 'OFFLINE'
    : ticketStatus === 'en_uso' || ticketStatus === 'pesada_bruta' || ticketStatus === 'pesada_tara'
    ? 'EN USO'
    : 'LIBRE';

  const scaleStatusColor = !isOnline
    ? 'bg-red-100 text-red-700'
    : scaleStatusLabel === 'EN USO'
    ? 'bg-yellow-100 text-yellow-700'
    : 'bg-green-100 text-green-700';

  const showConfirmGross =
    isOnline && ticketStatus === 'pesada_bruta' && liveWeight !== null;
  const showConfirmTare =
    isOnline && ticketStatus === 'pesada_tara' && liveWeight !== null;

  return (
    <div
      className={cn(
        'bg-white rounded-xl border p-6 space-y-5',
        !isOnline ? 'border-red-300' : 'border-gray-200',
      )}
    >
      {/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm font-medium">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          Báscula desconectada — sin señal del dispositivo
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">{deviceName}</span>
        </div>
        <span
          className={cn(
            'text-xs font-semibold px-3 py-1 rounded-full',
            scaleStatusColor,
          )}
        >
          {scaleStatusLabel}
        </span>
      </div>

      {/* Weight display */}
      <div className="text-center py-4">
        <div className="flex items-center justify-center gap-4">
          <span
            className={cn(
              'text-5xl md:text-6xl font-black tracking-tight',
              !isOnline
                ? 'text-gray-300'
                : liveWeight === null
                ? 'text-gray-300'
                : 'text-gray-900',
            )}
          >
            {liveWeight !== null ? formatWeight(liveWeight) : '— — —'}
          </span>

          {/* Stability indicator */}
          {isOnline && liveWeight !== null && (
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'w-4 h-4 rounded-full',
                  isStable
                    ? 'bg-green-500 animate-pulse'
                    : 'bg-yellow-400',
                )}
              />
              <span className="text-xs text-gray-400">
                {isStable ? 'Estable' : 'Fluctuando'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {showConfirmGross && (
          <Button
            className="flex-1 bg-guay-600 hover:bg-guay-700 text-white font-semibold"
            disabled={!isStable || isPending}
            onClick={() => liveWeight !== null && onConfirmGross?.(liveWeight)}
          >
            {isPending ? 'Confirmando...' : 'Confirmar Peso Bruto'}
          </Button>
        )}
        {showConfirmTare && (
          <Button
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            disabled={!isStable || isPending}
            onClick={() => liveWeight !== null && onConfirmTare?.(liveWeight)}
          >
            {isPending ? 'Confirmando...' : 'Confirmar Tara'}
          </Button>
        )}
        {!showConfirmGross && !showConfirmTare && isOnline && (
          <p className="text-sm text-gray-400 text-center w-full py-2">
            Sin acción pendiente — esperando ticket activo
          </p>
        )}
      </div>
    </div>
  );
}
