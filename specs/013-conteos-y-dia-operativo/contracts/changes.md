# Contrato013

POST /v1/pos/commands existente, sesión/tenant/local/roles/CSRF servidor.

- InventoryCount: business_day_id UUID opcional lectura legacy, requerido por nuevos efectos; status agrega superseded y superseded_by opcional. DayClose agrega pending_inventory_count_ids opcional lectura, siempre escrito al cerrar ahora.
- StockCountLine agrega expected_stock_version servidor para ayuda de revisión, opcional en lectura histórica/traspasos; no es entrada del comando de conteo. Versiones se verifican contra el registro interno de servidor.
- inventory.count: cashier propietario de caja abierta solo Caja; admin cualquier estación. Nuevo día servidor. Solapamiento exige incluir todos los SKU del conteo sustituido o400 VALIDATION_ERROR. Sustitución completa+declaración atómicas.
- inventory.adjust: admin diferente del declarador; día vigente y abierto. Status no declared409 INVALID_TRANSITION; día desconocido/anterior409 BUSINESS_DAY_LOCKED; versión/on_hand distintos409 VERSION_CONFLICT; cantidad menor a reserved409 STOCK_RESERVATIONS_EXCEED_COUNT. Motivo válido obligatorio incluso cero diferencia. Validar todas las líneas antes de mutar.
- order.create y line.fulfill sobre SKU retenido409 RESOURCE_COUNTING. Cotización permitida, sin reserva; aprobación/reserva serializadas en escritor. Void físico restore_stock sobre SKU contado409; void libera reserva pendiente sin stock ficticio, versión cambia y exige reconteo.
- handover.begin sobre Caja con conteo pendiente409 RESOURCE_COUNTING; contar/ajustar otra estación durante handover permitido. day.close provisional registra IDs de conteos declared y nota, sin aceptar stock ni pago unknown.
- order.line.void, check.discount.apply/remove sobre cuenta con pedidos de día anterior409 BUSINESS_DAY_LOCKED; cobranza anterior sin cambio de contrato.

Rechazo sin nuevas operaciones/estado/auditoría/outbox. Replay de operación válida sin nuevo efecto; versiones y scope existentes no se debilitan. OpenAPI enum/status/propiedades se actualizan con runtime, sin endpoint/migración nuevos.
