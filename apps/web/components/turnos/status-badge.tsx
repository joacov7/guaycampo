import { cn } from '@/lib/utils';
import type { TruckShiftStatus, ShiftScheduleStatus } from '@guaycampo/shared-types';

type Status = TruckShiftStatus | ShiftScheduleStatus | string;

const statusConfig: Record<
  string,
  { label: string; classes: string }
> = {
  // TruckShiftStatus
  pendiente: { label: 'Pendiente', classes: 'bg-gray-100 text-gray-700 border-gray-200' },
  confirmado: { label: 'Confirmado', classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  en_camino: { label: 'En camino', classes: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  en_planta: { label: 'En planta', classes: 'bg-orange-50 text-orange-700 border-orange-200' },
  en_balanza: { label: 'En báscula', classes: 'bg-purple-50 text-purple-700 border-purple-200' },
  en_laboratorio: { label: 'En lab.', classes: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  en_descarga: { label: 'En descarga', classes: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  completado: { label: 'Completado', classes: 'bg-green-50 text-green-700 border-green-200' },
  rechazado: { label: 'Rechazado', classes: 'bg-red-50 text-red-700 border-red-200' },
  cancelado: { label: 'Cancelado', classes: 'bg-gray-100 text-gray-500 border-gray-200' },
  // ShiftScheduleStatus
  open: { label: 'Abierto', classes: 'bg-green-50 text-green-700 border-green-200' },
  closed: { label: 'Cerrado', classes: 'bg-gray-100 text-gray-600 border-gray-200' },
  completed: { label: 'Completado', classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  cancelled: { label: 'Cancelado', classes: 'bg-red-50 text-red-600 border-red-200' },
};

interface StatusBadgeProps {
  status: Status;
  size?: 'sm' | 'default';
  className?: string;
}

export function StatusBadge({ status, size = 'default', className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    classes: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-xs',
        config.classes,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
