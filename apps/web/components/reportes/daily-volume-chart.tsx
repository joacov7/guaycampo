'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { VolumeByDay } from '@/hooks/use-reports';

interface Props {
  data: VolumeByDay[];
}

function fmtAxisDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

const fmtTons = (v: number) => `${(v / 1000).toFixed(1)}tn`;

export function DailyVolumeChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Sin datos para el período seleccionado
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: fmtAxisDate(d.date),
    kg: d.kg,
    tickets: d.tickets,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={fmtTons} tick={{ fontSize: 11 }} width={56} />
        <Tooltip formatter={(v: number) => fmtTons(v)} />
        <Line
          type="monotone"
          dataKey="kg"
          name="Volumen"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
