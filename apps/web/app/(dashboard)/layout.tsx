import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Dashboard',
};

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: 'grid' },
  { href: '/dashboard/shifts', label: 'Turnos', icon: 'calendar' },
  { href: '/dashboard/queue', label: 'Cola', icon: 'list-ordered' },
  { href: '/dashboard/scale', label: 'Balanza', icon: 'scale' },
  { href: '/dashboard/lab', label: 'Laboratorio', icon: 'flask-conical' },
  { href: '/dashboard/silos', label: 'Silos', icon: 'database' },
  { href: '/dashboard/clients', label: 'Clientes', icon: 'users' },
  { href: '/dashboard/reports', label: 'Reportes', icon: 'bar-chart-2' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-guay-600 text-white flex items-center justify-center text-sm font-bold">
              GC
            </div>
            <span className="font-semibold text-gray-900">GuayCampo</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <span className="w-5 h-5 text-gray-400">{/* icon placeholder */}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User area */}
        <div className="p-3 border-t border-gray-200">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <div className="w-8 h-8 rounded-full bg-guay-100 flex items-center justify-center text-guay-700 font-medium text-xs">
              U
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-900 text-xs">Usuario</p>
              <p className="text-gray-400 text-xs">Operador</p>
            </div>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 gap-4">
          <h1 className="text-sm font-medium text-gray-500 flex-1">
            {/* Page title injected by child pages */}
          </h1>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              En línea
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
