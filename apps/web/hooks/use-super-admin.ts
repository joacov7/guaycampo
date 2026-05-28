'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface GlobalStats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  totalTickets30d: number;
  totalTons30d: number;
  planBreakdown: Record<string, number>;
}

export interface TenantMetric {
  id: string;
  slug: string;
  name: string;
  cuit: string;
  plan: string;
  status: string;
  createdAt: string;
  activeUsers: number;
  ticketsLast30d: number;
  ticketsLast7d: number;
  ticketsTotal: number;
  tonsLast30d: number;
  lastTicketAt: string | null;
}

export interface TenantDetail {
  tenant: {
    id: string;
    slug: string;
    name: string;
    cuit: string;
    plan: string;
    status: string;
    createdAt: string;
  };
  metrics: TenantMetric | null;
  recentTickets: Array<{
    id: string;
    ticketNumber: string;
    status: string;
    createdAt: string;
    vehicle: { plate: string };
    driver: { fullName: string };
    client: { name: string };
  }>;
  activeUsers: Array<{
    id: string;
    email: string;
    fullName: string;
    status: string;
    lastLogin: string | null;
    role: { name: string } | null;
  }>;
}

export interface TenantFilters {
  status?: string;
  plan?: string;
  search?: string;
}

export interface CreateTenantPayload {
  name: string;
  slug: string;
  cuit: string;
  plan: string;
  adminEmail: string;
  adminName: string;
}

export interface UpdateTenantPayload {
  plan?: string;
  status?: string;
  name?: string;
}

export interface ImpersonateResult {
  token: string;
  expiresIn: number;
}

export function useGlobalStats() {
  return useQuery({
    queryKey: ['super-admin', 'stats'],
    queryFn: () => api.get<GlobalStats>('/auth/super-admin/stats'),
    staleTime: 30_000,
  });
}

export function useTenants(filters?: TenantFilters) {
  return useQuery({
    queryKey: ['super-admin', 'tenants', filters],
    queryFn: () =>
      api.get<TenantMetric[]>('/auth/super-admin/tenants', {
        params: {
          status: filters?.status,
          plan: filters?.plan,
          search: filters?.search,
        },
      }),
    staleTime: 30_000,
  });
}

export function useTenantDetail(id: string) {
  return useQuery({
    queryKey: ['super-admin', 'tenants', id],
    queryFn: () => api.get<TenantDetail>(`/auth/super-admin/tenants/${id}`),
    enabled: Boolean(id),
    staleTime: 15_000,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTenantPayload) =>
      api.post<{ tenant: TenantDetail['tenant']; adminUser: { id: string; email: string; fullName: string }; temporaryPassword: string }>(
        '/auth/super-admin/tenants',
        data,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants'] });
      void queryClient.invalidateQueries({ queryKey: ['super-admin', 'stats'] });
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTenantPayload }) =>
      api.patch<TenantDetail['tenant']>(`/auth/super-admin/tenants/${id}`, data),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants'] });
      void queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants', id] });
    },
  });
}

export function useImpersonateTenant() {
  return useMutation({
    mutationFn: ({ tenantId, userId }: { tenantId: string; userId: string }) =>
      api.post<ImpersonateResult>(
        `/auth/super-admin/tenants/${tenantId}/impersonate`,
        {},
        { params: { userId } },
      ),
  });
}
