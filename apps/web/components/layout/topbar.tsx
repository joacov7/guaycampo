'use client';

import { useSession } from 'next-auth/react';
import { useQueueStore } from '@/lib/store';
import { Bell, Wifi, WifiOff } from 'lucide-react';

interface TopbarProps {
  title?: string;
}

export function Topbar({ title }: TopbarProps) {
  const { data: session } = useSession();
  const { isConnected, metrics } = useQueueStore();

  const tenantName = session?.user?.tenantName ?? '';

  return (
    <div className="flex items-center gap-4 w-full px-6">
      {title && (
        <h1 className="text-sm font-semibold text-gray-700 flex-1 truncate">{title}</h1>
      )}
      {!title && <div className="flex-1" />}

      <div className="flex items-center gap-3">
        {/* Tenant badge */}
        {tenantName && (
          <span className="hidden sm:inline-flex text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
            {tenantName}
          </span>
        )}

        {/* Queue count */}
        {metrics !== null && metrics.total > 0 && (
          <span className="text-xs text-guay-700 bg-guay-50 border border-guay-200 px-2.5 py-1 rounded-full font-medium">
            {metrics.total} en cola
          </span>
        )}

        {/* WebSocket status */}
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            isConnected
              ? 'bg-green-50 text-green-700'
              : 'bg-gray-50 text-gray-500'
          }`}
          title={isConnected ? 'Tiempo real activo' : 'Sin conexión en tiempo real'}
        >
          {isConnected ? (
            <Wifi className="w-3 h-3" />
          ) : (
            <WifiOff className="w-3 h-3" />
          )}
          <span className="hidden sm:inline">
            {isConnected ? 'En vivo' : 'Desconectado'}
          </span>
        </span>

        {/* Notifications placeholder */}
        <button
          className="relative w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
          aria-label="Notificaciones"
        >
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
