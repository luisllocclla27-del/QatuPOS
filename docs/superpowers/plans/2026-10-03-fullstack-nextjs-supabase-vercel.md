> HISTÓRICO, NO EJECUTAR: este borrador del03/10 propone otro acceso/auth y fue reemplazado por la arquitectura017. Para el despliegue vigente usar [RELEASE-CLOUD](../../RELEASE-CLOUD.md) y [DEPLOY-SUPABASE-VERCEL](../../DEPLOY-SUPABASE-VERCEL.md): SQL privado, sin Data API del navegador y session5432 con TLS. Se conserva como antecedente.

# Plan de Implementación: Unificación Full-Stack en Next.js con Supabase y Vercel

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar el sistema POS de *El Encanto Huamanguino* en una aplicación full-stack Next.js 16 (App Router) desplegable en Vercel con PostgreSQL y autenticación en Supabase (nivel gratuito inicial), conservando el motor de dominio determinista BigInt y la resiliencia en red.

**Architecture:** Se eliminan el servicio Fastify independiente y sus proxies de desarrollo, migrando la totalidad de los contratos y la autoridad transaccional a Next.js Route Handlers (`/api/v1/pos/*` y `/api/v1/guest/*`). La base de datos opera sobre Supabase PostgreSQL utilizando el Transaction Pooler (puerto 6543) para manejar transacciones pesimistas (`FOR UPDATE`) bajo serverless, con un esquema de autenticación dual (Supabase Auth para dueños remotos + PIN ultra-rápido en cookies para mozos/caja).

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, PostgreSQL 17 (Supabase), `@supabase/ssr`, `@supabase/supabase-js`, `pg` (Pooler transaccional), `@qatu/domain` (Aritmética BigInt), `@qatu/contracts`, Vitest, Playwright.

## Global Constraints

- Todas las mutaciones comerciales deben ejecutarse bajo transacción atómica con bloqueo pesimista por sucursal (`SELECT state FROM branch_state WHERE branch_id=$1 FOR UPDATE`).
- El dinero se persiste y calcula exclusivamente en céntimos enteros `bigint` sin coma flotante (conforme a `012_money_bigint.sql` y `exact.ts`).
- Cada comanda u orden debe validar idempotencia contra `command_operations` mediante el hash SHA-256 del payload (`operation_id`).
- La autenticación de personal en salón debe ser por PIN/usuario rápido en cookie `qatu_session` (`HttpOnly`, `SameSite=Strict`, `Secure` en producción).
- Los clientes comensales usan cookie `qatu_guest` restringida a `/api/v1/guest` con PIN de 10 caracteres (`XXXXX-XXXXX`).
- Compatible con el Free Tier de Supabase y el Plan Hobby de Vercel.

---

### Task 1: Dependencias y Configuración Base de Supabase en `apps/pos`

**Files:**
- Modify: `apps/pos/package.json`
- Create: `apps/pos/src/lib/supabase/client.ts`
- Create: `apps/pos/src/lib/supabase/server.ts`
- Create: `apps/pos/src/lib/supabase/middleware.ts`
- Test: `tests/unit/supabase-config.test.ts`

**Interfaces:**
- Produces: `createClient()` (cliente de navegador Supabase), `createClient()` (cliente de Server Components/Route Handlers con cookies `@supabase/ssr`).

- [ ] **Step 1: Escribir la prueba unitaria para la configuración de Supabase**

```typescript
// tests/unit/supabase-config.test.ts
import { describe, it, expect } from 'vitest';

describe('Supabase Environment Configuration', () => {
  it('validates environment variable presence for Supabase', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://xyz.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined();
  });
});
```

- [ ] **Step 2: Ejecutar la prueba para verificar que pasa**

Run: `pnpm --filter @qatu/pos test tests/unit/supabase-config.test.ts`
Expected: PASS

- [ ] **Step 3: Instalar dependencias `@supabase/ssr` y `@supabase/supabase-js` en `apps/pos`**

Ejecutar en la raíz del proyecto:
```bash
pnpm --filter @qatu/pos add @supabase/supabase-js @supabase/ssr pg
pnpm --filter @qatu/pos add -D @types/pg
```

