# QatuPOS Demo de Pitch — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir y desplegar `apps/demo` — la demo interactiva de pitch de QatuPOS en `demo.qatupos.pe` — con el "Recreo La Laguna" de 40 mesas, flujo QR real, KDS en tiempo real vía Supabase Realtime y auto-reset cada 30 minutos.

**Architecture:** Nuevo workspace Next.js 16 `apps/demo` dentro del monorepo existente. Importa `@qatu/domain` y `@qatu/contracts` directamente. UI nueva con Tailwind CSS + Shadcn/ui + Framer Motion. Backend vía Route Handlers de Next.js que usan el motor de dominio real conectado a un Supabase dedicado exclusivamente para demo. Vercel Cron Job ejecuta el reset cada 30 minutos.

**Tech Stack:** Next.js 16 (App Router), Tailwind CSS 3, Shadcn/ui, Framer Motion 11, Recharts 2, Lucide React, `@supabase/ssr`, `@supabase/supabase-js`, `@qatu/domain`, `@qatu/contracts`, pnpm workspace, Vercel Cron, Supabase Realtime.

## Global Constraints

- El workspace `apps/demo` NO modifica `apps/pos`, `packages/domain`, `packages/contracts` ni `services/commerce`.
- `QATU_ENV=demo` — modo que bloquea SUNAT, Izipay y hardware real. Toda capacidad simulada lleva badge `[DEMO]`.
- El Supabase de la demo es completamente independiente del de producción (credenciales y proyecto separados).
- El dinero se muestra siempre en S/ con 2 decimales, calculado desde céntimos BigInt vía `@qatu/domain`.
- Supabase Realtime para actualizaciones en vivo (KDS y tracking de estado del comensal) — sin polling.
- Reset completo en menos de 2 segundos. El countdown es visible en todas las pantallas.
- Node.js 24.x, pnpm 12.5.1, TypeScript 6.x — mismas versiones que el monorepo.

---

### Task 1: Scaffolding de `apps/demo` y Configuración del Workspace

**Files:**
- Create: `apps/demo/package.json`
- Create: `apps/demo/tsconfig.json`
- Create: `apps/demo/next.config.ts`
- Create: `apps/demo/tailwind.config.ts`
- Create: `apps/demo/postcss.config.mjs`
- Create: `apps/demo/vercel.json`
- Create: `apps/demo/src/app/layout.tsx`
- Create: `apps/demo/src/app/globals.css`

**Interfaces:**
- Produces: Workspace `@qatu/demo` montado en pnpm, compilable con `pnpm --filter @qatu/demo build`.

- [ ] **Step 1: Crear `apps/demo/package.json`**

```json
{
  "name": "@qatu/demo",
  "version": "0.1.0",
  "private": true,
  "engines": { "node": "24.x" },
  "scripts": {
    "dev": "next dev --hostname 127.0.0.1 --port 3001",
    "build": "next build",
    "start": "next start --hostname 127.0.0.1 --port 3001"
  },
  "dependencies": {
    "@qatu/contracts": "workspace:*",
    "@qatu/domain": "workspace:*",
    "@supabase/supabase-js": "^2.49.0",
    "@supabase/ssr": "^0.6.1",
    "framer-motion": "^11.0.0",
    "lucide-react": "1.49.0",
    "next": "16.3.8",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "recharts": "^2.15.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0"
  },
  "devDependencies": {
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.5.0",
    "tailwindcss": "^3.4.0",
    "typescript": "6.0.3"
  }
}
```

- [ ] **Step 2: Crear `apps/demo/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Crear `apps/demo/next.config.ts`**

```typescript
import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ['@qatu/contracts', '@qatu/domain'],
  webpack(config) {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
  outputFileTracingRoot: path.resolve(process.cwd(), '../..'),
};

export default nextConfig;
```

- [ ] **Step 4: Crear `apps/demo/tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0fdf9',
          100: '#ccfbef',
          500: '#0ea47a',
          600: '#0d9268',
          700: '#0b7a58',
          900: '#064e38',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 5: Crear `apps/demo/postcss.config.mjs`**

