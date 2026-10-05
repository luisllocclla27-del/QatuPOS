# Documento de Diseño: Anulaciones de Pedidos y Liberación de Cobros

**Fecha**: 2026-10-02  
**Feature**: `007-anulaciones-devoluciones`  
**Estado**: Aprobado por el usuario  
**Alcance**: Piloto presencial El Encanto Huamanguino (`F:/PROYECTOS/QatuPOS/el-encanto-huamanguino`)

---

## 1. Contexto y Objetivos

En la operación real de una marisquería (El Encanto Huamanguino), un comensal puede equivocarse, desistir de un plato o solicitar la cancelación de una bebida antes de su consumo. Previamente, una comanda aceptada no podía anularse, obligando al pago y preparación forzosa.
Asimismo, si en Caja se reservaba un importe para pago digital o con tarjeta y el cliente cambiaba de opinión a efectivo, no existía una forma de liberar la retención sin registrar un pago incierto artificial.

Este incremento implementa:
1. **Anulación Granular de Líneas de Pedido (`order.line.void`)**:
   - Autorizado exclusivamente para personal de **Caja** y **Administración** (`cashier`, `admin`).
   - El mozo no puede anular directamente; debe solicitar la anulación en Caja.
   - Requiere motivo obligatorio (mínimo 3 caracteres) registrado en auditoría (`order_void_audit`).
   - Reduce el total de la cuenta y el saldo por cobrar en céntimos exactos PEN (`MoneyMinor`).
   - Libera existencias reservadas no entregadas, y permite reintegrar existencias entregadas según confirmación de Caja.
   - Emite comanda de anulación a estaciones para detener la elaboración en cocina.
2. **Liberación de Cobro Retenido (`collection.release`)**:
   - Permite al cajero liberar un cobro reservado (`CollectionAuthorization` en estado `reserved`), reintegrando el saldo libre a la cuenta.

---

## 2. Contratos y Comandos (`@qatu/contracts`)

### Comandos
```typescript
export interface OrderLineVoidCommand {
  type: 'order.line.void';
  operation_id: UUID;
  line_id: UUID;
  expected_version: number;
  quantity: number;
  restore_stock: boolean;
  reason: string;
}

export interface CollectionReleaseCommand {
  type: 'collection.release';
  operation_id: UUID;
  authorization_id: UUID;
  expected_version: number;
  reason: string;
}
```

### Entidades y Extensiones
- `OrderLine`:
  - `voided_quantity: number` (acumulado de unidades anuladas, 0 por defecto).
- `OrderVoidAuditEntry`:
  - `id: UUID`
  - `actor_id: UUID`
  - `operation_id: UUID`
  - `line_id: UUID`
  - `order_id: UUID`
  - `visit_id: UUID`
  - `quantity: number`
  - `amount_minor: MoneyMinor`
  - `restored_stock: boolean`
  - `reason: string`
  - `created_at: string`

---

## 3. Lógica Transaccional y Financiera (`@qatu/domain` & `services/commerce`)

1. **Bloqueo y Autorización**:
   - `SELECT ... FOR UPDATE` de la visita y la cuenta en PostgreSQL.
   - Verificación de rol: `session.user.role === 'cashier' || session.user.role === 'admin'`. De lo contrario: `DomainError('FORBIDDEN')`.
   - Verificación de visita: estado `open`.
2. **Validación de Cantidad y Coherencia de Saldo**:
   - `quantity >= 1` y `quantity <= (line.quantity - line.voided_quantity)`.
   - `void_amount = quantity * line.unit_price_minor`.
   - `check.paid_minor + check.held_minor <= check.total_minor - void_amount`. Si el saldo libre no cubre el monto a anular, se rechaza con `CHECK_BALANCE_EXCEEDED`.
3. **Ajuste de Cuenta**:
   - `check.total_minor -= void_amount`.
   - `check.remaining_collectible_minor -= void_amount`.
   - Incremento de `check.version` y `line.version`.
4. **Control de Inventario**:
   - Si `line.stock_policy === 'unit'` y `line.stock_item_id`:
     - Unidades no entregadas (`unfulfilled = max(0, line.quantity - line.fulfilled_quantity - line.voided_quantity)`): se reduce `StockItem.reserved -= min(quantity, unfulfilled)` y aumenta `StockItem.available += min(quantity, unfulfilled)`.
     - Si `restore_stock === true` para unidades ya entregadas: `StockItem.on_hand += qty_restored`, `StockItem.available += qty_restored` con `StockMovement(kind: 'adjustment')`.
5. **Aviso a Estaciones y Auditoría**:
   - Si la línea pertenece a `cocina` o `heladeria`: emisión de `PrintJob` con mensaje de anulación para el cocinero/heladero.
   - Inserción atómica en `order_void_audit`.

---

## 4. Experiencia de Usuario (`apps/pos`)

1. **Pestaña Caja**:
   - Al seleccionar una cuenta, se muestra la lista de platos de las tandas.
   - Botón `Anular` por cada línea activa.
   - Modal con selector de cantidad, motivo obligatorio y opción de reintegro de stock.
   - Botón `Liberar cobro` si existe una autorización reservada.
2. **Pestaña Mesas (Mozo)**:
   - Indicador visual de platos anulados (tachado / badge `Anulado` y motivo).
   - Mensaje informativo: *«Para anular pedidos enviados a cocina, acércate a Caja»*.
3. **Portal Cliente (`/cliente`)**:
   - Actualización en tiempo real del estado de líneas anuladas en *«Mis pedidos»*.

---

## 5. Estrategia de Pruebas y Aceptación

- **Unitarias (`tests/unit/`)**: Aritmética de reducción, validación de motivos, rol y stock.
- **Integración (`tests/integration/`)**: Persistencia atómica en PostgreSQL y rechazo a rol mozo.
- **End-to-End (`tests/e2e/zzzz-voids.spec.ts`)**: Recorrido completo con mozo pidiendo, caja anulando, stock restituido, cobro ajustado y cierre de mesa.
