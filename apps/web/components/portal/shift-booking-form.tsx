'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { QrCode, Share2, Check, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ICommodity } from '@guaycampo/shared-types';

// -----------------------------------------------------------------------------
// Tipos y esquemas
// -----------------------------------------------------------------------------

interface AvailableSlot {
  shiftId: string;
  date: string;
  timeFrom?: string;
  timeTo?: string;
  commodityId: string;
  commodityName: string;
  availableSlots: number;
  totalSlots: number;
}

interface BookingResult {
  id: string;
  qrCode?: string;
  status: string;
  shift?: {
    date: string;
    timeFrom?: string;
    commodity?: { name: string };
  };
}

const step1Schema = z.object({
  date: z.string().min(1, 'Seleccioná una fecha'),
  commodityId: z.string().min(1, 'Seleccioná un cultivo'),
  shiftId: z.string().min(1, 'Seleccioná un turno disponible'),
});

const step2Schema = z.object({
  plate: z.string().min(5, 'Ingresá la patente').max(10, 'Patente inválida'),
  driverDni: z.string().min(7, 'Ingresá el DNI del chofer').max(10, 'DNI inválido'),
  driverName: z.string().min(3, 'Ingresá el nombre del chofer'),
  estimatedQty: z
    .number({ invalid_type_error: 'Ingresá un número válido' })
    .min(1000, 'Mínimo 1.000 kg')
    .max(50000, 'Máximo 50.000 kg'),
  cpeNumber: z.string().optional(),
});

type Step1Values = z.infer<typeof step1Schema>;
type Step2Values = z.infer<typeof step2Schema>;

interface AllValues extends Step1Values, Step2Values {
  commodityName?: string;
  shiftInfo?: AvailableSlot;
}

// -----------------------------------------------------------------------------
// Subcomponentes auxiliares
// -----------------------------------------------------------------------------

function SlotIndicator({ available, total }: { available: number; total: number }) {
  const color =
    available > 5 ? 'text-green-700 bg-green-50 border-green-200' :
    available > 2 ? 'text-yellow-700 bg-yellow-50 border-yellow-200' :
    'text-red-700 bg-red-50 border-red-200';

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border', color)}>
      {available > 0 ? (
        <>Quedan {available} cupos</>
      ) : (
        <><AlertCircle className="w-3 h-3" /> Sin cupos</>
      )}
    </span>
  );
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
              i + 1 < current
                ? 'bg-guay-600 text-white'
                : i + 1 === current
                ? 'bg-guay-600 text-white ring-4 ring-guay-100'
                : 'bg-gray-100 text-gray-400',
            )}
          >
            {i + 1 < current ? <Check className="w-4 h-4" /> : i + 1}
          </div>
          {i < total - 1 && (
            <div className={cn('w-8 h-0.5', i + 1 < current ? 'bg-guay-600' : 'bg-gray-200')} />
          )}
        </div>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Componente principal
// -----------------------------------------------------------------------------