```javascript
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
export default config;
```

- [ ] **Step 6: Crear `apps/demo/vercel.json`**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "installCommand": "corepack pnpm install --frozen-lockfile",
  "buildCommand": "corepack pnpm build",
  "crons": [
    {
      "path": "/api/demo/reset",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

- [ ] **Step 7: Crear `apps/demo/src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

:root {
  --background: #f8fafc;
  --foreground: #0f172a;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: 'Inter', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 8: Crear `apps/demo/src/app/layout.tsx`**

```typescript
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'QatuPOS — Demo interactiva para recreos y restaurantes',
  description: 'Gestión de mesas, pedidos QR y control de caja. Demo en vivo del Recreo La Laguna.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 9: Instalar dependencias del workspace `@qatu/demo`**

```bash
pnpm --filter @qatu/demo install
```

- [ ] **Step 10: Verificar que el workspace compila**

```bash
pnpm --filter @qatu/demo build
```
Expected: Next.js compila sin errores de TypeScript.

---

### Task 2: Constantes, Carta y Datos del Recreo La Laguna

**Files:**
- Create: `apps/demo/src/lib/demo-constants.ts`
- Create: `apps/demo/src/lib/demo-seed.ts`

**Interfaces:**
- Produces:
  - `DEMO_PRODUCTS: Product[]` — 28 platos con id, nombre, precio en céntimos, categoría, estación
  - `DEMO_TABLES: TableConfig[]` — 40 mesas con zona y estado inicial
  - `DEMO_STAFF: StaffConfig[]` — 4 personas con usuario, PIN y rol
  - `INITIAL_BRANCH_STATE: BranchState` — snapshot inicial completo para el reset

- [ ] **Step 1: Crear `apps/demo/src/lib/demo-constants.ts`**

```typescript
// apps/demo/src/lib/demo-constants.ts

export const DEMO_RESTAURANT_NAME = 'Recreo La Laguna';
export const DEMO_RESET_INTERVAL_MINUTES = 30;

export type DemoZone = 'Zona Laguna' | 'Zona Jardín' | 'Zona Techada' | 'Zona VIP';
export type DemoStation = 'cocina' | 'caja' | 'heladeria';
export type DemoTableStatus = 'free' | 'active' | 'paying' | 'alert';

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
```

- [ ] **Step 2: Verificar tipos TypeScript**

```bash
pnpm --filter @qatu/demo exec tsc --noEmit
```
Expected: Sin errores.

---

### Task 3: Cliente de Supabase y Utilidades del Servidor

**Files:**
- Create: `apps/demo/src/lib/supabase-browser.ts`
- Create: `apps/demo/src/lib/supabase-server.ts`
- Create: `apps/demo/src/lib/demo-db.ts`

**Interfaces:**
- Produces:
  - `createBrowserClient()` — cliente Supabase para componentes client-side y Realtime
  - `createServerClient()` — cliente Supabase para Route Handlers y Server Components
  - `getDemoState()` — lee el `branch_state` JSONB de la demo desde la DB
  - `resetDemoState(state)` — sobreescribe el `branch_state` con el snapshot inicial

- [ ] **Step 1: Crear `apps/demo/src/lib/supabase-browser.ts`**

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createDemoBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 2: Crear `apps/demo/src/lib/supabase-server.ts`**

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createDemoServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { /* Server Component read-only */ }
        },
      },
    }
  );
}
```

- [ ] **Step 3: Crear `apps/demo/src/lib/demo-db.ts`**

```typescript
import { createDemoServerClient } from './supabase-server';

const DEMO_BRANCH_ID = process.env.DEMO_BRANCH_ID!;
const DEMO_TENANT_ID = process.env.DEMO_TENANT_ID!;

