# Especificación de Diseño: Unificación Full-Stack en Next.js con Supabase y Vercel

- **Proyecto**: El Encanto Huamanguino (QatuPOS)
- **Fecha**: 2026-10-03
- **Estado**: Propuesta de Diseño (Ready for Review)
- **Autor / Arquitectura**: Antigravity & Equipo de Ingeniería

---

## 1. Resumen Ejecutivo y Objetivos

El objetivo de esta fase de desarrollo final es transformar la arquitectura del sistema POS de *El Encanto Huamanguino* desde su prototipo de procesos locales independientes (Fastify en loopback + Next.js en puerto separado + PostgreSQL embebido en disco) hacia una **aplicación unificada full-stack en Next.js (App Router)** alojada en **Vercel** y respaldada por **Supabase** (PostgreSQL y Auth).

### Metas Principales:
1. **Unificación de Código**: Eliminar el servidor independiente Fastify (`services/commerce`) migrando todos los endpoints de negocio a **Next.js Route Handlers** (`apps/pos/src/app/api/...`), compartiendo directamente los contratos (`@qatu/contracts`) y el motor de dominio (`@qatu/domain`).
2. **Nivel Gratuito Inicial y Escalabilidad**: Diseñado para operar 100% dentro de los límites gratuitos de **Vercel Hobby** y **Supabase Free Tier** (500 MB Postgres, pooling transaccional Supavisor, 50,000 MAU).
3. **Autenticación Híbrida**:
   - **Administradores y Dueños**: Supabase Auth (Email + Contraseña / OAuth) para acceso remoto a métricas y configuraciones desde cualquier red externa.
   - **Personal de Salón (Mozos, Cajeros, Cocina)**: Acceso ultrarrápido en el POS táctil mediante **Usuario / PIN numérico (4 a 6 dígitos)** y sesiones seguras en cookies `HttpOnly`.
   - **Comensales (Mesa)**: PIN temporal de mesa (`XXXXX-XXXXX`) asociado a la atención activa vía autoservicio QR en `/cliente`.
4. **Alta Resiliencia en Salón (Failover 4G / Wi-Fi)**: Operación tolerante a caídas de red o cortes de Wi-Fi mediante conmutación a datos móviles/hotspot, con cero riesgo de comandas duplicadas gracias a la clave de idempotencia (`operation_id`).
5. **Preservación de Invariantes Críticos**: Mantener la integridad de dinero exacto en céntimos `bigint`, bloqueo pesimista por sucursal (`FOR UPDATE`) y libro de auditoría/outbox.

---

## 2. Arquitectura General del Sistema

```mermaid
flowchart TD
    subgraph Dispositivos["Dispositivos del Restaurante & Remotos"]
        T["Tablets de Mozos (Touch)"]
        K["Pantalla KDS Cocina/Bar"]
        PC["PC / Tablet de Caja"]
        C["Celulares Clientes (QR Mesa)"]
        D["Dueño / Administración (Remoto)"]
    end

    subgraph Vercel["Despliegue Vercel (Next.js 16 Full-Stack)"]
        UI_POS["POS App (React 19 Touch UI)"]
        UI_GUEST["Guest App (/cliente)"]
        
        subgraph ServerlessAPI["Next.js Route Handlers (/api/v1)"]
            RH_AUTH["/api/v1/pos/session (PIN & Admin)"]
            RH_POS["/api/v1/pos/commands (Mutaciones)"]
            RH_SNAP["/api/v1/pos/snapshot (Estado)"]
            RH_QUOTE["/api/v1/pos/quotes (Cotizaciones)"]
            RH_GUEST["/api/v1/guest/* (Autoservicio)"]
        end
        
        DOM["@qatu/domain (Aritmética BigInt + Reducer)"]
        ServerlessAPI --> DOM
    end

    subgraph SupabaseCloud["Supabase (Nube - Región sa-east-1 / us-east-1)"]
        SB_AUTH["Supabase Auth (GoTrue)"]
        SB_POOLER["Supabase Transaction Pooler (Puerto 6543)"]
        
        subgraph Database["PostgreSQL 17"]
            T_BS[("branch_state (Aggregate JSONB)")]
            T_AUDIT[("Auditorías, Outbox, Fiscal")]
            T_STAFF[("staff_memberships & sessions")]
        end
        
        SB_POOLER --> T_BS
        SB_POOLER --> T_AUDIT
        SB_POOLER --> T_STAFF
    end

    Dispositivos -->|HTTPS / LAN / 4G| Vercel
    UI_POS --> ServerlessAPI
    UI_GUEST --> ServerlessAPI
    RH_AUTH -.-> SB_AUTH
    ServerlessAPI -->|pg Pooler (Port 6543)| SB_POOLER
```

