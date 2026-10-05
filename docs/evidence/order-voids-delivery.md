# Entrega · Anulaciones de Pedidos, Reposición de Stock y Liberación de Cobros

02/10/2026. Ejecución `95093d70-f6bb-4045-8486-a6423e30d5cc` · Asignación `43fbd161-f812-4e8c-bcc3-cee9f986ea5c` · WorkKind `implementation` · Feature `specs/007-anulaciones-devoluciones`.

Se entrega la implementación completa e integrada del incremento de **anulaciones de comandas, reposición de inventario físico/disponible, recálculo atómico de cuentas y liberación de cobros retenidos** en el piloto presencial **El Encanto Huamanguino**.

---

## 1. Resumen de Capacidades Implementadas

1. **Anulación Granular de Comandas (`order.line.void`)**:
   - Capacidad exclusiva para personal de Caja y Administración (`cashier` y `admin`).
   - Los mozos y cocineros son bloqueados en servidor con HTTP 403 `FORBIDDEN`.
   - Permite anular unidades individuales o completas de una línea de pedido activa.
   - Motivo obligatorio (mínimo 3 caracteres) registrado en auditoría inmutable.
   - Recálculo exacto del total de la cuenta (`check.total_minor`) y saldo libre (`check.remaining_collectible_minor`) en céntimos enteros PEN (`MoneyMinor`).
   - Control de seguridad: rechaza con `CHECK_BALANCE_EXCEEDED` si el monto a anular supera el saldo libre disponible (impidiendo saldos negativos).

2. **Gestión Inteligente de Inventario y Mermas**:
   - **Platos no entregados**: La cantidad anulada libera su reserva física, devolviendo automáticamente el saldo a unidades disponibles (`reserved -= qty`, `available += qty`).
   - **Platos ya entregados**: El cajero decide si la unidad física reingresa a almacén (`restore_stock: true`, generando un movimiento de inventario `adjustment`) o se registra como merma/consumo sin retorno físico (`restore_stock: false`).

3. **Liberación de Cobros Retenidos (`collection.release`)**:
   - Permite al cajero o administrador cancelar una autorización de cobro en estado `reserved` (ej. cambio a efectivo o tarjeta declinada) con motivo justificado.
   - Restituye inmediatamente el importe retenido al saldo disponible por cobrar (`held_minor -= amount`, `remaining_collectible_minor += amount`).
   - Evita la creación de cobros inciertos cuando el cliente simplemente cambió de método de pago.

4. **Alertas a Estaciones de Preparación**:
   - Generación automática de tickets `PrintJob` rotulados `[ANULADO]` dirigidos a Cocina o Heladería con el detalle del producto, cantidad y motivo de la anulación para detener la preparación física.

5. **Experiencia de Usuario en Caja (`apps/pos`)**:
   - Panel de comandas de la mesa seleccionada con detalle de tandas, unidades pedidas, entregadas y anuladas.
   - Modal interactivo de anulación con selector de cantidad, motivo obligatorio y checkbox para reincorporar stock físico.
   - Botón contextual para liberar cobros retenidos con diálogo de confirmación y motivo.
   - Tabla de **Auditoría de Anulaciones** en la pantalla de Caja con trazabilidad en tiempo real de ítems anulados, impacto financiero y reposición de almacén.
   - Permite cerrar visitas (`table.close`) con normalidad cuando todas las unidades activas no anuladas han sido entregadas y cobradas.

---

## 2. Evidencia de Verificación Técnica

- **Typecheck**: `pnpm typecheck` aprobado con 0 errores de TypeScript (`tsc --noEmit`).
- **Compilación de producción**: `pnpm build` (`next build` con Turbopack) exitoso en 655ms.
- **Pruebas Unitarias y de Integración**:
  - `pnpm test` (Vitest): **126 pruebas aprobadas al 100%** en 5 suites:
    - `tests/unit/contracts.test.ts` (29 pruebas): esquemas, validación OpenAPI y contratos de anulación/liberación.
    - `tests/unit/exact.test.ts` (13 pruebas): aritmética entera sin punto flotante en céntimos PEN.
    - `tests/unit/pilot-domain.test.ts` (52 pruebas): reglas puras de dominio, escenarios US1-US4, límites financieros y cierre de mesa con anulados.
    - `tests/integration/api.test.ts` (15 pruebas): persistencia transaccional PostgreSQL en `order_void_audit`, rechazo a mozo, liberación de autorización y repetición idempotente.
    - `tests/integration/guest.test.ts` (17 pruebas): ciclo de vida de cliente en mesa y cotizaciones.
- **Pruebas End-to-End en Playwright**:
  - `pnpm test:e2e`: **8 escenarios aprobados al 100%**:
    - `pos.spec.ts` (2 pruebas): dos terminales táctiles compartiendo mesa, cobro exacto en caja, despacho y adaptación móvil.
    - `zz-guest.spec.ts` (3 pruebas): pedidos de cliente, clave de mesa, tolerancia a fallos.
    - `zzz-catalog.spec.ts` (2 pruebas): alta y edición de carta por admin, rechazo por cambio de precio 409 `PRICE_CHANGED` y confirmación consciente.
    - `zzzz-voids.spec.ts` (1 prueba): flujo completo de comanda, reserva y liberación de cobro con tarjeta, anulación en caja con motivo y ajuste de inventario, recálculo atómico de cuenta, entrega en cocina, cobro en efectivo y cierre exitoso de mesa.
- **Validación SDD**:
  - `pnpm validate:sdd`: **25/25 comprobaciones aprobadas**, generando `docs/evidence/planning-validation.json`.

---

## 3. Capturas de Pantalla y Auditoría

- `docs/evidence/screens/anulacion-caja.png`: Pantalla de Caja con la línea anulada, el recálculo atómico del total y el panel de auditoría reciente.
- `docs/evidence/screens/mesa-cerrada-anulada.png`: Cierre exitoso y liberación de la mesa tras cobrar el importe neto post-anulación.

---

## 4. Enlaces de Documentación

- [Revisión Independiente](order-voids-review.md): Verificación formal de seguridad financiera, concurrencia y roles.
- [WorkOrder de Asignación](../construction/runs/2026-10-02-order-voids/work-order.json): Ficha de trabajo formal del incremento.
- [Delivery JSON](../construction/runs/2026-10-02-order-voids/delivery.json): Manifiesto estructurado de entrega y hashes SHA-256.
- [Reporte de Continuidad](CONTINUIDAD.md): Estado general de la aplicación y base técnica.
