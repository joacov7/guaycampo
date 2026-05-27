'use client';

import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle } from 'lucide-react';
import { useSiloChart } from '@/hooks/use-silos';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from '@/components/recharts-wrapper';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type SensorType = 'temperature' | 'humidity' | 'level' | 'co2';
type Period = 6 | 24 | 168 | 720; // hours

const sensorTabs: { key: SensorType; label: string; unit: string; threshold?: number }[] = [
  { key: 'temperature', label: 'Temperatura', unit: '°C', threshold: 30 },
  { key: 'humidity', label: 'Humedad', unit: '%', threshold: 15 },
  { key: 'level', label: 'Nivel', unit: '%' },
  { key: 'co2', label: 'CO₂', unit: 'ppm', threshold: 1000 },
];

const periodOptions: { value: Period; label: string }[] = [
  { value: 6, label: '6h' },
  { value: 24, label: '24h' },
  { value: 168, label: '7d' },
  { value: 720, label: '30d' },
];

const CHART_COLORS = [
  '#16a34a',
  '#2563eb',
  '#d97706',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
];

interface SensorChartProps {
  siloId: string;
}

export function SensorChart({ siloId }: SensorChartProps) {
  const [activeSensor, setActiveSensor] = useState<SensorType>('temperature');
  const [period, setPeriod] = useState<Period>(24);

  const sensorConfig = sensorTabs.find((s) => s.key === activeSensor) ?? sensorTabs[0];
  const { data, isLoading, isError } = useSiloChart(siloId, activeSensor, period);

  // Determine series keys (anything except 'timestamp')
  const seriesKeys = data && data.length > 0
    ? Object.keys(data[0]).filter((k) => k !== 'timestamp')
    : [];

  const formatXTick = (ts: string) => {
    try {
      const d = new Date(ts);
      if (period <= 24) return format(d, 'HH:mm', { locale: es });
      return format(d, 'dd/MM', { locale: es });
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-4">
      {/* Sensor tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs
          value={activeSensor}
          onValueChange={(v) => setActiveSensor(v as SensorType)}
        >
          <TabsList>
            {sensorTabs.map((s) => (
              <TabsTrigger key={s.key} value={s.key}>
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Period selector */}
        <div className="flex items-center gap-1">
          {periodOptions.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                period === p.value
                  ? 'bg-guay-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : isError ? (
        <div className="flex items-center justify-center h-40 gap-2 text-gray-400">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">Error al cargar datos del gráfico</span>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
          Sin datos disponibles para el período seleccionado
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXTick}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                unit={` ${sensorConfig.unit}`}
              />
              <Tooltip
                formatter={(value: number | string) => [
                  `${value} ${sensorConfig.unit}`,
                ]}
                labelFormatter={(label: string) => {
                  try {
                    return format(new Date(label), 'dd/MM/yyyy HH:mm', { locale: es });
                  } catch {
                    return label;
                  }
                }}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              {seriesKeys.length > 1 && <Legend />}

              {/* Threshold reference line */}
              {sensorConfig.threshold !== undefined && (
                <ReferenceLine
                  y={sensorConfig.threshold}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{ value: 'Límite', fill: '#ef4444', fontSize: 11 }}
                />
              )}

              {seriesKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                  name={key}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
