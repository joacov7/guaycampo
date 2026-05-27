'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ILabSample, IScaleTicket } from '@guaycampo/shared-types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface LabResultInput {
  sampleId: string;
  humidity?: number;
  protein?: number;
  gluten?: number;
  fallingNumber?: number;
  testWeight?: number;
  damagedGrains?: number;
  foreignMatter?: number;
  brokenGrains?: number;
  burnedGrains?: number;
  observations?: string;
}

export interface LabResultPreview {
  grade: string;
  netAdjustment: number;
  adjustments: {
    concept: string;
    valueReal: number;
    valueBase: number;
    deviation: number;
    adjustmentPct: number;
  }[];
  status: 'aprobado' | 'rechazado' | 'condicional';
  rejectionCause?: string;
  warning?: string;
}

export interface PendingSamplesResponse {
  data: (ILabSample & {
    scaleTicket: IScaleTicket & {
      vehicle: { plate: string };
      driver: { fullName: string };
      commodity: { name: string; code: string };
      client: { name: string };
    };
  })[];
  total: number;
}

// -----------------------------------------------------------------------------
// Hook: muestras pendientes
// -----------------------------------------------------------------------------

export function usePendingSamples() {
  return useQuery<PendingSamplesResponse>({
    queryKey: ['lab', 'pending'],
    queryFn: () => api.get<PendingSamplesResponse>('/lab/samples/pending'),
    refetchInterval: 30_000,
  });
}

// -----------------------------------------------------------------------------
// Hook: preview del resultado antes de confirmar
// -----------------------------------------------------------------------------

export function useLabPreview() {
  return useMutation({
    mutationFn: (input: LabResultInput) =>
      api.post<LabResultPreview>('/lab/samples/preview', input),
  });
}

// -----------------------------------------------------------------------------
// Hook: confirmar y enviar resultado
// -----------------------------------------------------------------------------

export function useSubmitLabResult() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: LabResultInput) =>
      api.post<ILabSample>('/lab/samples/submit', input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lab'] });
      void qc.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

// -----------------------------------------------------------------------------
// Hook: historial de muestras del día
// -----------------------------------------------------------------------------

export function useLabSamplesToday() {
  return useQuery<PendingSamplesResponse>({
    queryKey: ['lab', 'today'],
    queryFn: () =>
      api.get<PendingSamplesResponse>('/lab/samples', { params: { date: 'today' } }),
    refetchInterval: 60_000,
  });
}
