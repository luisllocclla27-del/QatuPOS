# QatuPOS Demo de Pitch — Especificación de Diseño

**Fecha:** 2026-10-06  
**Estado:** Aprobado por el equipo — pendiente de plan de implementación  
**Repositorio:** `luisllocclla27-del/QatuPOS` (monorepo existente)  
**URL de despliegue:** `https://demo.qatupos.pe`

---

## 1. Objetivo

Construir una demo interactiva de pitch para QatuPOS desplegada en `demo.qatupos.pe`, dirigida simultáneamente a **dueños de recreos campestres/restaurantes grandes** y a **inversores**. La demo usa datos precargados del recreo ficticio "Recreo La Laguna" (40 mesas), se auto-resetea cada 30 minutos y reutiliza el motor de dominio real (`@qatu/domain`, `@qatu/contracts`) para que los pedidos QR sean transacciones reales — no simulaciones.

El diferenciador central: el visitante escanea un QR con su celular, hace un pedido, y ese pedido aparece en el KDS de cocina en pantalla en menos de 2 segundos.

---

## 2. Alcance Explícito

### Incluye
- Nueva aplicación `apps/demo` en el monorepo existente
- 5 pantallas interactivas: Landing, Salón, Cliente QR (móvil), KDS Cocina, Dashboard
- Supabase dedicado para la demo (independiente de producción)
- Auto-reset cada 30 minutos vía Vercel Cron
- Tiempo real vía Supabase Realtime (pedidos QR → KDS sin recargar)
- Datos precargados del "Recreo La Laguna": 40 mesas, 28 productos, 5 categorías
- Estado inicial siempre vivo: 12 mesas activas, 3 comandas en cocina, 5 mesas por cobrar

### Excluye
- Integración con SUNAT, Izipay o cualquier hardware real
- Comprobantes fiscales (toda la fiscalía está en modo `[DEMO]` no operativo)
- Modificación del código de `apps/pos` ni de `packages/domain` ni `packages/contracts`
- Sistema de usuarios/registro (la demo es pública, sin login)
- Modo offline / PWA (la demo requiere conexión — es un pitch en vivo)

---

## 3. Arquitectura

### 3.1 Estructura en el Monorepo

```
el-encanto-huamanguino/
├── packages/
│   ├── contracts/          ← Sin cambios
│   └── domain/             ← Sin cambios
├── apps/
│   ├── pos/                ← Sin cambios
│   └── demo/               ← NUEVO
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx                    ← Landing Hero
│       │   │   ├── salon/page.tsx               ← Vista del Salón
│       │   │   ├── cliente/page.tsx             ← App QR del Comensal
│       │   │   ├── cocina/page.tsx              ← KDS Cocina
│       │   │   ├── dashboard/page.tsx           ← Dashboard Dueño/Inversor
│       │   │   └── api/
│       │   │       ├── demo/reset/route.ts      ← Endpoint de reset
│       │   │       ├── v1/pos/[...path]/route.ts← Proxy al motor de dominio
│       │   │       └── v1/guest/[...path]/route.ts
│       │   ├── components/
│       │   │   ├── salon-map.tsx                ← Mapa interactivo 40 mesas
│       │   │   ├── table-card.tsx               ← Card de mesa individual
│       │   │   ├── kds-card.tsx                 ← Card de comanda en cocina
│       │   │   ├── guest-app.tsx                ← App completa del comensal
│       │   │   ├── dashboard-owner.tsx          ← Vista del dueño
│       │   │   ├── dashboard-investor.tsx       ← Vista del inversor
│       │   │   ├── reset-banner.tsx             ← Banner de countdown pre-reset
│       │   │   └── demo-badge.tsx               ← Badge [DEMO] en capacidades
│       │   └── lib/
│       │       ├── demo-supabase.ts             ← Cliente Supabase de demo
│       │       ├── demo-seed.ts                 ← Estado inicial "La Laguna"
│       │       └── demo-constants.ts            ← Carta, mesas, zonas
│       ├── package.json
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       └── vercel.json
└── scripts/
    └── demo/
        └── reset.ts                             ← Script de reset programático
```

### 3.2 Stack Tecnológico de `apps/demo`

