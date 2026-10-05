# Contrato012

POST /v1/pos/commands existente. Create/update siguen admin; void cashier/admin. Sesión/CSRF y scope se resuelven en servidor. JSON estricto, importes servidor, mismo contrato transaccional.

Create: `product_id` opcional UUID; si existe incluso inactivo →409 PRODUCT_ID_CONFLICT. Omitido generaID servidor. Update: omitted route fields conservar, explicit SKU validar, final none+SKU no nulo400 VALIDATION_ERROR, final unit+SKU ausente/ajeno/otraestación400. No se silencian campos. Historial y cambio efectivo →409 COMMERCIAL_HISTORY_LOCKED.

Void: stock Caja, handover prepared/declared/disputed y efecto de reserva/reintegro →409 RESOURCE_COUNTING. Otraestación o sin efecto de stock conservan flujo vigente.

Error enum OpenAPI/TS agrega PRODUCT_ID_CONFLICT. OpenAPI documenta semántica de campos y máximo safeinteger existente del precio. No cambio de persistencia ni de impuestos.

Todos los rechazos dejan cero nuevas operaciones/efectos; replay de operación válida recupera una sola auditoría/outbox con permisos vigentes.
