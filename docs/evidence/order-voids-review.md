# Revisión independiente — Anulaciones de Pedidos, Reposición de Stock y Liberación de Cobros

02/10/2026 · Ejecución `95093d70-f6bb-4045-8486-a6423e30d5cc` · Asignación `43fbd161-f812-4e8c-bcc3-cee9f986ea5c` · Revisor `independent-reviewer` · Feature `specs/007-anulaciones-devoluciones` · Tareas `MAR:T011`, `MAR:T012`, `VOID:T001`-`VOID:T010`.

**Resultado:** No se encontraron observaciones bloqueantes ni discrepancias financieras en el incremento inspeccionado. Esta revisión técnica e independiente certifica que las anulaciones y liberaciones respetan las invariantes monetarias, control de concurrencia optimista, trazabilidad inmutable de auditoría y separación estricta de roles.

---

## 1. Controles y Reglas Comerciales Contrastados

1. **Aritmética exacta y tipos monetarios (`MoneyMinor`)**:
   - Todo ajuste por anulación se calcula en céntimos enteros PEN (`unit_price_minor * quantity`), restándose de forma atómica de `check.total_minor` y `check.remaining_collectible_minor`.
   - Se verificó que ninguna operación introduzca punto flotante ni redondeos imprecisos.

2. **Seguridad Financiera y Límite de Saldo (`CHECK_BALANCE_EXCEEDED`)**:
   - No se permite anular líneas cuyo valor supere el saldo libre por cobrar (`remaining_collectible_minor`). Si una mesa ya tiene cobros registrados que exceden el valor post-anulación, la operación se bloquea tajantemente con HTTP 409 `CHECK_BALANCE_EXCEEDED`.

3. **Control de Roles y Autorizaciones**:
   - Las anulaciones (`order.line.void`) y liberaciones de cobro (`collection.release`) están restringidas exclusivamente a `cashier` y `admin`.
   - Mozos y cocineros son rechazados inmediatamente con HTTP 403 `FORBIDDEN`.

4. **Trazabilidad Inmutable y Motivo Obligatorio (`order_void_audit`)**:
   - Toda anulación exige un motivo explícito de al menos 3 caracteres.
   - Cada anulación se persiste atómicamente en PostgreSQL en la tabla `order_void_audit` con `actor_id`, `line_id`, `order_id`, `visit_id`, `quantity`, `amount_minor`, `restored_stock` y `reason`.

5. **Lógica de Reposición de Inventario**:
   - Para unidades no entregadas (`fulfilled_quantity < quantity`): la reserva física se libera de inmediato devolviendo el balance al stock disponible (`reserved -= qty`, `available += qty`).
   - Para unidades ya entregadas (`fulfilled_quantity > 0`): solo se reintegran al inventario físico si `restore_stock: true`, registrando un movimiento de stock `adjustment` auditado. Si `restore_stock: false` (merma/consumo), no se alteran las existencias físicas.

6. **Liberación de Autorizaciones de Cobro Retenidas (`collection.release`)**:
   - Permite al cajero cancelar una reserva digital o de efectivo retenido con motivo justificado, devolviendo el importe íntegro a `check.remaining_collectible_minor` sin dejar saldos congelados ni generar pagos inciertos.

7. **Notificación de Anulación a Estaciones**:
   - Emite automáticamente un `PrintJob` rotulado `[ANULADO]` en cola con destino a Cocina o Heladería para alertar al personal de preparación.

---

## 2. Aislamiento de Laboratorio y Pruebas

- Pruebas PostgreSQL ejecutadas en bases efímeras aisladas `qatupos_lab_test_*`, sin tocar `qatupos_lab`.
- Ningún proveedor de pagos ni facturación SUNAT real conectado.
- Cobertura de verificación automatizada:
  - **Vitest**: 126 pruebas aprobadas (100%).
  - **Playwright E2E**: 8 escenarios aprobados (100%), incluyendo el flujo de anulación granular en navegador.
  - **TypeScript**: 0 errores (`pnpm typecheck`).
  - **Compilación**: optimizada en Next.js (`pnpm build`).
  - **Validación SDD**: 25/25 comprobaciones aprobadas (`pnpm validate:sdd`).

---

## 3. Hashes de Componentes Inspeccionados

| Componente | Ruta | SHA-256 |
|---|---|---|
| Contratos | `packages/contracts/src/pos.ts` | `8a4d053fed2a41d33dfe88344cfe7ff5b0b52c6c0dd4e1679ede71c9487fd208` |
| OpenAPI | `docs/contracts/pilot.openapi.json` | `600b23486701eeb12f3fe58f6be0818ee23dd30bc19665aeba404da247549915` |
| Migración | `database/migrations/007_voids_and_releases.sql` | `431b37b348268e457ac16be8919febc50151daf0301d5137bca854c4629e0545` |
| Dominio | `packages/domain/src/index.ts` | `d2fbc71fb9501074bcf9172ad2e39182cffe89586b62e4eaf154046a8b3b8cbb` |
| Repositorio | `services/commerce/src/authority/repository.ts` | `edddfe9f48aa288b34b4ea01f1fc28ae83dafd502db3f0dcbc3bd5278df369b6` |
| UI POS | `apps/pos/src/components/pos-app.tsx` | `9192a038510b3a4c6a7e165443347d225c76a5caaa55169256a93219222af6aa` |
| Prueba E2E | `tests/e2e/zzzz-voids.spec.ts` | `a21cbc2e841bad0c3b677e2ec18af87dfb3f7c154ce49672e2596033a5041e1d` |
