'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { QualitySummary } from '@/hooks/use-reports';

interface Props {
  data: QualitySummary[];
}

const GRADE_COLORS: Record<string, string> = {
  G1: '#22c55e',
  G2: '#3b82f6',
  G3: '#f59e0b',
  'Sin grado': '#94a3b8',
};

const DEFAULT_COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6'];

function getGradeColor(grade: string, idx: number): string {
  return GRADE_COLORS[grade] ?? DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
}

export function QualityPieCharts({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        Sin datos de calidad para el período seleccionado
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {data.map((commodity) => {
        const entries = Object.entries(commodity.gradeDistribution);
        if (entries.length === 0) return null;

        const pieData = entries.map(([grade, count]) => ({ name: grade, value: count }));
        const total = pieData.reduce((s, d) => s + d.value, 0);

        return (
          <div key={commodity.commodityName}>
            <p className="text-sm font-medium text-gray-700 mb-2 text-center">
              {commodity.commodityName}
            </p>
            <div className="text-xs text-gray-500 flex justify-center gap-4 mb-1">
              <span>Hum: {commodity.avgHumidity.toFixed(1)}%</span>
              {commodity.avgProtein !== null && (
                <span>Prot: {commodity.avgProtein.toFixed(1)}%</span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) =>
                    total > 0 ? `${name} ${Math.round((value / total) * 100)}%` : name
                  }
                  labelLine={false}
                >
                  {pieData.map((entry, idx) => (
                    <Cell key={entry.name} fill={getGradeColor(entry.name, idx)} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v} tickets`, 'Cantidad']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}
