# Plan de Tareas: Notas de Crédito Electrónicas SUNAT (BC01 / FC01)

**Feature**: `010-notas-credito-sunat` · **Piloto**: El Encanto Huamanguino

## Fase 1: Contratos y Base de Datos (Persistencia)
- [x] T001: Extender tipos en `packages/contracts/src/pos.ts` (`FiscalDocType = 'boleta' | 'factura' | 'nota_credito'`, `SunatCreditReasonCode`, `FiscalCreditNoteIssueCommand`, campos de referencia en `FiscalDocument`).
- [x] T002: Actualizar esquema OpenAPI en `docs/contracts/pilot.openapi.json`.
- [x] T003: Crear migración `database/migrations/010_credit_notes.sql` con series iniciales `BC01` y `FC01`, y columnas de referencia en `fiscal_documents`.
- [x] T004: Aplicar migración en `qatupos_lab` y actualizar utilidades de prueba en `tests/support/database.ts`.

## Fase 2: Dominio Puro y Persistencia Transaccional
- [x] T005: Implementar lógica de dominio para `fiscal.credit_note.issue` en `packages/domain/src/index.ts` (validación de rol, deducción de serie, generación de UBL hash/QR y estado anulado).
- [x] T006: Implementar persistencia transaccional atómica en `services/commerce/src/authority/repository.ts` con incremento de `fiscal_series` para `BC01` y `FC01`, e inserción en `fiscal_documents`.
- [x] T007: Validar validaciones en `services/commerce/src/platform/validation.ts`.

## Fase 3: Pruebas Unitarias y de Integración
- [x] T008: Agregar pruebas unitarias en `tests/unit/contracts.test.ts` para validación de comandos y tipos de Nota de Crédito.
- [x] T009: Agregar pruebas unitarias de dominio en `tests/unit/pilot-domain.test.ts` (emisión de NC sobre Boleta y Factura, rechazo a mozo, rechazo por doble anulación).
- [x] T010: Agregar pruebas de integración en `tests/integration/api.test.ts` con base de datos efímera PostgreSQL.

## Fase 4: Frontend POS y Experiencia de Usuario
- [x] T011: Crear componente modal `apps/pos/src/components/issue-credit-note-modal.tsx` para emitir Notas de Crédito con selector de motivo SUNAT y sustento.
- [x] T012: Actualizar modal térmico `apps/pos/src/components/thermal-receipt-modal.tsx` para renderizar el ticket térmico de 80mm de Nota de Crédito.
- [x] T013: Integrar en `apps/pos/src/components/pos-app.tsx` en la tabla de comprobantes emitidos: botón "❌ Anular con NC", insignias de anulación y filtro/visualizador de Notas de Crédito.
- [x] T014: Actualizar `apps/pos/src/components/cash-audit-modal.tsx` para deducir Notas de Crédito y mostrar Ventas Netas del turno.

## Fase 5: Pruebas End-to-End y Cierre de Entrega
- [x] T015: Crear prueba E2E en Playwright `tests/e2e/zzzzzzz-credit-notes.spec.ts` verificando el ciclo completo en navegador con capturas en `docs/evidence/screens/`.
- [x] T016: Ejecutar batería completa de validación: `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm test:e2e`, `pnpm validate:sdd`.
- [x] T017: Generar manifiesto de entrega `docs/construction/runs/2026-10-02-notas-credito/delivery.json`, `docs/evidence/credit-notes-delivery.md` y `docs/evidence/credit-notes-review.md`.
