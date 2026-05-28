'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { TopTransporter } from '@/hooks/use-reports';

interface Props {
  data: TopTransporter[];
}

const COLORS = [
  '#1d4ed8',
  '#2563eb',
  '#3b82f6',
  '#60a5fa',
  '#93c5fd',
  '#bfdbfe',
  '#dbeafe',
  '#eff6ff',
  '#f0f9ff',
  '#e0f2fe',
];

const fmtTons = (v: number) => `${(v / 1000).toFixed(1)}tn`;

export function TopTransportersChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Sin datos para el período seleccionado
      </div>
    );
  }

  const chartData = data
    .slice(0, 10)
    .map((d) => ({
      name: d.transporterName,
      grossKg: d.grossKg,
      tickets: d.ticketCount,
    }))
    .reverse();

  return (
    <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 36)}>
      <BarChart
        layout="vertical"
        data={chartData}
        margin={{ top: 4, right: 24, left: 120, bottom: 4 }}
      >
        <XAxis type="number" tickFormatter={fmtTons} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
        <Tooltip formatter={(v: number) => fmtTons(v)} />
        <Bar dataKey="grossKg" name="Peso Bruto" radius={[0, 4, 4, 0]}>
          {chartData.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
