'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Settings, Building2, Sliders, DollarSign, FileSpreadsheet, Plug } from 'lucide-react';
import { PlantProfile } from '@/components/configuracion/plant-profile';
import { OperatingParams } from '@/components/configuracion/operating-params';
import { TariffsTable } from '@/components/configuracion/tariffs-table';
import { AfipConfig } from '@/components/configuracion/afip-config';
import { IntegrationsConfig } from '@/components/configuracion/integrations-config';
import { cn } from '@/lib/utils';

type Tab = 'perfil' | 'parametros' | 'tarifas' | 'afip' | 'integraciones';

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }>; adminOnly?: boolean }[] = [
  { id: 'perfil', label: 'Perfil de la Planta', icon: Building2 },
  { id: 'parametros', label: 'Parámetros Operativos', icon: Sliders, adminOnly: true },
  { id: 'tarifas', label: 'Tarifas', icon: DollarSign, adminOnly: true },
  { id: 'afip', label: 'AFIP', icon: FileSpreadsheet, adminOnly: true },
  { id: 'integraciones', label: 'Integraciones', icon: Plug, adminOnly: true },
];

export default function ConfiguracionPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>('perfil');

  const userRole = session?.user?.role ?? '';
  const isAdmin = userRole === 'tenant_admin';

  const visibleTabs = TABS.filter((tab) => !tab.adminOnly || isAdmin);

  return (
    <div className="space-y-5 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-guay-600" />
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ajustes de la planta y la plataforma</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0',
                  activeTab === tab.id
                    ? 'border-guay-600 text-guay-700 bg-guay-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'perfil' && <PlantProfile />}
          {activeTab === 'parametros' && isAdmin && <OperatingParams />}
          {activeTab === 'tarifas' && isAdmin && <TariffsTable />}
          {activeTab === 'afip' && isAdmin && <AfipConfig />}
          {activeTab === 'integraciones' && isAdmin && <IntegrationsConfig />}

          {/* Fallback for non-admin trying to access admin-only tabs */}
          {(['parametros', 'tarifas', 'afip', 'integraciones'] as Tab[]).includes(activeTab) && !isAdmin && (
            <div className="text-center py-12">
              <Settings className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Acceso restringido</p>
              <p className="text-sm text-gray-400 mt-1">Solo el administrador puede modificar esta sección</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
