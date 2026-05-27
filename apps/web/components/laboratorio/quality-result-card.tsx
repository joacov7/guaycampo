'use client';

import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import type { LabResultPreview } from '@/hooks/use-lab';

interface QualityResultCardProps {
  result: LabResultPreview;
}

export function QualityResultCard({ result }: QualityResultCardProps) {
  const isApproved = result.status === 'aprobado';
  const isRejected = result.status === 'rechazado';
  const isConditional = result.status === 'condicional';

  const totalIsPositive = result.netAdjustment >= 0;

  return (
    <div className="space-y-4">
      {/* Grade */}
      <div
        className={cn(
          'rounded-xl border-2 p-5 text-center',
          isApproved && 'border-green-300 bg-green-50',
          isRejected && 'border-red-300 bg-red-50',
          isConditional && 'border-yellow-300 bg-yellow-50',
        )}
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          {isApproved && <CheckCircle2 className="w-6 h-6 text-green-600" />}
          {isRejected && <XCircle className="w-6 h-6 text-red-600" />}
          {isConditional && <AlertTriangle className="w-6 h-6 text-yellow-600" />}
          <span
            className={cn(
              'text-2xl font-black tracking-tight',
              isApproved && 'text-green-700',
              isRejected && 'text-red-700',
              isConditional && 'text-yellow-700',
            )}
          >
            {result.grade}
          </span>
        </div>

        {isRejected && result.rejectionCause && (
          <p className="text-sm text-red-600 font-medium">{result.rejectionCause}</p>
        )}
        {isConditional && result.warning && (
          <p className="text-sm text-yellow-700 font-medium">{result.warning}</p>
        )}
      </div>

      {/* Adjustments table */}
      {result.adjustments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Ajustes comerciales
            </h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-gray-50">
                <th className="px-4 py-2 text-left font-medium">Parámetro</th>
                <th className="px-3 py-2 text-right font-medium">Real</th>
                <th className="px-3 py-2 text-right font-medium">Base</th>
                <th className="px-3 py-2 text-right font-medium">Desvío</th>
                <th className="px-3 py-2 text-right font-medium">Ajuste</th>
              </tr>
            </thead>
            <tbody>
              {result.adjustments.map((adj, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-gray-700">{adj.concept}</td>
                  <td className="px-3 py-2.5 text-right text-gray-600">{adj.valueReal}</td>
                  <td className="px-3 py-2.5 text-right text-gray-400">{adj.valueBase}</td>
                  <td className="px-3 py-2.5 text-right text-gray-500">
                    {adj.deviation > 0 ? '+' : ''}
                    {adj.deviation.toFixed(2)}
                  </td>
                  <td
                    className={cn(
                      'px-3 py-2.5 text-right font-semibold',
                      adj.adjustmentPct > 0 ? 'text-green-600' : adj.adjustmentPct < 0 ? 'text-red-600' : 'text-gray-400',
                    )}
                  >
                    {adj.adjustmentPct > 0 ? '+' : ''}
                    {adj.adjustmentPct.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                <td colSpan={4} className="px-4 py-3 text-sm text-gray-700">
                  Ajuste total
                </td>
                <td
                  className={cn(
                    'px-3 py-3 text-right text-base font-black',
                    totalIsPositive ? 'text-green-600' : 'text-red-600',
                  )}
                >
                  {totalIsPositive ? '+' : ''}
                  {result.netAdjustment.toFixed(2)}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
