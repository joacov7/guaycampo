'use client';

import { useState } from 'react';
import { useCallNextTruck } from '@/hooks/use-queue';
import { PhoneCall, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CallNextButtonProps {
  disabled?: boolean;
  queueLength: number;
}

export function CallNextButton({ disabled, queueLength }: CallNextButtonProps) {
  const { mutate: callNext, isPending } = useCallNextTruck();
  const [lastCalled, setLastCalled] = useState<string | null>(null);

  function handleCall() {
    callNext(undefined, {
      onSuccess: (data: { called: { truckShift?: { vehicle?: { plate?: string } } } }) => {
        setLastCalled(data.called?.truckShift?.vehicle?.plate ?? null);
        setTimeout(() => setLastCalled(null), 5000);
      },
    });
  }

  if (queueLength === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm">
        <PhoneCall className="w-4 h-4" />
        Cola vacía
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {lastCalled && (
        <span className="text-sm text-guay-700 bg-guay-50 border border-guay-200 px-3 py-1.5 rounded-lg animate-fade-in">
          Llamado: <strong>{lastCalled}</strong>
        </span>
      )}
      <Button
        onClick={handleCall}
        disabled={disabled || isPending || queueLength === 0}
        className="bg-guay-600 hover:bg-guay-700 text-white gap-2"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <PhoneCall className="w-4 h-4" />
        )}
        {isPending ? 'Llamando...' : 'Llamar siguiente'}
      </Button>
    </div>
  );
}
