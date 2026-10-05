# Revisión independiente — Carta Configurable con Revisión de Precios

02/10/2026 · Ejecución `9b1cb5b8-53e3-4d40-97ef-5fe5c862bc2a` · Asignación `a1c2e3f4-b5d6-4789-9012-34567890abcd` · Revisor `independent-reviewer` · Feature `specs/006-carta-precios` · Tareas `MAR:T004`, `MAR:T025`, `MAR:T027`, `CAT:T001`-`CAT:T012`.

**Resultado:** No se encontraron observaciones bloqueantes ni discrepancias financieras en el incremento inspeccionado. Esta revisión técnica e independiente verifica la rigurosidad de los contratos, cálculos exactos en céntimos PEN, aislamiento transaccional y ausencia de efectos colaterales ante cambios de precio.

---

## 1. Controles y Reglas Comerciales Contrastados

1. **Aritmética exacta y tipos monetarios (`MoneyMinor`)**:
   - Todo precio PEN se almacena y calcula como entero estrictamente positivo (> 0) en céntimos (`MoneyMinor`).
   - Se verificó la eliminación de punto flotante en cálculo de subtotales, totales de cotización y validación de órdenes.
   - Entradas no numéricas, cadenas mal formadas, precios <= 0 o decimales flotantes son rechazados en el validador del dominio con `VALIDATION_FAILED` / `INPUT`.

2. **Inmutabilidad y ciclo de vida de la cotización (`order_quotes`)**:
   - Las cotizaciones se calculan exclusivamente en el servidor (`createDomainQuote`) y se persisten en `order_quotes` con `quote_id` UUID, `total_minor`, líneas congeladas con versión del producto y `expires_at = NOW() + INTERVAL '120 seconds'`.
   - La cotización es estrictamente de consulta: no reserva existencias, no modifica saldos de cuenta de mesa, no genera tickets ni altera el estado de la visita.
   - Una cotización es de un solo uso (`consumed_at`): al ser aceptada por una orden se marca consumida atómicamente, impidiendo reutilización duplicada.

3. **Rechazo por cambio de precio y confirmación consciente (`PRICE_CHANGED`)**:
   - Al ejecutar `order.create`, la transacción bloquea la visita y el local (`SELECT ... FOR UPDATE`), verifica que la cotización pertenezca a la misma visita y no haya expirado ni sido consumida.
   - Verifica que el precio y versión de cada producto coincidan exactamente con la carta autorizada vigente.
   - Si el precio cambió en el interín (ej. S/ 35.00 a S/ 38.00):
     - La transacción se revierte íntegramente: 0 tickets emitidos, 0 reservas o descuentos de stock, saldo de cuenta intacto.
     - Responde con HTTP 409 `PRICE_CHANGED` incluyendo el detalle `changed_products` con precio previo y nuevo.
     - La UI en POS y `/cliente` intercepta el código, muestra aviso claro al usuario, actualiza la cotización y exige confirmación explícita con el nuevo valor.

4. **Control de concurrencia optimista (`expected_version`) y auditoría (`catalog_audit`)**:
   - La modificación de productos en catálogo requiere `expected_version`. Si dos administradores intentan editar simultáneamente, el segundo es rechazado con `VERSION_CONFLICT` / `CATALOG_VERSION_CONFLICT`.
   - Cada alta y edición de producto se audita atómicamente en `catalog_audit` dentro de la misma transacción PostgreSQL, registrando `action`, `actor_id`, `reason` (obligatorio >= 3 chars), versión anterior y cambios efectuados (`changes` jsonb).

5. **Bloqueo por historial comercial (`COMMERCIAL_HISTORY_LOCKED`)**:
   - Si un producto ya cuenta con líneas en pedidos previamente aceptados en el local, el dominio prohíbe terminantemente cambiar su `station` o `stock_policy`/`stock_item_id`.
   - Esto garantiza que órdenes históricas y kardex permanezcan consistentes y no se rompa la trazabilidad de despacho.

6. **Autorización estricta de participantes y roles**:
   - Los comandos `catalog.product.create` y `catalog.product.update` exigen rol `admin`. Mozos, cajeros o personal de cocina reciben HTTP 403 `FORBIDDEN`.
   - El endpoint `/v1/guest/quotes` verifica sesión activa y mesa vinculada sin permitir consultas de catálogo administrativo ni acceso a tablas de auditoría.

---

## 2. Aislamiento de Laboratorio y Pruebas

- Se verificó que todas las pruebas en PostgreSQL se ejecutan en bases de datos efímeras aisladas `qatupos_lab_test_*`, preservando intacta la base de datos interactiva `qatupos_lab`.
- Ningún proveedor de pagos real, hardware físico ni servicio tributario (SUNAT) fue activado; todos los comportamientos operan bajo entornos simulados claramente identificados en la UI.
- Se comprobó la ejecución completa y limpia de:
  - Vitest: 114 pruebas aprobadas (100%).
  - Playwright E2E: 7 escenarios aprobados (100%), incluyendo el escenario central S/ 35.00 -> S/ 38.00 y vistas móviles/tablets.
  - Verificación estricta de TypeScript: 0 errores (`pnpm typecheck`).
  - Compilación de producción: empaquetado exitoso de Next.js (`pnpm build`).
  - Validación documental SDD: 25/25 comprobaciones aprobadas (`pnpm validate:sdd`).

---

## 3. Hashes de Componentes Inspeccionados

| Componente | Ruta | SHA-256 |
|---|---|---|
| Contratos | `packages/contracts/src/pos.ts` | `32d2d0484b3be78f4816518e431080dce695e3e349731e58fe1a25a662c3e0a7` |
| OpenAPI | `docs/contracts/pilot.openapi.json` | `4aa3c608b06ebc69a21a45a8d432abcaff6227fed5ef0c16d34df92fadecb95b` |
| Migración | `database/migrations/006_catalog_and_quotes.sql` | `d9b7152a14851f87b4501472d28a4e8588d3e578661627e922d378c38b1d2bf5` |
| Dominio | `packages/domain/src/index.ts` | `15918f81569e60a0bc57262f43df68dde19a94142e24960d92237329934b5144` |
| Repositorio | `services/commerce/src/authority/repository.ts` | `25b26eecdf746bb3e8cdba26bd6ebaa071714fe676a9370fc6d71d970fe44017` |
| App Comercio | `services/commerce/src/app.ts` | `e9c2c3d7e590f6905d031546c4231da08284d8f67a9657691e7ee7700c7692ea` |
| Admin Carta | `apps/pos/src/components/catalog-management.tsx` | `d5153d2b59526c496604a25ded28e663de9e5f726dd5613aeecfe92c7672b28e` |
| Shell POS | `apps/pos/src/components/pos-app.tsx` | `813e9ad9a0dd70080e5e8666a273e56e222dca7660e474c302739e0236e0b087` |
| Cliente Web | `apps/pos/src/components/guest-app.tsx` | `2352302a1da8704e534b5c743f3dd514d8fc92c6cfdf0604136c55bfd4b13331` |
| E2E Carta | `tests/e2e/zzz-catalog.spec.ts` | `8056ded57a37df72ff17e459d8d061236cd62636745fc752dc8cebc0698e3b92` |
