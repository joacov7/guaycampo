'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { Send, Calculator, Loader2, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QualityResultCard } from '@/components/laboratorio/quality-result-card';
import { useLabPreview, useSubmitLabResult } from '@/hooks/use-lab';
import type { PendingSamplesResponse } from '@/hooks/use-lab';

// -----------------------------------------------------------------------------
// Schema
// -----------------------------------------------------------------------------

const baseSchema = {
  humidity: z.coerce.number().min(0).max(100).optional(),
  foreignMatter: z.coerce.number().min(0).max(100).optional(),
  damagedGrains: z.coerce.number().min(0).max(100).optional(),
};

const labSchema = z.object({
  ...baseSchema,
  protein: z.coerce.number().min(0).max(100).optional(),
  oil: z.coerce.number().min(0).max(100).optional(),
  brokenGrains: z.coerce.number().min(0).max(100).optional(),
  gluten: z.coerce.number().min(0).max(100).optional(),
  fallingNumber: z.coerce.number().min(0).optional(),
  testWeight: z.coerce.number().min(0).optional(),
  burnedGrains: z.coerce.number().min(0).max(100).optional(),
});

type LabFormValues = z.infer<typeof labSchema>;

// -----------------------------------------------------------------------------
// Field config per commodity
// -----------------------------------------------------------------------------

interface FieldConfig {
  key: keyof LabFormValues;
  label: string;
  unit: string;
  step?: number;
}

const commodityFields: Record<string, FieldConfig[]> = {
  SOJA: [
    { key: 'humidity', label: 'Humedad', unit: '%', step: 0.1 },
    { key: 'protein', label: 'Proteína', unit: '%', step: 0.1 },
    { key: 'oil', label: 'Aceite', unit: '%', step: 0.1 },
    { key: 'damagedGrains', label: 'Granos dañados', unit: '%', step: 0.1 },
    { key: 'foreignMatter', label: 'Materia extraña', unit: '%', step: 0.01 },
    { key: 'brokenGrains', label: 'Granos quebrados', unit: '%', step: 0.1 },
  ],
  TRIGO: [
    { key: 'humidity', label: 'Humedad', unit: '%', step: 0.1 },
    { key: 'gluten', label: 'Gluten húmedo', unit: '%', step: 0.1 },
    { key: 'fallingNumber', label: 'Falling number', unit: 'seg' },
    { key: 'testWeight', label: 'Peso hectolítrico', unit: 'kg/hl', step: 0.1 },
    { key: 'burnedGrains', label: 'Granos ardidos', unit: '%', step: 0.01 },
  ],
  MAIZ: [
    { key: 'humidity', label: 'Humedad', unit: '%', step: 0.1 },
    { key: 'burnedGrains', label: 'Granos ardidos', unit: '%', step: 0.01 },
    { key: 'foreignMatter', label: 'Materia extraña', unit: '%', step: 0.01 },
  ],
};

const defaultFields: FieldConfig[] = [
  { key: 'humidity', label: 'Humedad', unit: '%', step: 0.1 },
  { key: 'damagedGrains', label: 'Granos dañados', unit: '%', step: 0.1 },
  { key: 'foreignMatter', label: 'Materia extraña', unit: '%', step: 0.01 },
];

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

type SampleWithDetails = PendingSamplesResponse['data'][0];

interface SampleFormProps {
  sample: SampleWithDetails;
  onSuccess?: () => void;
}

export function SampleForm({ sample, onSuccess }: SampleFormProps) {
  const commodityCode = sample.scaleTicket?.commodity?.code?.toUpperCase() ?? '';
  const fields = commodityFields[commodityCode] ?? defaultFields;

  const preview = useLabPreview();
  const submit = useSubmitLabResult();

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<LabFormValues>({
    resolver: zodResolver(labSchema),
    defaultValues: {},
  });

  const onCalculate = () => {
    const values = getValues();
    preview.mutate({ sampleId: sample.id, ...values });
  };

  const onSubmit = (values: LabFormValues) => {
    submit.mutate(
      { sampleId: sample.id, ...values },
      {
        onSuccess: () => {
          onSuccess?.();
        },
      },
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
          <FlaskConical className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Muestra #{sample.sampleNumber}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {sample.scaleTicket?.commodity?.name ?? 'N/D'} &mdash;{' '}
            {sample.scaleTicket?.vehicle?.plate ?? '—'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {fields.map((field) => (
            <div key={field.key} className="space-y-1">
              <Label className="text-xs text-gray-600">
                {field.label}
                <span className="text-gray-400 ml-1">({field.unit})</span>
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  step={field.step ?? 1}
                  placeholder="0.00"
                  className={cn(
                    'pr-10 text-sm',
                    errors[field.key] && 'border-red-300',
                  )}
                  {...register(field.key)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  {field.unit}
                </span>
              </div>
              {errors[field.key] && (
                <p className="text-xs text-red-500">
                  {errors[field.key]?.message?.toString()}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-2 text-sm"
            onClick={onCalculate}
            disabled={preview.isPending}
          >
            {preview.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Calculator className="w-4 h-4" />
            )}
            Calcular
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-guay-600 hover:bg-guay-700 text-white gap-2 text-sm"
            disabled={submit.isPending}
          >
            {submit.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Confirmar y Enviar
          </Button>
        </div>
      </form>

      {/* Preview result */}
      {preview.data && (
        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">
            Vista previa del resultado
          </p>
          <QualityResultCard result={preview.data} />
        </div>
      )}

      {/* Success state */}
      {submit.isSuccess && submit.data && (
        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">
            Resultado enviado
          </p>
        </div>
      )}

      {/* Error */}
      {submit.isError && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
          Error al enviar resultado. Intente nuevamente.
        </p>
      )}
    </div>
  );
}
