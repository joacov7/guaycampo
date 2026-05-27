'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MoreHorizontal, Pencil, Eye } from 'lucide-react';
import type { IClient } from '@guaycampo/shared-types';
import { ClientType } from '@guaycampo/shared-types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const clientTypeLabels: Record<ClientType, string> = {
  [ClientType.PRODUCTOR]: 'Productor',
  [ClientType.ACOPIADOR]: 'Acopiador',
  [ClientType.EXPORTADOR]: 'Exportador',
  [ClientType.INDUSTRIA]: 'Industria',
  [ClientType.OTRO]: 'Otro',
};

function BalanceBadge({ balance }: { balance: number }) {
  const isPositive = balance >= 0;
  return (
    <span
      className={cn(
        'font-semibold text-sm',
        isPositive ? 'text-green-700' : 'text-red-600',
      )}
    >
      {isPositive ? '+' : ''}
      {balance.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}
    </span>
  );
}

function ActionMenu({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
            <Link
              href={`/dashboard/clientes/${clientId}`}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setOpen(false)}
            >
              <Eye className="w-3.5 h-3.5" />
              Ver detalle
            </Link>
            <Link
              href={`/dashboard/clientes/${clientId}?tab=datos`}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setOpen(false)}
            >
              <Pencil className="w-3.5 h-3.5" />
              Editar
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

interface ClientTableProps {
  clients: IClient[];
  isLoading?: boolean;
}

export function ClientTable({ clients, isLoading }: ClientTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
        <p className="text-gray-400 text-sm">No se encontraron clientes</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                Nombre
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide hidden sm:table-cell">
                CUIT
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide hidden md:table-cell">
                Tipo
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide hidden lg:table-cell">
                Localidad
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                Saldo CC
              </th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/clientes/${client.id}`}
                    className="font-medium text-gray-900 hover:text-guay-700 transition-colors"
                  >
                    {client.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden sm:table-cell">
                  {client.cuit}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {client.clientType ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      {clientTypeLabels[client.clientType] ?? client.clientType}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">
                  {client.locality ? `${client.locality}${client.province ? `, ${client.province}` : ''}` : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <BalanceBadge balance={client.currentAccount} />
                </td>
                <td className="px-4 py-3">
                  <ActionMenu clientId={client.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
