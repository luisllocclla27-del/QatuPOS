# 🍽️ QatuPOS Demo Pitch — Recreo Campestre "La Laguna"

> Aplicación web interactiva de demostración y pitch de **QatuPOS** diseñada para restaurantes campestres y de alta concurrencia en Huamanga, Ayacucho y todo el Perú.
> 
> **URL Demo en vivo:** [https://demo.qatupos.pe](https://demo.qatupos.pe)

---

## 🎯 Objetivo de la Demostración

Demostrar en vivo ante comensales, dueños de restaurantes, evaluadores e inversionistas la potencia de QatuPOS para resolver los cuellos de botella reales en restaurantes campestres:
- **Salón saturado (40 mesas)** distribuidas en 4 zonas abiertas.
- **Pedidos concurrentes desde celulares de comensales** mediante código QR/PIN sin descargas.
- **KDS de Cocina en tiempo real** sincronizado en menos de 3 segundos sin demoras de mozos.
- **Dashboard Ejecutivo dual** con analítica operativa para el dueño y tracción de mercado para inversionistas.
- **Resiliencia operativa**: reinicio automático cada 30 minutos sin intervención manual.

---

## 🏗️ Arquitectura y Tecnologías

La aplicación demo está construida como un workspace moderno dentro del monorepo QatuPOS:

- **Frontend & Server**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack, React 19).
- **Estilos & Animaciones**: [Tailwind CSS](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/) para transiciones fluidas de mesas y comandas, e iconos de [Lucide React](https://lucide.dev/).
- **Visualización de Datos**: [Recharts](https://recharts.org/) para el gráfico interactivo de ventas por hora.
- **Persistencia & Sincronización Realtime**:
  - [Supabase](https://supabase.com/) (PostgreSQL + Supabase Realtime).
  - Canales de broadcast para eventos instantáneos: `demo-salon`, `demo-kds`, `demo-cliente`.
  - Tabla `branch_state` que almacena el agregado completo del restaurante.
- **Contratos & Dominio Compartidos**:
  - `@qatu/contracts`: Tipado canónico de órdenes, visitas, mesas, productos y personal.
  - `@qatu/domain`: Reglas de negocio e invariantes de estado.
- **Automatización**: Vercel Cron Jobs para reinicio programado cada 30 minutos (`/api/demo/reset`).

---

## 📱 Roles y Vistas Interactivas

La aplicación contiene 4 experiencias coordinadas e hiper-realistas:

### 1. Portada Principal (`/`)
- **Mapa interactivo visual** de las 40 mesas del Recreo "La Laguna", coloreadas por su estado en tiempo real (🟢 Libre, 🔵 Ocupada, 🟡 Por cobrar, 🔴 Alerta).
- **Lanzador rápido de roles** con un solo clic: Salón, Comensal Móvil, Cocina KDS y Dashboard.
- **Credenciales y perfiles de demostración** visibles para el presentador.
- **Banner de reinicio automático** con contador regresivo en vivo.

### 2. Salón & Mozos (`/salon`)
- **40 mesas organizadas por zonas**:
  - *Salón Principal* (Mesas 1 a 16)
  - *Terraza* (Mesas 17 a 28)
  - *Jardín* (Mesas 29 a 36)
  - *Zona VIP* (Mesas 37 a 40)
- **Panel lateral detallado** al seleccionar cualquier mesa:
  - Estado del pedido, mozo responsable y comensales.
  - Generador de **PIN de acceso** temporal de 4 dígitos para vincular con el comensal.
  - Acciones rápidas: Emitir Pre-cuenta, Confirmar Pago y Liberar Mesa.
- Sincronización bidireccional instantánea ante pedidos entrantes de comensales o confirmaciones de cocina.

### 3. Comensal Móvil (`/cliente`)
- **Experiencia móvil optimizada** (en desktop incluye marco telefónico interactivo; en celulares ocupa pantalla completa).
- **Validación por PIN**: el comensal ingresa el PIN proporcionado por el mozo para abrir su mesa.
- **Carta regional auténtica** con platillos ayacuchanos y campestres:
  - *Platos Criollos*: Pachamanca 3 Carnes, Cuy Chactado, Puca Picante con Chicharrón, Chicharrón Huamanguino.
  - *Pescados*: Trucha Frita de Quinua, Ceviche de Trucha Serrana.
  - *Bebidas*: Jarra de Chicha de Jora, Chicha Morada, Cervezas artesanales.
  - *Postres*: Muyuchi Tradicional, Mazamorra de Calabaza.
- **Carrito interactivo** con desglose de impuestos (Subtotal, IGV 18%, Total).
- **Seguimiento en vivo del pedido**:
  - `Recibido ➔ Preparando ➔ Listo en mesa`.

### 4. Cocina KDS (`/cocina`)
- **Kitchen Display System** con tickets en tiempo real.
- **Urgencia visual por temporizador**:
  - 🟢 Verde (< 15 min transcurridos)
  - 🟡 Ámbar (15 a 25 min transcurridos)
  - 🔴 Rojo (> 25 min transcurridos)
- **Badge identificador `📱 QR`** para comandas originadas directamente por clientes desde sus teléfonos.
- **Transición de estados por ítem y ticket**: `Preparando` y `✓ Listo`.
- **Notificación sonora configurable** (Web Audio API) al llegar un nuevo pedido.
- **Cajón de comandas completadas** para auditoría y recuperación inmediata.

### 5. Dashboard Ejecutivo (`/dashboard`)
Panel interactivo con interruptor de modo dual:
- **Modo Dueño**:
  - KPIs en tiempo real: Ventas del día (S/), Total de Pedidos, Ticket Promedio, Comandas en Preparación.
  - Gráfico animado de ventas por hora.
  - Mini mapa de distribución de salón.
  - Ticker de alertas operativas inteligentes (mesas demoradas, platos de alta demanda).
- **Modo Inversor**:
  - Métricas de oportunidad de mercado: TAM gastronómico en Ayacucho y provincias.
  - Ventajas competitivas clave: resiliencia offline-first, emisión de boletas/facturas integrada, costo de hardware accesible.
  - Modelo de negocio SaaS y unit economics proyectados.
  - Botón de llamado a la acción (CTA) directo para contactar al equipo fundador.

---

## 🔄 Sistema de Reset Automático

Para garantizar que la demo siempre esté limpia y disponible para presentaciones:

1. **Endpoint de Reset (`POST /api/demo/reset`)**:
   - Sobrescribe el estado en Supabase con `INITIAL_DEMO_STATE`.
   - Autenticado mediante `Bearer ${CRON_SECRET}` para llamadas externas.
2. **Vercel Cron Job**:
   - Configurado en `vercel.json` con la expresión cron `*/30 * * * *` (cada 30 minutos).
3. **Componente `<ResetBanner />`**:
   - Presente en el encabezado de todas las páginas de la demo.
   - Muestra el tiempo restante antes del próximo reinicio programado.

---

## ⚙️ Variables de Entorno

Copiar el archivo de plantilla y configurar los valores correspondientes:

```bash
cp apps/demo/.env.example apps/demo/.env.local
```

### Detalle de Variables

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase dedicado para la demo |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública anónima de Supabase |
| `DEMO_TENANT_ID` | UUID del tenant de la demo (ej. `00000000-0000-4000-8000-000000000001`) |
| `DEMO_BRANCH_ID` | UUID de la sucursal de la demo (ej. `00000000-0000-4000-8000-000000000002`) |
| `CRON_SECRET` | Secreto aleatorio de 32+ caracteres para validar el Vercel Cron |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1` para habilitar pnpm en entornos de Vercel |

---

## 🚀 Puesta en Marcha Local

### Prerrequisitos
- Node.js >= 24
- pnpm 12.5.1 (gestionado vía Corepack)

```bash
# 1. Instalar dependencias en el monorepo
corepack pnpm install --frozen-lockfile

# 2. Iniciar servidor de desarrollo de la demo (puerto 3001)
pnpm --filter @qatu/demo dev

# 3. Compilar para producción
pnpm --filter @qatu/demo build

# 4. Ejecutar pruebas unitarias de la demo
pnpm vitest run tests/unit/demo
```

Abrir [http://127.0.0.1:3001](http://127.0.0.1:3001) en el navegador.

---

## 🗄️ Base de Datos y Seed en Supabase

1. Crear un proyecto en [database.new](https://database.new) llamado `qatupos-demo`.
2. Aplicar las migraciones del directorio `database/migrations/` en el SQL Editor de Supabase.
3. Habilitar **Supabase Realtime** para la tabla `branch_state`.
4. Ejecutar el script de seed para poblar "La Laguna":

```bash
# Opción A: Conexión directa a PostgreSQL
DATABASE_URL="postgres://postgres:[PASSWORD]@[HOST]:5432/postgres" pnpm seed:demo

# Opción B: Vía REST API de Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT].supabase.co" SUPABASE_SERVICE_ROLE_KEY="[KEY]" pnpm seed:demo
```

---

## ☁️ Despliegue en Vercel

### Opción A: Despliegue desde Root Directory `apps/demo` (Recomendado)

1. En el dashboard de Vercel, importar el repositorio `luisllocclla27-del/QatuPOS`.
2. Configurar **Root Directory**: `apps/demo`.
3. Activar la opción: **"Include source files outside of Root Directory"** (necesario para `packages/contracts` y `packages/domain`).
4. Configurar las variables de entorno detalladas en `.env.example`.
5. Vercel detectará automáticamente `apps/demo/vercel.json` con el cron `*/30 * * * *`.

### Opción B: Despliegue desde la Raíz del Monorepo

El archivo raíz `vercel.json` ya está configurado para compilar `@qatu/demo` y registrar el cron job automáticamente:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "installCommand": "corepack pnpm install --frozen-lockfile",
  "buildCommand": "corepack pnpm --filter @qatu/demo build",
  "outputDirectory": "apps/demo/.next",
  "crons": [
    {
      "path": "/api/demo/reset",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

---

## 🧪 Verificación del Despliegue

Una vez desplegado en `https://demo.qatupos.pe`:

1. Visitar `/` y verificar que las 40 mesas carguen con sus estados iniciales.
2. Abrir `/salon` en una ventana y `/cocina` en otra.
3. Desde `/salon`, seleccionar una mesa libre (ej. Mesa 12), presionar **Abrir Mesa** y obtener el **PIN**.
4. En el celular o en ventana de incógnito, abrir `/cliente`, ingresar a la Mesa 12 con el PIN, agregar una *Pachamanca 3 Carnes* y presionar **Enviar Pedido**.
5. Verificar que en `/cocina` aparezca inmediatamente la comanda con la insignia `📱 QR`.
6. En `/cocina`, marcar **Preparando** y luego **✓ Listo**.
7. Verificar que en `/cliente` el estado cambie automáticamente a **Listo en mesa**.
8. Revisar en Vercel → **Deployments** → **Functions** → **Cron Jobs** que `/api/demo/reset` esté programado cada 30 minutos.
