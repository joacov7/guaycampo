import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { ShiftBookingForm } from '@/components/portal/shift-booking-form';

export const metadata: Metadata = {
  title: 'Reservar turno | Portal del Productor',
};

export default function NuevoTurnoPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/portal/mis-turnos"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reservar turno</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Completá los datos para reservar tu turno de descarga
          </p>
        </div>
      </div>

      <ShiftBookingForm />
    </div>
  );
}
