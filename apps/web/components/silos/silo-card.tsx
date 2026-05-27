'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Thermometer, Droplets, AlertTriangle, Wind } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { SiloWithStatus } from '@/hooks/use-silos';

interface SiloCardProps {
  silo: SiloWithStatus;
}

function temperatureBorderColor(temp?: number): string {
  if (temp === undefined) return 'border-gray-200';
  if (temp > 30) return 'border-red-400';
  if (temp >= 25) return 'border-yellow-400';
  return 'border-green-400';
}

function temperatureTextColor(temp?: number): string {
  if (temp === undefined) return 'text-gray-400';
  if (temp > 30) return 'text-red-600';
  if (temp >= 25) return 'text-yellow-600';
  return 'text-green-600';
}

function statusDot(silo: SiloWithStatus): string {
  if (silo.status === 'fuera_de_servicio') return 'bg-gray-300';
  if (silo.status === 'mantenimiento') return 'bg-yellow-400';
  if ((silo.activeAlerts ?? 0) > 0) return 'bg-red-500 animate-pulse';
  return 'bg-green-500';
}

function statusLabel(silo: SiloWithStatus): string {
  if (silo.status === 'fuera_de_servicio') return 'Fuera de servicio';
  if (silo.status === 'mantenimiento') return 'Mantenimiento';
  if ((silo.activeAlerts ?? 0) > 0) return 'Con alertas';
  return 'Operativo';
}

export function SiloCard({ silo }: SiloCardProps) {
  const fillPct = silo.fillPct ?? (silo.currentStock / silo.capacityTon) * 100;
  const stockTn = (silo.currentStock / 1000).toFixed(1);
  const capacityTn = (silo.capacityTon / 1000).toFixed(1);

  return (
    <Link href={`/dashboard/silos/${silo.id}`} className="block">
      <div
        className={cn(
          'bg-white rounded-xl border-2 p-4 space-y-3 hover:shadow-md transition-shadow cursor-pointer',
          temperatureBorderColor(silo.lastTemperature),
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">{silo.name}</h3>
            {silo.commodity && (
              <p className="text-xs text-gray-500">{silo.commodity.name}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', statusDot(silo))} />
            <span className="text-xs text-gray-500">{statusLabel(silo)}</span>
          </div>
        </div>

        {/* Fill bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Llenado</span>
            <span className="font-semibold text-gray-900">{Math.round(fillPct)}%</span>
          </div>
          <Progress
            value={fillPct}
            className={cn(
              'h-3',
              fillPct > 90 ? '[&>div]:bg-red-500' : fillPct > 75 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-guay-500',
            )}
          />
          <p className="text-xs text-gray-400">
            {stockTn} tn / {capacityTn} tn
          </p>
        </div>

        {/* Sensors */}
        <div className="flex items-center gap-3 flex-wrap">
          {silo.lastTemperature !== undefined && (
            <SensorPill
              icon={Thermometer}
              value={`${silo.lastTemperature.toFixed(1)}°C`}
              colorClass={temperatureTextColor(silo.lastTemperature)}
            />
          )}
          {silo.lastHumidity !== undefined && (
            <SensorPill
              icon={Droplets}
              value={`${silo.lastHumidity.toFixed(1)}%`}
              colorClass="text-blue-500"
            />
          )}
          {silo.aerationActive && (
            <SensorPill icon={Wind} value="Aireando" colorClass="text-cyan-500" />
          )}
        </div>

        {/* Alerts */}
        {(silo.activeAlerts ?? 0) > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              {silo.activeAlerts} alerta{(silo.activeAlerts ?? 0) > 1 ? 's' : ''} activa
              {(silo.activeAlerts ?? 0) > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

function SensorPill({
  icon: Icon,
  value,
  colorClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  colorClass: string;
}) {
  return (
    <div className="flex items-center gap-1 text-xs">
      <Icon className={cn('w-3.5 h-3.5', colorClass)} />
      <span className="text-gray-600 font-medium">{value}</span>
    </div>
  );
}
