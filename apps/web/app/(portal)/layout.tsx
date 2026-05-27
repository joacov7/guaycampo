import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { PortalHeader } from '@/components/portal/portal-header';
import { PortalNav } from '@/components/portal/portal-nav';
import type { AuthUser } from '@/types';

export const metadata: Metadata = {
  title: 'Portal del Productor | GuayCampo',
};

const OPERATIVE_ROLES = [
  'tenant_admin',
  'jefe_operaciones',
  'operador_balanza',
  'laboratorista',
  'administrativo',
];

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // Si es un rol operativo, mandarlo al dashboard operativo
  if (OPERATIVE_ROLES.includes(session.user.role)) {
    redirect('/dashboard');
  }

  const user = session.user as AuthUser;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PortalHeader user={user} />
      <PortalNav />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 sm:py-8">
        {children}
      </main>
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <p className="text-xs text-gray-400 text-center">
            ¿Necesitás ayuda? Llamanos al{' '}
            <a href="tel:+5493415000000" className="text-guay-600 hover:underline font-medium">
              0341 500-0000
            </a>{' '}
            &mdash; Lunes a viernes de 7:00 a 18:00 hs
          </p>
        </div>
      </footer>
    </div>
  );
}
