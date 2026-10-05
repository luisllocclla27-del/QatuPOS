# Research & Architecture Decisions (ADR)

## ADR-1: Almacenamiento y Ciclo de Vida de las Cotizaciones (Quotes)

### Contexto
El sistema requiere que antes de aceptar un pedido, el cliente (o mozo) obtenga una cotización con precios calculados por el servidor. Dicha cotización debe ser inmutable y verificarse de forma estricta al confirmar el pedido.
Se evaluaron tres opciones de almacenamiento:
1. Almacenar las cotizaciones dentro del agregado JSONB `branch_state`.
2. Utilizar tokens firmados (JWT/HMAC) devueltos al cliente y decodificados al aceptar.
3. Almacenar las cotizaciones en una tabla PostgreSQL dedicada `order_quotes`.

### Decisión
Se selecciona la **Opción 3 (tabla PostgreSQL `order_quotes`)**:
- Mantiene el agregado `branch_state` libre de datos efímeros con alto volumen de creación/expiración.
- Permite indexar y expirar cotizaciones por `expires_at` fácilmente.
- Permite verificar y bloquear la cotización dentro de la transacción comercial que realiza `SELECT ... FOR UPDATE` sobre `branch_state`.
- Es completamente inmune a manipulaciones del lado del cliente, conservando la regla de que el navegador nunca es fuente de autoridad.

---

## ADR-2: Política y Duración de Expiración (TTL)

### Contexto
Los precios o la disponibilidad pueden variar durante el turno del restaurante. Se propuso inicialmente una ventana de 120 segundos.

### Decisión
- La expiración se fija en **120 segundos** a partir de la emisión en el reloj del servidor.
- El cálculo se realiza comparando `context.now <= quote.expires_at`.
- Si la cotización expira antes de que el usuario envíe la confirmación, se responde `409 QUOTE_EXPIRED` (o `400`).
- La interfaz detecta este estado y solicita automáticamente una nueva cotización mostrando los precios actualizados.

---

## ADR-3: Manejo de Idempotencia y Cambio de Precio Concurrente

### Contexto
¿Qué ocurre si un pedido fue aceptado exitosamente a S/ 35.00, luego el administrador sube el precio a S/ 38.00, y el cliente reintenta el mismo `operation_id` por pérdida de conexión?

### Decisión
- Conforme a **CAT-FR-010**, la deduplicación por `operation_id` en `command_operations` tiene precedencia al evaluar reintentos idénticos del mismo participante.
- Si la operación ya fue aceptada, el servidor devuelve la orden original congelada a S/ 35.00 con `replayed: true`.
- Esto garantiza que interrupciones de red no provoquen dobles cobros ni fallen retrospectivamente órdenes ya consolidadas.

---

## ADR-4: Inmutabilidad de Atributos Estructurales con Historial Comercial

### Contexto
Un producto puede haber sido impreso y despachado hacia una estación (ej. Cocina) o haber descontado inventario con política unitaria. Si un administrador cambiase su estación a Caja o removiese su vinculación de inventario, se generaría inconsistencia contable e histórica.

### Decisión
- Conforme a **CAT-FR-012**, si un producto tiene líneas registradas en cualquier orden dentro de `state.orders`, se bloquea cualquier intento de cambiar `station`, `stock_policy` o `stock_item_id`.
- Se permite actualizar `name`, `category`, `price_minor` y el estado `active`.
- El intento de cambiar los campos estructurales devuelve `409 COMMERCIAL_HISTORY_LOCKED`.
