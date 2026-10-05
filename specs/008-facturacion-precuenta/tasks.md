# Tasks: Pre-cuenta y Comprobantes Electrónicos SUNAT

**Feature ID**: `008-facturacion-precuenta` · **Fecha**: 2026-10-02

## Phase 1 — Contratos y Base de Datos
- [x] T001 Actualizar contratos TypeScript en `packages/contracts/src/pos.ts` con `FiscalDocument`, `FiscalDocumentIssueCommand`, `ALREADY_ISSUED` y campo `fiscal_documents` en snapshot.
- [x] T002 Actualizar especificación OpenAPI en `docs/contracts/pilot.openapi.json` con esquemas y validaciones de emisión fiscal.
- [x] T003 Crear migración `database/migrations/008_fiscal_documents.sql` con tablas `fiscal_series` y `fiscal_documents`.
- [x] T004 Actualizar fixtures de prueba y limpieza en `tests/support/database.ts`.

## Phase 2 — Dominio Puro y Persistencia
- [x] T005 Implementar reglas de validación (RUC 11 dígitos, DNI 8 dígitos, umbral S/ 700), cálculo de IGV 18% y generación de Hash/QR en `packages/domain/src/index.ts`.
- [x] T006 Implementar bloqueo atómico de correlativo, persistencia de `fiscal_documents` y actualización de `checks` en `services/commerce/src/authority/repository.ts`.
- [x] T007 Escribir pruebas unitarias de dominio para cálculo de IGV, validaciones de receptor y bloqueo de duplicidad.

## Phase 3 — Frontend y Experiencia de Usuario
- [x] T008 Implementar modal y visualizador de Pre-cuenta de mesa en `apps/pos/src/components/pos-app.tsx`.
- [x] T009 Implementar modal de emisión de Boleta y Factura con validación de RUC y DNI en tiempo real en Caja.
- [x] T010 Implementar modal de visualización de Ticket Térmico de 80mm con estilos de impresión `@media print`, QR y Hash UBL 2.1.
- [x] T011 Implementar visor de historial de comprobantes emitidos en el panel de Caja.

## Phase 4 — Verificación y Entrega
- [x] T012 Escribir prueba E2E de Playwright (`tests/e2e/zzzzz-fiscal.spec.ts`) que cubra precuenta, emisión de boleta y ticket térmico.
- [x] T013 Ejecutar `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build` y `pnpm validate:sdd`.
- [x] T014 Generar reporte de entrega, revisión independiente y manifiesto de delivery.
