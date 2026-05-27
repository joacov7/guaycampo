'use client';

import { useState } from 'react';
import { Truck, User, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Placeholder data — replace with API calls
const mockVehicles = [
  { id: 'v1', plate: 'ABC 123', plateTrailer: 'XYZ 456', vehicleType: 'camion_semirremolque', driver: 'Carlos Gómez', company: 'Transportes del Sur', taraKg: 12500 },
  { id: 'v2', plate: 'DEF 456', plateTrailer: undefined, vehicleType: 'camion', driver: 'Luis Martínez', company: 'Fletes Pampa', taraKg: 9800 },
  { id: 'v3', plate: 'GHI 789', plateTrailer: 'MNO 321', vehicleType: 'camion_acoplado', driver: 'Roberto Díaz', company: 'Transportes Norte', taraKg: 11200 },
  { id: 'v4', plate: 'JKL 012', plateTrailer: undefined, vehicleType: 'batea', driver: 'Mario Fernández', company: 'Fletes Sur SA', taraKg: 8500 },
];

const vehicleTypeLabels: Record<string, string> = {
  camion: 'Camión',
  camion_acoplado: 'Camión c/ Acoplado',
  camion_semirremolque: 'Semirremolque',
  batea: 'Batea',
  acoplado: 'Acoplado',
};

type ActiveTab = 'vehicles' | 'drivers';

export default function CamionesPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('vehicles');
  const [search, setSearch] = useState('');

  const filteredVehicles = mockVehicles.filter(
    (v) =>
      v.plate.toLowerCase().includes(search.toLowerCase()) ||
      v.driver.toLowerCase().includes(search.toLowerCase()) ||
      v.company.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Camiones</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gestión de vehículos y conductores
          </p>
        </div>
        <Button className="bg-guay-600 hover:bg-guay-700 gap-2 self-start" disabled>
          <Plus className="w-4 h-4" />
          Agregar
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('vehicles')}
          className={`flex items-center gap-2 px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
            activeTab === 'vehicles'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Truck className="w-4 h-4" />
          Vehículos
        </button>
        <button
          onClick={() => setActiveTab('drivers')}
          className={`flex items-center gap-2 px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
            activeTab === 'drivers'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <User className="w-4 h-4" />
          Conductores
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar por patente, conductor..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Vehicles table */}
      {activeTab === 'vehicles' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Patente
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide hidden sm:table-cell">
                    Tipo
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Conductor
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide hidden md:table-cell">
                    Empresa
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide hidden lg:table-cell">
                    Tara
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-400 text-sm">
                      Sin resultados
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map((vehicle) => (
                    <tr
                      key={vehicle.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-7 rounded bg-gray-100 border border-gray-200 flex items-center justify-center">
                            <span className="text-xs font-bold text-gray-700">
                              {vehicle.plate.replace(' ', '')}
                            </span>
                          </div>
                          {vehicle.plateTrailer && (
                            <span className="text-xs text-gray-400">
                              + {vehicle.plateTrailer}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {vehicleTypeLabels[vehicle.vehicleType] ?? vehicle.vehicleType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-guay-100 flex items-center justify-center text-guay-700 text-xs font-medium flex-shrink-0">
                            {vehicle.driver.charAt(0)}
                          </div>
                          <span className="text-gray-800 truncate max-w-[120px]">
                            {vehicle.driver}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-500 text-sm">
                        {vehicle.company}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-sm">
                        {vehicle.taraKg.toLocaleString('es-AR')} kg
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drivers tab */}
      {activeTab === 'drivers' && (
        <div className="text-center py-16 space-y-3">
          <User className="w-12 h-12 text-gray-200 mx-auto" />
          <p className="text-gray-500 font-medium">Vista de conductores</p>
          <p className="text-sm text-gray-400">Próximamente disponible</p>
        </div>
      )}
    </div>
  );
}
