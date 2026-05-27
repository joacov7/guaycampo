'use client';

import { useSession } from 'next-auth/react';
import { useTenant } from '@/hooks/use-tenant';
import { Settings, Building2, User, Bell, Shield } from 'lucide-react';

interface ConfigSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  content: React.ReactNode;
}

export default function ConfiguracionPage() {
  const { data: session } = useSession();
  const { tenantName, tenantSlug } = useTenant();

  const sections: ConfigSection[] = [
    {
      id: 'empresa',
      label: 'Empresa',
      icon: Building2,
      description: 'Datos del acopiador',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoField label="Nombre" value={tenantName ?? '—'} />
            <InfoField label="Slug" value={tenantSlug ?? '—'} />
            <InfoField label="ID de tenant" value={session?.user?.tenantId ?? '—'} />
            <InfoField label="Plan" value="Professional" />
          </div>
        </div>
      ),
    },
    {
      id: 'usuario',
      label: 'Mi perfil',
      icon: User,
      description: 'Datos de tu cuenta',
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoField label="Nombre" value={session?.user?.name ?? '—'} />
          <InfoField label="Email" value={session?.user?.email ?? '—'} />
          <InfoField label="Rol" value={session?.user?.role ?? '—'} />
        </div>
      ),
    },
    {
      id: 'notificaciones',
      label: 'Notificaciones',
      icon: Bell,
      description: 'Alertas y avisos',
      content: (
        <div className="space-y-3">
          <ToggleRow label="Alertas de cola llena" defaultChecked />
          <ToggleRow label="Camiones sin turno" defaultChecked />
          <ToggleRow label="Silo al 90% de capacidad" defaultChecked />
          <ToggleRow label="Análisis de laboratorio rechazado" />
        </div>
      ),
    },
    {
      id: 'permisos',
      label: 'Seguridad',
      icon: Shield,
      description: 'Roles y accesos',
      content: (
        <div className="text-center py-6 space-y-2">
          <Shield className="w-10 h-10 text-gray-200 mx-auto" />
          <p className="text-sm text-gray-500">Gestión de roles disponible próximamente</p>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-guay-600" />
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ajustes de la plataforma</p>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-guay-50 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-guay-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">{section.label}</h2>
                  <p className="text-xs text-gray-400">{section.description}</p>
                </div>
              </div>
              <div className="p-5">{section.content}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-800 font-medium">{value}</p>
    </div>
  );
}

function ToggleRow({
  label,
  defaultChecked,
}: {
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only peer"
          defaultChecked={defaultChecked}
        />
        <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-guay-500 transition-colors" />
        <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
      </div>
    </label>
  );
}
