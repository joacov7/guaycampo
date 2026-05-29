'use client';

import { useQuery } from '@tanstack/react-query';
import { Truck, Database, Weight, Thermometer, AlertTriangle, Clock } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { QueueWidget } from '@/components/dashboard/queue-widget';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { ThroughputChart } from '@/components/dashboard/throughput-chart';
import { ActiveAlertsWidget } from '@/components/dashboard/active-alerts-widget';
import { OperationsOverview } from '@/components/dashboard/operations-overview';
import { api } from '@/lib/api';
import type { IDashboardStats } from '@guaycampo/shared-types';
import { useQueueStore } from '@/lib/store';

// Stock por cultivo
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from '@/components/recharts-wrapper';
import { Skeleton } from '@/components/ui/skeleton';

interface StockByCommodity {
  name: string;
  toneladas: number;
}

function StockChart() {
  const { data, isLoading } = useQuery<StockByCommodity[]>({
    queryKey: ['dashboard-stock-commodity'],
    queryFn: () => api.get<StockByCommodity[]>('/dashboard/stock-by-commodity'),
    refetchInterval: 60_000,
  });

  const chartData: StockByCommodity[] = data ?? [
    { name: 'Soja', toneladas: 1450 },
    { name: 'Maíz', toneladas: 820 },
    { name: 'Trigo', toneladas: 340 },
    { name: 'Girasol', toneladas: 210 },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">Stock por cultivo (tn)</h2>
      {isLoading ? (
        <Skeleton className="h-44 w-full" />
      ) : (
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 2, bottom: 2 }}>
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                formatter={(v: number | string) => [`${v} tn`, 'Stock']}
              />
              <Bar dataKey="toneladas" fill="#16a34a" radius={[0, 4, 4, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const { metrics } = useQueueStore();

  const { data: stats } = useQuery<IDashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<IDashboardStats>('/dashboard/stats'),
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5 capitalize">{today}</p>
      </div>

      {/* Row 1: 6 KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatsCard
          label="Camiones hoy"
          value={stats?.trucksInPlant ?? '—'}
          sublabel="en planta ahora"
          icon={Truck}
          accent="blue"
        />
        <StatsCard
          label="En cola"
          value={metrics?.total ?? '—'}
          sublabel="esperando turno"
          icon={Clock}
          accent="orange"
        />
        <StatsCard
          label="Procesados"
          value={stats?.shiftsCompleted ?? '—'}
          sublabel="turnos completados"
          icon={Truck}
          accent="guay"
        />
        <StatsCard
          label="Toneladas"
          value={
            stats?.totalWeightToday
              ? `${(stats.totalWeightToday / 1000).toFixed(0)}tn`
              : '—'
          }
          sublabel="pesadas hoy"
          icon={Weight}
          accent="purple"
        />
        <StatsCard
          label="Temp. max silo"
          value={
            stats?.siloCapacityUsed !== undefined
              ? `—°C`
              : '—'
          }
          sublabel="temperatura máxima"
          icon={Thermometer}
          accent="orange"
        />
        <StatsCard
          label="Alertas activas"
          value={stats?.alertsActive ?? 0}
          sublabel={stats?.alertsActive ? 'requieren atención' : 'sin problemas'}
          icon={AlertTriangle}
          accent={stats?.alertsActive ? 'orange' : 'guay'}
        />
      </div>

      {/* Row 2: Operations overview */}
      <OperationsOverview />

      {/* Row 3: Chart + Queue + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Throughput chart — 50% */}
        <div className="lg:col-span-2">
          <ThroughputChart />
        </div>

        {/* Queue — 25% */}
        <div className="lg:col-span-1">
          <QueueWidget />
        </div>

        {/* Alerts — 25% */}
        <div className="lg:col-span-1">
          <ActiveAlertsWidget maxItems={4} />
        </div>
      </div>

      {/* Row 4: Activity + Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Activity — 60% */}
        <div className="lg:col-span-3">
          <RecentActivity />
        </div>

        {/* Stock by commodity — 40% */}
        <div className="lg:col-span-2">
          <StockChart />
        </div>
      </div>
    </div>
  );
}
