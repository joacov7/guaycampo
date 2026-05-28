'use client';

import { useQuery } from '@tanstack/react-query';

const BILLING_URL =
  process.env.NEXT_PUBLIC_BILLING_URL ?? 'http://localhost:3006';

async function billingGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const { getSession } = await import('next-auth/react');
  const session = await getSession();
  const token = session?.user?.accessToken ?? '';

  const url = new URL(`${BILLING_URL}/api${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    });
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Reports API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VolumeByCommodity {
  commodityName: string;
  grossKg: number;
  netKg: number;
  ticketCount: number;
}

export interface VolumeByDay {
  date: string;
  kg: number;
  tickets: number;
}

export interface TopTransporter {
  transporterName: string;
  grossKg: number;
  ticketCount: number;
  avgProcessMinutes: number;
}

export interface ProcessingTime {
  commodityName: string;
  avgMinutes: number;
  p50Minutes: number;
  p95Minutes: number;
  ticketCount: number;
}

export interface QualitySummary {
  commodityName: string;
  avgHumidity: number;
  avgProtein: number | null;
  gradeDistribution: Record<string, number>;
}

export interface ClientActivity {
  clientName: string;
  grossKg: number;
  netKg: number;
  ticketCount: number;
  lastActivity: string;
}

export interface SiloInventory {
  siloName: string;
  commodityName: string | null;
  capacityTon: number;
  currentStockTon: number;
  fillPct: number;
}

export interface WeeklySummary {
  week: string;
  totalKg: number;
  tickets: number;
  avgProcessMinutes: number;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useVolumeByCommod(from: Date, to: Date) {
  return useQuery<VolumeByCommodity[]>({
    queryKey: ['reports', 'volume-by-commodity', fmtDate(from), fmtDate(to)],
    queryFn: () =>
      billingGet<VolumeByCommodity[]>('/reports/volume-by-commodity', {
        from: fmtDate(from),
        to: fmtDate(to),
      }),
    staleTime: 5 * 60_000,
  });
}

export function useVolumeByDay(from: Date, to: Date) {
  return useQuery<VolumeByDay[]>({
    queryKey: ['reports', 'volume-by-day', fmtDate(from), fmtDate(to)],
    queryFn: () =>
      billingGet<VolumeByDay[]>('/reports/volume-by-day', {
        from: fmtDate(from),
        to: fmtDate(to),
      }),
    staleTime: 5 * 60_000,
  });
}

export function useTopTransporters(from: Date, to: Date) {
  return useQuery<TopTransporter[]>({
    queryKey: ['reports', 'top-transporters', fmtDate(from), fmtDate(to)],
    queryFn: () =>
      billingGet<TopTransporter[]>('/reports/top-transporters', {
        from: fmtDate(from),
        to: fmtDate(to),
      }),
    staleTime: 5 * 60_000,
  });
}

export function useProcessingTimes(from: Date, to: Date) {
  return useQuery<ProcessingTime[]>({
    queryKey: ['reports', 'processing-times', fmtDate(from), fmtDate(to)],
    queryFn: () =>
      billingGet<ProcessingTime[]>('/reports/processing-times', {
        from: fmtDate(from),
        to: fmtDate(to),
      }),
    staleTime: 5 * 60_000,
  });
}

export function useQualitySummary(from: Date, to: Date) {
  return useQuery<QualitySummary[]>({
    queryKey: ['reports', 'quality-summary', fmtDate(from), fmtDate(to)],
    queryFn: () =>
      billingGet<QualitySummary[]>('/reports/quality-summary', {
        from: fmtDate(from),
        to: fmtDate(to),
      }),
    staleTime: 5 * 60_000,
  });
}

export function useClientActivity(from: Date, to: Date) {
  return useQuery<ClientActivity[]>({
    queryKey: ['reports', 'client-activity', fmtDate(from), fmtDate(to)],
    queryFn: () =>
      billingGet<ClientActivity[]>('/reports/client-activity', {
        from: fmtDate(from),
        to: fmtDate(to),
      }),
    staleTime: 5 * 60_000,
  });
}

export function useSiloInventory() {
  return useQuery<SiloInventory[]>({
    queryKey: ['reports', 'silo-inventory'],
    queryFn: () => billingGet<SiloInventory[]>('/reports/silo-inventory'),
    staleTime: 2 * 60_000,
  });
}

export function useWeeklySummary(from: Date, to: Date) {
  return useQuery<WeeklySummary[]>({
    queryKey: ['reports', 'weekly-summary', fmtDate(from), fmtDate(to)],
    queryFn: () =>
      billingGet<WeeklySummary[]>('/reports/weekly-summary', {
        from: fmtDate(from),
        to: fmtDate(to),
      }),
    staleTime: 5 * 60_000,
  });
}
