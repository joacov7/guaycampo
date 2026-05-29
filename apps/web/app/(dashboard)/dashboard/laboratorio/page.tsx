'use client';

import { useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { PendingSamples } from '@/components/laboratorio/pending-samples';
import { SampleForm } from '@/components/laboratorio/sample-form';
import { usePendingSamples } from '@/hooks/use-lab';

export default function LaboratorioPage() {
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const { data } = usePendingSamples();

  const selectedSample = data?.data.find((s) => s.id === selectedSampleId) ?? null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <FlaskConical className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Laboratorio</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Análisis de calidad y resultados comerciales
          </p>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left: Pending samples */}
        <div className="lg:col-span-2">
          <PendingSamples
            onSelectSample={setSelectedSampleId}
            selectedSampleId={selectedSampleId ?? undefined}
          />
        </div>

        {/* Right: Form or placeholder */}
        <div className="lg:col-span-3">
          {selectedSample ? (
            <SampleForm
              sample={selectedSample}
              onSuccess={() => setSelectedSampleId(null)}
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
              <FlaskConical className="w-12 h-12 text-gray-200" />
              <p className="text-sm font-medium">Seleccioná una muestra para analizar</p>
              <p className="text-xs text-gray-300">
                Hacé click en una muestra del panel izquierdo
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
