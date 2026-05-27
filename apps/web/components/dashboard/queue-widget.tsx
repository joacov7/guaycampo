'use client';

import Link from 'next/link';
import { useQueueStore } from '@/lib/store';
import { Clock, Truck, ArrowRight } from 'lucide-react';
import type { QueuePositionWithDetails } from '@/types';

export function QueueWidget() {
  const { positions, metrics, isConnected } = useQueueStore();

  const topPositions = positions.slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Cola Virtual</h2>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
            }`}
          />
          <Link
            href="/dashboard/cola"
            className="text-xs text-guay-600 hover:text-guay-700 flex items-center gap-0.5 font-medium"
          >
            Ver todo
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Metrics mini row */}
      {metrics && (
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{metrics.total}</p>
            <p className="text-xs text-gray-400">En cola</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{metrics.avgWaitMinutes}m</p>
            <p className="text-xs text-gray-400">Esp. prom.</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{metrics.currentlyInScale}</p>
            <p className="text-xs text-gray-400">En báscula</p>
          </div>
        </div>
      )}

      {/* Queue list */}
      <div className="space-y-1.5">
        {topPositions.length === 0 ? (
          <div className="text-center py-4">
            <Truck className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-xs text-gray-400">Cola vacía</p>
          </div>
        ) : (
          topPositions.map((pos: QueuePositionWithDetails) => (
            <div
              key={pos.id}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="w-6 h-6 rounded-full bg-guay-100 text-guay-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                {pos.position}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">
                  {pos.truckShift?.vehicle?.plate ?? 'N/A'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {pos.truckShift?.commodity?.name ?? ''}
                </p>
              </div>
              {pos.estimatedWait !== undefined && (
                <div className="flex items-center gap-0.5 text-xs text-gray-400 flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {pos.estimatedWait}m
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
