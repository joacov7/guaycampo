'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface AgingRow {
  clientId: string;
  clientName: string;
  current: number;
  days31to60: number;
  days61to90: number;
  over90: number;
  total: number;
}

export interface AccountMovement {
  id: string;
  movementDate: string;
  movementType: string;
  referenceType?: string;
  referenceId?: string;
  debit: number;
  credit: number;
  balanceAfter: number;
  description?: string;
  documentNumber?: string;
}

export interface AccountSummary {
  clientId: string;
  clientName: string;
  currentBalance: number;
  creditLimit?: number;
  totalDebit: number;
  totalCredit: number;
  overdueAmount: number;
  recentMovements: AccountMovement[];
}

export interface AccountStatement {
  clientId: string;
  clientName: string;
  from: string;
  to: string;
  openingBalance: number;
  closingBalance: number;
  movements: AccountMovement[];
}

export interface RegisterPaymentInput {
  amount: number;
  description?: string;
  documentNumber?: string;
  movementDate?: string;
}

export function useAging() {
  return useQuery<AgingRow[]>({
    queryKey: ['account-aging'],
    queryFn: () => api.get<AgingRow[]>('/billing/account/aging'),
    staleTime: 60_000,
  });
}

export function useAccountBalance(clientId: string) {
  return useQuery<AccountSummary>({
    queryKey: ['account-balance', clientId],
    queryFn: () => api.get<AccountSummary>(`/billing/account/${clientId}`),
    enabled: Boolean(clientId),
    staleTime: 30_000,
  });
}

export function useAccountStatement(clientId: string, from: Date, to: Date) {
  const fromStr = from.toISOString().split('T')[0];
  const toStr = to.toISOString().split('T')[0];

  return useQuery<AccountStatement>({
    queryKey: ['account-statement', clientId, fromStr, toStr],
    queryFn: () =>
      api.get<AccountStatement>(`/billing/account/${clientId}/statement`, {
        params: { from: fromStr, to: toStr },
      }),
    enabled: Boolean(clientId),
    staleTime: 30_000,
  });
}

export function useRegisterPayment(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RegisterPaymentInput) =>
      api.post<unknown>(`/billing/account/${clientId}/payment`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['account-balance', clientId] });
      void queryClient.invalidateQueries({ queryKey: ['account-statement', clientId] });
      void queryClient.invalidateQueries({ queryKey: ['account-aging'] });
    },
  });
}
