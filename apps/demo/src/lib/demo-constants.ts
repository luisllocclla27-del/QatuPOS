// apps/demo/src/lib/demo-constants.ts

export const DEMO_RESTAURANT_NAME = 'Recreo La Laguna';
export const DEMO_RESET_INTERVAL_MINUTES = 30;

export type DemoZone = 'Zona Laguna' | 'Zona Jardín' | 'Zona Techada' | 'Zona VIP';
export type DemoStation = 'cocina' | 'caja' | 'heladeria';
export type DemoTableStatus = 'free' | 'active' | 'paying' | 'alert';

export const STATUS_COLORS: Record<DemoTableStatus, string> = {
  free:    '#22c55e',
  active:  '#3b82f6',
  paying:  '#f59e0b',
  alert:   '#ef4444',
};

export interface DemoProduct {
  id: string;
  name: string;
  category: string;
  price_cents: number;  // céntimos (ej: 3800 = S/38.00)
  station: DemoStation;
  emoji: string;
}

export interface DemoTable {
  number: number;
  zone: DemoZone;
  initial_status: DemoTableStatus;
  seats: number;
}

export interface DemoStaff {
  username: string;
  name: string;
  role: 'waiter' | 'cashier' | 'kitchen' | 'admin';
  pin: string;
  station: DemoStation | null;
}

export const DEMO_PRODUCTS: DemoProduct[] = [
  // Ceviches & Tiraditos
  { id: 'cv-001', name: 'Ceviche Clásico',       category: 'Ceviches & Tiraditos', price_cents: 3800, station: 'cocina',    emoji: '🦐' },
  { id: 'cv-002', name: 'Ceviche Mixto',          category: 'Ceviches & Tiraditos', price_cents: 4500, station: 'cocina',    emoji: '🦐' },
  { id: 'cv-003', name: 'Leche de Tigre',         category: 'Ceviches & Tiraditos', price_cents: 2200, station: 'cocina',    emoji: '🥃' },
  { id: 'cv-004', name: 'Tiradito Nikkei',        category: 'Ceviches & Tiraditos', price_cents: 4200, station: 'cocina',    emoji: '🐟' },
  { id: 'cv-005', name: 'Ceviche de Conchas',     category: 'Ceviches & Tiraditos', price_cents: 4800, station: 'cocina',    emoji: '🦪' },
  // Parrillas
  { id: 'pr-001', name: 'Anticuchos x3',          category: 'Parrillas',            price_cents: 2500, station: 'cocina',    emoji: '🍖' },
  { id: 'pr-002', name: 'Parrilla Mixta',         category: 'Parrillas',            price_cents: 8900, station: 'cocina',    emoji: '🥩' },
  { id: 'pr-003', name: 'Costillar BBQ',          category: 'Parrillas',            price_cents: 7500, station: 'cocina',    emoji: '🥩' },
  { id: 'pr-004', name: 'Chuletas a la Parrilla', category: 'Parrillas',            price_cents: 6200, station: 'cocina',    emoji: '🍖' },
  // Arroces & Guisos
  { id: 'ar-001', name: 'Causa Rellena',          category: 'Arroces & Guisos',     price_cents: 1800, station: 'cocina',    emoji: '🥘' },
  { id: 'ar-002', name: 'Seco de Res',            category: 'Arroces & Guisos',     price_cents: 3200, station: 'cocina',    emoji: '🥘' },
  { id: 'ar-003', name: 'Arroz con Leche',        category: 'Arroces & Guisos',     price_cents: 1200, station: 'cocina',    emoji: '🍚' },
  { id: 'ar-004', name: 'Lomo Saltado',           category: 'Arroces & Guisos',     price_cents: 3800, station: 'cocina',    emoji: '🥩' },
  { id: 'ar-005', name: 'Ají de Gallina',         category: 'Arroces & Guisos',     price_cents: 3000, station: 'cocina',    emoji: '🍗' },
  { id: 'ar-006', name: 'Tacu Tacu con Lomo',     category: 'Arroces & Guisos',     price_cents: 4200, station: 'cocina',    emoji: '🥘' },
  // Bebidas
  { id: 'be-001', name: 'Inca Kola 500ml',        category: 'Bebidas',              price_cents:  700, station: 'caja',      emoji: '🥤' },
  { id: 'be-002', name: 'Cerveza Cristal 620ml',  category: 'Bebidas',              price_cents:  900, station: 'caja',      emoji: '🍺' },
  { id: 'be-003', name: 'Cerveza Pilsen 620ml',   category: 'Bebidas',              price_cents:  900, station: 'caja',      emoji: '🍺' },
  { id: 'be-004', name: 'Chicha Morada 1L',       category: 'Bebidas',              price_cents: 1200, station: 'caja',      emoji: '🫙' },
  { id: 'be-005', name: 'Agua San Luis 625ml',    category: 'Bebidas',              price_cents:  400, station: 'caja',      emoji: '💧' },
  { id: 'be-006', name: 'Gaseosa 1.5L',           category: 'Bebidas',              price_cents: 1000, station: 'caja',      emoji: '🥤' },
  { id: 'be-007', name: 'Limonada Frozen',        category: 'Bebidas',              price_cents: 1400, station: 'caja',      emoji: '🍋' },
  // Postres
  { id: 'po-001', name: 'Picarones x6',           category: 'Postres',              price_cents: 1400, station: 'heladeria', emoji: '🍩' },
  { id: 'po-002', name: 'Mazamorra Morada',       category: 'Postres',              price_cents: 1000, station: 'heladeria', emoji: '🍮' },
  { id: 'po-003', name: 'Crema Volteada',         category: 'Postres',              price_cents: 1200, station: 'heladeria', emoji: '🍮' },
  { id: 'po-004', name: 'Suspiro a la Limeña',    category: 'Postres',              price_cents: 1300, station: 'heladeria', emoji: '🍮' },
  { id: 'po-005', name: 'Helado de Lúcuma',       category: 'Postres',              price_cents: 1100, station: 'heladeria', emoji: '🍨' },
  { id: 'po-006', name: 'Tres Leches',            category: 'Postres',              price_cents: 1500, station: 'heladeria', emoji: '🍰' },
];

