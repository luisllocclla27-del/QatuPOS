# Feature Specification: carta configurable con revisión de precios

**Feature ID**: `006-carta-precios` · Sin rama nueva. **Created**: 2026-10-02. **Status**: especificación formalizada; en implementación.

**Input**: el administrador configura la carta sintética (alta, precio en céntimos PEN, categoría, nombre, habilitación, estación y control de stock unitario); mozo y cliente solicitan cotizaciones inmutables calculadas por el servidor; si el precio o disponibilidad comercial cambia antes de confirmar el pedido, el servidor rechaza la cotización sin efectos comerciales y exige revisión y confirmación explícita con el nuevo precio.

---

## User Scenarios & Testing

### US1 — Administrador configura productos de la carta (P1)
El administrador del local accede a la sección de administración de carta en el POS. Puede listar productos filtrando por categoría, estación y estado de venta (activo/deshabilitado). Puede crear un nuevo producto con nombre, categoría, precio en céntimos (positivo), estación (`cocina`, `heladeria` o `caja`) y control de existencias (sin stock o vinculado a un ítem existente de `caja`). Puede editar nombre, categoría, precio y estado activo de productos existentes con control de versión optimista (`expected_version`). Si un producto ya tiene historial comercial en pedidos aceptados, el servidor bloquea cambios en su estación o control de inventario para preservar la integridad operativa.

**Independent Test**: Dos administradores cargan el producto versión 1; el primero sube el precio de S/ 35.00 a S/ 38.00 (versión pasa a 2); el segundo intenta guardar sobre versión 1 y recibe `VERSION_CONFLICT` sin sobrescribir.

### US2 — Cotización inmutable y revisión antes de aceptar pedidos (P1)
Tanto el mozo en su terminal o tablet como el cliente en `/cliente` agregan platos o bebidas a su borrador. Antes de registrar el pedido, el cliente HTTP solicita una cotización (`quote`) al servidor indicando las líneas solicitadas. El servidor calcula los precios en céntimos PEN con aritmética entera exacta, fija las versiones de los productos cotizados, genera un identificador opaco `quote_id` con expiración de 120 segundos y devuelve el resumen financiero oficial. La cotización no reserva existencias, no afecta el saldo de la cuenta ni emite tickets. La interfaz presenta la cotización al usuario para su revisión y confirmación expresa.

**Independent Test**: Solicitar cotización devuelve `total_minor` exacto y fecha de expiración; inspeccionar la cuenta de la mesa y las existencias demuestra que no hubo reservas ni cargos.

### US3 — Rechazo por cambio de precio y confirmación del nuevo valor (P1)
Un cliente o mozo cotiza un Ceviche a S/ 35.00 (`quote_id` Q1). Antes de que confirme el pedido, el administrador actualiza el precio del Ceviche a S/ 38.00. Cuando el cliente envía la confirmación con Q1, el servidor verifica atómicamente la cotización bajo bloqueo de la visita y del local: detecta que el precio vigente en la carta ya no coincide con el valor cotizado. La transacción se revierte por completo: no se crea orden, no se descuenta stock, no se añade cargo a la cuenta y no se genera ticket. El servidor responde con `PRICE_CHANGED` detallando el nuevo valor. La interfaz muestra un aviso claro («El precio cambió. Revisa tu pedido»), actualiza el precio a S/ 38.00 conservando la selección del usuario y requiere una nueva confirmación consciente.

**Independent Test**: Ejecutar confirmación con precio obsoleto genera error 409 `PRICE_CHANGED`, saldo inalterado y cero tickets emitidos; solicitar nueva cotización a S/ 38.00 y confirmarla registra exitosamente el pedido.

### US4 — Deshabilitación de producto y última unidad compartida (P1)
Si un producto es deshabilitado por el administrador tras haber sido cotizado, el intento de confirmación falla con `PRODUCT_UNAVAILABLE` sin efectos colaterales; las tandas ya aceptadas previamente siguen su curso normal de preparación y entrega. Si dos terminales cotizan simultáneamente la última unidad de una bebida con stock unitario, solo la primera confirmación que entre al commit transaccional reserva y acepta la orden; la segunda recibe `INSUFFICIENT_STOCK` sin números negativos en almacén.

**Independent Test**: Deshabilitar un plato impide nuevos pedidos cotizados previamente pero mantiene la entrega de pedidos ya aceptados en Cocina/Heladería.

---

## Edge Cases

1. **Cotización vencida**: Si transcurren más de 120 segundos entre la cotización y la confirmación, el servidor rechaza con `QUOTE_EXPIRED`. El frontend renueva la cotización y solicita confirmación.
2. **Cambio de producto ajeno al carrito**: Si el administrador sube el precio del Arroz con Mariscos pero el cliente solo cotizó Ceviche, la cotización del cliente permanece válida y se acepta normalmente (CAT-FR-009).
3. **Respuesta perdida / Reintento idempotente**: Si un envío de confirmación sufre interrupción de red y se reintenta con el mismo `operation_id` y `quote_id`, el servidor devuelve el pedido original sin duplicar cargos ni tickets, incluso si el catálogo cambió después (CAT-FR-010).
4. **Pago o cierre concurrente de la visita**: Si Caja confirma el pago total de la cuenta mientras el cliente confirma una cotización, la transacción comercial comprueba el estado de la visita bajo bloqueo y rechaza la orden con `GUEST_ACCESS_ENDED` o `VISIT_NOT_OPEN`.
5. **Sesión de cliente cerrada o clave rotada**: Si el mozo rota la clave o la atención concluye, cualquier cotización vinculada a esa sesión o visita queda inmediatamente invalidada.
6. **Entrada de precio inválido**: Intentos de enviar decimales, cadenas mal formateadas o precios negativos/cero son rechazados por validación estricta en servidor.

