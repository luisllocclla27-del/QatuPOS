# Plan: Descuentos Comerciales, Cortesías de Salón y Arqueo / Reporte X de Caja

**Feature ID**: `009-descuentos-arqueo-caja` · **Fecha**: 2026-10-02

## 1. Arquitectura y Enfoque

Seguimos la arquitectura limpia del núcleo:
1. **Contratos (`packages/contracts/src/pos.ts`)**:
   - Campos en `Check`: `discount_minor: MoneyMinor`, `discount_reason?: string`, `discount_kind?: 'percentage' | 'fixed'`, `discount_percent?: number`.
   - Interfaz `CheckDiscountAuditEntry`.
   - Comandos `CheckDiscountApplyCommand` y `CheckDiscountRemoveCommand`.
   - Snapshot enriquecido con `discount_audit: CheckDiscountAuditEntry[]`.
2. **OpenAPI (`docs/contracts/pilot.openapi.json`)**:
   - Nuevos esquemas y comandos de descuento en la especificación formal.
3. **Persistencia PostgreSQL (`database/migrations/009_discounts_and_cash_audit.sql`)**:
   - Columnas en tabla `checks`: `discount_minor integer not null default 0`, `discount_reason text`, `discount_kind text`, `discount_percent integer`.
   - Tabla `check_discount_audit` con `(id, check_id, visit_id, actor_id, operation_id, discount_minor, discount_kind, discount_percent, reason, created_at)`.
4. **Dominio Puro (`packages/domain/src/index.ts`)**:
   - Handler para `case 'check.discount.apply'`:
     - Validación de rol `cashier` o `admin`.
     - Cálculo exacto en céntimos PEN:
       - Si `kind === 'percentage'`: `discount = Math.round((gross_total * percent) / 100)`.
       - Si `kind === 'fixed'`: `discount = command.amount_minor`.
     - Validaciones de límite: `discount > 0 && discount <= gross_total`, y `discount <= check.remaining_collectible_minor`.
     - Recálculo de `check.total_minor = gross_total - discount`, `check.remaining_collectible_minor = check.total_minor - check.paid_minor - check.held_minor`.
   - Handler para `case 'check.discount.remove'`:
     - Retira el descuento, reponiendo el total a `gross_total`.
5. **Repositorio Atómico (`services/commerce/src/authority/repository.ts`)**:
   - Persistencia transaccional de campos en `checks` y registro en `check_discount_audit`.
6. **Frontend POS (`apps/pos`)**:
   - Botón "Descuento / Cortesía" en la comanda de la mesa en Caja.
   - Modal interactivo de aplicación de descuento (selector % o monto fijo S/, motivo obligatorio).
   - Actualización de `ThermalReceiptModal` para desglosar Subtotal, Descuento y Total en Pre-cuenta y Comprobante Fiscal.
   - Componente y modal "Arqueo de Caja (Corte X)" con resumen financiero y ticket térmico de 80mm imprimible.
   - Botón de impresión de ticket térmico 80mm en Cierre de Turno y Cierre del Día (Reporte Z).
7. **Pruebas y Verificación**:
   - Unit tests en `tests/unit/pilot-domain.test.ts`.
   - Integración en `tests/integration/api.test.ts`.
   - E2E en Playwright: `tests/e2e/zzzzzz-discounts-audit.spec.ts`.
