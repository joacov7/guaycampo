'use client';

import { cn } from '@/lib/utils';
import type { SiloInventory } from '@/hooks/use-reports';

interface Props {
  data: SiloInventory[];
}

function fillColor(pct: number): string {
  if (pct >= 95) return 'bg-red-500';
  if (pct >= 80) return 'bg-orange-400';
  if (pct >= 50) return 'bg-blue-500';
  return 'bg-gray-400';
}

function fillTextColor(pct: number): string {
  if (pct >= 95) return 'text-red-700';
  if (pct >= 80) return 'text-orange-700';
  if (pct >= 50) return 'text-blue-700';
  return 'text-gray-600';
}

const fmt = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });

export function SiloInventoryBars({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        No hay silos registrados
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((silo) => (
        <div key={silo.siloName}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-800">{silo.siloName}</span>
              {silo.commodityName && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {silo.commodityName}
                </span>
              )}
            </div>
            <div className="text-right">
              <span className={cn('text-sm font-semibold', fillTextColor(silo.fillPct))}>
                {silo.fillPct.toFixed(1)}%
              </span>
              <span className="text-xs text-gray-400 ml-2">
                {fmt.format(silo.currentStockTon)} / {fmt.format(silo.capacityTon)} tn
              </span>
            </div>
          </div>
          <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', fillColor(silo.fillPct))}
              style={{ width: `${Math.min(silo.fillPct, 100)}%` }}
            />
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-100">
        {[
          { color: 'bg-gray-400', label: '< 50%' },
          { color: 'bg-blue-500', label: '50–80%' },
          { color: 'bg-orange-400', label: '80–95%' },
          { color: 'bg-red-500', label: '> 95%' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={cn('w-3 h-3 rounded-full', item.color)} />
            <span className="text-xs text-gray-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