---

## Requirements

- **CAT-FR-001**: Todo precio PEN es un entero en céntimos (`MoneyMinor`), positivo (> 0), calculado exclusivamente con aritmética exacta sin punto flotante.
- **CAT-FR-002**: Las modificaciones a productos exigen `expected_version`; dos ediciones concurrentes sobre la misma versión no se sobrescriben silenciosamente (`VERSION_CONFLICT`).
- **CAT-FR-003**: Las operaciones de catálogo, su auditoría (`catalog_audit`) y los eventos outbox se persisten atómicamente por el escritor transaccional existente.
- **CAT-FR-004**: Los pedidos aceptados congelan en cada línea el nombre del producto, precio unitario, estación y política de stock al momento de la aceptación; cambios posteriores en la carta no modifican pedidos históricos.
- **CAT-FR-005**: Las cotizaciones son generadas y calculadas exclusivamente por el servidor, vinculadas a la visita y al actor/sesión originador. El frontend no decide ni envía importes o totales de autoridad.
- **CAT-FR-006**: La cotización es inmutable, tiene un TTL estricto (120 segundos reloj de servidor) y no constituye reserva de existencias, cargo a la cuenta ni emisión de órdenes.
- **CAT-FR-007**: La aceptación de una orden valida atómicamente en la misma transacción la vigencia de la cotización, la correspondencia de versiones y precios de cada producto, la disponibilidad de stock, el estado de la visita y el saldo de la cuenta.
- **CAT-FR-008**: Si el precio o la disponibilidad de un producto cotizado cambió antes de la confirmación, el comando se rechaza sin efectos colaterales (`PRICE_CHANGED` o `PRODUCT_UNAVAILABLE`) y la UI debe requerir nueva revisión.
- **CAT-FR-009**: Cambios en productos que no forman parte de las líneas cotizadas no invalidan la cotización.
- **CAT-FR-010**: El reintento con el mismo `operation_id` devuelve de forma idempotente el resultado previo sin nuevos cargos ni impresiones duplicadas, verificando siempre los permisos del participante.
- **CAT-FR-011**: Deshabilitar o archivar un producto impide nuevas cotizaciones u órdenes, pero preserva intacta la preparación y entrega de tandas históricas ya aceptadas.
- **CAT-FR-012**: La primera entrega bloquea la modificación de estación, política de inventario o vínculo a stock de un producto si ya tiene líneas registradas en pedidos aceptados (`COMMERCIAL_HISTORY_LOCKED`).
- **CAT-FR-013**: Los endpoints de administración de catálogo y auditoría son exclusivos para usuarios con rol `admin`. El cliente en `/cliente` o personal no autorizado no tienen acceso a estos contratos.
- **CAT-FR-014**: Ante fallos de red durante el envío de la orden, la interfaz preserva el borrador y la operación para recuperación explícita sin generar identificadores nuevos al azar.
- **CAT-FR-015**: El catálogo expuesto a POS y cliente refleja en tiempo real la proyección autorizada por el servidor; cachés locales no autorizan discrepancias.
- **CAT-FR-016**: La migración de base de datos es aditiva (`006_catalog_and_quotes.sql`) y preserva todas las cuentas, pagos, stock, visitas y pedidos existentes.

---

## Success Criteria

- **CAT-SC-001**: Un cambio de precio en la carta de S/ 35.00 a S/ 38.00 rechaza fehacientemente cualquier confirmación basada en la cotización a S/ 35.00 con código `PRICE_CHANGED` y cero impacto en saldo o inventario.
- **CAT-SC-002**: Una orden aceptada a S/ 35.00 permanece registrada a S/ 35.00 en la cuenta, tickets e historial tras actualizar la carta a S/ 38.00.
- **CAT-SC-003**: Dos administradores modificando el mismo producto al mismo tiempo: uno confirma y el segundo recibe `VERSION_CONFLICT` con los datos actualizados.
- **CAT-SC-004**: Una cotización confirmada después de 120 segundos es rechazada con `QUOTE_EXPIRED`.
- **CAT-SC-005**: Carreras por la última unidad de stock entre dos terminales resultan en una única aceptación y rechazo por stock insuficiente sin números negativos.
- **CAT-SC-006**: Deshabilitar un plato impide su inclusión en nuevas cotizaciones y rechaza cotizaciones previas, mientras pedidos pendientes en cocina siguen preparándose.
- **CAT-SC-007**: Todo el flujo (creación/edición de carta en admin, cotización, revisión de precios en mozo y cliente) funciona fluidamente en tabletas (1024×768) y móviles (390×844) con controles accesibles (>= 44px).
- **CAT-SC-008**: La suite completa de pruebas unitarias, contratos, integración PostgreSQL y escenarios Playwright se ejecuta y aprueba al 100%.
