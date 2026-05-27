'use client';

import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle, Camera } from 'lucide-react';

interface PlateCaptureProps {
  plateDetected?: string;
  plateConfirmed?: string;
  ocrConfidence?: number;
  photoUrl?: string;
}

export function PlateCapture({
  plateDetected,
  plateConfirmed,
  ocrConfidence,
  photoUrl,
}: PlateCaptureProps) {
  const plate = plateConfirmed ?? plateDetected;
  const confidencePct = ocrConfidence ? Math.round(ocrConfidence * 100) : null;
  const isHighConfidence = confidencePct !== null && confidencePct >= 85;

  if (!plateDetected && !photoUrl) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-gray-400 gap-2">
        <Camera className="w-8 h-8" />
        <p className="text-xs">Sin captura de cámara</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Photo */}
      {photoUrl && (
        <div className="rounded-lg overflow-hidden bg-gray-100 aspect-video relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt="Captura cámara báscula"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* OCR result */}
      {plate && (
        <div
          className={cn(
            'flex items-center justify-between px-4 py-3 rounded-lg border',
            isHighConfidence
              ? 'bg-green-50 border-green-200'
              : 'bg-yellow-50 border-yellow-200',
          )}
        >
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Patente detectada (OCR)</p>
            <p className="text-xl font-black tracking-widest text-gray-900">{plate}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {confidencePct !== null && (
              <span
                className={cn(
                  'text-sm font-bold',
                  isHighConfidence ? 'text-green-600' : 'text-yellow-600',
                )}
              >
                {confidencePct}%
              </span>
            )}
            {isHighConfidence ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-500" />
            )}
          </div>
        </div>
      )}

      {plateConfirmed && plateDetected && plateConfirmed !== plateDetected && (
        <p className="text-xs text-gray-400">
          OCR detectó: <span className="font-mono">{plateDetected}</span> — confirmada manualmente
        </p>
      )}
    </div>
  );
}
