'use client';

import { TrendingUp, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { useCurrentPrices, type PriceCondition } from '@/hooks/use-prices';
import { cn } from '@/lib/utils';

const CONDITION_LABELS: Record<PriceCondition, string> = {
  pizarra: 'Pizarra',
  forward: 'Forward',
  spot: 'Spot',
  canje: 'Canje',
  fijacion: 'Fijación',
};

const CONDITION_BADGE: Record<PriceCondition, string> = {
  pizarra: 'bg-green-100 text-green-700',
  forward: 'bg-blue-100 text-blue-700',
  spot: 'bg-amber-100 text-amber-700',
  canje: 'bg-purple-100 text-purple-700',
  fijacion: 'bg-red-100 text-red-700',
};

function formatDate(dateStr: string | Date) {
  try {
    return format(new Date(dateStr), "dd/MM/yyyy 'a las' HH:mm", { locale: es });
  } catch {
    return String(dateStr);
  }
}

function formatDateShort(dateStr: string | Date) {
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: es });
  } catch {
    return String(dateStr);
  }
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

export default function PortalPreciosPage() {
  const { data: groups = [], isLoading, isRefetching, refetch, dataUpdatedAt } = useCurrentPrices();

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;
  const allPrices = groups.flatMap((g) => g.prices);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cotizaciones vigentes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Precios de referencia por producto y condición
          </p>
        </div>
        <button
          onClick={() => void refetch()}
          disabled={isRefetching}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-guay-600 transition-colors"
        >
          <RefreshCw className={cn('w-4 h-4', isRefetching && 'animate-spin')} />
          <span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        <p className="text-sm text-amber-700">
          Los precios son referenciales y pueden variar. Consultá con nuestro equipo para confirmar cotizaciones.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : allPrices.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <TrendingUp className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Sin cotizaciones disponibles</p>
          <p className="text-sm text-gray-400 mt-1">
            Pronto se publicarán los precios vigentes
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.commodityId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Commodity header */}
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <h2 className="text-sm font-semibold text-gray-800">
                  {group.commodityName}
                  {group.commodityCode && (
                    <span className="ml-2 text-xs text-gray-400 font-normal">
                      ({group.commodityCode})
                    </span>
                  )}
                </h2>
              </div>

              {/* Prices grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-100">
                {group.prices.map((price) => (
                  <div key={price.id} className="bg-white p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          CONDITION_BADGE[price.condition as PriceCondition],
                        )}
                      >
                        {CONDITION_LABELS[price.condition as PriceCondition]}
                      </span>
                      <span className="text-xs text-gray-400">{price.currency}</span>
                    </div>

                    <div>
                      <p className="text-xl font-bold text-gray-900">
                        {formatPrice(price.pricePerTon, price.currency)}
                      </p>
                      <p className="text-xs text-gray-400">por tonelada</p>
                    </div>

                    <div className="text-xs text-gray-400 space-y-0.5">
                      <p>Vigente desde {formatDateShort(price.validFrom)}</p>
                      {price.validUntil && (
                        <p>Hasta {formatDateShort(price.validUntil)}</p>
                      )}
                      {price.deliveryMonths && (
                        <p className="text-gray-500">Entrega: {price.deliveryMonths}</p>
                      )}
                    </div>

                    {price.notes && (
                      <p className="text-xs text-gray-500 border-t border-gray-100 pt-2">
                        {price.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Last updated */}
      {lastUpdated && !isLoading && (
        <p className="text-xs text-gray-400 text-center">
          Última actualización: {formatDate(lastUpdated)}
        </p>
      )}
    </div>
  );
}
