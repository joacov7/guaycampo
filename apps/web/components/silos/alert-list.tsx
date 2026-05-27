'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { AlertTriangle, Info, Zap, ShieldAlert, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSiloAlerts } from '@/hooks/use-silos';
import { api } from '@/lib/api';
import type { ISiloAlert, AlertSeverity } from '@guaycampo/shared-types';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface AlertListProps {
  siloId: string;
}

const severityIcon: Record<AlertSeverity, React.ComponentType<{ className?: string }>> = {
  info: Info,
  warning: AlertTriangle,
  critical: Zap,
  emergency: ShieldAlert,
};

const severityStyle: Record<AlertSeverity, string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-700',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  critical: 'bg-red-50 border-red-200 text-red-700',
  emergency: 'bg-red-100 border-red-400 text-red-800',
};

const severityIconStyle: Record<AlertSeverity, string> = {
  info: 'text-blue-500',
  warning: 'text-yellow-500',
  critical: 'text-red-500',
  emergency: 'text-red-700',
};

export function AlertList({ siloId }: AlertListProps) {
  const { data: alerts, isLoading, isError, refetch } = useSiloAlerts(siloId);
  const qc = useQueryClient();

  const acknowledge = useMutation({
    mutationFn: (alertId: string) =>
      api.post(`/silos/alerts/${alertId}/acknowledge`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['silo-alerts', siloId] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-gray-400">
        <p className="text-sm">Error al cargar alertas</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-gray-400">
        Sin alertas registradas
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert: ISiloAlert) => {
        const Icon = severityIcon[alert.severity];
        const style = severityStyle[alert.severity];
        const iconStyle = severityIconStyle[alert.severity];
        const isActive = !alert.acknowledgedAt && !alert.resolvedAt;

        return (
          <div
            key={alert.id}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg border',
              isActive ? style : 'bg-gray-50 border-gray-200 text-gray-500',
            )}
          >
            <Icon
              className={cn('w-4 h-4 mt-0.5 flex-shrink-0', isActive ? iconStyle : 'text-gray-400')}
            />

            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-medium', isActive ? '' : 'text-gray-500')}>
                {alert.message}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                {alert.value !== undefined && (
                  <span className="text-xs opacity-70">
                    Valor: {alert.value}
                    {alert.threshold !== undefined && ` / Límite: ${alert.threshold}`}
                  </span>
                )}
                <span className="text-xs opacity-60">
                  {formatDistanceToNow(new Date(alert.triggeredAt), {
                    locale: es,
                    addSuffix: true,
                  })}
                </span>
                {alert.resolvedAt && (
                  <span className="text-xs text-green-600 font-medium">Resuelta</span>
                )}
                {alert.acknowledgedAt && !alert.resolvedAt && (
                  <span className="text-xs text-gray-400 font-medium">Reconocida</span>
                )}
              </div>
            </div>

            {isActive && !alert.acknowledgedAt && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs flex-shrink-0 gap-1 h-7"
                disabled={acknowledge.isPending}
                onClick={() => acknowledge.mutate(alert.id)}
              >
                <Check className="w-3 h-3" />
                Reconocer
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