| Capa | Tecnología | Versión | Justificación |
|:---|:---|:---|:---|
| Framework | Next.js | 16.x | Mismo que `apps/pos` — coherencia |
| UI Base | Tailwind CSS | 3.x | Diseño SaaS rápido y consistente |
| Componentes | Shadcn/ui | latest | Componentes accesibles listos |
| Animaciones | Framer Motion | 11.x | Transiciones del flujo QR |
| Gráficos | Recharts | 2.x | Dashboard de métricas animadas |
| Iconos | Lucide React | 1.x | Ya presente en el monorepo |
| Lógica Core | `@qatu/domain` + `@qatu/contracts` | workspace | 100% real, sin simulación |
| Base de datos | Supabase (proyecto dedicado demo) | — | Independiente de producción |
| Tiempo real | Supabase Realtime | — | Pedidos QR → KDS < 2 segundos |
| Cron Reset | Vercel Cron Jobs | — | `vercel.json` → cada 30 min |

### 3.3 Supabase de Demo vs. Producción

```
┌─────────────────────────┐     ┌─────────────────────────┐
│  Supabase DEMO          │     │  Supabase PRODUCCIÓN     │
│  Proyecto dedicado      │     │  El Encanto Huamanguino  │
│  Datos: La Laguna       │     │  Datos reales            │
│  Reset: cada 30 min     │     │  Sin reset               │
│  Credenciales demo      │     │  Credenciales privadas   │
│  QATU_ENV=demo          │     │  QATU_ENV=production     │
└─────────────────────────┘     └─────────────────────────┘
         ↑ COMPLETAMENTE SEPARADOS — sin conexión entre sí
```

---

## 4. Las 5 Pantallas

### 4.1 Landing Hero (`/`)

**Propósito:** Primera impresión. Impactar en 5 segundos. Redirigir al rol correcto.

**Elementos:**
- Fondo: mapa SVG animado del recreo con mesas de colores según estado (Framer Motion)
- Headline: *"El recreo que se gestiona solo"*
- Subheadline: *"Pedidos desde el celular del comensal. Cocina actualizada en 2 segundos. Control total para el dueño."*
- 3 botones de entrada por rol:
  - 🧑‍💼 **Ver como Dueño** → `/dashboard`
  - 👨‍🏫 **Ver como Mozo** → `/salon`
  - 🍽️ **Ver como Cliente** → `/cliente`
- Contador de reset visible: *"Demo se reinicia en 18:42"*
- Footer discreto: *"Demo interactiva — datos ficticios, pedidos reales dentro de la sesión"*

### 4.2 Salón — Vista del Mozo (`/salon`)

**Propósito:** El dueño ve control total. El mozo ve su área de trabajo. Ambos ven los pedidos QR llegando.

**Elementos:**
- Header: nombre del recreo, turno activo, hora del servidor
- **Mapa interactivo de 40 mesas** en cuadrícula por zonas:
  - 🟢 Verde: libre
  - 🔵 Azul: activa con comensales
  - 🟡 Amarillo: esperando pago
  - 🔴 Rojo: alerta (mucho tiempo sin atención)
- Al hacer clic en una mesa activa: panel lateral con pedidos, estado, mozo asignado
- Botón **"Activar QR de Mesa"** (en mesa activa): genera y muestra el PIN `XXXXX-XXXXX`
- Barra lateral derecha: resumen del turno (ventas, mesas activas, comandas pendientes)
- Toast animado cuando llega un pedido QR: *"🔔 Mesa 12 — nuevo pedido del comensal"*
- Supabase Realtime: el estado de las mesas se actualiza sin recargar

**Datos precargados:** 12 mesas azules activas, 5 amarillas, 3 rojas con alert de tiempo.

### 4.3 Cliente QR — App del Comensal (`/cliente`)

**Propósito:** El visitante usa su propio celular. Hace un pedido real. Ve el efecto en cocina.

**6 estados con transiciones Framer Motion:**

1. **Bienvenida sin PIN**: Carta visible, pedido bloqueado. *"Pide la clave al mozo."*
2. **Ingreso de PIN**: Input `XXXXX-XXXXX`, validación en tiempo real.
3. **Carta activa**: Categorías con scroll, cards de productos con foto/precio, carrito flotante.
4. **Cotización**: Resumen de ítems, total exacto en S/, countdown de 2 minutos de vigencia.
5. **Pedido enviado**: Confirmación animada. Lista de ítems con estado `Pendiente`.
6. **Tracking en vivo**: Estado de cada ítem actualizado por Supabase Realtime.

