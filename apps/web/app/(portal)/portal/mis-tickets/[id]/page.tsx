'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronLeft,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Beaker,
  Scale,
  Award,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { IScaleTicket, ILabSample } from '@guaycampo/shared-types';
import { ScaleStatus, LabStatus } from '@guaycampo/shared-types';

interface TicketDetail extends IScaleTicket {
  vehicle?: { plate: string; plateTrailer?: string; vehicleType?: string };
  driver?: { fullName: string; dni: string };
  client?: { name: string; cuit: string };
  commodity?: { name: string; code: string };
  labSamples?: LabSampleDetail[];
}

interface LabSampleDetail extends ILabSample {
  grade?: string;
  netAdjustment?: number;
  bonuses?: { concept: string; percentage: number; kg?: number }[];
  discounts?: { concept: string; percentage: number; kg?: number }[];
}

function StatusIcon({ status }: { status: ScaleStatus }) {
  switch (status) {
    case ScaleStatus.COMPLETADO:
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case ScaleStatus.ANULADO:
      return <XCircle className="w-5 h-5 text-red-500" />;
    default:
      return <Clock className="w-5 h-5 text-yellow-500" />;
  }
}

const statusLabel: Record<ScaleStatus, string> = {
  [ScaleStatus.PENDIENTE]: 'Pendiente',
  [ScaleStatus.PESADA_BRUTA]: 'Pesada bruta tomada',
  [ScaleStatus.PESADA_TARA]: 'Pesada tara tomada',
  [ScaleStatus.COMPLETADO]: 'Completado',
  [ScaleStatus.ANULADO]: 'Anulado',
};

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();

  const { data: ticket, isLoading } = useQuery<TicketDetail>({
    queryKey: ['portal-ticket', params.id],
    queryFn: () => api.get<TicketDetail>(`/tickets/${params.id}`),
    enabled: Boolean(params.id),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Ticket no encontrado</p>
        <Link href="/portal/mis-tickets" className="mt-4 text-guay-600 hover:underline text-sm">
          Volver a mis tickets
        </Link>
      </div>
    );
  }

  const lab = ticket.labSamples?.[0];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/portal/mis-tickets"
            className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">
                Ticket #{ticket.ticketNumber}
              </h1>
              <StatusIcon status={ticket.status} />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {statusLabel[ticket.status]}
              {ticket.grossAt && (
                <span className="ml-2">
                  · {format(new Date(ticket.grossAt), "d 'de' MMMM yyyy", { locale: es })}
                </span>
              )}
            </p>
          </div>
        </div>
        <button className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors flex-shrink-0">
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Descargar PDF</span>
        </button>
      </div>

      {/* Datos del pesaje */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50">
          <Scale className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700">Datos del pesaje</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Peso bruto</p>
              <p className="text-lg font-bold text-gray-900">
                {ticket.grossWeight
                  ? ticket.grossWeight.toLocaleString('es-AR')
                  : '—'}
              </p>
              <p className="text-xs text-gray-400">kg</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Tara</p>
              <p className="text-lg font-bold text-gray-900">
                {ticket.tareWeight
                  ? ticket.tareWeight.toLocaleString('es-AR')
                  : '—'}
              </p>
              <p className="text-xs text-gray-400">kg</p>
            </div>
            <div className="text-center bg-guay-50 rounded-xl p-2">
              <p className="text-xs text-guay-600 mb-1 font-medium">Peso neto</p>
              <p className="text-2xl font-bold text-guay-700">
                {ticket.netWeight
                  ? ticket.netWeight.toLocaleString('es-AR')
                  : '—'}
              </p>
              <p className="text-xs text-guay-500">kg</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Cultivo</p>
              <p className="font-medium text-gray-900 mt-0.5">
                {ticket.commodity?.name ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Camión</p>
              <p className="font-medium text-gray-900 mt-0.5 uppercase">
                {ticket.vehicle?.plate ?? '—'}
                {ticket.vehicle?.plateTrailer && (
                  <span className="text-gray-500 font-normal"> / {ticket.vehicle.plateTrailer}</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Chofer</p>
              <p className="font-medium text-gray-900 mt-0.5">
                {ticket.driver?.fullName ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">DNI chofer</p>
              <p className="font-medium text-gray-900 mt-0.5">
                {ticket.driver?.dni ?? '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Resultados de laboratorio */}
      {lab && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <Beaker className="w-4 h-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-700">Resultados de laboratorio</h2>
            </div>
            {lab.grade && (
              <div className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-bold text-amber-700">
                  Grado {lab.grade}
                </span>
              </div>
            )}
          </div>
          <div className="p-5 space-y-4">
            {/* Estado del lab */}
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                  lab.status === LabStatus.APROBADO
                    ? 'bg-green-50 text-green-700'
                    : lab.status === LabStatus.RECHAZADO
                    ? 'bg-red-50 text-red-700'
                    : 'bg-yellow-50 text-yellow-700',
                )}
              >
                {lab.status === LabStatus.APROBADO
                  ? 'Aprobado'
                  : lab.status === LabStatus.RECHAZADO
                  ? `Rechazado${lab.rejectionCause ? ': ' + lab.rejectionCause : ''}`
                  : 'En proceso'}
              </span>
              {lab.netAdjustment !== undefined && (
                <span
                  className={cn(
                    'text-sm font-semibold',
                    lab.netAdjustment >= 0 ? 'text-green-600' : 'text-red-600',
                  )}
                >
                  Ajuste neto: {lab.netAdjustment >= 0 ? '+' : ''}
                  {lab.netAdjustment.toFixed(2)}%
                </span>
              )}
            </div>

            {/* Parámetros */}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-xs font-medium text-gray-500">Parámetro</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { label: 'Humedad', value: lab.humidity, unit: '%' },
                  { label: 'Proteína', value: lab.protein, unit: '%' },
                  { label: 'Gluten', value: lab.gluten, unit: '%' },
                  { label: 'Número de caída', value: lab.fallingNumber, unit: 's' },
                  { label: 'Peso hectolítrico', value: lab.testWeight, unit: 'kg/hl' },
                  { label: 'Granos dañados', value: lab.damagedGrains, unit: '%' },
                  { label: 'Materias extrañas', value: lab.foreignMatter, unit: '%' },
                  { label: 'Granos quebrados', value: lab.brokenGrains, unit: '%' },
                ]
                  .filter((p) => p.value !== undefined && p.value !== null)
                  .map((p) => (
                    <tr key={p.label}>
                      <td className="py-2 text-gray-600">{p.label}</td>
                      <td className="py-2 text-right font-medium text-gray-900">
                        {typeof p.value === 'number' ? p.value.toFixed(2) : p.value} {p.unit}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {/* Bonificaciones y descuentos */}
            {((lab.bonuses?.length ?? 0) > 0 || (lab.discounts?.length ?? 0) > 0) && (
              <div className="space-y-3 border-t border-gray-100 pt-4">
                {lab.bonuses && lab.bonuses.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-green-700 mb-2">Bonificaciones</p>
                    <div className="space-y-1">
                      {lab.bonuses.map((b, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-gray-600">{b.concept}</span>
                          <span className="text-green-600 font-medium">
                            +{b.percentage.toFixed(2)}%
                            {b.kg !== undefined && ` (+${b.kg.toLocaleString('es-AR')} kg)`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {lab.discounts && lab.discounts.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-700 mb-2">Descuentos</p>
                    <div className="space-y-1">
                      {lab.discounts.map((d, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-gray-600">{d.concept}</span>
                          <span className="text-red-600 font-medium">
                            -{d.percentage.toFixed(2)}%
                            {d.kg !== undefined && ` (-${d.kg.toLocaleString('es-AR')} kg)`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Firma pendiente */}
      {ticket.status === ScaleStatus.PENDIENTE && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-sm text-yellow-800 font-medium">
            Este ticket está pendiente de confirmación
          </p>
          <p className="text-xs text-yellow-700 mt-1">
            El pesaje aún no fue finalizado en la planta.
          </p>
        </div>
      )}
    </div>
  );
}
