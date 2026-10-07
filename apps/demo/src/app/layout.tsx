import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'QatuPOS – Demo interactiva para recreos y restaurantes',
  description: 'Gestión de mesas, pedidos QR y control de caja. Demo en vivo del Recreo La Laguna.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
