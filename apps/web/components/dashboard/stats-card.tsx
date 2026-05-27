import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label?: string;
  };
  accent?: 'blue' | 'green' | 'purple' | 'orange' | 'guay';
}

const accentMap = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    icon: 'text-blue-500',
    value: 'text-blue-700',
  },
  green: {
    bg: 'bg-green-50',
    text: 'text-green-600',
    icon: 'text-green-500',
    value: 'text-green-700',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    icon: 'text-purple-500',
    value: 'text-purple-700',
  },
  orange: {
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    icon: 'text-orange-500',
    value: 'text-orange-700',
  },
  guay: {
    bg: 'bg-guay-50',
    text: 'text-guay-600',
    icon: 'text-guay-500',
    value: 'text-guay-700',
  },
};

export function StatsCard({
  label,
  value,
  sublabel,
  icon: Icon,
  trend,
  accent = 'guay',
}: StatsCardProps) {
  const colors = accentMap[accent];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide leading-none">
          {label}
        </p>
        {Icon && (
          <div className={cn('p-1.5 rounded-lg', colors.bg)}>
            <Icon className={cn('w-4 h-4', colors.icon)} />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className={cn('text-3xl font-bold tracking-tight', colors.value)}>
          {value}
        </p>
        {sublabel && (
          <p className="text-xs text-gray-400">{sublabel}</p>
        )}
      </div>

      {trend !== undefined && (
        <div className="flex items-center gap-1">
          <span
            className={cn(
              'text-xs font-medium',
              trend.value >= 0 ? 'text-green-600' : 'text-red-500',
            )}
          >
            {trend.value >= 0 ? '+' : ''}
            {trend.value}%
          </span>
          {trend.label && (
            <span className="text-xs text-gray-400">{trend.label}</span>
          )}
        </div>
      )}
    </div>
  );
}
