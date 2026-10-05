import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'El Encanto Huamanguino · QatuPOS', description: 'Mesas, Cocina, Heladería y Caja de El Encanto Huamanguino.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
