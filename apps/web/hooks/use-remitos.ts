'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type RemitoType = 'entrada' | 'salida' | 'transferencia';
export type RemitoStatus = 'borrador' | 'emitido' | 'firmado' | 'anulado';

export interface RemitoClient {
  id: string;
  name: string;
  cuit?: string;
}

export interface RemitoCommodity {
  id: string;
  name: string;
  code?: string;
}

export interface RemitoVehicle {
  id: string;
  plate: string;
  brand?: string | null;
  model?: string | null;
}

export interface RemitoDriver {
  id: string;
  fullName: string;
  licenseNumber?: string | null;
}

export interface Remito {
  id: string;
  remitoNumber: string;
  remitoType: RemitoType;
  status: RemitoStatus;
  client: RemitoClient;
  commodity: RemitoCommodity;
  vehicle: RemitoVehicle | null;
  driver: RemitoDriver | null;
  grossWeightKg: number | null;
  tareWeightKg: number | null;
  netWeightKg: number | null;
  origin: string | null;
  destination: string | null;
  issueDate: string;
  signatureData: string | null;
  signerName: string | null;
  signedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RemitoFilters {
  type?: RemitoType | '';
  status?: RemitoStatus | '';
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateRemitoDto {
  remitoType: RemitoType;
  clientId: string;
  vehicleId?: string;
  driverId?: string;
  commodityId: string;
  scaleTicketId?: string;
  grossWeightKg?: number;
  tareWeightKg?: number;
  netWeightKg?: number;
  origin?: string;
  destination?: string;
  issueDate?: string;
  notes?: string;
}

export interface SignRemitoDto {
  signatureData: string;
  signerName: string;
}

export function useRemitos(filters: RemitoFilters = {}) {
  return useQuery({
    queryKey: ['remitos', filters],
    queryFn: () =>
      api.get<Remito[]>('/remitos', {
        params: {
          type: filters.type || undefined,
          status: filters.status || undefined,
          clientId: filters.clientId || undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
        },
      }),
    staleTime: 30_000,
  });
}

export function useRemito(id: string) {
  return useQuery({
    queryKey: ['remitos', id],
    queryFn: () => api.get<Remito>(`/remitos/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateRemito() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRemitoDto) => api.post<Remito>('/remitos', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['remitos'] });
    },
  });
}

export function useSignRemito() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SignRemitoDto }) =>
      api.post<Remito>(`/remitos/${id}/sign`, data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['remitos'] });
      void queryClient.invalidateQueries({ queryKey: ['remitos', vars.id] });
    },
  });
}

export function useCancelRemito() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Remito>(`/remitos/${id}/cancel`, {}),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ['remitos'] });
      void queryClient.invalidateQueries({ queryKey: ['remitos', id] });
    },
  });
}
