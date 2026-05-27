'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { type Socket } from 'socket.io-client';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { useQueueStore } from '@/lib/store';

export function useSocket() {
  const { data: session } = useSession();
  const socketRef = useRef<Socket | null>(null);
  const { setConnected } = useQueueStore();

  useEffect(() => {
    const token = session?.user?.accessToken;
    if (!token) return;

    const socket = getSocket(token);
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    if (socket.connected) {
      setConnected(true);
    }

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
    };
  }, [session?.user?.accessToken, setConnected]);

  return socketRef.current;
}

export function useDisconnectSocket() {
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);
}