**Nota de demo**: Banner discreto en la parte superior durante toda la sesión: *"Demo interactiva — tu pedido es real en esta sesión."*

### 4.4 KDS Cocina (`/cocina`)

**Propósito:** El cocinero (o el visitante mirando la segunda pantalla) ve las comandas llegar en tiempo real.

**Elementos:**
- Layout horizontal optimizado para TV/monitor grande
- Cards de comandas ordenadas por: urgente → tiempo de espera → secuencia
- Cada card muestra: mesa, zona, tiempo transcurrido, lista de ítems con cantidades, origen (`Mozo` o `QR`)
- Cuando llega el pedido QR del visitante: la card entra con animación desde la derecha (Framer Motion `slide-in`)
- Botones por card: `[Preparando]` → `[Listo]`
- Ítems marcados como listos se tachan con animación
- Badge especial en comandas de origen QR: `📱 Comensal`
- Counter de tiempo: verde (<10 min), amarillo (10-15 min), rojo (>15 min)
- Supabase Realtime: sin polling, actualización inmediata

### 4.5 Dashboard Dueño/Inversor (`/dashboard`)

**Propósito:** Convencer al dueño de que tiene control total. Convencer al inversor de que el producto escala.

**Toggle en esquina superior derecha:** `[👨‍💼 Dueño]` | `[📈 Inversor]`

**Modo Dueño:**
- 4 KPIs en tiempo real: Ventas del día (S/), Pedidos totales, Ticket promedio (S/), Comandas activas
- Mapa de mesas miniatura con estados (mismo color que `/salon`)
- Desglose de caja: Efectivo / Yape / Tarjeta con montos
- Gráfico de barras Recharts: Ventas por hora del día (animado al cargar)
- Alertas inteligentes: ticker horizontal con mesas sin atención, stock bajo, pagos confirmados
- Tabla de las 5 mesas más rentables del turno

**Modo Inversor:**
- 3 métricas de producto: "0 pedidos duplicados" / "<2 seg QR→Cocina" / "500 mesas soportadas"
- Panel de diferenciadores vs. competencia (6 puntos, cada uno con ícono ✅)
- Mercado objetivo: ~8,000 recreos en Perú, ticket promedio S/350/mes
- CTA: `[Contactar equipo QatuPOS →]` (abre modal con email/WhatsApp)

---

## 5. Datos Precargados: "Recreo La Laguna"

### 5.1 Carta (28 productos)

| Categoría | Producto | Precio (S/) | Estación |
|:---|:---|---:|:---|
| Ceviches & Tiraditos | Ceviche Clásico | 38.00 | Cocina |
| Ceviches & Tiraditos | Ceviche Mixto | 45.00 | Cocina |
| Ceviches & Tiraditos | Leche de Tigre | 22.00 | Cocina |
| Ceviches & Tiraditos | Tiradito Nikkei | 42.00 | Cocina |
| Ceviches & Tiraditos | Ceviche de Conchas | 48.00 | Cocina |
| Parrillas | Anticuchos x3 | 25.00 | Cocina |
| Parrillas | Parrilla Mixta | 89.00 | Cocina |
| Parrillas | Costillar BBQ | 75.00 | Cocina |
| Parrillas | Chuletas a la Parrilla | 62.00 | Cocina |
| Arroces & Guisos | Causa Rellena | 18.00 | Cocina |
| Arroces & Guisos | Seco de Res | 32.00 | Cocina |
| Arroces & Guisos | Arroz con Leche | 12.00 | Cocina |
| Arroces & Guisos | Lomo Saltado | 38.00 | Cocina |
| Arroces & Guisos | Ají de Gallina | 30.00 | Cocina |
| Arroces & Guisos | Tacu Tacu con Lomo | 42.00 | Cocina |
| Bebidas | Inca Kola 500ml | 7.00 | Caja |
| Bebidas | Cerveza Cristal 620ml | 9.00 | Caja |
| Bebidas | Cerveza Pilsen 620ml | 9.00 | Caja |
| Bebidas | Chicha Morada 1L | 12.00 | Caja |
| Bebidas | Agua San Luis 625ml | 4.00 | Caja |
| Bebidas | Gaseosa 1.5L | 10.00 | Caja |
| Bebidas | Limonada Frozen | 14.00 | Caja |
| Postres | Picarones x6 | 14.00 | Heladería |
| Postres | Mazamorra Morada | 10.00 | Heladería |
| Postres | Crema Volteada | 12.00 | Heladería |
| Postres | Suspiro a la Limeña | 13.00 | Heladería |
| Postres | Helado de Lúcuma | 11.00 | Heladería |
| Postres | Tres Leches | 15.00 | Heladería |

