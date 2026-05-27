import type { Metadata } from 'next';
import { Truck, CalendarDays, Weight, Clock } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { QueueWidget } from '@/components/dashboard/queue-widget';
import { RecentActivity } from '@/components/dashboard/recent-activity';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function DashboardPage() {
  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5 capitalize">{today}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatsCard
          label="Camiones hoy"
          value={8}
          sublabel="5 en cola ahora"
          icon={Truck}
          accent="blue"
        />
        <StatsCard
          label="Turnos activos"
          value={3}
          sublabel="1 completado"
          icon={CalendarDays}
          accent="guay"
        />
        <StatsCard
          label="Toneladas"
          value="285t"
          sublabel="procesadas hoy"
          icon={Weight}
          accent="purple"
        />
        <StatsCard
          label="Espera prom."
          value="42m"
          sublabel="por camión"
          icon={Clock}
          accent="orange"
        />
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Queue widget — real-time */}
        <div className="lg:col-span-1">
          <QueueWidget />
        </div>

        {/* Recent activity */}
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
