'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { IClient, PaginatedResponse, IScaleTicket } from '@guaycampo/shared-types';
import type { ClientType, IvaCondition } from '@guaycampo/shared-types';

export interface ClientFilters {
  clientType?: ClientType;
  province?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateClientDto {
  name: string;
  cuit: string;
  clientType?: ClientType;
  address?: string;
  locality?: string;
  province?: string;
  ivaCondition?: IvaCondition;
  creditLimit?: number;
  phone?: string;
  email?: string;
}

export interface UpdateClientDto extends Partial<CreateClientDto> {}

export interface AccountMovement {
  id: string;
  date: string;
  concept: string;
  amount: number;
  balance: number;
  reference?: string;
}

export function useClients(filters: ClientFilters = {}) {
  return useQuery({
    queryKey: ['clients', filters],
    queryFn: () =>
      api.get<PaginatedResponse<IClient>>('/clients', {
        params: {
          clientType: filters.clientType,
          province: filters.province,
          status: filters.status,
          search: filters.search,
          page: filters.page ?? 1,
          limit: filters.limit ?? 20,
        },
      }),
    staleTime: 30_000,
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: () => api.get<IClient>(`/clients/${id}`),
    enabled: Boolean(id),
  });
}

export function useClientTickets(clientId: string, page = 1) {
  return useQuery({
    queryKey: ['client-tickets', clientId, page],
    queryFn: () =>
      api.get<PaginatedResponse<IScaleTicket>>(`/clients/${clientId}/tickets`, {
        params: { page, limit: 30 },
      }),
    enabled: Boolean(clientId),
  });
}

export function useClientAccount(clientId: string) {
  return useQuery({
    queryKey: ['client-account', clientId],
    queryFn: () =>
      api.get<{ balance: number; movements: AccountMovement[] }>(
        `/clients/${clientId}/account`,
      ),
    enabled: Boolean(clientId),
  });
}

export function useClientLiquidations(clientId: string, page = 1) {
  return useQuery({
    queryKey: ['client-liquidations', clientId, page],
    queryFn: () =>
      api.get<PaginatedResponse<Record<string, unknown>>>(
        `/clients/${clientId}/liquidations`,
        { params: { page, limit: 20 } },
      ),
    enabled: Boolean(clientId),
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateClientDto) => api.post<IClient>('/clients', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClientDto }) =>
      api.patch<IClient>(`/clients/${id}`, data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['clients'] });
      void queryClient.invalidateQueries({ queryKey: ['clients', vars.id] });
    },
  });
}
