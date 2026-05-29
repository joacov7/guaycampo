'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface Dryer {
  id: string;
  name: string;
  code: string;
  capacity_ton_h: number | null;
  fuel_type: string;
  status: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface DryingBatch {
  id: string;
  batch_number: string;
  dryer_id: string | null;
  scale_ticket_id: string | null;
  client_id: string;
  commodity_id: string;
  input_weight_kg: number;
  output_weight_kg: number | null;
  input_humidity_pct: number;
  output_humidity_pct: number | null;
  target_humidity_pct: number;
  shrinkage_pct: number | null;
  cost_per_ton: number | null;
  total_cost: number | null;
  started_at: string;
  finished_at: string | null;
  status: 'en_proceso' | 'completado' | 'cancelado';
  notes: string | null;
  operator_id: string | null;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  // joins
  client_name?: string;
  commodity_name?: string;
  dryer_name?: string;
}

export interface DryingStats {
  batchesToday: number;
  avgShrinkagePct: number | null;
  totalKgProcessed30d: number;
  activeBatches: number;
}

export interface DryingBatchFilters {
  status?: string;
  clientId?: string;
  commodityId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateDryingBatchPayload {
  dryerId?: string;
  scaleTicketId?: string;
  clientId: string;
  commodityId: string;
  inputWeightKg: number;
  inputHumidityPct: number;
  targetHumidityPct?: number;
  costPerTon?: number;
  notes?: string;
}

export interface FinishDryingBatchPayload {
  outputWeightKg: number;
  outputHumidityPct: number;
  costPerTon?: number;
}

export interface CreateDryerPayload {
  name: string;
  code: string;
  capacityTonH?: number;
  fuelType?: string;
}

// -----------------------------------------------------------------------------
// Hook: list batches
// -----------------------------------------------------------------------------

export function useDryingBatches(filters: DryingBatchFilters = {}) {
  return useQuery<DryingBatch[]>({
    queryKey: ['drying', 'batches', filters],
    queryFn: () =>
      api.get<DryingBatch[]>('/drying/batches', {
        params: {
          status: filters.status,
          clientId: filters.clientId,
          commodityId: filters.commodityId,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        },
      }),
    refetchInterval: 30_000,
  });
}

// -----------------------------------------------------------------------------
// Hook: stats
// -----------------------------------------------------------------------------

export function useDryingStats() {
  return useQuery<DryingStats>({
    queryKey: ['drying', 'stats'],
    queryFn: () => api.get<DryingStats>('/drying/batches/stats'),
    refetchInterval: 60_000,
  });
}

// -----------------------------------------------------------------------------
// Hook: dryers list
// -----------------------------------------------------------------------------

export function useDryers() {
  return useQuery<Dryer[]>({
    queryKey: ['drying', 'dryers'],
    queryFn: () => api.get<Dryer[]>('/drying/dryers'),
    staleTime: 5 * 60_000,
  });
}

// -----------------------------------------------------------------------------
// Hook: create batch
// -----------------------------------------------------------------------------

export function useCreateDryingBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDryingBatchPayload) =>
      api.post<DryingBatch>('/drying/batches', payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['drying'] });
    },
  });
}

// -----------------------------------------------------------------------------
// Hook: finish batch
// -----------------------------------------------------------------------------

export function useFinishDryingBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FinishDryingBatchPayload }) =>
      api.post<DryingBatch>(`/drying/batches/${id}/finish`, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['drying'] });
    },
  });
}

// -----------------------------------------------------------------------------
// Hook: cancel batch
// -----------------------------------------------------------------------------

export function useCancelDryingBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<DryingBatch>(`/drying/batches/${id}/cancel`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['drying'] });
    },
  });
}

// -----------------------------------------------------------------------------
// Hook: create dryer
// -----------------------------------------------------------------------------

export function useCreateDryer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDryerPayload) =>
      api.post<Dryer>('/drying/dryers', payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['drying', 'dryers'] });
    },
  });
}
