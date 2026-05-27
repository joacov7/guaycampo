'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, Info } from 'lucide-react';

interface TariffRow {
  commodityId: string;
  commodityName: string;
  storagePricePerTonMonth: number;
  commissionPct: number;
  dryingPricePerTon: number;
  conditioningPricePerTon: number;
}

export function TariffsTable() {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [rows, setRows] = useState<TariffRow[]>([]);

  const { isLoading } = useQuery({
    queryKey: ['tariffs'],
    queryFn: () => api.get<TariffRow[]>('/auth/tenant/tariffs'),
    staleTime: 60_000,
    select: (data) => {
      setRows(data);
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: (tariffs: TariffRow[]) => api.put('/auth/tenant/tariffs', { tariffs }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tariffs'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  function updateRow(index: number, field: keyof Omit<TariffRow, 'commodityId' | 'commodityName'>, value: number) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-200">
        <p className="text-gray-400 text-sm">No hay cultivos configurados</p>
        <p className="text-xs text-gray-400 mt-1">Los cultivos se configuran desde el módulo de administración</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>
          Las tarifas aplican a liquidaciones nuevas. Las liquidaciones existentes no se modifican.
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                  Cultivo
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide whitespace-nowrap">
                  Almacenaje ($/tn/mes)
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                  Comisión (%)
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide whitespace-nowrap">
                  Secado ($/tn)
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide whitespace-nowrap">
                  Acond. ($/tn)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, index) => (
                <tr key={row.commodityId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-900">{row.commodityName}</td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={row.storagePricePerTonMonth}
                      onChange={(e) => updateRow(index, 'storagePricePerTonMonth', parseFloat(e.target.value) || 0)}
                      className="w-24 text-right px-2 py-1 rounded border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={row.commissionPct}
                      onChange={(e) => updateRow(index, 'commissionPct', parseFloat(e.target.value) || 0)}
                      className="w-20 text-right px-2 py-1 rounded border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={row.dryingPricePerTon}
                      onChange={(e) => updateRow(index, 'dryingPricePerTon', parseFloat(e.target.value) || 0)}
                      className="w-24 text-right px-2 py-1 rounded border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={row.conditioningPricePerTon}
                      onChange={(e) => updateRow(index, 'conditioningPricePerTon', parseFloat(e.target.value) || 0)}
                      className="w-24 text-right px-2 py-1 rounded border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-guay-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
            <CheckCircle className="w-4 h-4" />
            Tarifas guardadas
          </span>
        )}
        <button
          type="button"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(rows)}
          className="px-5 py-2 bg-guay-600 hover:bg-guay-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {mutation.isPending ? 'Guardando...' : 'Guardar tarifas'}
        </button>
      </div>
    </div>
  );
}
