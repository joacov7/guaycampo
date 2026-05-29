'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  CalendarDays,
  ListOrdered,
  Truck,
  Scale,
  FlaskConical,
  Flame,
  Database,
  Receipt,
  FileSignature,
  FileOutput,
  BarChart3,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  User,
  Users,
  UsersRound,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore, useQueueStore } from '@/lib/store';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  disabled?: boolean;
  comingSoon?: boolean;
  roles?: string[];
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/turnos', label: 'Turnos', icon: CalendarDays },
  { href: '/dashboard/cola', label: 'Cola Virtual', icon: ListOrdered },
  { href: '/dashboard/camiones', label: 'Camiones', icon: Truck },
  { href: '/dashboard/balanza', label: 'Balanza', icon: Scale },
  { href: '/dashboard/remitos', label: 'Remitos', icon: FileOutput },
  { href: '/dashboard/laboratorio', label: 'Laboratorio', icon: FlaskConical },
  { href: '/dashboard/secado', label: 'Secado', icon: Flame },
  { href: '/dashboard/silos', label: 'Silos', icon: Database },
  {
    href: '/dashboard/clientes',
    label: 'Clientes',
    icon: UsersRound,
    roles: ['tenant_admin', 'jefe_operaciones', 'administrativo'],
  },
  {
    href: '/dashboard/cuentas-corrientes',
    label: 'Cuentas Corrientes',
    icon: Wallet,
    roles: ['tenant_admin', 'jefe_operaciones', 'administrativo'],
  },
  {
    href: '/dashboard/contratos',
    label: 'Contratos',
    icon: FileSignature,
    roles: ['tenant_admin', 'jefe_operaciones', 'administrativo'],
  },
  {
    href: '/dashboard/precios',
    label: 'Precios',
    icon: TrendingUp,
    roles: ['tenant_admin', 'jefe_operaciones', 'administrativo'],
  },
  {
    href: '/dashboard/reportes',
    label: 'Reportes',
    icon: BarChart3,
    roles: ['tenant_admin', 'jefe_operaciones', 'administrativo'],
  },
  { href: '/dashboard/administracion', label: 'Administración', icon: Receipt, disabled: true, comingSoon: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { positions } = useQueueStore();
  const { data: session } = useSession();

  const queueCount = positions.length;
  const tenantName = session?.user?.tenantName ?? 'GuayCampo';
  const userName = session?.user?.name ?? 'Usuario';
  const userRole = session?.user?.role ?? 'Operador';
  const userInitials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Filter nav items by role
  const visibleNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  });

  return (
    <aside
      className={cn(
        'relative bg-white border-r border-gray-200 flex flex-col transition-all duration-300 h-full',
        sidebarCollapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Toggle button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 z-10 w-6 h-6 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
        aria-label={sidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Brand */}
      <div className="h-16 flex items-center px-4 border-b border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-guay-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
            GC
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate text-sm">GuayCampo</p>
              <p className="text-xs text-gray-400 truncate">{tenantName}</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href);
          const badge = item.href === '/dashboard/cola' ? queueCount : undefined;

          return (
            <div key={item.href} className="relative group">
              {item.disabled ? (
                <div
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-not-allowed opacity-50',
                    'text-gray-400',
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.comingSoon && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                          Pronto
                        </span>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-guay-50 text-guay-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5 flex-shrink-0',
                      isActive ? 'text-guay-600' : 'text-gray-400',
                    )}
                  />
                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      {badge !== undefined && badge > 0 && (
                        <span className="flex-shrink-0 min-w-[1.25rem] h-5 flex items-center justify-center text-xs font-medium bg-guay-100 text-guay-700 rounded-full px-1">
                          {badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              )}

              {/* Tooltip when collapsed */}
              {sidebarCollapsed && (
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:block z-50">
                  <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    {item.label}
                    {item.comingSoon && ' (Próximamente)'}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Separator */}
      <div className="px-2 pb-2 space-y-0.5">
        {(['tenant_admin', 'jefe_operaciones'] as string[]).includes(userRole) && (
          <Link
            href="/dashboard/usuarios"
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname.startsWith('/dashboard/usuarios')
                ? 'bg-guay-50 text-guay-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
            )}
          >
            <Users className="w-5 h-5 flex-shrink-0 text-gray-400" />
            {!sidebarCollapsed && <span>Usuarios</span>}
            {sidebarCollapsed && (
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:block z-50">
                <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  Usuarios
                </div>
              </div>
            )}
          </Link>
        )}
        <Link
          href="/dashboard/configuracion"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
            pathname === '/dashboard/configuracion'
              ? 'bg-guay-50 text-guay-700 font-medium'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
          )}
        >
          <Settings className="w-5 h-5 flex-shrink-0 text-gray-400" />
          {!sidebarCollapsed && <span>Configuración</span>}
        </Link>
      </div>

      {/* User area */}
      <div className="p-3 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-guay-100 flex items-center justify-center text-guay-700 font-medium text-xs flex-shrink-0">
            {userInitials || <User className="w-4 h-4" />}
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-xs truncate">{userName}</p>
              <p className="text-gray-400 text-xs truncate capitalize">{userRole}</p>
            </div>
          )}
          {!sidebarCollapsed && (
            <button
              onClick={() => signOut({ redirectTo: '/login' })}
              className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
