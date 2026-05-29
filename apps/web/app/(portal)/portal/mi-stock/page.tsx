'use client';

import { useQuery } from '@tanstack/react-query';
import { Warehouse, Package } from 'lucide-react';
import { api } from '@/lib/api';

interface StockItem {
  siloId: string;
  siloName: string;
  commodityName: string;
  stockKg: number;
  lastUpdated: string;
}

function formatTon(kg: number) {
  return `${(kg / 1000).toFixed(2)} tn`;
}

export default function MiStockPage() {
  const { data, isLoading } = useQuery<StockItem[]>({
    queryKey: ['portal-mi-stock'],
    queryFn: () => api.get<StockItem[]>('/stock/my'),
    staleTime: 60_000,
  });

  const totalKg = data?.reduce((s, i) => s + i.stockKg, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Mi Stock</h1>
        <p className="text-sm text-gray-500 mt-0.5">Stock depositado en planta</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <Warehouse className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <p className="text-xs text-gray-500">Stock total</p>
          <p className="text-2xl font-bold text-gray-900">{formatTon(totalKg)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 animate-pulse flex gap-4">
              <div className="w-8 h-8 bg-gray-100 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-1/3" />
                <div className="h-3 bg-gray-100 rounded w-1/4" />
              </div>
            </div>
          ))
        ) : data && data.length > 0 ? (
          data.map((item) => (
            <div key={item.siloId} className="p-4 flex items-center gap-4">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{item.siloName}</p>
                <p className="text-xs text-gray-500">{item.commodityName}</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">{formatTon(item.stockKg)}</p>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-gray-400">
            <Warehouse className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sin stock registrado</p>
          </div>
        )}
      </div>
    </div>
  );
}
