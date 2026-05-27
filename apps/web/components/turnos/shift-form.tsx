'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createShiftSchema, type CreateShiftFormValues } from '@/lib/validations';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface ShiftFormProps {
  onSubmit: (data: CreateShiftFormValues) => Promise<void>;
  isLoading?: boolean;
  defaultValues?: Partial<CreateShiftFormValues>;
}

const operationTypes = [
  { value: 'compra', label: 'Compra' },
  { value: 'acopio', label: 'Acopio' },
  { value: 'canje', label: 'Canje' },
  { value: 'remito', label: 'Remito' },
];

// Placeholder commodities — replace with API call
const mockCommodities = [
  { id: 'c1', name: 'Soja' },
  { id: 'c2', name: 'Maíz' },
  { id: 'c3', name: 'Girasol' },
  { id: 'c4', name: 'Trigo' },
  { id: 'c5', name: 'Sorgo' },
];

export function ShiftForm({ onSubmit, isLoading, defaultValues }: ShiftFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateShiftFormValues>({
    resolver: zodResolver(createShiftSchema),
    defaultValues: defaultValues ?? {
      date: new Date().toISOString().split('T')[0],
      totalSlots: 20,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Date */}
      <div className="space-y-1.5">
        <Label htmlFor="date">Fecha</Label>
        <Input
          id="date"
          type="date"
          {...register('date')}
          className={errors.date ? 'border-red-300 focus-visible:ring-red-400' : ''}
        />
        {errors.date && (
          <p className="text-xs text-red-600">{errors.date.message}</p>
        )}
      </div>

      {/* Commodity */}
      <div className="space-y-1.5">
        <Label htmlFor="commodityId">Cultivo</Label>
        <select
          id="commodityId"
          {...register('commodityId')}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Seleccionar cultivo</option>
          {mockCommodities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {errors.commodityId && (
          <p className="text-xs text-red-600">{errors.commodityId.message}</p>
        )}
      </div>

      {/* Operation type */}
      <div className="space-y-1.5">
        <Label htmlFor="operationType">Tipo de operación</Label>
        <select
          id="operationType"
          {...register('operationType')}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Seleccionar tipo</option>
          {operationTypes.map((op) => (
            <option key={op.value} value={op.value}>{op.label}</option>
          ))}
        </select>
        {errors.operationType && (
          <p className="text-xs text-red-600">{errors.operationType.message}</p>
        )}
      </div>

      {/* Slots */}
      <div className="space-y-1.5">
        <Label htmlFor="totalSlots">Cantidad de slots</Label>
        <Input
          id="totalSlots"
          type="number"
          min={1}
          max={500}
          {...register('totalSlots', { valueAsNumber: true })}
          className={errors.totalSlots ? 'border-red-300 focus-visible:ring-red-400' : ''}
        />
        {errors.totalSlots && (
          <p className="text-xs text-red-600">{errors.totalSlots.message}</p>
        )}
      </div>

      {/* Time range */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="timeFrom">Hora desde</Label>
          <Input id="timeFrom" type="time" {...register('timeFrom')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="timeTo">Hora hasta</Label>
          <Input id="timeTo" type="time" {...register('timeTo')} />
        </div>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full bg-guay-600 hover:bg-guay-700">
        {isLoading ? 'Guardando...' : 'Crear turno'}
      </Button>
    </form>
  );
}
