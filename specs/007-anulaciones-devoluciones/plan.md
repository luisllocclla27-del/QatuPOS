# Implementation Plan: Anulaciones de Pedidos y Liberación de Cobros

**Feature ID**: `007-anulaciones-devoluciones`

---

## 1. Contratos y Esquemas
- Actualizar `packages/contracts/src/pos.ts`:
  - Agregar `OrderLineVoidCommand` y `CollectionReleaseCommand` a `PosCommand`.
  - Extender `OrderLine` con `voided_quantity: number` y `void_reason?: string`.
  - Agregar `OrderVoidAuditEntry` a `PosSnapshot` (`void_audit: OrderVoidAuditEntry[]`).
  - Agregar código de error `'ALREADY_SETTLED'` o reutilizar `'CHECK_BALANCE_EXCEEDED' | 'QUANTITY_EXCEEDED' | 'FORBIDDEN'`.
- Actualizar `docs/contracts/pilot.openapi.json`:
  - Registrar esquemas de `order.line.void` y `collection.release` en `PosCommand`.
  - Actualizar `OrderLine` y `PosSnapshot`.

---

## 2. Base de Datos y Migración
- Crear `database/migrations/007_voids_and_releases.sql`:
  - Añadir columna `voided_quantity INT NOT NULL DEFAULT 0` a la tabla `order_lines`.
  - Crear tabla `order_void_audit`:
    `id UUID PRIMARY KEY`, `actor_id UUID NOT NULL`, `operation_id UUID NOT NULL`, `line_id UUID NOT NULL`, `order_id UUID NOT NULL`, `visit_id UUID NOT NULL`, `quantity INT NOT NULL`, `amount_minor INT NOT NULL`, `restored_stock BOOLEAN NOT NULL`, `reason TEXT NOT NULL`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
- Actualizar `tests/support/database.ts` para truncar `order_void_audit`.

---

## 3. Dominio y Persistencia Transaccional
- En `packages/domain/src/index.ts`:
  - Implementar validación y cálculo de `order.line.void`.
  - Implementar validación y cálculo de `collection.release`.
  - Validar rol `cashier` o `admin`.
- En `services/commerce/src/authority/repository.ts`:
  - Transacción atómica de anulación con ajuste de `check`, `stock`, `order_lines` y inserción en `order_void_audit`.
  - Emisión de `PrintJob` de anulación.
  - Liberación de `CollectionAuthorization` en estado `reserved`.

---

## 4. Interfaz de Usuario en `apps/pos`
- En `apps/pos/src/components/pos-app.tsx`:
  - En pestaña `Caja`: listar líneas de comanda de la mesa con botón `Anular`.
  - Modal de anulación con selector de cantidad, motivo obligatorio y casilla de reposición de stock.
  - Botón `Liberar cobro` para autorizaciones retenidas.
  - En pestaña `Mesas` (Mozo): mostrar ítems anulados y aviso de acudir a Caja para anular.
  - En `GuestOrders`: reflejar ítems anulados.

---

## 5. Pruebas y Verificación
- Pruebas unitarias: `tests/unit/pilot-domain.test.ts`.
- Pruebas de integración: `tests/integration/api.test.ts`.
- Pruebas E2E en Playwright: `tests/e2e/zzzz-voids.spec.ts`.
- Verificación completa: `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`, `pnpm validate:sdd`.