---

## 3. Modelo de Datos y Motor Transaccional

### 3.1 Conexión en Entornos Serverless
En Vercel, las funciones son efímeras y no deben abrir conexiones directas ilimitadas al puerto `5432`.
- **Estrategia**: Se utiliza el **Transaction Pooler de Supabase (Supavisor)** en el puerto `6543`.
- **Configuración de Pool**: Instancia singleton de `pg.Pool` con `max: 1` a `3` conexiones por invocación serverless y tiempos de desconexión breves (`idleTimeoutMillis: 10000`).

### 3.2 Bloqueo Pesimista e Idempotencia
El patrón central de consistencia de QatuPOS se traslada intacto al Route Handler de comandos:

```sql
-- 1. Inicio de transacción en el pooler
BEGIN;

-- 2. Bloqueo exclusivo del estado de la sucursal
SELECT state, version 
FROM branch_state 
WHERE tenant_id = $1 AND branch_id = $2 
FOR UPDATE;

-- 3. Verificación de Idempotencia
SELECT request_sha256, entity_id 
FROM command_operations 
WHERE tenant_id = $1 AND branch_id = $2 AND operation_id = $3;
-- Si existe: reejecución segura sin duplicar efectos (replayed = true)

-- 4. Ejecución de lógica pura de dominio con BigInt (@qatu/domain)
-- (Calcula nuevo estado, deduplica comprobantes, evalúa stock)

-- 5. Actualización atómica de agregados y libros de eventos
UPDATE branch_state 
SET state = $3, version = version + 1, updated_at = now() 
WHERE tenant_id = $1 AND branch_id = $2;

INSERT INTO command_operations (...) VALUES (...);
INSERT INTO outbox (...) VALUES (...);

-- 6. Confirmación
COMMIT;
```

### 3.3 Esquema de Base de Datos
Se migran las 12 migraciones SQL existentes directamente a Supabase:
- `branch_state`: Estado JSONB agregado de salón, comandas, caja y turnos.
- `command_operations`: Registro de deduplicación criptográfica SHA-256.
- `outbox`: Cola secuencial de eventos.
- `staff_memberships`: Personal y credenciales de acceso local.
- `staff_sessions` y `guest_sessions`: Sesiones activas con hash de token.
- `fiscal_documents` y `fiscal_series`: Comprobantes y series tributarias.
- `external_receipts`: Claves compuestas para impedir reutilizar vouchers de Yape o tarjetas.
- Columnas `bigint` (de `012_money_bigint.sql`) con restricciones de rango `0` a `9007199254740991` céntimos.

---

## 4. Modelo de Autenticación y Sesiones Dual

Para armonizar la velocidad requerida en un restaurante con la seguridad administrativa en la nube:

### 4.1 Administradores / Dueños (Supabase Auth)
- Utiliza `@supabase/ssr` con cookies estándar de sesión.
- Inicia sesión vía correo y contraseña desde el formulario administrativo.
- Permite acceso a paneles de control, reportes analíticos, configuración de carta y auditoría desde cualquier lugar fuera del restaurante.

### 4.2 Personal de Salón (Mozos, Cajeros, KDS)
- Los mozos y cocineros necesitan cambios de usuario instantáneos en pantalla compartida sin tipear correos electrónicos.
- **Flujo de Acceso**:
  1. En la pantalla de login del POS, el usuario selecciona su nombre o ingresa su usuario (`mozo1`, `caja`, `cocina`) y digita su **PIN de 4 a 6 dígitos**.
  2. El endpoint `POST /api/v1/pos/session` valida el hash scrypt almacenado en `staff_memberships`.
  3. Al validar, genera una cookie `qatu_session` firmada (`HttpOnly`, `SameSite=Strict`, `Secure`), conteniendo un identificador de sesión temporal asociado al rol (`waiter`, `cashier`, `kitchen`, `admin`).
  4. La sesión se invalida automáticamente ante cambios administrativos de permisos o expiración de turno.

