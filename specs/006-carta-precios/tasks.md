# Tareas de ejecución del incremento: Carta y Revisión de Precios

- [x] CAT:T001 Contratos compartidos (@qatu/contracts pos.ts y pilot.openapi.json) para productos, cotizaciones, auditoría y comandos.
- [x] CAT:T002 Migración aditiva PostgreSQL `database/migrations/006_catalog_and_quotes.sql` (tablas `order_quotes` y `catalog_audit`).
- [x] CAT:T003 Reglas puras de dominio (@qatu/domain): cotización inmutable, validación estricta en `order.create`, bloqueo por precio cambiado o cotización vencida, comandos `catalog.product.create` y `catalog.product.update` con control de concurrencia optimista y bloqueo de historial comercial.
- [x] CAT:T004 Autorización y persistencia comercial (`services/commerce`): repositorios de cotización y catálogo, endpoints HTTP para staff y guest, y validación atómica en transacción.
- [x] CAT:T005 Pruebas unitarias y de integración PostgreSQL para cotizaciones, cambio de precios S/35 a S/38, expiración a 120s, stock concurrente, auditoría y recuperación idempotente.
- [x] CAT:T006 Interfaz de administración de carta en POS (`apps/pos/src/components/pos-app.tsx` / `catalog-management.tsx`): listado, filtros, creación, edición de precios y auditoría.
- [x] CAT:T007 Flujo de cotización y revisión de precios en POS para mozo con alerta y recuperación ante cambios de precio.
- [x] CAT:T008 Flujo de cotización y revisión de precios en `/cliente` (`apps/pos/src/components/guest-app.tsx`) con detección y comparativa ante `PRICE_CHANGED`.
- [x] CAT:T009 Pruebas E2E en Playwright para el escenario central (S/35 -> S/38) y edición de carta en tablet y móvil (`tests/e2e/zzz-catalog.spec.ts`).
- [x] CAT:T010 Ejecución y verificación completa: `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`, `pnpm validate:sdd`.
- [x] CAT:T011 Revisión independiente de código, aislamiento y seguridad comercial.
- [x] CAT:T012 Generación de entrega formal y actualización de `docs/evidence/CONTINUIDAD.md`.
