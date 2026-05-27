'use client';

import { cn } from '@/lib/utils';

export const ROLE_DESCRIPTIONS: Record<
  string,
  { label: string; description: string; color: string }
> = {
  tenant_admin: {
    label: 'Administrador',
    description: 'Acceso total al sistema. Puede crear usuarios y modificar configuración.',
    color: 'red',
  },
  jefe_operaciones: {
    label: 'Jefe de Operaciones',
    description: 'Gestiona turnos, cola y todos los módulos operativos.',
    color: 'orange',
  },
  operador_balanza: {
    label: 'Operador de Balanza',
    description: 'Opera la báscula, confirma pesos y gestiona la cola.',
    color: 'blue',
  },
  laboratorista: {
    label: 'Laboratorista',
    description: 'Carga resultados de análisis de calidad.',
    color: 'purple',
  },
  operador_silos: {
    label: 'Operador de Silos',
    description: 'Monitorea y gestiona el stock de silos.',
    color: 'green',
  },
  administrativo: {
    label: 'Administrativo',
    description: 'Accede a facturación, liquidaciones y reportes financieros.',
    color: 'yellow',
  },
  conductor: {
    label: 'Conductor',
    description: 'Solo acceso a la app móvil para ver sus turnos.',
    color: 'gray',
  },
  cliente_productor: {
    label: 'Productor / Cliente',
    description: 'Acceso al portal del productor. Ve sus propios tickets y liquidaciones.',
    color: 'teal',
  },
};

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  gray: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
};

interface RoleSelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function RoleSelector({ value, onChange, error, disabled }: RoleSelectorProps) {
  return (
    <div className="space-y-2">
      <div
        className={cn(
          'grid grid-cols-1 sm:grid-cols-2 gap-2',
          disabled && 'opacity-50 pointer-events-none',
        )}
      >
        {Object.entries(ROLE_DESCRIPTIONS).map(([roleKey, role]) => {
          const colors = colorMap[role.color] ?? colorMap['gray'];
          const isSelected = value === roleKey;
          return (
            <button
              key={roleKey}
              type="button"
              onClick={() => onChange(roleKey)}
              className={cn(
                'text-left px-3 py-2.5 rounded-lg border-2 transition-all',
                isSelected
                  ? `${colors.bg} ${colors.border} ${colors.text}`
                  : 'border-gray-200 hover:border-gray-300 bg-white',
              )}
            >
              <div className="flex items-start gap-2">
                <div
                  className={cn(
                    'mt-0.5 w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 transition-colors',
                    isSelected ? `${colors.border} bg-current` : 'border-gray-300',
                  )}
                />
                <div>
                  <p
                    className={cn(
                      'text-sm font-medium',
                      isSelected ? colors.text : 'text-gray-900',
                    )}
                  >
                    {role.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{role.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const info = ROLE_DESCRIPTIONS[role];
  if (!info) return <span className="text-xs text-gray-500">{role}</span>;
  const colors = colorMap[info.color] ?? colorMap['gray'];
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        colors.bg,
        colors.text,
      )}
    >
      {info.label}
    </span>
  );
}