export function ShiftBookingForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<AllValues>>({});
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);

  // Mínimo: mañana
  const minDate = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  // ----- Step 1 -----
  const form1 = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      date: formData.date ?? '',
      commodityId: formData.commodityId ?? '',
      shiftId: formData.shiftId ?? '',
    },
  });

  const selectedDate = form1.watch('date');
  const selectedCommodityId = form1.watch('commodityId');

  const { data: commodities } = useQuery<ICommodity[]>({
    queryKey: ['commodities'],
    queryFn: () => api.get<ICommodity[]>('/commodities'),
    staleTime: 300_000,
  });

  const { data: slots, isLoading: slotsLoading } = useQuery<AvailableSlot[]>({
    queryKey: ['available-slots', selectedDate, selectedCommodityId],
    queryFn: () =>
      api.get<AvailableSlot[]>('/shifts/available', {
        params: {
          date: selectedDate,
          commodityId: selectedCommodityId || undefined,
        },
      }),
    enabled: Boolean(selectedDate),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  // ----- Step 2 -----
  const form2 = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      plate: formData.plate ?? '',
      driverDni: formData.driverDni ?? '',
      driverName: formData.driverName ?? '',
      estimatedQty: formData.estimatedQty,
      cpeNumber: formData.cpeNumber ?? '',
    },
  });

  // ----- Mutación reserva -----
  const bookMutation = useMutation({
    mutationFn: (data: AllValues) =>
      api.post<BookingResult>('/portal/shifts/book', {
        shiftId: data.shiftId,
        plate: data.plate,
        driverDni: data.driverDni,
        driverName: data.driverName,
        estimatedQty: data.estimatedQty,
        cpeNumber: data.cpeNumber || undefined,
      }),
    onSuccess: (result) => {
      setBookingResult(result);
      setStep(3);
    },
  });

  function onStep1Submit(values: Step1Values) {
    const slot = slots?.find((s) => s.shiftId === values.shiftId);
    setFormData((prev) => ({
      ...prev,
      ...values,
      commodityName: slot?.commodityName,
      shiftInfo: slot,
    }));
    setStep(2);
  }

  function onStep2Submit(values: Step2Values) {
    const all: AllValues = { ...formData, ...values } as AllValues;
    setFormData(all);
    bookMutation.mutate(all);
  }

  function handleWhatsApp() {
    if (!bookingResult) return;
    const shiftDate = bookingResult.shift?.date
      ? format(new Date(bookingResult.shift.date), "d 'de' MMMM", { locale: es })
      : '';
    const text = encodeURIComponent(
      `Hola! Reservé un turno en GuayCampo.\n` +
      `Fecha: ${shiftDate}\n` +
      `Cultivo: ${formData.shiftInfo?.commodityName ?? ''}\n` +
      `Camión: ${formData.plate}\n` +
      `ID: ${bookingResult.id}`,
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 max-w-xl mx-auto">
      <StepIndicator current={step} total={3} />

      {/* ---- PASO 1: Fecha y cultivo ---- */}
      {step === 1 && (
        <form onSubmit={form1.handleSubmit(onStep1Submit)} className="space-y-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Paso 1: Elegí fecha y cultivo</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Podés reservar a partir de mañana
            </p>
          </div>

          {/* Fecha */}
          <div className="space-y-1.5">
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">
              Fecha de entrega
            </label>
            <input
              id="date"
              type="date"
              min={minDate}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-guay-500 transition"
              {...form1.register('date')}
            />
            {form1.formState.errors.date && (
              <p className="text-xs text-red-600">{form1.formState.errors.date.message}</p>
            )}
          </div>

          {/* Cultivo */}
          <div className="space-y-1.5">
            <label htmlFor="commodityId" className="block text-sm font-medium text-gray-700">
              Cultivo
            </label>
            <select
              id="commodityId"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-guay-500 transition bg-white"
              {...form1.register('commodityId')}
            >
              <option value="">Todos los cultivos</option>
              {commodities?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cupos disponibles */}
          {selectedDate && (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Turno disponible
              </label>
              {slotsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : !slots || slots.length === 0 ? (
                <div className="py-4 text-center text-sm text-gray-500 bg-gray-50 rounded-lg">
                  No hay cupos disponibles para esa fecha
                </div>
              ) : (
                <div className="space-y-2">
                  {slots.map((slot) => (
                    <label
                      key={slot.shiftId}
                      className={cn(
                        'flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors',
                        form1.watch('shiftId') === slot.shiftId
                          ? 'border-guay-500 bg-guay-50'
                          : slot.availableSlots === 0
                          ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                          : 'border-gray-200 hover:border-guay-300',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          value={slot.shiftId}
                          disabled={slot.availableSlots === 0}
                          className="text-guay-600 focus:ring-guay-500"
                          {...form1.register('shiftId')}
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {slot.commodityName}
                            {slot.timeFrom && (
                              <span className="ml-2 text-gray-500 font-normal">
                                {slot.timeFrom}
                                {slot.timeTo && ` – ${slot.timeTo}`}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <SlotIndicator
                        available={slot.availableSlots}
                        total={slot.totalSlots}
                      />
                    </label>
                  ))}
                </div>
              )}
              {form1.formState.errors.shiftId && (
                <p className="text-xs text-red-600">{form1.formState.errors.shiftId.message}</p>
              )}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 bg-guay-600 hover:bg-guay-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            Continuar
            <ChevronRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* ---- PASO 2: Datos del camión ---- */}
      {step === 2 && (
        <form onSubmit={form2.handleSubmit(onStep2Submit)} className="space-y-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Paso 2: Datos del camión</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Completá los datos del vehículo y el chofer
            </p>
          </div>

          {/* Selección resumida del paso 1 */}
          <div className="bg-guay-50 rounded-lg p-3 text-sm text-guay-800">
            <p className="font-medium">
              {formData.shiftInfo?.commodityName} ·{' '}
              {formData.date
                ? format(new Date(formData.date + 'T12:00'), "d 'de' MMMM", { locale: es })
                : '—'}
              {formData.shiftInfo?.timeFrom && ` · ${formData.shiftInfo.timeFrom}`}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="plate" className="block text-sm font-medium text-gray-700">
                Patente del camión
              </label>
              <input
                id="plate"
                type="text"
                placeholder="AB 123 CD"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-guay-500 transition uppercase"
                {...form2.register('plate')}
              />
              {form2.formState.errors.plate && (
                <p className="text-xs text-red-600">{form2.formState.errors.plate.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="estimatedQty" className="block text-sm font-medium text-gray-700">
                Cantidad estimada (kg)
              </label>
              <input
                id="estimatedQty"
                type="number"
                min={1000}
                max={50000}
                step={100}
                placeholder="25000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-guay-500 transition"
                {...form2.register('estimatedQty', { valueAsNumber: true })}
              />
              {form2.formState.errors.estimatedQty && (
                <p className="text-xs text-red-600">{form2.formState.errors.estimatedQty.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="driverDni" className="block text-sm font-medium text-gray-700">
                DNI del chofer
              </label>
              <input
                id="driverDni"
                type="text"
                placeholder="20123456"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-guay-500 transition"
                {...form2.register('driverDni')}
              />
              {form2.formState.errors.driverDni && (
                <p className="text-xs text-red-600">{form2.formState.errors.driverDni.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="driverName" className="block text-sm font-medium text-gray-700">
                Nombre del chofer
              </label>
              <input
                id="driverName"
                type="text"
                placeholder="Juan Pérez"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-guay-500 transition"
                {...form2.register('driverName')}
              />
              {form2.formState.errors.driverName && (
                <p className="text-xs text-red-600">{form2.formState.errors.driverName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="cpeNumber" className="block text-sm font-medium text-gray-700">
              Número de CPE{' '}
              <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              id="cpeNumber"
              type="text"
              placeholder="Código de Porte Electrónico"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-guay-500 transition"
              {...form2.register('cpeNumber')}
            />
          </div>

          {bookMutation.isError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              Ocurrió un error al reservar. Intentá nuevamente.
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Volver
            </button>
            <button
              type="submit"
              disabled={bookMutation.isPending}
              className="flex-1 py-2.5 bg-guay-600 hover:bg-guay-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              {bookMutation.isPending ? 'Reservando...' : 'Confirmar reserva'}
              {!bookMutation.isPending && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </form>
      )}

      {/* ---- PASO 3: Confirmación y QR ---- */}
      {step === 3 && bookingResult && (
        <div className="space-y-5 text-center">
          <div className="w-14 h-14 rounded-full bg-guay-100 flex items-center justify-center mx-auto">
            <Check className="w-7 h-7 text-guay-600" />
          </div>

          <div>
            <h2 className="text-base font-semibold text-gray-900">¡Turno reservado!</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Tu turno fue confirmado exitosamente
            </p>
          </div>

          {/* Resumen */}
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Cultivo</span>
              <span className="font-medium text-gray-900">
                {formData.shiftInfo?.commodityName ?? '—'}
              </span>
            </div>
            {bookingResult.shift?.date && (
              <div className="flex justify-between">
                <span className="text-gray-500">Fecha</span>
                <span className="font-medium text-gray-900">
                  {format(new Date(bookingResult.shift.date), "d 'de' MMMM yyyy", { locale: es })}
                  {bookingResult.shift.timeFrom && ` · ${bookingResult.shift.timeFrom}`}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Camión</span>
              <span className="font-medium text-gray-900 uppercase">{formData.plate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Chofer</span>
              <span className="font-medium text-gray-900">{formData.driverName}</span>
            </div>
            {formData.estimatedQty && (
              <div className="flex justify-between">
                <span className="text-gray-500">Cantidad est.</span>
                <span className="font-medium text-gray-900">
                  {formData.estimatedQty.toLocaleString('es-AR')} kg
                </span>
              </div>
            )}
          </div>

          {/* QR */}
          {bookingResult.qrCode && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-gray-700">
                <QrCode className="w-4 h-4" />
                Código QR de acceso
              </div>
              {bookingResult.qrCode.startsWith('data:image') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bookingResult.qrCode}
                  alt="QR de acceso"
                  className="w-48 h-48 mx-auto"
                />
              ) : (
                <div className="font-mono text-xs text-center break-all select-all text-gray-700 p-2 bg-gray-50 rounded-lg">
                  {bookingResult.qrCode}
                </div>
              )}
              <p className="text-xs text-gray-500">
                Guardá o compartí este código. Lo necesitarás para entrar a la planta.
              </p>
            </div>
          )}

          {/* Acciones */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleWhatsApp}
              className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Compartir por WhatsApp
            </button>
            <button
              onClick={() => router.push('/portal/mis-turnos')}
              className="w-full py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
            >
              Ver mis turnos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
