'use client';

import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from '@/components/recharts-wrapper';

interface ThroughputPoint {
  hour: string;
  camiones: number;
  toneladas?: number;
}

export function ThroughputChart() {
  const { data, isLoading } = useQuery<ThroughputPoint[]>({
    queryKey: ['throughput', 'today'],
    queryFn: () => api.get<ThroughputPoint[]>('/dashboard/throughput'),
    refetchInterval: 60_000,
  });

  // Mock data as fallback for UI
  const chartData: ThroughputPoint[] = data ?? Array.from({ length: 12 }, (_, i) => ({
    hour: `${(6 + i).toString().padStart(2, '0')}:00`,
    camiones: Math.floor(Math.random() * 8),
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Camiones por hora</h2>
        <span className="text-xs text-gray-400">Últimas 12 horas</span>
      </div>

      {isLoading ? (
        <Skeleton className="h-44 w-full" />
      ) : (
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 2, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                formatter={(value: number | string) => [`${value} camiones`, 'Procesados']}
              />
              <Bar
                dataKey="camiones"
                fill="#16a34a"
                radius={[3, 3, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
