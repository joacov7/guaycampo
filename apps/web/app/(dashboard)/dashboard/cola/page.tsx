'use client';

import { QueueBoard } from '@/components/cola/queue-board';

export default function ColaPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Cola Virtual</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Gestión en tiempo real de la cola de camiones
        </p>
      </div>

      {/* Queue board with real-time updates */}
      <QueueBoard />
    </div>
  );
}
