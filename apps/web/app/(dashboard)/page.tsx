import type { Metadata } from 'next';
import type {
  IDashboardStats,
  TruckShiftStatus,
} from '@guaycampo/shared-types';

export const metadata: Metadata = {
  title: 'Dashboard',
};

// Mock data for scaffold — replace with real API calls
const mockStats: IDashboardStats = {
  date: new Date(),
  tenantId: 'demo',
  shiftsToday: 3,
  shiftsCompleted: 1,
  shiftsPending: 2,
  trucksInPlant: 8,
  trucksInQueue: 5,
  totalWeightToday: 285000,
  avgWaitTime: 42,
  siloCapacityUsed: 4200,
  siloCapacityTotal: 8000,
  alertsActive: 1,
};

const mockRecentShifts = [
  {
    id: '1',
    plate: 'ABC123',
    driver: 'Carlos Gómez',
    commodity: 'Soja',
    status: 'en_balanza' as TruckShiftStatus,
    time: '08:45',
  },
  {
    id: '2',
    plate: 'DEF456',
    driver: 'Luis Martínez',
    commodity: 'Maíz',
    status: 'en_laboratorio' as TruckShiftStatus,
    time: '09:10',
  },
  {
    id: '3',
    plate: 'GHI789',
    driver: 'Roberto Díaz',
    commodity: 'Soja',
    status: 'en_descarga' as TruckShiftStatus,
    time: '09:30',
  },
];

const statusColors: Record<string, string> = {
  pendiente: 'bg-gray-100 text-gray-700',
  confirmado: 'bg-blue-50 text-blue-700',
  en_camino: 'bg-yellow-50 text-yellow-700',
  en_planta: 'bg-orange-50 text-orange-700',
  en_balanza: 'bg-purple-50 text-purple-700',
  en_laboratorio: 'bg-indigo-50 text-indigo-700',
  en_descarga: 'bg-cyan-50 text-cyan-700',
  completado: 'bg-green-50 text-green-700',
  rechazado: 'bg-red-50 text-red-700',
  cancelado: 'bg-gray-100 text-gray-500',
};

const statusLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_camino: 'En camino',
  en_planta: 'En planta',
  en_balanza: 'En balanza',
  en_laboratorio: 'En laboratorio',
  en_descarga: 'En descarga',
  completado: 'Completado',
  rechazado: 'Rechazado',
  cancelado: 'Cancelado',
};

export default function DashboardPage() {
  const capacityPct = Math.round(
    (mockStats.siloCapacityUsed / mockStats.siloCapacityTotal) * 100,
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date().toLocaleDateString('es-AR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Camiones en planta"
          value={mockStats.trucksInPlant}
          sublabel={`${mockStats.trucksInQueue} en cola`}
          accent="blue"
        />
        <StatCard
          label="Turnos hoy"
          value={mockStats.shiftsToday}
          sublabel={`${mockStats.shiftsCompleted} completados`}
          accent="green"
        />
        <StatCard
          label="Peso total"
          value={`${(mockStats.totalWeightToday / 1000).toFixed(1)}t`}
          sublabel="hoy"
          accent="purple"
        />
        <StatCard
          label="Espera promedio"
          value={`${mockStats.avgWaitTime}m`}
          sublabel="por camión"
          accent="orange"
        />
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Silo capacity */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Capacidad de silos
          </h2>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Ocupado</span>
              <span className="font-medium text-gray-900">{capacityPct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  capacityPct > 90
                    ? 'bg-red-500'
                    : capacityPct > 75
                    ? 'bg-yellow-500'
                    : 'bg-guay-500'
                }`}
                style={{ width: `${capacityPct}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">
              {(mockStats.siloCapacityUsed / 1000).toFixed(1)}k /{' '}
              {(mockStats.siloCapacityTotal / 1000).toFixed(1)}k ton
            </p>
          </div>
          {mockStats.alertsActive > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700">
              <span className="font-medium">
                {mockStats.alertsActive} alerta{mockStats.alertsActive > 1 ? 's' : ''} activa
                {mockStats.alertsActive > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Actividad reciente
          </h2>
          <div className="space-y-2">
            {mockRecentShifts.map((shift) => (
              <div
                key={shift.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-700">
                  {shift.plate}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {shift.driver}
                  </p>
                  <p className="text-xs text-gray-500">{shift.commodity}</p>
                </div>
                <div className="text-right space-y-1">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      statusColors[shift.status] ?? ''
                    }`}
                  >
                    {statusLabels[shift.status] ?? shift.status}
                  </span>
                  <p className="text-xs text-gray-400">{shift.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sublabel,
  accent,
}: {
  label: string;
  value: string | number;
  sublabel: string;
  accent: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const accentClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <p
        className={`text-3xl font-bold ${
          accentClasses[accent].split(' ')[1]
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-gray-400">{sublabel}</p>
    </div>
  );
}
