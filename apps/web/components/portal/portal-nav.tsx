'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CalendarDays, FileText, DollarSign, Warehouse, ClipboardList, Wallet, FileSignature, TrendingUp, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/portal', label: 'Inicio', icon: Home },
  { href: '/portal/mis-turnos', label: 'Mis Turnos', icon: CalendarDays },
  { href: '/portal/mis-tickets', label: 'Mis Tickets', icon: FileText },
  { href: '/portal/mis-cpes', label: 'Mis CPEs', icon: ClipboardList },
  { href: '/portal/mis-liquidaciones', label: 'Liquidaciones', icon: DollarSign },
  { href: '/portal/mi-stock', label: 'Mi Stock', icon: Warehouse },
  { href: '/portal/mi-cuenta', label: 'Mi Cuenta', icon: Wallet },
  { href: '/portal/mis-contratos', label: 'Mis Contratos', icon: FileSignature },
  { href: '/portal/precios', label: 'Precios', icon: TrendingUp },
  { href: '/portal/mis-certificados', label: 'Certificados', icon: Award },
];

export function PortalNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/portal'
                ? pathname === '/portal'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0',
                  isActive
                    ? 'border-guay-600 text-guay-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300',
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:block">{item.label}</span>
                <span className="sm:hidden text-xs">{item.label.split(' ').pop()}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
