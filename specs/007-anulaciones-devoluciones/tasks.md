# Tareas de ejecución del incremento: Anulaciones y Liberación de Cobros

- [x] VOID:T001 Contratos compartidos (@qatu/contracts pos.ts y pilot.openapi.json) para comandos `order.line.void`, `collection.release` y auditoría de anulación.
- [x] VOID:T002 Migración aditiva PostgreSQL `database/migrations/007_voids_and_releases.sql` (columna `voided_quantity` y tabla `order_void_audit`).
- [x] VOID:T003 Reglas de dominio puro (@qatu/domain): validación de permisos de cajero/admin, rechazo a mozo, recálculo de cuenta en céntimos PEN y lógica de reposición de inventario.
- [x] VOID:T004 Persistencia atómica y autoridad comercial (`services/commerce`): transacción PostgreSQL bajo bloqueo de fila, ajuste de check, actualización de stock y emisión de notificación a cocina.
- [x] VOID:T005 Pruebas unitarias y de integración PostgreSQL para anulación con/sin reposición de stock, límites de saldo y liberación de cobro retenido.
- [x] VOID:T006 Interfaz de Caja (`apps/pos/src/components/pos-app.tsx`): visualización de líneas de comanda, modal de anulación con motivo obligatorio y botón de liberación de cobro.
- [x] VOID:T007 Visualización en Mozo y Estaciones: reflejar platos anulados en historial y reducción en pendientes de cocina.
- [x] VOID:T008 Pruebas E2E en Playwright (`tests/e2e/zzzz-voids.spec.ts`): flujo completo de comanda, anulación en caja, reintegro de stock, cobro final y cierre.
- [x] VOID:T009 Verificación completa: `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`, `pnpm validate:sdd`.
- [x] VOID:T010 Revisión independiente de seguridad financiera, auditoría y entrega final.
