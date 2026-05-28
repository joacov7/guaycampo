'use client';

import { useState, useMemo } from 'react';
import { BarChart3, Download, TrendingUp, Truck, Clock, Droplets } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useVolumeByCommod,
  useVolumeByDay,
  useTopTransporters,
  useProcessingTimes,
  useQualitySummary,
  useClientActivity,
  useSiloInventory,
} from '@/hooks/use-reports';
import { VolumeByCommodityChart } from '@/components/reportes/volume-by-commodity-chart';
import { DailyVolumeChart } from '@/components/reportes/daily-volume-chart';
import { TopTransportersChart } from '@/components/reportes/top-transporters-chart';
import { QualityPieCharts } from '@/components/reportes/quality-pie-charts';
import { ProcessingTimesChart } from '@/components/reportes/processing-times-chart';
import { SiloInventoryBars } from '@/components/reportes/silo-inventory-bars';

const BILLING_URL = process.env.NEXT_PUBLIC_BILLING_URL ?? 'http://localhost:3006';

// ---------------------------------------------------------------------------
// Date preset helpers
// ---------------------------------------------------------------------------

interface Preset {
  label: string;
  getDates: () => { from: Date; to: Date };
}

const PRESETS: Preset[] = [
  {
    label: 'Hoy',
    getDates: () => {
      const d = new Date();
      return { from: new Date(d.getFullYear(), d.getMonth(), d.getDate()), to: d };
    },
  },
  {
    label: '7 días',
    getDates: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 7);
      return { from, to };
    },
  },
  {
    label: '30 días',
    getDates: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 30);
      return { from, to };
    },
  },
  {
    label: '90 días',
    getDates: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 90);
      return { from, to };
    },
  },
  {
    label: 'Este mes',
    getDates: () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from, to: now };
    },
  },
  {
    label: 'Este año',
    getDates: () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), 0, 1);
      return { from, to: now };
    },
  },
];

function fmtDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ChartCard({
  title,
  children,
  onExport,
  exportLabel = 'Exportar CSV',
  isLoading = false,
}: {
  title: string;
  children: React.ReactNode;
  onExport?: () => void;
  exportLabel?: string;
  isLoading?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {onExport && (
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            {exportLabel}
          </button>
        )}
      </div>
      {isLoading ? (
        <div className="animate-pulse bg-gray-100 rounded h-64" />
      ) : (
        children
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sublabel,
  icon: Icon,
  accent = 'blue',
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: 'blue' | 'green' | 'orange' | 'gray';
}) {
  const accentMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    gray: 'bg-gray-50 text-gray-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg flex-shrink-0', accentMap[accent])}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 truncate">{label}</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
          {sublabel && <p className="text-xs text-gray-400 mt-0.5 truncate">{sublabel}</p>}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const numFmt = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

export default function ReportesPage() {
  // Default: last 30 days
  const [from, setFrom] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [to, setTo] = useState<Date>(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  });
  const [activePreset, setActivePreset] = useState<string>('30 días');

  const { data: volumeByCommod = [], isLoading: loadingVol } = useVolumeByCommod(from, to);
  const { data: volumeByDay = [], isLoading: loadingDay } = useVolumeByDay(from, to);
  const { data: topTransporters = [], isLoading: loadingTransp } = useTopTransporters(from, to);
  const { data: processingTimes = [], isLoading: loadingProc } = useProcessingTimes(from, to);
  const { data: qualitySummary = [], isLoading: loadingQuality } = useQualitySummary(from, to);
  const { data: clientActivity = [], isLoading: loadingClients } = useClientActivity(from, to);
  const { data: siloInventory = [], isLoading: loadingSilos } = useSiloInventory();

  // KPIs
  const kpis = useMemo(() => {
    const totalGrossKg = volumeByCommod.reduce((s, d) => s + d.grossKg, 0);
    const totalTickets = volumeByCommod.reduce((s, d) => s + d.ticketCount, 0);
    const avgMinutes =
      processingTimes.length > 0
        ? processingTimes.reduce((s, d) => s + d.avgMinutes, 0) / processingTimes.length
        : 0;
    const avgHumidity =
      qualitySummary.length > 0
        ? qualitySummary.reduce((s, d) => s + d.avgHumidity, 0) / qualitySummary.length
        : 0;
    return { totalGrossKg, totalTickets, avgMinutes, avgHumidity };
  }, [volumeByCommod, processingTimes, qualitySummary]);

  function applyPreset(preset: Preset) {
    const { from: f, to: t } = preset.getDates();
    f.setHours(0, 0, 0, 0);
    t.setHours(23, 59, 59, 999);
    setFrom(f);
    setTo(t);
    setActivePreset(preset.label);
  }

  function handleFromChange(e: React.ChangeEvent<HTMLInputElement>) {
    const d = new Date(e.target.value);
    d.setHours(0, 0, 0, 0);
    setFrom(d);
    setActivePreset('');
  }

  function handleToChange(e: React.ChangeEvent<HTMLInputElement>) {
    const d = new Date(e.target.value);
    d.setHours(23, 59, 59, 999);
    setTo(d);
    setActivePreset('');
  }

  function exportCsv(type: string) {
    const fromStr = fmtDateInput(from);
    const toStr = fmtDateInput(to);
    window.open(
      `${BILLING_URL}/api/reports/export/csv?type=${type}&from=${fromStr}&to=${toStr}`,
      '_blank',
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Reportes</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Analytics de operaciones y calidad
            </p>
          </div>
        </div>

        {/* Date range controls */}
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          {/* Presets */}
          <div className="flex flex-wrap gap-1">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => applyPreset(preset)}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-lg border transition-colors',
                  activePreset === preset.label
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600',
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom pickers */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fmtDateInput(from)}
              onChange={handleFromChange}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-400 text-xs">—</span>
            <input
              type="date"
              value={fmtDateInput(to)}
              onChange={handleToChange}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Toneladas ingresadas"
          value={
            loadingVol
              ? '...'
              : `${numFmt.format(Math.round(kpis.totalGrossKg / 1000))} tn`
          }
          sublabel="peso bruto total"
          icon={TrendingUp}
          accent="blue"
        />
        <KpiCard
          label="Camiones procesados"
          value={loadingVol ? '...' : numFmt.format(kpis.totalTickets)}
          sublabel="tickets completados"
          icon={Truck}
          accent="green"
        />
        <KpiCard
          label="Tiempo promedio"
          value={
            loadingProc
              ? '...'
              : kpis.avgMinutes > 0
                ? `${kpis.avgMinutes.toFixed(0)} min`
                : '—'
          }
          sublabel="por camión"
          icon={Clock}
          accent="orange"
        />
        <KpiCard
          label="Humedad promedio"
          value={
            loadingQuality
              ? '...'
              : kpis.avgHumidity > 0
                ? `${kpis.avgHumidity.toFixed(1)}%`
                : '—'
          }
          sublabel="promedio entre commodities"
          icon={Droplets}
          accent="gray"
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Volumen por Commodity"
          isLoading={loadingVol}
          onExport={() => exportCsv('volume-by-commodity')}
        >
          <VolumeByCommodityChart data={volumeByCommod} />
        </ChartCard>

        <ChartCard title="Volumen Diario" isLoading={loadingDay}>
          <DailyVolumeChart data={volumeByDay} />
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Top 10 Transportistas"
          isLoading={loadingTransp}
          onExport={() => exportCsv('top-transporters')}
        >
          <TopTransportersChart data={topTransporters} />
        </ChartCard>

        <ChartCard title="Tiempos de Proceso" isLoading={loadingProc}>
          <ProcessingTimesChart data={processingTimes} />
        </ChartCard>
      </div>

      {/* Quality distribution */}
      <ChartCard title="Distribución de Calidad por Commodity" isLoading={loadingQuality}>
        <QualityPieCharts data={qualitySummary} />
      </ChartCard>

      {/* Client ranking */}
      <ChartCard
        title="Ranking de Clientes"
        isLoading={loadingClients}
        onExport={() => exportCsv('client-activity')}
      >
        {clientActivity.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            Sin datos para el período seleccionado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Cliente
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    kg Bruto
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    kg Neto
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Tickets
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Última actividad
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clientActivity.map((client, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2 px-3 font-medium text-gray-900">
                      {client.clientName}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-600">
                      {numFmt.format(Math.round(client.grossKg))}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-600">
                      {numFmt.format(Math.round(client.netKg))}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-600">
                      {client.ticketCount}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-400 text-xs">
                      {new Date(client.lastActivity).toLocaleDateString('es-AR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      {/* Silo inventory - no date filter */}
      <ChartCard title="Inventario de Silos" isLoading={loadingSilos}>
        <SiloInventoryBars data={siloInventory} />
      </ChartCard>
    </div>
  );
}
