'use client';

import { cn } from '@/lib/utils';
import { FlaskConical, Clock, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { usePendingSamples } from '@/hooks/use-lab';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface PendingSamplesProps {
  onSelectSample: (sampleId: string) => void;
  selectedSampleId?: string;
}

export function PendingSamples({ onSelectSample, selectedSampleId }: PendingSamplesProps) {
  const { data, isLoading, isError, refetch } = usePendingSamples();

  const samples = data?.data ?? [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-guay-600" />
          Muestras pendientes
        </h2>
        {!isLoading && samples.length > 0 && (
          <span className="text-xs bg-yellow-100 text-yellow-700 font-semibold px-2.5 py-1 rounded-full">
            {samples.length} pendiente{samples.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* List */}
      <div className="divide-y divide-gray-50">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4">
              <Skeleton className="h-14 w-full" />
            </div>
          ))
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-gray-400">
            <AlertCircle className="w-8 h-8" />
            <p className="text-sm">Error al cargar muestras</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Reintentar
            </Button>
          </div>
        ) : samples.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
            <FlaskConical className="w-10 h-10 text-gray-200" />
            <p className="text-sm">Sin muestras pendientes</p>
          </div>
        ) : (
          samples.map((sample) => {
            const isSelected = sample.id === selectedSampleId;
            const waitingTime = formatDistanceToNow(new Date(sample.takenAt), {
              locale: es,
              addSuffix: false,
            });

            return (
              <button
                key={sample.id}
                onClick={() => onSelectSample(sample.id)}
                className={cn(
                  'w-full text-left p-4 transition-colors hover:bg-gray-50',
                  isSelected && 'bg-guay-50 border-l-2 border-l-guay-500',
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Sample number */}
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0',
                      isSelected ? 'bg-guay-600 text-white' : 'bg-gray-100 text-gray-600',
                    )}
                  >
                    {sample.sampleNumber.slice(-2)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-gray-900 truncate">
                        #{sample.sampleNumber}
                      </p>
                      <span
                        className={cn(
                          'text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0',
                          'bg-indigo-50 text-indigo-600',
                        )}
                      >
                        {sample.scaleTicket?.commodity?.name ?? 'N/D'}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 truncate mt-0.5">
                      {sample.scaleTicket?.vehicle?.plate ?? '—'} &mdash;{' '}
                      {sample.scaleTicket?.driver?.fullName ?? '—'}
                    </p>

                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      Esperando hace {waitingTime}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
