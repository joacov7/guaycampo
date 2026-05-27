import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  accent?: 'green' | 'blue' | 'orange' | 'purple' | 'red' | 'gray';
  loading?: boolean;
  children?: React.ReactNode;
}

const accentStyles: Record<NonNullable<SummaryCardProps['accent']>, string> = {
  green: 'bg-green-50 text-green-700',
  blue: 'bg-blue-50 text-blue-700',
  orange: 'bg-orange-50 text-orange-700',
  purple: 'bg-purple-50 text-purple-700',
  red: 'bg-red-50 text-red-700',
  gray: 'bg-gray-100 text-gray-700',
};

const iconStyles: Record<NonNullable<SummaryCardProps['accent']>, string> = {
  green: 'text-green-600',
  blue: 'text-blue-600',
  orange: 'text-orange-600',
  purple: 'text-purple-600',
  red: 'text-red-600',
  gray: 'text-gray-500',
};

export function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = 'green',
  loading = false,
  children,
}: SummaryCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', accentStyles[accent])}>
          <Icon className={cn('w-4 h-4', iconStyles[accent])} />
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-7 w-24 bg-gray-100 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          {children}
        </>
      )}
    </div>
  );
}
