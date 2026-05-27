'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { AlertTriangle, Zap, ShieldAlert, Info, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import type { ISiloAlert, AlertSeverity } from '@guaycampo/shared-types';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ActiveAlertsWidgetProps {
  maxItems?: number;
}

const severityIcon: Record<AlertSeverity, React.ComponentType<{ className?: string }>> = {
  info: Info,
  warning: AlertTriangle,
  critical: Zap,
  emergency: ShieldAlert,
};

const severityColor: Record<AlertSeverity, string> = {
  info: 'text-blue-500',
  warning: 'text-yellow-500',
  critical: 'text-red-500',
  emergency: 'text-red-700',
};

const severityBg: Record<AlertSeverity, string> = {
  info: 'bg-blue-50',
  warning: 'bg-yellow-50',
  critical: 'bg-red-50',
  emergency: 'bg-red-100',
};

export function ActiveAlertsWidget({ maxItems = 5 }: ActiveAlertsWidgetProps) {
  const { data: alerts, isLoading } = useQuery<ISiloAlert[]>({
    queryKey: ['alerts', 'active'],
    queryFn: () => api.get<ISiloAlert[]>('/silos/alerts/active'),
    refetchInterval: 30_000,
  });

  const visibleAlerts = (alerts ?? []).slice(0, maxItems);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Alertas activas</h2>
        {!isLoading && (alerts?.length ?? 0) > 0 && (
          <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">
            {alerts!.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : visibleAlerts.length === 0 ? (
        <div className="text-center py-6 text-gray-400">
          <p className="text-sm">Sin alertas activas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleAlerts.map((alert) => {
            const Icon = severityIcon[alert.severity];
            return (
              <div
                key={alert.id}
                className={cn(
                  'flex items-start gap-2.5 p-2.5 rounded-lg',
                  severityBg[alert.severity],
                )}
              >
                <Icon
                  className={cn('w-4 h-4 mt-0.5 flex-shrink-0', severityColor[alert.severity])}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDistanceToNow(new Date(alert.triggeredAt), {
                      locale: es,
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            );
          })}

          {(alerts?.length ?? 0) > maxItems && (
            <Link
              href="/dashboard/silos"
              className="flex items-center justify-center gap-1 text-xs text-guay-600 hover:text-guay-700 py-1 font-medium"
            >
              Ver todas ({alerts!.length})
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