export async function getDemoState() {
  const supabase = await createDemoServerClient();
  const { data, error } = await supabase
    .from('branch_state')
    .select('state, version')
    .eq('tenant_id', DEMO_TENANT_ID)
    .eq('branch_id', DEMO_BRANCH_ID)
    .single();

  if (error) throw new Error(`Error leyendo estado demo: ${error.message}`);
  return { state: data.state, version: data.version as number };
}

export async function resetDemoState(initialState: object): Promise<void> {
  const supabase = await createDemoServerClient();
  const { error } = await supabase
    .from('branch_state')
    .update({ state: initialState, version: 1, updated_at: new Date().toISOString() })
    .eq('tenant_id', DEMO_TENANT_ID)
    .eq('branch_id', DEMO_BRANCH_ID);

  if (error) throw new Error(`Error reseteando demo: ${error.message}`);
}
```

---

### Task 4: Endpoint de Reset Automático y Countdown

**Files:**
- Create: `apps/demo/src/app/api/demo/reset/route.ts`
- Create: `apps/demo/src/components/reset-banner.tsx`

**Interfaces:**
- Produces:
  - `POST /api/demo/reset` — ejecutado por Vercel Cron cada 30 min
  - `<ResetBanner />` — countdown visible en todas las pantallas

- [ ] **Step 1: Crear `apps/demo/src/app/api/demo/reset/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { resetDemoState } from '@/lib/demo-db';
import { INITIAL_DEMO_STATE } from '@/lib/demo-seed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Vercel Cron envía Authorization header con CRON_SECRET
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    await resetDemoState(INITIAL_DEMO_STATE);
    return NextResponse.json({ ok: true, reset_at: new Date().toISOString() });
  } catch (err) {
    console.error('Error en reset de demo:', err);
    return NextResponse.json({ error: 'Reset fallido' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Crear `apps/demo/src/components/reset-banner.tsx`**

```typescript
'use client';

import { useEffect, useState } from 'react';

const RESET_INTERVAL_MS = 30 * 60 * 1000; // 30 minutos

function getNextReset(): Date {
  const now = Date.now();
  const interval = RESET_INTERVAL_MS;
  return new Date(Math.ceil(now / interval) * interval);
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function ResetBanner() {
  const [msLeft, setMsLeft] = useState<number>(0);

  useEffect(() => {
    function tick() {
      setMsLeft(getNextReset().getTime() - Date.now());
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const isWarning = msLeft < 60_000;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
      isWarning
        ? 'bg-amber-100 text-amber-800'
        : 'bg-slate-100 text-slate-600'
    }`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      Demo se reinicia en {formatCountdown(msLeft)}
    </div>
  );
}
```

---

### Task 5: Landing Hero (`/`)

**Files:**
- Create: `apps/demo/src/app/page.tsx`
- Create: `apps/demo/src/components/hero-map.tsx`

**Interfaces:**
- Consumes: `DEMO_TABLES`, `DEMO_STAFF`, `<ResetBanner />`
- Produces: Página landing con mapa SVG animado, 3 botones de rol, credenciales visibles

- [ ] **Step 1: Crear `apps/demo/src/components/hero-map.tsx`**

```typescript
'use client';

import { motion } from 'framer-motion';
import { DEMO_TABLES, type DemoTableStatus } from '@/lib/demo-constants';

const STATUS_COLORS: Record<DemoTableStatus, string> = {
  free:    '#22c55e',
  active:  '#3b82f6',
  paying:  '#f59e0b',
  alert:   '#ef4444',
};

export function HeroMap() {
  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="grid grid-cols-8 gap-2 p-6 bg-white/60 backdrop-blur rounded-2xl shadow-xl border border-white">
        {DEMO_TABLES.map((table, i) => (
          <motion.div
            key={table.number}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.02, type: 'spring', stiffness: 300 }}
            className="flex flex-col items-center gap-0.5"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow"
              style={{ backgroundColor: STATUS_COLORS[table.initial_status] }}
            >
              {table.number}
            </div>
          </motion.div>
        ))}
      </div>
      {/* Leyenda */}
      <div className="flex gap-4 justify-center mt-4 text-xs text-slate-600">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
            <span className="capitalize">{
              status === 'free' ? 'Libre' :
              status === 'active' ? 'Activa' :
              status === 'paying' ? 'Por cobrar' : 'Alerta'
            }</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Crear `apps/demo/src/app/page.tsx`**

