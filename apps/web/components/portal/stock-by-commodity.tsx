'use client';

import { Warehouse } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StockCommodityItem {
  commodityId: string;
  commodityName: string;
  totalKg: number;
  percentage?: number;
}

interface StockByCommodityProps {
  items: StockCommodityItem[];
  loading?: boolean;
}

const COLORS = [
  'bg-guay-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
];

function kgToTon(kg: number) {
  return (kg / 1000).toFixed(2);
}

export function StockByCommodity({ items, loading = false }: StockByCommodityProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
            <div className="h-3 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <Warehouse className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Sin stock en planta</p>
        <p className="text-sm text-gray-400 mt-1">No hay granos registrados en este momento</p>
      </div>
    );
  }

  const totalKg = items.reduce((sum, i) => sum + i.totalKg, 0);

  return (
    <div className="space-y-4">
      {/* Total */}
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-gray-500">Total en planta</span>
        <span className="text-lg font-bold text-gray-900">{kgToTon(totalKg)} tn</span>
      </div>

      {/* Bars */}
      <div className="space-y-3">
        {items.map((item, idx) => {
          const pct = totalKg > 0 ? (item.totalKg / totalKg) * 100 : 0;
          return (
            <div key={item.commodityId} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', COLORS[idx % COLORS.length])}
                  />
                  <span className="font-medium text-gray-700">{item.commodityName}</span>
                </div>
                <span className="text-gray-600 tabular-nums">
                  {kgToTon(item.totalKg)} tn
                  <span className="text-gray-400 ml-1">({pct.toFixed(0)}%)</span>
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', COLORS[idx % COLORS.length])}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
