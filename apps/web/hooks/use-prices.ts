'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type PriceCondition = 'pizarra' | 'forward' | 'spot' | 'canje' | 'fijacion';
export type PriceCurrency = 'ARS' | 'USD';

export interface PriceCommodity {
  commodityId: string;
  commodityName: string;
  commodityCode: string | null;
}

export interface Price {
  id: string;
  commodityId: string;
  commodityName: string;
  commodityCode: string | null;
  condition: PriceCondition;
  pricePerTon: number;
  currency: PriceCurrency;
  validFrom: string;
  validUntil: string | null;
  deliveryMonths: string | null;
  isActive: boolean;
  notes: string | null;
  tenantId: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PriceGroup {
  commodityId: string;
  commodityName: string;
  commodityCode: string;
  prices: Price[];
}

export interface PriceHistoryPoint {
  id: string;
  priceListId: string;
  commodityId: string;
  commodityName: string;
  condition: PriceCondition;
  pricePerTon: number;
  currency: PriceCurrency;
  recordedAt: string;
}

export interface MarketSummaryItem {
  commodityId: string;
  commodityName: string;
  commodityCode: string | null;
  condition: PriceCondition;
  pricePerTon: number;
  currency: PriceCurrency;
  validFrom: string;
}

export interface PriceFilters {
  commodityId?: string;
  condition?: PriceCondition | '';
  isActive?: boolean;
}

export interface CreatePriceDto {
  commodityId: string;
  condition: PriceCondition;
  pricePerTon: number;
  currency: PriceCurrency;
  validFrom: string;
  validUntil?: string;
  deliveryMonths?: string;
  notes?: string;
}

export interface UpdatePriceDto {
  pricePerTon?: number;
  validUntil?: string;
  notes?: string;
  isActive?: boolean;
}

export function usePrices(filters: PriceFilters = {}) {
  return useQuery({
    queryKey: ['prices', filters],
    queryFn: () =>
      api.get<Price[]>('/prices', {
        params: {
          commodityId: filters.commodityId || undefined,
          condition: filters.condition || undefined,
          isActive: filters.isActive !== undefined ? String(filters.isActive) : undefined,
        },
      }),
    staleTime: 30_000,
  });
}

export function useCurrentPrices() {
  return useQuery({
    queryKey: ['prices', 'current'],
    queryFn: () => api.get<PriceGroup[]>('/prices/current'),
    staleTime: 60_000,
  });
}

export function usePriceHistory(commodityId: string, days = 30) {
  return useQuery({
    queryKey: ['prices', 'history', commodityId, days],
    queryFn: () =>
      api.get<PriceHistoryPoint[]>('/prices/history', {
        params: { commodityId, days },
      }),
    enabled: Boolean(commodityId),
    staleTime: 60_000,
  });
}

export function useMarketSummary() {
  return useQuery({
    queryKey: ['prices', 'summary'],
    queryFn: () => api.get<MarketSummaryItem[]>('/prices/summary'),
    staleTime: 60_000,
  });
}

export function useCreatePrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePriceDto) => api.post<Price>('/prices', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['prices'] });
    },
  });
}

export function useUpdatePrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePriceDto }) =>
      api.patch<Price>(`/prices/${id}`, data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['prices'] });
      void queryClient.invalidateQueries({ queryKey: ['prices', vars.id] });
    },
  });
}

export function useDeactivatePrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<{ id: string; isActive: boolean }>(`/prices/${id}/deactivate`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['prices'] });
    },
  });
}
