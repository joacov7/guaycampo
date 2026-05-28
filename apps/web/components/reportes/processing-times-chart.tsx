'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { ProcessingTime } from '@/hooks/use-reports';

interface Props {
  data: ProcessingTime[];
}

const fmtMin = (v: number) => `${v.toFixed(0)} min`;

export function ProcessingTimesChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Sin datos de tiempos para el período seleccionado
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: d.commodityName,
    Promedio: Math.round(d.avgMinutes * 10) / 10,
    P50: Math.round(d.p50Minutes * 10) / 10,
    P95: Math.round(d.p95Minutes * 10) / 10,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={fmtMin} tick={{ fontSize: 11 }} width={56} />
        <Tooltip formatter={(v: number) => fmtMin(v)} />
        <Legend />
        <Bar dataKey="Promedio" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="P50" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="P95" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