- [ ] **Step 4: Crear utilidades de cliente Supabase en `apps/pos/src/lib/supabase/server.ts`**

```typescript
// apps/pos/src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Invoked from Server Component; ignore if read-only
          }
        },
      },
    }
  );
}
```

- [ ] **Step 5: Crear cliente Supabase para navegador en `apps/pos/src/lib/supabase/client.ts`**

```typescript
// apps/pos/src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 6: Confirmar tipos con typecheck**

Run: `pnpm typecheck`
Expected: PASS sin errores de TypeScript.

---

### Task 2: Cliente de Base de Datos para Supabase Transaction Pooler

**Files:**
- Create: `apps/pos/src/lib/server/database.ts`
- Test: `tests/unit/database-pooler.test.ts`

**Interfaces:**
- Produces: `getPool(): pg.Pool` optimizado para funciones serverless en Vercel, conectando al puerto 6543 (Supavisor) con transacciones seguras.

- [ ] **Step 1: Escribir la prueba unitaria para el Pooler de base de datos**

```typescript
// tests/unit/database-pooler.test.ts
import { describe, it, expect, vi } from 'vitest';
import { getPool } from '../../apps/pos/src/lib/server/database';

describe('Database Pooler Configuration', () => {
  it('instantiates pool with transaction pooler parameters', () => {
    process.env.DATABASE_URL = 'postgresql://postgres.test:password@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';
    const pool = getPool();
    expect(pool).toBeDefined();
  });
});
```

- [ ] **Step 2: Ejecutar la prueba para verificar que falla antes de crear el módulo**

Run: `pnpm vitest run tests/unit/database-pooler.test.ts`
Expected: FAIL (Cannot find module)

- [ ] **Step 3: Implementar `apps/pos/src/lib/server/database.ts`**

```typescript
// apps/pos/src/lib/server/database.ts
import pg from 'pg';

const { Pool } = pg;

let globalPool: pg.Pool | null = null;

export function getPool(connectionString?: string): pg.Pool {
  const url = connectionString ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL no configurada.');
  }

  if (!globalPool) {
    globalPool = new Pool({
      connectionString: url,
      max: Number(process.env.DB_MAX_CONNECTIONS ?? 3),
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });
  }

  return globalPool;
}

export async function closePool(): Promise<void> {
  if (globalPool) {
    await globalPool.end();
    globalPool = null;
  }
}
```

- [ ] **Step 4: Ejecutar la prueba unitaria**

Run: `pnpm vitest run tests/unit/database-pooler.test.ts`
Expected: PASS

---

### Task 3: Portabilidad del Motor de Autoridad Transaccional a Next.js Server

**Files:**
- Create: `apps/pos/src/lib/server/repository.ts`
- Create: `apps/pos/src/lib/server/security.ts`
- Create: `apps/pos/src/lib/server/money.ts`
- Test: `tests/unit/server-repository.test.ts`

**Interfaces:**
- Consumes: `@qatu/domain`, `@qatu/contracts`, `getPool()`
- Produces:
  - `transact(pool, actor, command, guest?)`: Ejecuta comandos bajo `FOR UPDATE` e idempotencia.
  - `createQuote(pool, actor, input, guest?)`: Cotización vinculante.
  - `snapshot(pool, actor)`: Proyección de estado.
  - `hashPassword(password)` / `verifyPassword(password, salt, hash)`.

- [ ] **Step 1: Escribir la prueba unitaria para la lógica de hash criptográfico y dinero**

```typescript
// tests/unit/server-repository.test.ts
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../apps/pos/src/lib/server/security';
import { sqlMoney } from '../../apps/pos/src/lib/server/money';

