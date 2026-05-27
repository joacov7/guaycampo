'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  ShiftFilters,
  CreateTruckShiftDto,
  ShiftWithStats,
} from '@/types';
import type { PaginatedResponse, ITruckShift } from '@guaycampo/shared-types';

// Mock data for development when API is not available
const mockShifts: ShiftWithStats[] = [
  {
    id: '1',
    createdAt: new Date(),
    tenantId: 'demo',
    date: new Date(),
    commodityId: 'c1',
    commodity: { id: 'c1', name: 'Soja', code: 'SOJ', unit: 'kg', tenantId: 'demo' },
    operationType: 'acopio' as const,
    totalSlots: 20,
    usedSlots: 12,
    timeFrom: '07:00',
    timeTo: '13:00',
    status: 'open' as const,
    truckShifts: [],
  },
  {
    id: '2',
    createdAt: new Date(),
    tenantId: 'demo',
    date: new Date(),
    commodityId: 'c2',
    commodity: { id: 'c2', name: 'Maíz', code: 'MAI', unit: 'kg', tenantId: 'demo' },
    operationType: 'compra' as const,
    totalSlots: 15,
    usedSlots: 8,
    timeFrom: '13:00',
    timeTo: '18:00',
    status: 'open' as const,
    truckShifts: [],
  },
];

export function useShifts(filters: ShiftFilters = {}) {
  return useQuery({
    queryKey: ['shifts', filters],
    queryFn: async () => {
      try {
        return await api.get<PaginatedResponse<ShiftWithStats>>('/shifts', {
          params: {
            date: filters.date,
            status: filters.status,
            commodityId: filters.commodityId,
            page: filters.page ?? 1,
            limit: filters.limit ?? 20,
          },
        });
      } catch {
        // Return mock data when API is unavailable
        return {
          data: mockShifts,
          total: mockShifts.length,
          page: 1,
          limit: 20,
          totalPages: 1,
        } satisfies PaginatedResponse<ShiftWithStats>;
      }
    },
    staleTime: 30_000,
  });
}

export function useShift(id: string) {
  return useQuery({
    queryKey: ['shifts', id],
    queryFn: async () => {
      try {
        return await api.get<ShiftWithStats>(`/shifts/${id}`);
      } catch {
        return mockShifts.find((s) => s.id === id) ?? null;
      }
    },
    enabled: Boolean(id),
  });
}

export function useTruckShifts(shiftId: string) {
  return useQuery({
    queryKey: ['truck-shifts', shiftId],
    queryFn: async () => {
      try {
        return await api.get<ITruckShift[]>(`/shifts/${shiftId}/trucks`);
      } catch {
        return [] as ITruckShift[];
      }
    },
    enabled: Boolean(shiftId),
  });
}

export function useCreateTruckShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTruckShiftDto) =>
      api.post<ITruckShift>('/trucks/shifts', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['shifts'] });
      void queryClient.invalidateQueries({ queryKey: ['truck-shifts'] });
    },
  });
}

export function useUpdateTruckShiftStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: string;
    }) => api.patch<ITruckShift>(`/trucks/shifts/${id}/status`, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['shifts'] });
      void queryClient.invalidateQueries({ queryKey: ['truck-shifts'] });
    },
  });
}
