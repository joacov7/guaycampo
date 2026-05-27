'use client';

import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTemperatureMap } from '@/hooks/use-silos';

interface TemperatureMapProps {
  siloId: string;
}

function tempToColor(temp: number | null): string {
  if (temp === null) return 'bg-gray-100 text-gray-400';
  if (temp > 35) return 'bg-red-600 text-white';
  if (temp > 30) return 'bg-red-400 text-white';
  if (temp > 27) return 'bg-orange-400 text-white';
  if (temp > 25) return 'bg-yellow-400 text-gray-900';
  if (temp > 20) return 'bg-green-400 text-white';
  if (temp > 15) return 'bg-teal-400 text-white';
  return 'bg-blue-400 text-white';
}

export function TemperatureMap({ siloId }: TemperatureMapProps) {
  const { data, isLoading, isError } = useTemperatureMap(siloId);

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (isError || !data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        Sin datos de temperatura disponibles
      </div>
    );
  }

  // Determine grid dimensions
  const maxCable = Math.max(...data.map((p) => p.cable));
  const maxPosition = Math.max(...data.map((p) => p.position));

  // Build lookup
  const lookup = new Map<string, number | null>();
  data.forEach((p) => {
    lookup.set(`${p.cable}:${p.position}`, p.value);
  });

  const cables = Array.from({ length: maxCable }, (_, i) => i + 1);
  const positions = Array.from({ length: maxPosition }, (_, i) => i + 1);

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Legend */}
        <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500">
          <span className="font-medium">Temperatura (°C):</span>
          {[
            { label: '≤15', color: 'bg-blue-400' },
            { label: '15–20', color: 'bg-teal-400' },
            { label: '20–25', color: 'bg-green-400' },
            { label: '25–27', color: 'bg-yellow-400' },
            { label: '27–30', color: 'bg-orange-400' },
            { label: '>30', color: 'bg-red-500' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className={cn('w-3 h-3 rounded-sm', item.color)} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Column headers (cables) */}
            <div
              className="grid gap-1.5 mb-1"
              style={{ gridTemplateColumns: `auto repeat(${maxCable}, minmax(2.5rem, 1fr))` }}
            >
              <div className="text-xs text-gray-400 text-center py-1" />
              {cables.map((c) => (
                <div key={c} className="text-xs text-gray-500 font-medium text-center py-1">
                  Cable {c}
                </div>
              ))}
            </div>

            {/* Rows (positions, from top = top of silo) */}
            {positions.map((pos) => (
              <div
                key={pos}
                className="grid gap-1.5 mb-1.5"
                style={{ gridTemplateColumns: `auto repeat(${maxCable}, minmax(2.5rem, 1fr))` }}
              >
                {/* Row label */}
                <div className="text-xs text-gray-400 font-medium text-right pr-2 flex items-center justify-end w-12">
                  P{pos}
                </div>
                {cables.map((cable) => {
                  const temp = lookup.get(`${cable}:${pos}`) ?? null;
                  return (
                    <Tooltip key={cable}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            'h-10 w-10 rounded-lg flex items-center justify-center text-xs font-bold cursor-default transition-transform hover:scale-105',
                            tempToColor(temp),
                          )}
                        >
                          {temp !== null ? temp.toFixed(1) : '—'}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Cable {cable}, Posición {pos}
                          {temp !== null ? `: ${temp.toFixed(1)}°C` : ': sin lectura'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