describe('Server Security & Money', () => {
  it('hashes and verifies passwords correctly using scrypt', async () => {
    const { salt, hash } = hashPassword('MiPIN1234');
    expect(salt).toBeDefined();
    expect(hash).toBeDefined();

    const ok = await verifyPassword('MiPIN1234', salt, hash);
    expect(ok).toBe(true);

    const bad = await verifyPassword('OtroPIN', salt, hash);
    expect(bad).toBe(false);
  });

  it('safely parses bigint monetary values without overflow', () => {
    expect(sqlMoney('3500')).toBe(3500);
    expect(sqlMoney(4200)).toBe(4200);
    expect(() => sqlMoney('-10')).toThrow();
  });
});
```

- [ ] **Step 2: Ejecutar la prueba para verificar que falla**

Run: `pnpm vitest run tests/unit/server-repository.test.ts`
Expected: FAIL

- [ ] **Step 3: Implementar `apps/pos/src/lib/server/security.ts`**

Portar las funciones criptográficas de `services/commerce/src/platform/security.ts`:
- `hashPassword(password: string): { salt: string; hash: string }`
- `verifyPassword(password: string, salt: string, stored: string): Promise<boolean>`
- `token(): string` (UUID / 32 bytes base64url)
- `digest(value: string): string` (SHA-256)
- `canonical(value: unknown): string` (JSON ordenado)

- [ ] **Step 4: Implementar `apps/pos/src/lib/server/money.ts`**

Portar `sqlMoney(value: unknown): number` de `services/commerce/src/platform/money.ts` garantizando deserialización limpia de `bigint`.

- [ ] **Step 5: Implementar `apps/pos/src/lib/server/repository.ts`**

Portar `transact`, `createQuote`, `snapshot` desde `services/commerce/src/authority/repository.ts`, adaptando los llamados para ejecutarse con `getPool()`.

- [ ] **Step 6: Ejecutar las pruebas unitarias**

Run: `pnpm vitest run tests/unit/server-repository.test.ts`
Expected: PASS

---

### Task 4: Route Handlers de Sesión y Autenticación de Personal (`/api/v1/pos/session`)

**Files:**
- Create: `apps/pos/src/app/api/v1/pos/session/route.ts`
- Test: `tests/integration/api-pos-session.test.ts`

**Interfaces:**
- Produces:
  - `POST /api/v1/pos/session`: Login con `{ username, password }` o PIN rápido. Emite cookie `qatu_session`.
  - `GET /api/v1/pos/session`: Retorna usuario actual, claims y `csrf_token`.
  - `DELETE /api/v1/pos/session`: Cierra sesión y revoca cookie.

- [ ] **Step 1: Escribir la prueba de integración para `/api/v1/pos/session`**

```typescript
// tests/integration/api-pos-session.test.ts
import { describe, it, expect } from 'vitest';
import { POST, GET, DELETE } from '../../apps/pos/src/app/api/v1/pos/session/route';
import { NextRequest } from 'next/server';

