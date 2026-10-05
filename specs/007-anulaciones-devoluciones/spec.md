# Feature Specification: Anulación de Pedidos y Liberación de Cobros

**Feature ID**: `007-anulaciones-devoluciones` · Sin rama nueva. **Created**: 2026-10-02. **Status**: especificación formalizada; lista para implementación.

**Input**: El personal de Caja o Administración anula de forma granular líneas o tandas de pedidos con motivo obligatorio registrado en auditoría, restituyendo stock disponible y recalculando el total de la cuenta sin punto flotante; asimismo, Caja puede liberar autorizaciones de cobro retenidas sin generar cobros inciertos.

---

## User Scenarios & Testing

### US1 — Caja anula plato no preparado con restitución de stock (P1)
Un comensal o mozo solicita anular un plato o bebida antes de su preparación/entrega. El mozo no puede anular; acude a Caja. El cajero selecciona la mesa, elige la línea, ingresa la cantidad a anular y un motivo obligatorio (mínimo 3 caracteres). El servidor valida atómicamente la solicitud:
- Si el ítem tenía stock reservado, libera la reserva al stock disponible.
- Descuenta el valor exacto de la cuenta de la mesa y del saldo libre.
- Emite un aviso de anulación a la estación de cocina.
- La línea queda marcada con su cantidad anulada y motivo para auditoría.

**Independent Test**: Anular 1 Cerveza personal en una comanda reduce la cuenta en S/ 10.00, incrementa el stock disponible en 1 unidad, emite ticket de anulación a cocina/heladería y no altera pagos previos.

### US2 — Caja anula ítem ya entregado con decisión de reintegro de stock (P1)
Un plato o bebida fue entregado pero devuelto (ej. bebida cerrada no deseada). El cajero anula la línea especificando si la unidad física vuelve a almacén (`restore_stock: true`) o es merma (`false`).
- Si `restore_stock: true`: se incrementa `on_hand` y `available` con movimiento de inventario tipo `adjustment`.
- La cuenta se reduce en el monto exacto siempre que el saldo pagado no exceda el nuevo total.

**Independent Test**: Anular con `restore_stock: true` incrementa existencias físicas; con `restore_stock: false` mantiene el stock físico intacto registrando el motivo en auditoría.

### US3 — Intento de anulación por mozo denegado (P1)
Un usuario con rol `waiter` intenta ejecutar `order.line.void` por interfaz o API directa. El servidor rechaza inmediatamente la operación con HTTP 403 `FORBIDDEN`.

**Independent Test**: Solicitud con sesión de mozo devuelve código 403 y no modifica cuenta ni stock.

### US4 — Liberación de cobro retenido en Caja (P1)
El cajero reservó S/ 50.00 para pago digital con tarjeta o Yape (`collection.authorize`), pero el cliente prefiere pagar en efectivo. El cajero pulsa "Liberar cobro" con motivo justificado.
- El servidor ejecuta `collection.release`.
- `check.held_minor` vuelve a 0 y `check.remaining_collectible_minor` recupera el importe completo.
- No se genera cobro incierto ni se requiere resolución posterior.

**Independent Test**: Liberar autorización reservada desbloquea el saldo de la cuenta de inmediato para un nuevo cobro en efectivo.

---

## Edge Cases

1. **Intento de anular más unidades de las existentes**: Si una línea tiene 2 unidades y se intenta anular 3, el servidor rechaza con `QUANTITY_EXCEEDED`.
2. **Cuenta con pagos que superan el nuevo total**: Si una cuenta de S/ 50.00 ya tiene S/ 40.00 pagados y se intenta anular un plato de S/ 20.00 (nuevo total sería S/ 30.00), el comando es rechazado con `CHECK_BALANCE_EXCEEDED` para prevenir saldos negativos sin devolución financiera explícita.
3. **Motivo vacío o corto**: Motivos con menos de 3 caracteres son rechazados con `VALIDATION_ERROR`.
4. **Visita ya cerrada**: Si la visita fue cerrada o pagada totalmente, la anulación es rechazada con `VISIT_NOT_OPEN`.
5. **Reintento idempotente**: Reintentos con el mismo `operation_id` devuelven el resultado previo sin volver a descontar la cuenta ni duplicar inventario.

---

## Requirements

- **VOID-FR-001**: Las anulaciones de líneas solo pueden ser autorizadas por roles `cashier` y `admin`.
- **VOID-FR-002**: Toda anulación exige un motivo obligatorio de al menos 3 caracteres registrado en `order_void_audit`.
- **VOID-FR-003**: El ajuste financiero se calcula exclusivamente en céntimos enteros PEN (`MoneyMinor`) bajo bloqueo transaccional.
- **VOID-FR-004**: No se puede anular un monto mayor al saldo libre por cobrar de la cuenta (`CHECK_BALANCE_EXCEEDED`).
- **VOID-FR-005**: Las unidades de stock no entregadas se liberan de reserva automáticamente al inventario disponible.
- **VOID-FR-006**: Las unidades de stock ya entregadas solo se restituyen a almacén si se confirma explícitamente `restore_stock: true`.
- **VOID-FR-007**: Se emite comanda de anulación a las estaciones para detener la elaboración física en Cocina/Heladería.
- **VOID-FR-008**: La liberación de cobro (`collection.release`) restituye el importe retenido al saldo cobrable de la cuenta.
- **VOID-FR-009**: Las líneas históricas conservan su inmutabilidad mediante el campo acumulado `voided_quantity`.
- **VOID-FR-010**: La migración PostgreSQL es aditiva (`007_voids_and_releases.sql`) y no modifica datos existentes.
