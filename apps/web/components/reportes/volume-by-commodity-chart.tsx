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
import type { VolumeByCommodity } from '@/hooks/use-reports';

interface Props {
  data: VolumeByCommodity[];
}

const fmtTons = (v: number) => `${(v / 1000).toFixed(1)}tn`;

export function VolumeByCommodityChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Sin datos para el período seleccionado
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: d.commodityName,
    grossKg: d.grossKg,
    netKg: d.netKg,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={fmtTons} tick={{ fontSize: 11 }} width={56} />
        <Tooltip formatter={(v: number) => fmtTons(v)} />
        <Legend />
        <Bar dataKey="grossKg" name="Peso Bruto" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="netKg" name="Peso Neto" fill="#22c55e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
