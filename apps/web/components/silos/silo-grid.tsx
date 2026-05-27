'use client';

import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SiloCard } from '@/components/silos/silo-card';
import type { SiloWithStatus } from '@/hooks/use-silos';

interface SiloGridProps {
  silos: SiloWithStatus[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function SiloGrid({ silos, isLoading, isError, onRetry }: SiloGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
        <AlertCircle className="w-10 h-10" />
        <p className="text-sm font-medium">Error al cargar los silos</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (silos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
        <p className="text-sm">No hay silos configurados</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {silos.map((silo) => (
        <SiloCard key={silo.id} silo={silo} />
      ))}
    </div>
  );
}
