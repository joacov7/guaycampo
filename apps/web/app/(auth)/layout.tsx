import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Acceso',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-guay-50 to-guay-100 p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
