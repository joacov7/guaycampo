'use client';

import { cn } from '@/lib/utils';
import { Ticket, User, Building2, Wheat, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlateCapture } from '@/components/balanza/plate-capture';
import type { IScaleTicket, ScaleStatus } from '@guaycampo/shared-types';

interface ActiveTicketCardProps {
  ticket: IScaleTicket & {
    vehicle?: { plate: string };
    driver?: { fullName: string };
    client?: { name: string };
    commodity?: { name: string };
  };
  onConfirm?: () => void;
  onReject?: () => void;
  isPending?: boolean;
}

const statusLabels: Record<ScaleStatus, string> = {
  pendiente: 'Pendiente',
  pesada_bruta: 'Esperando bruto',
  pesada_tara: 'Esperando tara',
  completado: 'Completado',
  anulado: 'Anulado',
};

const statusColors: Record<ScaleStatus, string> = {
  pendiente: 'bg-gray-100 text-gray-600',
  pesada_bruta: 'bg-yellow-100 text-yellow-700',
  pesada_tara: 'bg-blue-100 text-blue-700',
  completado: 'bg-green-100 text-green-700',
  anulado: 'bg-red-100 text-red-700',
};

export function ActiveTicketCard({
  ticket,
  onConfirm,
  onReject,
  isPending = false,
}: ActiveTicketCardProps) {
  const statusColor = statusColors[ticket.status] ?? 'bg-gray-100 text-gray-600';
  const statusLabel = statusLabels[ticket.status] ?? ticket.status;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Ticket className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-900">
            Ticket #{ticket.ticketNumber}
          </span>
        </div>
        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', statusColor)}>
          {statusLabel}
        </span>
      </div>

      {/* OCR / Foto */}
      <PlateCapture
        plateDetected={ticket.plateDetected}
        plateConfirmed={ticket.plateConfirmed}
        ocrConfidence={ticket.ocrConfidence}
        photoUrl={ticket.grossPhotoUrl}
      />

      {/* Datos del camión */}
      <div className="grid grid-cols-2 gap-2">
        <DataRow icon={User} label="Chofer" value={ticket.driver?.fullName ?? 'N/D'} />
        <DataRow icon={Building2} label="Empresa" value={ticket.client?.name ?? 'N/D'} />
        <DataRow icon={Wheat} label="Cultivo" value={ticket.commodity?.name ?? 'N/D'} />
        <DataRow
          icon={Ticket}
          label="Patente"
          value={ticket.vehicle?.plate ?? ticket.plateConfirmed ?? 'N/D'}
        />
      </div>

      {/* Pesos */}
      {(ticket.grossWeight !== undefined || ticket.tareWeight !== undefined) && (
        <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-lg p-3">
          <WeightRow label="Bruto" value={ticket.grossWeight} />
          <WeightRow label="Tara" value={ticket.tareWeight} />
          <WeightRow label="Neto" value={ticket.netWeight} highlight />
        </div>
      )}

      {/* Actions */}
      {(ticket.status === 'pendiente' || ticket.status === 'pesada_bruta') && (
        <div className="flex gap-3">
          {onConfirm && (
            <Button
              className="flex-1 bg-guay-600 hover:bg-guay-700 text-white gap-2"
              onClick={onConfirm}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Confirmar
            </Button>
          )}
          {onReject && (
            <Button
              variant="outline"
              className="flex-1 text-red-600 border-red-200 hover:bg-red-50 gap-2"
              onClick={onReject}
              disabled={isPending}
            >
              <XCircle className="w-4 h-4" />
              Rechazar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function DataRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-xs font-medium text-gray-800 truncate">{value}</p>
      </div>
    </div>
  );
}

function WeightRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value?: number;
  highlight?: boolean;
}) {
  return (
    <div className="text-center">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p
        className={cn(
          'text-sm font-bold',
          highlight ? 'text-guay-700' : 'text-gray-700',
          value === undefined && 'text-gray-300',
        )}
      >
        {value !== undefined ? `${value.toLocaleString('es-AR')} kg` : '—'}
      </p>
    </div>
  );
}
