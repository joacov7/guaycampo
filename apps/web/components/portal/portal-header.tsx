'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { LogOut, User } from 'lucide-react';
import type { AuthUser } from '@/types';

interface PortalHeaderProps {
  user: AuthUser;
}

export function PortalHeader({ user }: PortalHeaderProps) {
  const initials = (user.name ?? '')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/portal" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-guay-600 text-white flex items-center justify-center text-sm font-bold">
            GC
          </div>
          <span className="font-semibold text-gray-900 text-sm hidden sm:block">
            GuayCampo
          </span>
        </Link>

        {/* User + logout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-guay-100 flex items-center justify-center text-guay-700 font-medium text-xs flex-shrink-0">
              {initials || <User className="w-4 h-4" />}
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-xs font-medium text-gray-900 leading-tight">{user.name}</p>
              <p className="text-xs text-gray-400 leading-tight">{user.tenantName}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ redirectTo: '/login' })}
            className="text-gray-400 hover:text-red-500 transition-colors p-1"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
