'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import type { IScaleTicket } from '@guaycampo/shared-types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface TicketFilters {
  date?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface ConfirmWeightArgs {
  id: string;
  type: 'gross' | 'tare';
  weight: number;
}

export interface WeightReading {
  deviceId: string;
  weightKg: number;
  timestamp: string;
}

export interface ScaleDevice {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'busy';
}

export interface TicketsResponse {
  data: IScaleTicket[];
  total: number;
}

// -----------------------------------------------------------------------------
// Hook: peso en tiempo real de un dispositivo
// -----------------------------------------------------------------------------

export function useActiveTicker(deviceId: string) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;

  const [liveWeight, setLiveWeight] = useState<number | null>(null);
  const [isStable, setIsStable] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (!token || !deviceId) return;

    const socket = getSocket(token);
    socket.emit('join:scale', deviceId);

    const handleReading = (data: WeightReading) => {
      if (data.deviceId === deviceId) {
        setLiveWeight(data.weightKg);
        setIsStable(false);
        setIsOnline(true);
      }
    };

    const handleStable = (data: { deviceId: string }) => {
      if (data.deviceId === deviceId) {
        setIsStable(true);
      }
    };

    const handleOffline = (data: { deviceId: string }) => {
      if (data.deviceId === deviceId) {
        setIsOnline(false);
      }
    };

    socket.on('weight:reading', handleReading);
    socket.on('weight:stable', handleStable);
    socket.on('scale:offline', handleOffline);

    return () => {
      socket.off('weight:reading', handleReading);
      socket.off('weight:stable', handleStable);
      socket.off('scale:offline', handleOffline);
      socket.emit('leave:scale', deviceId);
    };
  }, [token, deviceId]);

  return { liveWeight, isStable, isOnline };
}

// -----------------------------------------------------------------------------
// Hook: tickets del día
// -----------------------------------------------------------------------------

export function useTicketsToday(filters?: TicketFilters) {
  return useQuery<TicketsResponse>({
    queryKey: ['tickets', 'today', filters],
    queryFn: () =>
      api.get<TicketsResponse>('/tickets', {
        params: { date: 'today', ...filters },
      }),
    refetchInterval: 30_000,
  });
}

// -----------------------------------------------------------------------------
// Hook: ticket activo en báscula
// -----------------------------------------------------------------------------

export function useActiveTicket() {
  return useQuery<IScaleTicket | null>({
    queryKey: ['tickets', 'active'],
    queryFn: () =>
      api.get<IScaleTicket | null>('/tickets/active').catch(() => null),
    refetchInterval: 10_000,
  });
}

// -----------------------------------------------------------------------------
// Hook: confirmar peso
// -----------------------------------------------------------------------------

export function useConfirmWeight() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, type, weight }: ConfirmWeightArgs) =>
      api.post(`/tickets/${id}/confirm-${type}`, { weight }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

// -----------------------------------------------------------------------------
// Hook: dispositivos de báscula disponibles
// -----------------------------------------------------------------------------

export function useScaleDevices() {
  return useQuery<ScaleDevice[]>({
    queryKey: ['scale-devices'],
    queryFn: () => api.get<ScaleDevice[]>('/scale/devices'),
    staleTime: 60_000,
  });
}
