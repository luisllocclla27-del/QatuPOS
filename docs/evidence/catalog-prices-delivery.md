# Entrega · Carta Configurable con Revisión de Precios

02/10/2026. Ejecución `9b1cb5b8-53e3-4d40-97ef-5fe5c862bc2a` · Asignación `a1c2e3f4-b5d6-4789-9012-34567890abcd` · WorkKind `implementation` · Feature `specs/006-carta-precios`.

Se entrega la implementación completa e integrada de la **carta configurable con revisión de precios antes de aceptar pedidos** en el piloto presencial **El Encanto Huamanguino**.

---

## 1. Resumen de Capacidades Implementadas

1. **Administración de Carta en POS (`CatalogManagement`)**:
   - Pestaña "Carta" visible exclusivamente para personal con rol `admin`.
   - Listado reactivo de productos con filtros por categoría, estación de elaboración (`cocina`, `heladeria`, `caja`), estado activo/inactivo y búsqueda por texto.
   - Alta de productos (`catalog.product.create`) con validación de precios en céntimos PEN (`MoneyMinor`), estación y control de inventario (`none` o `unit`).
   - Edición de productos (`catalog.product.update`) con control de concurrencia optimista (`expected_version`) y motivo obligatorio (mínimo 3 caracteres).
   - Bloqueo estricto de estación y vínculo de stock ante historial comercial existente (`COMMERCIAL_HISTORY_LOCKED`).
   - Visor de auditoría con historial reciente de altas y modificaciones registradas en `catalog_audit`.

2. **Cotización Inmutable en Servidor (`order_quotes`)**:
   - Endpoints `POST /v1/pos/quotes` y `POST /v1/guest/quotes` que calculan importes oficiales en céntimos enteros PEN sin punto flotante.
   - Generación de `quote_id` UUID con TTL estricto de 120 segundos.
   - Inmutabilidad comercial: la cotización no reserva existencias, no modifica saldos de cuenta de mesa ni emite tickets.
   - Marcado atómico de consumo (`consumed_at`) para evitar reutilización o duplicidad.

3. **Rechazo por Cambio de Precio (`PRICE_CHANGED`) y Confirmación Consciente**:
   - Al confirmar un pedido en `order.create`, la transacción PostgreSQL bloquea atómicamente la visita y el local, comprobando que la cotización esté vigente y que los precios de cada producto coincidan exactamente con la carta autorizada.
   - Si el precio cambió en el interín (ej. S/ 35.00 a S/ 38.00):
     - La transacción se revierte íntegramente: 0 tickets emitidos, 0 reservas o descuentos de stock, saldo de cuenta inalterado.
     - Servidor responde con HTTP 409 `PRICE_CHANGED` detallando productos modificados.
     - La UI en POS y `/cliente` intercepta el error, muestra una alerta explicativa («El precio de "Ceviche clásico" cambió de S/ 35.00 a S/ 38.00. Revisa tu pedido antes de confirmar»), actualiza la cotización con los nuevos montos, preserva el borrador y exige confirmación consciente del usuario.

---

## 2. Evidencia de Verificación Técnica

- **Typecheck**: `pnpm typecheck` aprobado con 0 errores de tipado.
- **Compilación de producción**: `pnpm build` (`next build`) compilado con éxito y empaquetado optimizado de todas las rutas (`/`, `/_not-found`, `/cliente`).
- **Pruebas Unitarias, de Contratos y de Integración**:
  - `pnpm test` (Vitest): **114 pruebas aprobadas al 100%** en 5 suites:
    - `tests/unit/contracts.test.ts` (27 pruebas): validación de esquemas y contratos OpenAPI.
    - `tests/unit/exact.test.ts` (13 pruebas): aritmética exacta entera en céntimos PEN.
    - `tests/unit/pilot-domain.test.ts` (43 pruebas): reglas puras de dominio, cotizaciones, bloqueo por cambio de precio, control de stock y auditoría.
    - `tests/integration/api.test.ts` (14 pruebas): endpoints staff, concurrencia, permisos de admin y persistencia en PostgreSQL.
    - `tests/integration/guest.test.ts` (17 pruebas): ciclo de vida de cliente en mesa, cotización, detección y rechazo de cambio de precio S/ 35.00 -> S/ 38.00 y recuperación idempotente.
- **Pruebas End-to-End en Playwright**:
  - `pnpm test:e2e`: **7 escenarios aprobados al 100%**:
    - `pos.spec.ts` (2 pruebas): dos terminales táctiles compartiendo mesa, cobro exacto en caja, despacho de cocina/heladería y adaptación móvil.
    - `zz-guest.spec.ts` (3 pruebas): pedidos privados de cliente, entrega independiente de cuenta pagada, recuperación ante caída de red y tolerancia a fallos en sessionStorage.
    - `zzz-catalog.spec.ts` (2 pruebas): flujo completo de alta de producto por admin en Carta, actualización de precio de Ceviche de S/ 35.00 a S/ 38.00 con rechazo a cotización obsoleta, alerta en diálogo, actualización a S/ 38.00, confirmación consciente y verificación en cuenta de mozo; más comprobación de viewport móvil (390×844) sin desbordamiento horizontal.
- **Validación SDD**:
  - `pnpm validate:sdd`: **25/25 comprobaciones aprobadas**, generando `docs/evidence/planning-validation.json`.

---

## 3. Documentación y Enlaces de Evidencia

- [Revisión Independiente](catalog-prices-review.md): Evaluación estática de invariantes monetarias, atomicidad y seguridad comercial.
- [WorkOrder de Asignación](../construction/runs/2026-10-02-catalog-prices/work-order.json): Registro formal validado con `work-order.schema.json`.
- [Delivery JSON](../construction/runs/2026-10-02-catalog-prices/delivery.json): Manifiesto estructurado con hashes SHA-256 de entrega.
- [Reporte de Continuidad](CONTINUIDAD.md): Estado actualizado de la base, dependencias y próximos pasos.
- Capturas de pantalla generadas:
  - [Administración de Carta](screens/carta-admin.png)
  - [Alerta de Precio Cambiado](screens/precio-cambiado.png)
  - [Carta en Móvil](screens/carta-admin-movil.png)

---

## 4. Límites de Alcance y Próximos Pasos

- **Aislamiento**: Pruebas PostgreSQL ejecutadas en bases efímeras `qatupos_lab_test_*`; la base de datos interactiva `qatupos_lab` permanece intacta.
- **Entorno simulado**: Proveedores de pago (Yape/POS), hardware de impresión y SUNAT permanecen simulados bajo rótulos claros en la interfaz.
- **Límites**: No se incluyen recetas complejas, unidades fraccionarias, combos, mermas ni canales de delivery externo.
