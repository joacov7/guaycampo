import { cn } from '@/lib/utils';
import { Clock, Truck, User, Package } from 'lucide-react';
import type { QueuePositionWithDetails } from '@/types';

interface QueuePositionCardProps {
  position: QueuePositionWithDetails;
  isCalled?: boolean;
}

function formatWaitTime(minutes?: number): string {
  if (minutes === undefined) return '—';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function QueuePositionCard({ position, isCalled }: QueuePositionCardProps) {
  const ts = position.truckShift;

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 rounded-xl border transition-all',
        isCalled
          ? 'bg-guay-50 border-guay-300 shadow-sm ring-1 ring-guay-200'
          : 'bg-white border-gray-200 hover:border-gray-300',
      )}
    >
      {/* Position number */}
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0',
          isCalled
            ? 'bg-guay-600 text-white'
            : position.position <= 3
            ? 'bg-guay-100 text-guay-700'
            : 'bg-gray-100 text-gray-500',
        )}
      >
        {position.position}
      </div>

      {/* Vehicle plate */}
      <div className="w-20 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
        <div className="flex items-center gap-1">
          <Truck className="w-3 h-3 text-gray-400" />
          <span className="text-xs font-bold text-gray-700">
            {ts?.vehicle?.plate ?? 'N/A'}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-700 truncate">
            {ts?.driver?.fullName ?? '—'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <Package className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-500 truncate">
            {ts?.commodity?.name ?? '—'}
          </span>
        </div>
        <div className="hidden md:flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-500">
            Espera: {formatWaitTime(position.estimatedWait)}
          </span>
        </div>
      </div>

      {/* Called indicator */}
      {isCalled && (
        <span className="text-xs font-medium bg-guay-600 text-white px-2.5 py-1 rounded-full flex-shrink-0 animate-pulse">
          Llamado
        </span>
      )}

      {/* Zone */}
      {position.parkingZone && (
        <span className="hidden sm:inline-flex text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
          Zona {position.parkingZone}
        </span>
      )}
    </div>
  );
}