```typescript
import Link from 'next/link';
import { HeroMap } from '@/components/hero-map';
import { ResetBanner } from '@/components/reset-banner';
import { DEMO_STAFF } from '@/lib/demo-constants';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 text-white">
      <div className="max-w-5xl mx-auto px-6 py-16 flex flex-col items-center gap-12">

        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-2xl">🌊</div>
            <span className="font-bold text-xl">QatuPOS</span>
          </div>
          <ResetBanner />
        </div>

        {/* Headline */}
        <div className="text-center max-w-2xl">
          <h1 className="text-5xl font-extrabold leading-tight mb-4">
            El recreo que<br />se gestiona solo
          </h1>
          <p className="text-xl text-brand-100 leading-relaxed">
            Pedidos desde el celular del comensal.<br />
            Cocina actualizada en 2 segundos.<br />
            Control total para el dueño.
          </p>
        </div>

        {/* Mapa del recreo */}
        <HeroMap />

        {/* Botones de rol */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
          <Link href="/dashboard" className="group flex flex-col items-center gap-3 p-6 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/20 transition-all">
            <span className="text-4xl">🧑‍💼</span>
            <div className="text-center">
              <div className="font-semibold">Soy el Dueño</div>
              <div className="text-sm text-brand-100">Dashboard y control</div>
            </div>
          </Link>
          <Link href="/salon" className="group flex flex-col items-center gap-3 p-6 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/20 transition-all">
            <span className="text-4xl">👨‍🏫</span>
            <div className="text-center">
              <div className="font-semibold">Soy el Mozo</div>
              <div className="text-sm text-brand-100">Gestión de mesas y QR</div>
            </div>
          </Link>
          <Link href="/cliente" className="group flex flex-col items-center gap-3 p-6 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/20 transition-all">
            <span className="text-4xl">🍽️</span>
            <div className="text-center">
              <div className="font-semibold">Soy el Cliente</div>
              <div className="text-sm text-brand-100">Pide desde tu celular</div>
            </div>
          </Link>
        </div>

        {/* Credenciales visibles para la demo */}
        <div className="bg-white/10 rounded-2xl border border-white/20 p-6 w-full max-w-2xl">
          <p className="text-sm font-semibold text-brand-100 mb-3">Credenciales de demo (usa cualquiera):</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {DEMO_STAFF.map((s) => (
              <div key={s.username} className="bg-white/10 rounded-xl p-3 text-center">
                <div className="text-xs text-brand-200 capitalize">{s.role === 'waiter' ? 'Mozo' : s.role === 'cashier' ? 'Cajera' : s.role === 'kitchen' ? 'Cocina' : 'Admin'}</div>
                <div className="font-mono font-bold text-sm">{s.username}</div>
                <div className="font-mono text-brand-200 text-xs">PIN: {s.pin}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-brand-200 text-center">
          Demo interactiva — datos ficticios del Recreo La Laguna. Los pedidos QR son transacciones reales dentro de esta sesión.
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verificar que la landing compila y se ve correctamente**

```bash
pnpm --filter @qatu/demo dev
```
Abrir `http://localhost:3001` y verificar: mapa de 40 mesas con colores, 3 botones de rol, credenciales visibles, countdown de reset.

---

### Task 6: Vista del Salón con Mapa Interactivo y Flujo QR del Mozo (`/salon`)

**Files:**
- Create: `apps/demo/src/app/salon/page.tsx`
- Create: `apps/demo/src/components/salon-map.tsx`
- Create: `apps/demo/src/components/table-panel.tsx`

