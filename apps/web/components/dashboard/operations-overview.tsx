'use client';

import { useQuery } from '@tanstack/react-query';
import { Truck, Scale, FlaskConical, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import type { IDashboardStats } from '@guaycampo/shared-types';

interface OperationsOverviewProps {
  stats?: IDashboardStats;
}

export function OperationsOverview({ stats }: OperationsOverviewProps) {
  const { data, isLoading } = useQuery<IDashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<IDashboardStats>('/dashboard/stats'),
    refetchInterval: 30_000,
    initialData: stats,
  });

  const items = [
    {
      icon: Truck,
      label: 'En planta',
      value: data?.trucksInPlant ?? 0,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      icon: Loader2,
      label: 'En cola',
      value: data?.trucksInQueue ?? 0,
      color: 'text-yellow-600 bg-yellow-50',
    },
    {
      icon: Scale,
      label: 'En báscula',
      value: 0,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      icon: FlaskConical,
      label: 'En laboratorio',
      value: 0,
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      icon: CheckCircle2,
      label: 'Completados',
      value: data?.shiftsCompleted ?? 0,
      color: 'text-green-600 bg-green-50',
    },
  ];

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <Skeleton className="h-5 w-40 mb-4" />
        <div className="flex gap-3 flex-wrap">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-28 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">Estado operativo</h2>
      <div className="flex gap-3 flex-wrap">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5"
            >
              <div className={`p-1.5 rounded-md ${item.color.split(' ')[1]}`}>
                <Icon className={`w-3.5 h-3.5 ${item.color.split(' ')[0]}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 leading-none">{item.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