export const DEMO_TABLES: DemoTable[] = [
  // Zona Laguna — 12 mesas
  ...Array.from({ length: 12 }, (_, i) => ({
    number: i + 1,
    zone: 'Zona Laguna' as DemoZone,
    initial_status: ([
      'active','active','active','active','active','active',
      'paying','paying','paying','free','free','free',
    ][i]) as DemoTableStatus,
    seats: 6,
  })),
  // Zona Jardín — 10 mesas
  ...Array.from({ length: 10 }, (_, i) => ({
    number: i + 13,
    zone: 'Zona Jardín' as DemoZone,
    initial_status: (['active','active','active','alert','alert','free','free','free','free','free'][i]) as DemoTableStatus,
    seats: 8,
  })),
  // Zona Techada — 10 mesas
  ...Array.from({ length: 10 }, (_, i) => ({
    number: i + 23,
    zone: 'Zona Techada' as DemoZone,
    initial_status: (['active','active','free','free','free','free','free','free','free','free'][i]) as DemoTableStatus,
    seats: 4,
  })),
  // Zona VIP — 8 mesas
  ...Array.from({ length: 8 }, (_, i) => ({
    number: i + 33,
    zone: 'Zona VIP' as DemoZone,
    initial_status: (['active','free','free','free','free','free','free','free'][i]) as DemoTableStatus,
    seats: 10,
  })),
];

export const DEMO_STAFF: DemoStaff[] = [
  { username: 'carlos',    name: 'Carlos Quispe',   role: 'waiter',   pin: '1234', station: null },
  { username: 'ana',       name: 'Ana Flores',      role: 'cashier',  pin: '5678', station: 'caja' },
  { username: 'chef.pepe', name: 'José Mamani',     role: 'kitchen',  pin: '9012', station: 'cocina' },
  { username: 'admin',     name: 'Administrador',   role: 'admin',    pin: '0000', station: null },
];

/** Formatea céntimos a string de display: 3800 → "S/ 38.00" */
export function formatMoney(cents: number): string {
  return `S/ ${(cents / 100).toFixed(2)}`;
}

/** Genera un PIN demo aleatorio con formato XXXXX-XXXXX */
export function generateDemoPin(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part(5)}-${part(5)}`;
}