**Interfaces:**
- Consumes: `DEMO_TABLES`, Supabase Realtime para actualizaciones de mesas en vivo
- Produces:
  - Mapa interactivo de 40 mesas con click para ver detalle
  - Panel lateral con órdenes de la mesa seleccionada
  - Botón "Activar QR de Mesa" que genera y muestra el PIN `XXXXX-XXXXX`
  - Toast animado cuando llega pedido QR de comensal

- [ ] **Step 1: Crear `apps/demo/src/components/salon-map.tsx`**

Componente `'use client'` que:
1. Suscribe a Supabase Realtime canal `demo-tables` para recibir cambios de estado.
2. Renderiza las 40 mesas en cuadrícula por zonas con colores de `STATUS_COLORS`.
3. Al hacer click en una mesa `active` o `paying`, emite `onSelectTable(tableNumber)`.
4. Usa `motion.div` de Framer Motion para el efecto de pulso cuando llega un nuevo pedido QR.

```typescript
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DEMO_TABLES, type DemoTableStatus, STATUS_COLORS } from '@/lib/demo-constants';
import { createDemoBrowserClient } from '@/lib/supabase-browser';

interface TableState {
  number: number;
  status: DemoTableStatus;
  hasNewOrder: boolean;
}

export function SalonMap({ onSelectTable }: { onSelectTable: (n: number) => void }) {
  const [tables, setTables] = useState<TableState[]>(
    DEMO_TABLES.map(t => ({ number: t.number, status: t.initial_status, hasNewOrder: false }))
  );

  useEffect(() => {
    const supabase = createDemoBrowserClient();

    const channel = supabase
      .channel('demo-tables')
      .on('broadcast', { event: 'table-update' }, (payload) => {
        const { table_number, status, new_order } = payload.payload as {
          table_number: number;
          status: DemoTableStatus;
          new_order: boolean;
        };
        setTables(prev => prev.map(t =>
          t.number === table_number
            ? { ...t, status, hasNewOrder: new_order }
            : t
        ));
        if (new_order) {
          setTimeout(() => {
            setTables(prev => prev.map(t =>
              t.number === table_number ? { ...t, hasNewOrder: false } : t
            ));
          }, 3000);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const zones = ['Zona Laguna', 'Zona Jardín', 'Zona Techada', 'Zona VIP'] as const;

  return (
    <div className="space-y-6">
      {zones.map(zone => (
        <div key={zone}>
          <h3 className="text-sm font-semibold text-slate-500 mb-2">{zone}</h3>
          <div className="flex flex-wrap gap-2">
            {tables
              .filter(t => DEMO_TABLES.find(d => d.number === t.number)?.zone === zone)
              .map(table => (
                <motion.button
                  key={table.number}
                  animate={table.hasNewOrder ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.4 }}
                  onClick={() => onSelectTable(table.number)}
                  className="relative w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow transition-transform hover:scale-105"
                  style={{ backgroundColor: STATUS_COLORS[table.status] }}
                >
                  {table.number}
                  {table.hasNewOrder && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-white animate-bounce" />
                  )}
                </motion.button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Crear `apps/demo/src/app/salon/page.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SalonMap } from '@/components/salon-map';
import { ResetBanner } from '@/components/reset-banner';
import Link from 'next/link';

