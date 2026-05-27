import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3002';

export function getSocket(token: string): Socket {
  if (!socket || !socket.connected) {
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
    }
    socket = io(WS_URL, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function getExistingSocket(): Socket | null {
  return socket;
}
