'use client';

import { use } from 'react';
import Link from 'next/link';
import { ChevronLeft, Database, Package, AlertTriangle, Wind, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { TemperatureMap } from '@/components/silos/temperature-map';
import { SensorChart } from '@/components/silos/sensor-chart';
import { AlertList } from '@/components/silos/alert-list';
import { useSiloDetail } from '@/hooks/use-silos';

interface SiloDetailPageProps {
  params: Promise<{ id: string }>;
}

const statusLabel: Record<string, string> = {
  operativo: 'Operativo',
  mantenimiento: 'En mantenimiento',
  fuera_de_servicio: 'Fuera de servicio',
};

const statusStyle: Record<string, string> = {
  operativo: 'bg-green-100 text-green-700',
  mantenimiento: 'bg-yellow-100 text-yellow-700',
  fuera_de_servicio: 'bg-gray-100 text-gray-500',
};

export default function SiloDetailPage({ params }: SiloDetailPageProps) {
  const { id } = use(params);
  const { data: silo, isLoading, isError } = useSiloDetail(id);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !silo) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
        <AlertTriangle className="w-12 h-12 text-gray-300" />
        <p className="text-sm font-medium">No se pudo cargar el silo</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/silos">Volver a silos</Link>
        </Button>
      </div>
    );
  }

  const fillPct = silo.fillPct ?? (silo.currentStock / silo.capacityTon) * 100;
  const stockTn = (silo.currentStock / 1000).toFixed(2);
  const capacityTn = (silo.capacityTon / 1000).toFixed(2);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link
          href="/dashboard/silos"
          className="flex items-center gap-1 hover:text-guay-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Silos
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{silo.name}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <Database className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{silo.name}</h1>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyle[silo.status] ?? 'bg-gray-100 text-gray-500'}`}
                >
                  {statusLabel[silo.status] ?? silo.status}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 flex-wrap">
                <span className="capitalize">{silo.siloType}</span>
                {silo.sector && <span>Sector: {silo.sector}</span>}
                {silo.commodity && (
                  <span className="flex items-center gap-1">
                    <Package className="w-3.5 h-3.5" />
                    {silo.commodity.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stock + aeration */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {silo.aerationActive && (
              <div className="flex items-center gap-1.5 text-xs text-cyan-700 bg-cyan-50 px-3 py-1.5 rounded-full font-medium">
                <Wind className="w-3.5 h-3.5" />
                Aireando
              </div>
            )}
          </div>
        </div>

        {/* Stock bar */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Stock actual</span>
            <span className="font-bold text-gray-900">
              {stockTn} tn <span className="text-gray-400 font-normal">/ {capacityTn} tn</span>
            </span>
          </div>
          <Progress
            value={fillPct}
            className={`h-4 ${fillPct > 90 ? '[&>div]:bg-red-500' : fillPct > 75 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-guay-500'}`}
          />
          <p className="text-xs text-gray-400 text-right">{Math.round(fillPct)}% de capacidad</p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Temperature map */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Perfil de temperatura
          </h2>
          <TemperatureMap siloId={id} />
        </div>

        {/* Alert list */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Alertas</h2>
          <AlertList siloId={id} />
        </div>
      </div>

      {/* Sensor chart — full width */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Sensores — histórico</h2>
        <SensorChart siloId={id} />
      </div>
    </div>
  );
}
