import type { Metadata } from 'next';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { MobileNav } from '@/components/layout/mobile-nav';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex h-full">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header bar */}
        <header className="flex-shrink-0 bg-white border-b border-gray-200">
          <div className="flex items-center h-14 px-4">
            {/* Mobile: hamburger + logo */}
            <div className="lg:hidden flex items-center gap-2 mr-auto">
              <MobileNav />
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-guay-600 text-white flex items-center justify-center text-xs font-bold">
                  GC
                </div>
                <span className="font-semibold text-gray-900 text-sm">GuayCampo</span>
              </div>
            </div>

            {/* Desktop: topbar fills the rest */}
            <div className="hidden lg:flex flex-1">
              <Topbar />
            </div>

            {/* Mobile: right side actions only */}
            <div className="lg:hidden">
              <Topbar />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