### 4.3 Comensales en Mesa (Guest PIN)
- Al abrir una mesa, el mozo emite un PIN de 10 caracteres alfanuméricos legibles (`deriveGuestCode`, ej: `K7P9Q-3MX2W`).
- El cliente ingresa el PIN en `/cliente`. El Route Handler `POST /api/v1/guest/session` emite una cookie `qatu_guest` restringida al path `/api/v1/guest`.
- Toda la actividad queda ligada a la visita de la mesa y concluye automáticamente cuando la cuenta es cancelada en caja.

---

## 5. Especificación de Route Handlers (Next.js App Router)

Se reubican todos los endpoints dentro de `apps/pos/src/app/api/`:

### 5.1 Endpoints de Staff (`/api/v1/pos/`)
- `POST /api/v1/pos/session`: Autenticación de personal con PIN o usuario/contraseña.
- `GET /api/v1/pos/session`: Verificación de sesión activa y claims de rol.
- `DELETE /api/v1/pos/session`: Cierre de turno y revocación de cookie.
- `GET /api/v1/pos/snapshot`: Retorna la proyección reactiva del estado del restaurante según el rol del usuario (KDS solo ve su estación, mozo ve salón, caja ve cuentas).
- `POST /api/v1/pos/commands`: Punto único de mutación comercial transaccional con `operation_id` y `expected_version`.
- `POST /api/v1/pos/quotes`: Emisión de cotizaciones vinculantes con ventana de 2 minutos.

### 5.2 Endpoints de Comensales (`/api/v1/guest/`)
- `POST /api/v1/guest/session`: Vinculación de celular a la mesa mediante PIN.
- `GET /api/v1/guest/snapshot`: Consulta de estado de platos y comandas de la mesa.
- `POST /api/v1/guest/quotes`: Cotización del borrador del comensal.
- `POST /api/v1/guest/orders`: Envío de comanda a cocina con idempotencia de red.
- `DELETE /api/v1/guest/session`: Desvinculación voluntaria del navegador.

---

## 6. Estrategia de Red y Resiliencia en Restaurante

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MATRIZ DE DISPONIBILIDAD                        │
├───────────────────────┬────────────────────────────────────────────────┤
│ Evento de Falla       │ Comportamiento del Sistema                     │
├───────────────────────┼────────────────────────────────────────────────┤
│ Corte de Fibra/Wi-Fi  │ Conmutación automática a Router 4G / Hotspot.  │
│ Micro-corte en comanda│ Reintento con 'operation_id' evita duplicados. │
│ Refresco de pantalla  │ sessionStorage recupera comandas no enviadas.  │
│ Ancho de banda bajo   │ Interfaz en caché local (PWA); solo viaja JSON.│
└───────────────────────┴────────────────────────────────────────────────┘
```

1. **Idempotencia Estricta**: Cada comanda generada en la tablet tiene un UUID `operation_id` persistido antes del envío. Si la red conmuta a datos móviles durante el POST, el reintento es reconocido por el backend devolviendo el resultado original sin duplicar pedidos ni afectar el inventario.
2. **Arquitectura PWA**: El frontend de Next.js se configura con Service Worker para cachear HTML, estilos y assets. La aplicación abre instantáneamente y no consume datos para cargar la interfaz.
3. **Carga Ultraligera**: Los payloads de envío y respuesta están optimizados en JSON con tamaños promedio entre 2 y 5 KB, lo que permite operar con fluidez incluso con tethering 3G/4G básico.

---

## 7. Plan de Pruebas y Validación

1. **Pruebas Unitarias de Dominio**: Ejecutar las 11 suites de pruebas unitarias (`packages/domain`) con Vitest para certificar que la aritmética BigInt y los cálculos de IGV y caja no se alteren.
2. **Pruebas de Integración de Route Handlers**: Validar los nuevos Route Handlers de Next.js conectando contra una base de datos efímera de pruebas en Supabase/PostgreSQL.
3. **Pruebas E2E (Playwright)**: Ejecutar los 19 recorridos automatizados de navegador contra la aplicación Next.js servida en modo producción local y emulando caídas de red.
4. **Verificación de Seguridad**: Comprobar protección CSRF, cookies con flag `Secure` y aislamiento de datos de comensales.
