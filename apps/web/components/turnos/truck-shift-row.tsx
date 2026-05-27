import { StatusBadge } from '@/components/turnos/status-badge';
import { Truck, User, Package } from 'lucide-react';
import type { TruckShiftStatus } from '@guaycampo/shared-types';

interface TruckShiftWithDetails {
  id: string;
  vehicle?: { plate: string };
  driver?: { fullName: string };
  commodity?: { name: string };
  estimatedQty?: number;
  status: TruckShiftStatus;
}

interface TruckShiftRowProps {
  truckShift: TruckShiftWithDetails;
  onClick?: () => void;
}

export function TruckShiftRow({ truckShift, onClick }: TruckShiftRowProps) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e: React.KeyboardEvent) => e.key === 'Enter' && onClick() : undefined}
      className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 transition-colors"
    >
      {/* Plate */}
      <div className="w-16 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
        <span className="text-xs font-bold text-gray-700">
          {truckShift.vehicle?.plate ?? 'N/A'}
        </span>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 grid grid-cols-3 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-700 truncate">
            {truckShift.driver?.fullName ?? 'Sin conductor'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <Package className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-500 truncate">
            {truckShift.commodity?.name ?? '—'}
          </span>
        </div>
        {truckShift.estimatedQty !== undefined && (
          <div className="flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-500">
              {(truckShift.estimatedQty / 1000).toFixed(1)}t
            </span>
          </div>
        )}
      </div>

      {/* Status */}
      <StatusBadge status={truckShift.status} size="sm" />
    </div>
  );
}
