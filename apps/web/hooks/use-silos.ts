'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import type { ISilo, ISiloAlert } from '@guaycampo/shared-types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface SiloReading {
  siloId: string;
  sensorType: 'temperature' | 'humidity' | 'level' | 'co2';
  position?: string;
  value: number;
  unit: string;
  timestamp: string;
  cableIndex?: number;
  positionIndex?: number;
}

export interface SiloReadingEvent extends SiloReading {
  tenantId: string;
}

export interface SiloWithStatus extends ISilo {
  commodity?: { name: string; code: string };
  lastTemperature?: number;
  lastHumidity?: number;
  activeAlerts?: number;
  aerationActive?: boolean;
  fillPct?: number;
}

export interface SiloChartData {
  timestamp: string;
  [seriesKey: string]: number | string;
}

// Key: `${siloId}:${sensorType}:${position}`
type ReadingsMap = Record<string, SiloReading>;

// -----------------------------------------------------------------------------
// Hook: silos en tiempo real (lista + lecturas + alertas via WS)
// -----------------------------------------------------------------------------

export function useSilosRealtime() {
  const { data: session } = useSession();
  const tenantId = session?.user?.tenantId;
  const token = session?.user?.accessToken;

  const [readings, setReadings] = useState<ReadingsMap>({});
  const [alerts, setAlerts] = useState<ISiloAlert[]>([]);

  const silosQuery = useQuery<SiloWithStatus[]>({
    queryKey: ['silos'],
    queryFn: () => api.get<SiloWithStatus[]>('/silos'),
    enabled: Boolean(tenantId),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!token || !tenantId) return;

    const socket = getSocket(token);
    socket.emit('join:silos', tenantId);

    const handleReading = (data: SiloReadingEvent) => {
      setReadings((prev) => ({
        ...prev,
        [`${data.siloId}:${data.sensorType}:${data.position ?? ''}`]: data,
      }));
    };

    const handleAlert = (alert: ISiloAlert) => {
      setAlerts((prev) => [alert, ...prev.slice(0, 49)]);
    };

    socket.on('silo:reading', handleReading);
    socket.on('silo:alert', handleAlert);

    return () => {
      socket.off('silo:reading', handleReading);
      socket.off('silo:alert', handleAlert);
      socket.emit('leave:silos', tenantId);
    };
  }, [token, tenantId]);

  return {
    silos: silosQuery.data ?? [],
    readings,
    alerts,
    isLoading: silosQuery.isLoading,
    isError: silosQuery.isError,
    refetch: silosQuery.refetch,
  };
}

// -----------------------------------------------------------------------------
// Hook: detalle de un silo
// -----------------------------------------------------------------------------

export function useSiloDetail(siloId: string) {
  return useQuery<SiloWithStatus>({
    queryKey: ['silo', siloId],
    queryFn: () => api.get<SiloWithStatus>(`/silos/${siloId}`),
    enabled: Boolean(siloId),
    refetchInterval: 60_000,
  });
}

// -----------------------------------------------------------------------------
// Hook: datos para gráfico de sensores
// -----------------------------------------------------------------------------

export function useSiloChart(siloId: string, sensorType: string, hours: number) {
  return useQuery<SiloChartData[]>({
    queryKey: ['silo-chart', siloId, sensorType, hours],
    queryFn: () =>
      api.get<SiloChartData[]>(`/readings/${siloId}/chart`, {
        params: { sensor: sensorType, hours },
      }),
    enabled: Boolean(siloId),
  });
}

// -----------------------------------------------------------------------------
// Hook: alertas de un silo
// -----------------------------------------------------------------------------

export function useSiloAlerts(siloId: string) {
  return useQuery<ISiloAlert[]>({
    queryKey: ['silo-alerts', siloId],
    queryFn: () => api.get<ISiloAlert[]>(`/silos/${siloId}/alerts`),
    enabled: Boolean(siloId),
    refetchInterval: 30_000,
  });
}

// -----------------------------------------------------------------------------
// Hook: mapa de temperatura (cables x posiciones)
// -----------------------------------------------------------------------------

export interface TemperaturePoint {
  cable: number;
  position: number;
  value: number | null;
  label: string;
}

export function useTemperatureMap(siloId: string) {
  return useQuery<TemperaturePoint[]>({
    queryKey: ['silo-temp-map', siloId],
    queryFn: () => api.get<TemperaturePoint[]>(`/silos/${siloId}/temperature-map`),
    enabled: Boolean(siloId),
    refetchInterval: 30_000,
  });
}
