'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type ContractType = 'compra' | 'venta' | 'canje' | 'deposito';
export type PriceCondition = 'fijado' | 'a_fijar' | 'canje' | 'mercado';
export type ContractStatus = 'borrador' | 'activo' | 'cumplido' | 'vencido' | 'cancelado';

export interface ContractClient {
  id: string;
  name: string;
  cuit?: string;
}

export interface ContractCommodity {
  id: string;
  name: string;
  code?: string;
}

export interface ContractTicket {
  id: string;
  ticketNumber: string;
  createdAt: string;
  netWeight: number | null;
  status: string;
}

export interface Contract {
  id: string;
  contractNumber: string;
  client: ContractClient;
  commodity: ContractCommodity;
  contractType: ContractType;
  priceCondition: PriceCondition;
  pricePerTon: number | null;
  currency: string;
  quantityTon: number;
  fulfilledTon: number;
  fulfillmentPct: number;
  fromDate: string;
  toDate: string;
  status: ContractStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  scaleTickets?: ContractTicket[];
}

export interface ContractFilters {
  status?: ContractStatus | '';
  clientId?: string;
  commodityId?: string;
  search?: string;
}

export interface CreateContractDto {
  clientId: string;
  commodityId: string;
  contractType: ContractType;
  priceCondition: PriceCondition;
  pricePerTon?: number;
  currency?: string;
  quantityTon: number;
  fromDate: string;
  toDate: string;
  notes?: string;
}

export interface UpdateContractDto {
  pricePerTon?: number;
  notes?: string;
  fromDate?: string;
  toDate?: string;
  status?: ContractStatus;
  currency?: string;
  priceCondition?: PriceCondition;
}

export function useContracts(filters: ContractFilters = {}) {
  return useQuery({
    queryKey: ['contracts', filters],
    queryFn: () =>
      api.get<Contract[]>('/contracts', {
        params: {
          status: filters.status || undefined,
          clientId: filters.clientId || undefined,
          commodityId: filters.commodityId || undefined,
          search: filters.search || undefined,
        },
      }),
    staleTime: 30_000,
  });
}

export function useContract(id: string) {
  return useQuery({
    queryKey: ['contracts', id],
    queryFn: () => api.get<Contract>(`/contracts/${id}`),
    enabled: Boolean(id),
  });
}

export function useExpiringContracts() {
  return useQuery({
    queryKey: ['contracts', 'expiring'],
    queryFn: () => api.get<Contract[]>('/contracts/expiring'),
    staleTime: 60_000,
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateContractDto) => api.post<Contract>('/contracts', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
}

export function useUpdateContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContractDto }) =>
      api.patch<Contract>(`/contracts/${id}`, data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['contracts'] });
      void queryClient.invalidateQueries({ queryKey: ['contracts', vars.id] });
    },
  });
}

export function useCancelContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Contract>(`/contracts/${id}/cancel`, {}),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ['contracts'] });
      void queryClient.invalidateQueries({ queryKey: ['contracts', id] });
    },
  });
}

export function useLinkTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contractId, ticketId }: { contractId: string; ticketId: string }) =>
      api.post<Contract>(`/contracts/${contractId}/link-ticket`, { ticketId }),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['contracts'] });
      void queryClient.invalidateQueries({ queryKey: ['contracts', vars.contractId] });
    },
  });
}
