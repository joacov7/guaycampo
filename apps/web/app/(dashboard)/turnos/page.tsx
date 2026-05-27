'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, CalendarDays, Loader2 } from 'lucide-react';
import { useShifts } from '@/hooks/use-shifts';
import { ShiftCard } from '@/components/turnos/shift-card';
import { Button } from '@/components/ui/button';
import type { ShiftScheduleStatus } from '@guaycampo/shared-types';

type TabKey = 'all' | 'open' | 'completed';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'open', label: 'Activos' },
  { key: 'completed', label: 'Finalizados' },
];

const tabToStatus: Record<TabKey, ShiftScheduleStatus | undefined> = {
  all: undefined,
  open: 'open' as ShiftScheduleStatus,
  completed: 'completed' as ShiftScheduleStatus,
};

export default function TurnosPage() {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const { data, isLoading, isError } = useShifts({
    date: selectedDate,
    status: tabToStatus[activeTab],
  });

  const shifts = data?.data ?? [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Turnos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gestión de turnos y cupos por cultivo
          </p>
        </div>
        <Button asChild className="bg-guay-600 hover:bg-guay-700 gap-2 self-start sm:self-auto">
          <Link href="/dashboard/turnos/nuevo">
            <Plus className="w-4 h-4" />
            Nuevo Turno
          </Link>
        </Button>
      </div>

      {/* Date selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedDate(e.target.value)}
            className="h-9 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-guay-400"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-guay-500" />
        </div>
      )}

      {isError && (
        <div className="text-center py-16 space-y-2">
          <p className="text-red-600 font-medium">Error al cargar los turnos</p>
          <p className="text-sm text-gray-500">Intente recargar la página</p>
        </div>
      )}

      {!isLoading && !isError && shifts.length === 0 && (
        <div className="text-center py-16 space-y-4">
          <CalendarDays className="w-12 h-12 text-gray-200 mx-auto" />
          <div>
            <p className="text-gray-600 font-medium">Sin turnos para esta fecha</p>
            <p className="text-sm text-gray-400 mt-1">
              Cree un nuevo turno para comenzar a operar
            </p>
          </div>
          <Button asChild className="bg-guay-600 hover:bg-guay-700 gap-2">
            <Link href="/dashboard/turnos/nuevo">
              <Plus className="w-4 h-4" />
              Crear primer turno
            </Link>
          </Button>
        </div>
      )}

      {!isLoading && !isError && shifts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {shifts.map((shift) => (
            <ShiftCard key={shift.id} shift={shift} />
          ))}
        </div>
      )}
    </div>
  );
}