### 5.2 Distribución de 40 Mesas

| Zona | Mesas | Estado inicial |
|:---|:---|:---|
| Zona Laguna | 1–12 | 6 activas, 3 por cobrar, 3 libres |
| Zona Jardín | 13–22 | 3 activas, 2 alerta, 5 libres |
| Zona Techada | 23–32 | 2 activas, 8 libres |
| Zona VIP | 33–40 | 1 activa, 7 libres |

### 5.3 Personal de Demo

| Username | Rol | PIN |
|:---|:---|:---|
| `carlos` | Mozo | `1234` |
| `ana` | Cajera | `5678` |
| `chef.pepe` | Cocina | `9012` |
| `admin` | Administrador | `0000` |

*(Credenciales visibles en la landing para que el visitante pueda explorar cada rol)*

---

## 6. Auto-Reset cada 30 Minutos

### 6.1 Mecanismo

- **Vercel Cron** configurado en `apps/demo/vercel.json`:
  ```json
  {
    "crons": [{ "path": "/api/demo/reset", "schedule": "*/30 * * * *" }]
  }
  ```
- El endpoint `POST /api/demo/reset` ejecuta una transacción que restaura `branch_state` al snapshot inicial precalculado (constante en `demo-seed.ts`).
- Las sesiones de comensales activas reciben un evento Supabase Realtime `DEMO_RESET` y muestran: *"La demo fue reiniciada. ¡Gracias por explorar QatuPOS!"*
- El reset completa en < 2 segundos.

### 6.2 Countdown Visible

- Componente `<ResetBanner />` en todas las pantallas muestra: *"Demo se reinicia en MM:SS"*
- Al llegar a 1 minuto: banner en amarillo con aviso.
- Al llegar a 0: transición animada de toda la pantalla → *"Reiniciando demo..."* → pantalla fresca.

---

## 7. Seguridad y Restricciones del Entorno Demo

| Restricción | Implementación |
|:---|:---|
| `QATU_ENV=demo` | Bloquea SUNAT, Izipay, hardware real |
| Sin comprobantes fiscales reales | Badge `[DEMO]` en toda acción fiscal |
| Sin acceso al Supabase de producción | Variables de entorno separadas |
| Credenciales visibles intencionalmente | Solo aplican al Supabase demo |
| Sin datos personales reales | Todos los datos son ficticios |
| Reset automático | Limpia cualquier dato sensible accidental |

---

## 8. Despliegue

### 8.1 Variables de Entorno en Vercel (proyecto `demo`)

| Variable | Valor |
|:---|:---|
| `QATU_ENV` | `demo` |
| `QATU_DEPLOYMENT` | `vercel` |
| `QATU_PUBLIC_ORIGIN` | `https://demo.qatupos.pe` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase demo |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key del proyecto Supabase demo |
| `DATABASE_URL` | Conexión runtime del Supabase demo |
| `QATU_GUEST_CODE_KEY_BASE64` | Clave estable para PINs de mesa de demo |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1` |

### 8.2 Configuración de Vercel

- Root Directory: `apps/demo`
- Habilitar: *"Include source files outside of Root Directory"*
- Node.js: 22.x o 24.x
- Framework: Next.js (auto-detectado)

---

## 9. Criterios de Éxito

1. Un visitante sin instrucciones puede llegar a la landing, escanear el QR de mesa y ver su pedido en el KDS en menos de 90 segundos.
2. El dashboard del inversor muestra datos actualizados en tiempo real sin recargar la página.
3. El auto-reset ocurre exactamente cada 30 minutos sin interrumpir a visitantes en sesiones activas (muestran aviso suave).
4. La demo es pública, sin login, accesible desde cualquier dispositivo con navegador.
5. Ninguna acción en la demo afecta el Supabase de producción de El Encanto Huamanguino.
