'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { IUser, PaginatedResponse, UserStatus } from '@guaycampo/shared-types';

export interface UserFilters {
  role?: string;
  status?: UserStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateUserDto {
  fullName: string;
  email: string;
  phone?: string;
  roleName: string;
  status?: UserStatus;
}

export interface UpdateUserDto {
  fullName?: string;
  phone?: string;
  roleName?: string;
  status?: UserStatus;
}

export function useUsers(filters: UserFilters = {}) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () =>
      api.get<PaginatedResponse<IUser>>('/auth/users', {
        params: {
          role: filters.role,
          status: filters.status,
          search: filters.search,
          page: filters.page ?? 1,
          limit: filters.limit ?? 20,
        },
      }),
    staleTime: 30_000,
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => api.get<IUser>(`/auth/users/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserDto) =>
      api.post<{ user: IUser; temporaryPassword: string }>('/auth/users', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) =>
      api.patch<IUser>(`/auth/users/${id}`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch<IUser>(`/auth/users/${id}/deactivate`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ temporaryPassword: string }>(`/auth/users/${id}/reset-password`, {}),
  });
}
