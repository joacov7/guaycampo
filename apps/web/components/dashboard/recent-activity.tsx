import { cn } from '@/lib/utils';
import { CheckCircle2, Truck, Scale, FlaskConical, XCircle, LogIn } from 'lucide-react';
import { TruckShiftStatus } from '@guaycampo/shared-types';
import type { ActivityEvent } from '@/types';

interface RecentActivityProps {
  events?: ActivityEvent[];
}

const eventIconMap: Record<ActivityEvent['type'], React.ComponentType<{ className?: string }>> = {
  checkin: LogIn,
  called: Truck,
  scale: Scale,
  lab: FlaskConical,
  completed: CheckCircle2,
  rejected: XCircle,
};

const eventColorMap: Record<ActivityEvent['type'], string> = {
  checkin: 'bg-blue-100 text-blue-600',
  called: 'bg-yellow-100 text-yellow-600',
  scale: 'bg-purple-100 text-purple-600',
  lab: 'bg-indigo-100 text-indigo-600',
  completed: 'bg-green-100 text-green-600',
  rejected: 'bg-red-100 text-red-600',
};

const eventLabelMap: Record<ActivityEvent['type'], string> = {
  checkin: 'Ingresó',
  called: 'Llamado',
  scale: 'En báscula',
  lab: 'En laboratorio',
  completed: 'Completado',
  rejected: 'Rechazado',
};

const mockEvents: ActivityEvent[] = [
  {
    id: '1',
    type: 'checkin',
    plate: 'ABC 123',
    driverName: 'Carlos Gómez',
    commodityName: 'Soja',
    status: TruckShiftStatus.EN_PLANTA,
    timestamp: new Date(Date.now() - 5 * 60_000).toISOString(),
  },
  {
    id: '2',
    type: 'scale',
    plate: 'DEF 456',
    driverName: 'Luis Martínez',
    commodityName: 'Maíz',
    status: TruckShiftStatus.EN_BALANZA,
    timestamp: new Date(Date.now() - 12 * 60_000).toISOString(),
  },
  {
    id: '3',
    type: 'completed',
    plate: 'GHI 789',
    driverName: 'Roberto Díaz',
    commodityName: 'Soja',
    status: TruckShiftStatus.COMPLETADO,
    timestamp: new Date(Date.now() - 25 * 60_000).toISOString(),
  },
  {
    id: '4',
    type: 'called',
    plate: 'JKL 012',
    driverName: 'Mario Fernández',
    commodityName: 'Girasol',
    status: TruckShiftStatus.EN_PLANTA,
    timestamp: new Date(Date.now() - 35 * 60_000).toISOString(),
  },
];

function formatRelativeTime(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 60_000);
  if (diff < 1) return 'hace un momento';
  if (diff === 1) return 'hace 1 min';
  if (diff < 60) return `hace ${diff} min`;
  const hours = Math.floor(diff / 60);
  return `hace ${hours}h`;
}

export function RecentActivity({ events = mockEvents }: RecentActivityProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-900">Actividad reciente</h2>

      <div className="space-y-2">
        {events.map((event) => {
          const Icon = eventIconMap[event.type];
          const colorClass = eventColorMap[event.type];

          return (
            <div
              key={event.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-default"
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  colorClass,
                )}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-800">{event.plate}</span>
                  <span className="text-xs text-gray-500">&mdash;</span>
                  <span className="text-xs text-gray-600 truncate">{event.driverName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'text-xs font-medium',
                      colorClass.split(' ')[1],
                    )}
                  >
                    {eventLabelMap[event.type]}
                  </span>
                  <span className="text-xs text-gray-400">{event.commodityName}</span>
                </div>
              </div>

              <span className="text-xs text-gray-400 flex-shrink-0">
                {formatRelativeTime(event.timestamp)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
