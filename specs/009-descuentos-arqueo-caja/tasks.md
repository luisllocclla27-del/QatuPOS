# Tasks: Descuentos Comerciales, Cortesías de Salón y Arqueo / Reporte X de Caja

**Feature ID**: `009-descuentos-arqueo-caja` · **Fecha**: 2026-10-02

## Phase 1 — Contratos y Base de Datos
- [x] T001 Actualizar contratos TypeScript en `packages/contracts/src/pos.ts` con campos de descuento en `Check`, `CheckDiscountApplyCommand`, `CheckDiscountRemoveCommand`, `CheckDiscountAuditEntry` y `discount_audit` en snapshot.
- [x] T002 Actualizar OpenAPI en `docs/contracts/pilot.openapi.json` con esquemas y comandos de descuento.
- [x] T003 Crear migración `database/migrations/009_discounts_and_cash_audit.sql` con columnas en `checks` y tabla `check_discount_audit`.
- [x] T004 Actualizar fixtures de prueba y limpieza en `tests/support/database.ts`.

## Phase 2 — Dominio Puro y Persistencia
- [x] T005 Implementar reglas de descuento y remoción en `packages/domain/src/index.ts` (rol, céntimos exactos, límites de saldo, recálculo atómico).
- [x] T006 Implementar persistencia atómica en PostgreSQL de campos de descuento en `checks` e inserción en `check_discount_audit` en `services/commerce/src/authority/repository.ts`.
- [x] T007 Escribir pruebas unitarias de dominio para descuentos y límites de saldo.

## Phase 3 — Frontend y Experiencia de Usuario
- [x] T008 Implementar modal interactivo para aplicar y retirar descuentos en Caja en `apps/pos/src/components/pos-app.tsx`.
- [x] T009 Actualizar visualizador de Pre-cuenta y Comprobantes SUNAT en `apps/pos/src/components/thermal-receipt-modal.tsx` para reflejar el descuento.
- [x] T010 Implementar modal y vista de Ticket Térmico de 80mm de "Arqueo de Caja (Corte X)" con desglose en vivo por método de pago e impresión física.
- [x] T011 Implementar visor de auditoría de descuentos en Caja y botón de impresión de Ticket Térmico 80mm en Cierre de Turno y Día (Reporte Z).

## Phase 4 — Verificación y Entrega
- [x] T012 Escribir prueba E2E de Playwright (`tests/e2e/zzzzzz-discounts-audit.spec.ts`) que cubra pedido, descuento de mesa, pre-cuenta con descuento, cobro, arqueo de caja con ticket térmico y cierre.
- [x] T013 Ejecutar `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build` y `pnpm validate:sdd`.
- [x] T014 Generar reporte de entrega, revisión independiente y manifiesto de delivery.

## Phase 5: Convergence

02/10/2026 · Revisión root sobre base del incremento010. Los checks anteriores son evidencia histórica; estas brechas no se consideran resueltas por dichos checks. Asignación correctiva y evidencia en feature011; no marca tareas integrales del padre.

- [ ] MAR:T015 CRITICAL Bloquear retiro/reducción de descuento que reabre una cuenta totalmente pagada por DSC-FR-002 y Constitución IV (contradicts).
- [ ] MAR:T016 CRITICAL Calcular descuento/base/sumas con aritmética entera exacta por Constitución IV y DSC-FR-001/004 (contradicts).
- [ ] MAR:T017 CRITICAL Cerrar día con venta neta de anulaciones y descuentos por DSC-FR-006 y Constitución IV (partial).
- [ ] MAR:T018 CRITICAL Ocultar discount_audit a mozo/cocina y preservar conteo ciego por Constitución V y DSC-FR-003 (contradicts).
- [ ] MAR:T019 Delimitar documentos del Corte X a ventana del turno, sin incluir todo el historial por DSC-FR-005 (partial).
- [ ] MAR:T020 Distinguir reporte durante conteo ciego, sin convertir esperado null en cero por DSC-FR-005 y Constitución VI (contradicts).
- [ ] MAR:T021 Retirar QR decorativo y afirmaciones de transmisión/homologación del flujo simulado por DSC-FR-004 y Constitución VI/IX (contradicts).