export default function SalonPage() {
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);

  function generateDemoPin(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const part = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${part(5)}-${part(5)}`;
  }

  function handleActivateQR() {
    setPin(generateDemoPin());
    setShowPinModal(true);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-slate-400 hover:text-slate-600 text-sm">← Volver</Link>
          <h1 className="font-bold text-slate-800">🌊 Recreo La Laguna — Salón</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-500">Mozo: <span className="font-semibold text-slate-700">Carlos Quispe</span></div>
          <ResetBanner />
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Mapa principal */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="mb-4 flex gap-3 text-xs text-slate-500">
            {[
              { color: '#22c55e', label: 'Libre (20)' },
              { color: '#3b82f6', label: 'Activa (12)' },
              { color: '#f59e0b', label: 'Por cobrar (5)' },
              { color: '#ef4444', label: 'Alerta (3)' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                {label}
              </div>
            ))}
          </div>
          <SalonMap onSelectTable={setSelectedTable} />
        </div>

        {/* Panel lateral de mesa seleccionada */}
        <AnimatePresence>
          {selectedTable && (
            <motion.aside
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              className="w-80 bg-white border-l border-slate-200 p-6 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-800">Mesa {selectedTable}</h2>
                <button onClick={() => setSelectedTable(null)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>
              <div className="text-sm text-slate-500">Zona Laguna · 4 comensales</div>

              <button
                onClick={handleActivateQR}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors"
              >
                📱 Activar QR y mostrar clave
              </button>

              <div className="text-xs text-slate-400 text-center">
                El comensal necesita esta clave para poder ordenar desde su celular
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Modal del PIN */}
      <AnimatePresence>
        {showPinModal && pin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowPinModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl"
            >
              <div className="text-4xl mb-4">🔑</div>
              <h3 className="font-bold text-xl text-slate-800 mb-2">Clave de Mesa {selectedTable}</h3>
              <p className="text-slate-500 text-sm mb-6">Entrégala verbalmente al comensal</p>
              <div className="bg-slate-100 rounded-xl py-4 px-6 font-mono text-3xl font-bold text-slate-800 tracking-widest mb-6">
                {pin}
              </div>
              <p className="text-xs text-slate-400 mb-4">El cliente la ingresa en <strong>demo.qatupos.pe/cliente</strong></p>
              <button
                onClick={() => setShowPinModal(false)}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors"
              >
                Listo
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

---

### Task 7: App del Comensal QR (`/cliente`)

**Files:**
- Create: `apps/demo/src/app/cliente/page.tsx`
- Create: `apps/demo/src/components/guest-app-demo.tsx`

**Interfaces:**
- Produces: App móvil del comensal con 6 estados (bienvenida, PIN, carta, cotización, confirmado, tracking).
- Consumes: `DEMO_PRODUCTS`, `DEMO_TABLES`, Supabase Realtime para tracking de estado de ítems.

- [ ] **Step 1: Crear `apps/demo/src/components/guest-app-demo.tsx`**

Componente `'use client'` con máquina de estados:

```typescript
type GuestPhase = 'welcome' | 'pin' | 'menu' | 'quote' | 'confirmed' | 'tracking';

interface CartItem {
  product_id: string;
  quantity: number;
}

interface OrderItem {
  name: string;
  quantity: number;
  status: 'pending' | 'preparing' | 'ready' | 'delivered';
  emoji: string;
}
```

Estados y transiciones:
1. `welcome` → muestra carta en modo lectura, botón "Ingresar clave del mozo"
2. `pin` → input de 10 chars `XXXXX-XXXXX`, al validar cualquier formato correcto → `menu`
3. `menu` → carta con categorías scrollables, carrito flotante, botón "Ver resumen"
4. `quote` → resumen, countdown de 2 min, botón "Confirmar pedido"
5. `confirmed` → animación de éxito, lista de ítems en estado `pending`
6. `tracking` → Supabase Realtime actualiza estado de cada ítem en tiempo real

- [ ] **Step 2: Crear `apps/demo/src/app/cliente/page.tsx`**

```typescript
import { GuestAppDemo } from '@/components/guest-app-demo';

export default function ClientePage() {
  return <GuestAppDemo />;
}
```

---

### Task 8: KDS Cocina en Tiempo Real (`/cocina`)

**Files:**
- Create: `apps/demo/src/app/cocina/page.tsx`
- Create: `apps/demo/src/components/kds-card.tsx`

**Interfaces:**
- Produces: Display de cocina horizontal optimizado para TV, comandas en tiempo real vía Supabase Realtime, animación de entrada al llegar pedido QR.

- [ ] **Step 1: Crear `apps/demo/src/components/kds-card.tsx`**

```typescript
'use client';

import { motion } from 'framer-motion';

export interface KdsOrder {
  id: string;
  table_number: number;
  zone: string;
  created_at: string;
  source: 'staff' | 'guest';
  items: { name: string; quantity: number; status: 'pending' | 'preparing' | 'ready'; emoji: string }[];
}

function elapsedMinutes(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

export function KdsCard({
  order,
  onPreparing,
  onReady,
}: {
  order: KdsOrder;
  onPreparing: (id: string) => void;
  onReady: (id: string) => void;
}) {
  const elapsed = elapsedMinutes(order.created_at);
  const urgency = elapsed >= 15 ? 'red' : elapsed >= 10 ? 'amber' : 'green';

  return (
    <motion.div
      layout
      initial={{ x: 120, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -120, opacity: 0 }}
      className="bg-white rounded-2xl shadow-lg border border-slate-200 p-5 flex flex-col gap-4 min-w-64 max-w-72"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="font-bold text-slate-800">Mesa {order.table_number}</div>
          <div className="text-xs text-slate-400">{order.zone}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className={`text-sm font-bold ${urgency === 'red' ? 'text-red-500' : urgency === 'amber' ? 'text-amber-500' : 'text-green-500'}`}>
            {elapsed} min
          </div>
          {order.source === 'guest' && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">📱 QR</span>
          )}
        </div>
      </div>

      {/* Ítems */}
      <div className="space-y-2">
        {order.items.map((item, i) => (
          <div key={i} className={`flex items-center gap-2 text-sm ${item.status === 'ready' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
            <span>{item.emoji}</span>
            <span className="flex-1">{item.name}</span>
            <span className="font-semibold">×{item.quantity}</span>
          </div>
        ))}
      </div>

      {/* Acciones */}
      <div className="flex gap-2">
        <button
          onClick={() => onPreparing(order.id)}
          className="flex-1 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-semibold rounded-lg transition-colors"
        >
          Preparando
        </button>
        <button
          onClick={() => onReady(order.id)}
          className="flex-1 py-2 bg-green-100 hover:bg-green-200 text-green-800 text-sm font-semibold rounded-lg transition-colors"
        >
          ✓ Listo
        </button>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Crear `apps/demo/src/app/cocina/page.tsx`**

Componente `'use client'` que:
1. Carga comandas iniciales desde Supabase.
2. Suscribe a canal Realtime `demo-kds` para recibir nuevas comandas.
3. Al llegar comando QR: anima la nueva card desde la derecha con `slide-in`.
4. Botones "Preparando" y "Listo" actualizan estado en Supabase y emiten Realtime al `/cliente`.

---

### Task 9: Dashboard del Dueño e Inversor (`/dashboard`)

**Files:**
- Create: `apps/demo/src/app/dashboard/page.tsx`
- Create: `apps/demo/src/components/dashboard-owner.tsx`
- Create: `apps/demo/src/components/dashboard-investor.tsx`
- Create: `apps/demo/src/components/kpi-card.tsx`
- Create: `apps/demo/src/components/sales-chart.tsx`

**Interfaces:**
- Produces:
  - Toggle entre modo Dueño y modo Inversor
  - KPIs en tiempo real: ventas del día, pedidos, ticket promedio, comandas activas
  - Gráfico de barras animado de ventas por hora (Recharts)
  - Mapa miniatura de mesas
  - Ticker de alertas inteligentes
  - Panel de diferenciadores para inversores con CTA de contacto

- [ ] **Step 1: Crear `apps/demo/src/components/kpi-card.tsx`**

```typescript
interface KpiCardProps {
  label: string;
  value: string;
  sublabel?: string;
  emoji: string;
  trend?: 'up' | 'down' | 'neutral';
}

export function KpiCard({ label, value, sublabel, emoji, trend }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{emoji}</span>
        {trend === 'up' && <span className="text-xs text-green-600 font-semibold">↑ +12%</span>}
      </div>
      <div className="text-2xl font-extrabold text-slate-800">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
      {sublabel && <div className="text-xs text-slate-400">{sublabel}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Crear `apps/demo/src/components/sales-chart.tsx`**

```typescript
'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const DEMO_SALES_DATA = [
  { hour: '10am', sales: 340 }, { hour: '11am', sales: 580 },
  { hour: '12pm', sales: 920 }, { hour: '1pm',  sales: 1200 },
  { hour: '2pm',  sales: 1450 }, { hour: '3pm',  sales: 980 },
  { hour: '4pm',  sales: 780 }, { hour: '5pm',  sales: 620 },
  { hour: '6pm',  sales: 480 }, { hour: '7pm',  sales: 230 },
];

export function SalesChart() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <h3 className="font-semibold text-slate-700 mb-4">Ventas por hora (S/)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={DEMO_SALES_DATA}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v) => [`S/ ${v}`, 'Ventas']} />
          <Bar dataKey="sales" fill="#0ea47a" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Crear `apps/demo/src/app/dashboard/page.tsx`**

Toggle entre modo Dueño (4 KPIs + mapa mini + gráfico + alertas) y modo Inversor (métricas del producto + diferenciadores + CTA).

---

### Task 10: Build, Variables de Entorno y Despliegue en Vercel

**Files:**
- Create: `apps/demo/.env.example`

**Interfaces:**
- Produces: Deploy funcional en `demo.qatupos.pe` con Vercel Cron activo.

- [ ] **Step 1: Crear `apps/demo/.env.example`**

```bash
# Supabase del proyecto DEMO (nunca el de producción)
NEXT_PUBLIC_SUPABASE_URL=https://XXXXXXXXXXXXXXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# UUIDs del tenant y branch de la demo en Supabase
DEMO_TENANT_ID=uuid-tenant-demo
DEMO_BRANCH_ID=uuid-branch-demo

# Secret para autenticar el Vercel Cron Job
CRON_SECRET=un-secreto-largo-aleatorio-aqui

# Vercel
ENABLE_EXPERIMENTAL_COREPACK=1
```

- [ ] **Step 2: Crear proyecto en Supabase dedicado para demo**

1. Ir a [database.new](https://database.new) y crear proyecto `qatupos-demo`.
2. Ejecutar las 12 migraciones del directorio `database/migrations/` en el SQL Editor.
3. Ejecutar el seed de demo (script a crear en `scripts/demo/seed.ts`) para poblar "La Laguna".
4. Copiar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DEMO_TENANT_ID`, `DEMO_BRANCH_ID`.

- [ ] **Step 3: Importar `apps/demo` en Vercel**

1. En Vercel, importar el repositorio `luisllocclla27-del/QatuPOS`.
2. Root Directory: `apps/demo`.
3. Activar: "Include source files outside of Root Directory".
4. Cargar todas las variables de `apps/demo/.env.example` con valores reales.
5. Agregar `CRON_SECRET` (cadena aleatoria de 32+ caracteres).

- [ ] **Step 4: Verificar el despliegue**

1. Abrir `https://demo.qatupos.pe` — debe mostrar el landing con el mapa de 40 mesas.
2. Abrir `/salon` — debe mostrar las mesas en colores correctos.
3. Abrir `/cliente` desde un celular — debe mostrar la bienvenida con la carta.
4. Activar una mesa en `/salon`, obtener el PIN, ingresarlo en `/cliente`, agregar un plato y confirmar.
5. Verificar que en `/cocina` aparece la comanda del comensal en menos de 3 segundos.
6. Verificar que el cron de reset aparece en Vercel → Deployments → Functions → Cron Jobs.

- [ ] **Step 5: Commit final y push**

```bash
git add apps/demo
git commit -m "feat: add QatuPOS demo pitch app — Recreo La Laguna"
git push origin main
```
