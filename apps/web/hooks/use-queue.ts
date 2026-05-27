'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useQueueStore } from '@/lib/store';
import type { QueueState, QueuePositionWithDetails, QueueMetrics } from '@/types';

export function useQueueRealtime() {
  const { data: session } = useSession();
  const tenantId = session?.user?.tenantId;
  const token = session?.user?.accessToken;
  const queryClient = useQueryClient();

  const {
    positions,
    metrics,
    isConnected,
    setPositions,
    setMetrics,
    setConnected,
    updatePosition,
    removePosition,
  } = useQueueStore();

  // Load initial queue state from API
  const { data: initialState, isLoading } = useQuery({
    queryKey: ['queue', tenantId],
    queryFn: async () => {
      try {
        return await api.get<QueueState>('/queue');
      } catch {
        return {
          positions: [] as QueuePositionWithDetails[],
          metrics: {
            total: 0,
            avgWaitMinutes: 0,
            currentlyInScale: 0,
            calledToday: 0,
          } satisfies QueueMetrics,
        } satisfies QueueState;
      }
    },
    enabled: Boolean(tenantId),
    staleTime: 10_000,
  });

  // Initialize store from API data
  useEffect(() => {
    if (initialState) {
      setPositions(initialState.positions);
      setMetrics(initialState.metrics);
    }
  }, [initialState, setPositions, setMetrics]);

  // Connect WebSocket and subscribe to real-time updates
  useEffect(() => {
    if (!token || !tenantId) return;

    const socket = getSocket(token);

    socket.emit('join:operations', tenantId);

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join:operations', tenantId);
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('queue:state', (data: QueueState) => {
      setPositions(data.positions);
      setMetrics(data.metrics);
    });

    socket.on('queue:update', (data: { positions: QueuePositionWithDetails[] }) => {
      setPositions(data.positions);
      void queryClient.invalidateQueries({ queryKey: ['queue', tenantId] });
    });

    socket.on('queue:position:added', (position: QueuePositionWithDetails) => {
      updatePosition(position);
    });

    socket.on('queue:position:updated', (position: QueuePositionWithDetails) => {
      updatePosition(position);
    });

    socket.on('queue:position:removed', (data: { truckShiftId: string }) => {
      removePosition(data.truckShiftId);
    });

    socket.on('queue:metrics', (data: QueueMetrics) => {
      setMetrics(data);
    });

    if (socket.connected) {
      setConnected(true);
    }

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('queue:state');
      socket.off('queue:update');
      socket.off('queue:position:added');
      socket.off('queue:position:updated');
      socket.off('queue:position:removed');
      socket.off('queue:metrics');
      socket.emit('leave:operations', tenantId);
    };
  }, [token, tenantId, setPositions, setMetrics, setConnected, updatePosition, removePosition, queryClient]);

  return { positions, metrics, isConnected, isLoading };
}

export function useCallNextTruck() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const tenantId = session?.user?.tenantId;

  return useMutation({
    mutationFn: () => api.post<{ called: QueuePositionWithDetails }>('/queue/call-next', {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['queue', tenantId] });
    },
  });
}
