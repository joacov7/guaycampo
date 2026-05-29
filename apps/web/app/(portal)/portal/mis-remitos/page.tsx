'use client';

import { useQuery } from '@tanstack/react-query';
import { FileOutput, FileDown, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Remito, RemitoType, RemitoStatus } from '@/hooks/use-remitos';

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<RemitoType, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  transferencia: 'Transferencia',
};

const TYPE_BADGE: Record<RemitoType, string> = {
  entrada: 'bg-blue-100 text-blue-700',
  salida: 'bg-orange-100 text-orange-700',
  transferencia: 'bg-purple-100 text-purple-700',
};

const STATUS_LABELS: Record<RemitoStatus, string> = {
  borrador: 'Borrador',
  emitido: 'Emitido',
  firmado: 'Firmado',
  anulado: 'Anulado',
};

const STATUS_BADGE: Record<RemitoStatus, string> = {
  borrador: 'bg-gray-100 text-gray-600',
  emitido: 'bg-yellow-100 text-yellow-700',
  firmado: 'bg-green-100 text-green-700',
  anulado: 'bg-red-100 text-red-700',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: es });
  } catch {
    return dateStr;
  }
}

function formatKg(val: number | null) {
  if (val === null || val === undefined) return '—';
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(Number(val));
}

async function downloadPdf(remito: Remito) {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';
  const { getSession } = await import('next-auth/react');
  const session = await getSession();
  const token = session?.user?.accessToken ?? '';

  const res = await fetch(`${BASE_URL}/remitos/${remito.id}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `remito-${remito.remitoNumber}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MisRemitosPage() {
  const { data: remitos = [], isLoading } = useQuery<Remito[]>({
    queryKey: ['portal-mis-remitos'],
    queryFn: () => api.get<Remito[]>('/remitos'),
    staleTime: 60_000,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Mis Remitos</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Remitos de ingreso y egreso de mercadería
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-guay-500" />
          </div>
        ) : remitos.length === 0 ? (
          <div className="text-center py-12">
            <FileOutput className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Sin remitos</p>
            <p className="text-sm text-gray-400 mt-1">
              Los remitos asignados aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-3 font-medium text-gray-500 whitespace-nowrap">
                    Número
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500">Tipo</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 hidden sm:table-cell">
                    Producto
                  </th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 whitespace-nowrap hidden sm:table-cell">
                    Peso neto (kg)
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 whitespace-nowrap hidden md:table-cell">
                    Fecha
                  </th>
                  <th className="text-center py-3 px-3 font-medium text-gray-500">Estado</th>
                  <th className="text-center py-3 px-3 font-medium text-gray-500">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {remitos.map((remito) => (
                  <tr key={remito.id} className="hover:bg-gray-50">
                    <td className="py-3 px-3 font-mono font-medium text-gray-900 whitespace-nowrap">
                      {remito.remitoNumber}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          TYPE_BADGE[remito.remitoType],
                        )}
                      >
                        {TYPE_LABELS[remito.remitoType]}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-600 hidden sm:table-cell">
                      {remito.commodity.name}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-700 whitespace-nowrap hidden sm:table-cell">
                      {formatKg(remito.netWeightKg)}
                    </td>
                    <td className="py-3 px-3 text-gray-500 whitespace-nowrap hidden md:table-cell">
                      {formatDate(remito.issueDate)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          STATUS_BADGE[remito.status],
                        )}
                      >
                        {STATUS_LABELS[remito.status]}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => downloadPdf(remito)}
                        title="Descargar PDF"
                        className="inline-flex items-center justify-center p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <FileDown className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
