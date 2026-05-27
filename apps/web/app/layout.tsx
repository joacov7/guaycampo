import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'GuayCampo',
    template: '%s | GuayCampo',
  },
  description: 'Sistema integral de gestión para acopiadores de granos',
  keywords: ['acopio', 'granos', 'turnos', 'balanza', 'laboratorio', 'silos'],
  authors: [{ name: 'GuayCampo' }],
  openGraph: {
    title: 'GuayCampo',
    description: 'Sistema integral de gestión para acopiadores de granos',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