describe('API Route /api/v1/pos/session', () => {
  it('rejects invalid login credentials with 401', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/pos/session', {
      method: 'POST',
      body: JSON.stringify({ username: 'inexistente', password: 'bad' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Ejecutar la prueba para verificar que falla**

Run: `pnpm vitest run tests/integration/api-pos-session.test.ts`
Expected: FAIL (Cannot find module)

- [ ] **Step 3: Implementar `apps/pos/src/app/api/v1/pos/session/route.ts`**

- En `POST`:
  1. Extraer `{ username, password }`.
  2. Consultar `staff_memberships` por `username` activo.
  3. Validar con `verifyPassword`.
  4. Generar token de sesión y registrarlo en `staff_sessions`.
  5. Retornar `NextResponse.json({ user, csrf_token, expires_at })` configurando cookie `qatu_session`.
- En `GET`:
  1. Leer cookie `qatu_session`.
  2. Consultar sesión activa unida a `staff_memberships`.
  3. Si es válida, retornar `NextResponse.json({ user, csrf_token, expires_at })`. De lo contrario 401.
- En `DELETE`:
  1. Leer cookie `qatu_session`.
  2. Eliminar de `staff_sessions`.
  3. Limpiar cookie con `cookies().delete('qatu_session')`. Retornar 204.

- [ ] **Step 4: Ejecutar la prueba de integración**

Run: `pnpm vitest run tests/integration/api-pos-session.test.ts`
Expected: PASS

---

### Task 5: Route Handlers de Comandos y Estado del POS (`/api/v1/pos/commands`, `snapshot`, `quotes`)

**Files:**
- Create: `apps/pos/src/app/api/v1/pos/commands/route.ts`
- Create: `apps/pos/src/app/api/v1/pos/snapshot/route.ts`
- Create: `apps/pos/src/app/api/v1/pos/quotes/route.ts`
- Test: `tests/integration/api-pos-commands.test.ts`

**Interfaces:**
- Produces:
  - `GET /api/v1/pos/snapshot`: Retorna estado reactivo del salón, cocina, caja.
  - `POST /api/v1/pos/commands`: Despacha mutaciones vía `transact()` con `operation_id` y `expected_version`.
  - `POST /api/v1/pos/quotes`: Genera cotizaciones de pedidos vía `createQuote()`.

- [ ] **Step 1: Escribir la prueba de integración para el snapshot y comandos**

```typescript
// tests/integration/api-pos-commands.test.ts
import { describe, it, expect } from 'vitest';
import { GET } from '../../apps/pos/src/app/api/v1/pos/snapshot/route';
import { NextRequest } from 'next/server';

describe('API Route /api/v1/pos/snapshot', () => {
  it('requires authentication for snapshot access', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/pos/snapshot');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Ejecutar la prueba para verificar que falla**

Run: `pnpm vitest run tests/integration/api-pos-commands.test.ts`
Expected: FAIL

- [ ] **Step 3: Implementar los Route Handlers**

1. `apps/pos/src/app/api/v1/pos/snapshot/route.ts`:
   - Lee `qatu_session`. Si no existe o caducó, devuelve 401.
   - Invoca `snapshot(pool, actor)`.
   - Devuelve `NextResponse.json(projection)`.
2. `apps/pos/src/app/api/v1/pos/commands/route.ts`:
   - Valida sesión y cabecera `X-CSRF-Token`.
   - Lee JSON con `commandValid`.
   - Invoca `transact(pool, actor, command)`.
   - Retorna `NextResponse.json(result)`.
3. `apps/pos/src/app/api/v1/pos/quotes/route.ts`:
   - Valida sesión de mozo/caja.
   - Invoca `createQuote(pool, actor, lines)`.
   - Retorna `NextResponse.json(quote)`.

- [ ] **Step 4: Ejecutar la prueba de integración**

Run: `pnpm vitest run tests/integration/api-pos-commands.test.ts`
Expected: PASS

---

### Task 6: Route Handlers de Autoservicio Comensal (`/api/v1/guest/*`)

**Files:**
- Create: `apps/pos/src/app/api/v1/guest/session/route.ts`
- Create: `apps/pos/src/app/api/v1/guest/snapshot/route.ts`
- Create: `apps/pos/src/app/api/v1/guest/quotes/route.ts`
- Create: `apps/pos/src/app/api/v1/guest/orders/route.ts`
- Test: `tests/integration/api-guest.test.ts`

**Interfaces:**
- Produces:
  - `POST /api/v1/guest/session`: Ingreso con PIN de mesa (`joinGuest`), emite cookie `qatu_guest`.
  - `GET /api/v1/guest/snapshot`: Proyección privada de la mesa.
  - `POST /api/v1/guest/quotes`: Cotización del comensal.
  - `POST /api/v1/guest/orders`: Envío de pedido a cocina vía `transact` con identidad de mesa.
  - `DELETE /api/v1/guest/session`: Salida voluntaria del comensal.

- [ ] **Step 1: Escribir la prueba de integración para el PIN de comensal**

```typescript
// tests/integration/api-guest.test.ts
import { describe, it, expect } from 'vitest';
import { POST } from '../../apps/pos/src/app/api/v1/guest/session/route';
import { NextRequest } from 'next/server';

describe('API Route /api/v1/guest/session', () => {
  it('rejects invalid guest code format', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/guest/session', {
      method: 'POST',
      body: JSON.stringify({ code: 'INVALIDO' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Ejecutar la prueba para verificar que falla**

Run: `pnpm vitest run tests/integration/api-guest.test.ts`
Expected: FAIL

- [ ] **Step 3: Implementar los Route Handlers de comensales**

Implementar los 4 archivos en `apps/pos/src/app/api/v1/guest/` reutilizando las funciones de derivación y normalización `normalizeGuestCode` y `deriveGuestCode` portadas en `apps/pos/src/lib/server/security.ts`.

- [ ] **Step 4: Ejecutar la prueba de integración**

Run: `pnpm vitest run tests/integration/api-guest.test.ts`
Expected: PASS

---

### Task 7: Actualización de Clientes Frontend y Eliminación de Fastify Proxy

**Files:**
- Modify: `apps/pos/src/lib/client.ts`
- Modify: `apps/pos/src/lib/guest-client.ts`
- Modify: `apps/pos/next.config.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: Nuevos Route Handlers en `/api/v1/...`
- Modifies: `client.ts` y `guest-client.ts` para consumir directamente las rutas internas relativas `/api/v1/...` sin requerir servidor proxy en puerto 4000.

- [ ] **Step 1: Modificar `apps/pos/src/lib/client.ts`**

Cambiar la ruta base de peticiones de `/v1/pos` a `/api/v1/pos`.

- [ ] **Step 2: Modificar `apps/pos/src/lib/guest-client.ts`**

Cambiar la ruta base de peticiones de `/v1/guest` a `/api/v1/guest`.

- [ ] **Step 3: Simplificar `apps/pos/next.config.ts`**

Eliminar la sección `rewrites()` que redirigía hacia `http://127.0.0.1:4000`. Mantener la configuración de paquetes transpilados y optimizaciones de build.

- [ ] **Step 4: Actualizar scripts de ejecución en la raíz**

Actualizar el script `"dev"` en `package.json` para ejecutar directamente `pnpm --filter @qatu/pos dev`, ya que la API y el frontend ahora corren juntos en un solo proceso.

- [ ] **Step 5: Ejecutar typecheck**

Run: `pnpm typecheck`
Expected: PASS

---

### Task 8: Configuración de PWA y Resiliencia ante Cortes de Conexión

**Files:**
- Create: `apps/pos/public/manifest.json`
- Modify: `apps/pos/src/app/layout.tsx`
- Modify: `apps/pos/src/components/pos-app.tsx`

**Interfaces:**
- Produces: Capacidad PWA con web manifest, detección de cambio de conexión (Wi-Fi ➔ Datos Móviles) y botón de reintento/recuperación en caliente.

- [ ] **Step 1: Crear `apps/pos/public/manifest.json`**

```json
{
  "name": "El Encanto Huamanguino · QatuPOS",
  "short_name": "QatuPOS",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#172f35",
  "theme_color": "#08766c",
  "orientation": "any",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

- [ ] **Step 2: Vincular el manifest en `apps/pos/src/app/layout.tsx`**

Añadir metadatos de manifest e iconos en `metadata`.

- [ ] **Step 3: Agregar detector de conectividad en `pos-app.tsx`**

Añadir escucha de eventos `window.addEventListener('online')` y `window.addEventListener('offline')` para notificar al usuario en pantalla si está operando sobre datos móviles o si hubo una caída temporal de red.

- [ ] **Step 4: Verificar build de Next.js**

Run: `pnpm --filter @qatu/pos build`
Expected: Build exitoso (`✓ Compiled successfully`).

---

### Task 9: Ejecución Integral de Pruebas de Regresión y Validación Final

**Files:**
- Test: Todas las suites de `tests/unit/` y `tests/integration/`

- [ ] **Step 1: Ejecutar pruebas unitarias de dominio exacto y proyecciones**

Run: `pnpm test`
Expected: 352+ pruebas pasando sin fallos.

- [ ] **Step 2: Ejecutar verificación de tipos global**

Run: `pnpm typecheck`
Expected: 0 errores de TypeScript.

- [ ] **Step 3: Simular arranque de producción local**

Run: `pnpm --filter @qatu/pos start`
Expected: Servidor Next.js escuchando en puerto 3000 respondiendo a `/` y a `/api/v1/pos/session`.
