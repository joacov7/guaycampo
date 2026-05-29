'use client';

import { cn } from '@/lib/utils';
import { Database, Thermometer, AlertTriangle, Wind, TrendingUp } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { SiloGrid } from '@/components/silos/silo-grid';
import { useSilosRealtime } from '@/hooks/use-silos';

export default function SilosPage() {
  const { silos, alerts, isLoading, isError, refetch } = useSilosRealtime();

  // Aggregate KPIs
  const totalStock = silos.reduce((acc, s) => acc + s.currentStock, 0);
  const totalCapacity = silos.reduce((acc, s) => acc + s.capacityTon, 0);
  const capacityPct = totalCapacity > 0 ? Math.round((totalStock / totalCapacity) * 100) : 0;
  const maxTemp = silos.reduce(
    (acc, s) => (s.lastTemperature !== undefined ? Math.max(acc, s.lastTemperature) : acc),
    0,
  );
  const activeAlerts = alerts.filter((a) => !a.acknowledgedAt && !a.resolvedAt).length;
  const aerationCount = silos.filter((s) => s.aerationActive).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-50 rounded-lg">
          <Database className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Silos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            SCADA — monitoreo de almacenamiento en tiempo real
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatsCard
          label="Stock total"
          value={`${(totalStock / 1000).toFixed(0)}tn`}
          sublabel="en todo el complejo"
          icon={Database}
          accent="guay"
        />
        <StatsCard
          label="Capacidad usada"
          value={`${capacityPct}%`}
          sublabel={`${(totalCapacity / 1000).toFixed(0)}tn capacidad total`}
          icon={TrendingUp}
          accent="blue"
        />
        <StatsCard
          label="Temp. máxima"
          value={maxTemp > 0 ? `${maxTemp.toFixed(1)}°C` : '—'}
          sublabel="del complejo"
          icon={Thermometer}
          accent={maxTemp > 30 ? 'orange' : 'green'}
        />
        <StatsCard
          label="Alertas activas"
          value={activeAlerts}
          sublabel={activeAlerts === 0 ? 'Sin problemas' : 'Requieren atención'}
          icon={AlertTriangle}
          accent={activeAlerts > 0 ? 'orange' : 'guay'}
        />
        <StatsCard
          label="Con aireación"
          value={aerationCount}
          sublabel={`de ${silos.length} silos`}
          icon={Wind}
          accent="blue"
        />
      </div>

      {/* Silo grid */}
      <SiloGrid
        silos={silos}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
      />
    </div>
  );
}
