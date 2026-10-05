# 012 · Catálogo coherente y custodia protegida

03/10/2026. Alcance local sintético; implementación autorizada. Complementa006/007/011 sin modificar sus evidencias históricas. Revisión financiera independiente pendiente.

## Escenarios

1. Administración crea una oferta con identidad única. Repetir una operación recupera el resultado; otra operación con el mismo producto devuelve409 y no agrega productos, auditoría ni eventos.
2. Una oferta por unidad consume un SKU existente de su misma estación. Heladería no puede consumir cerveza de Caja. Dos ofertas pueden compartir un SKU; esto no duplica su existencia ni reservas.
3. Antes del primer pedido se puede corregir estación/política/SKU. La edición valida primero el estado final completo y audita todos los campos que cambiaron. Con cualquier pedido histórico, incluso anulado, estos tres campos quedan bloqueados; nombre/precio/visibilidad siguen editables y las líneas históricas permanecen intactas.
4. Al contar bebidas para un traspaso, liberar su reserva o reintegrar una unidad queda bloqueado. Una anulación de cocina o heladería continúa. Una bebida completamente entregada anulada sin reintegro puede ajustar el consumo comercial sin modificar las existencias contadas.
5. El formulario explica estación, SKU compatible, falta de inventario disponible y bloqueo por historial antes de guardar. El servidor sigue siendo autoridad.

## Requisitos

- CATC-FR-001: identidad de producto única dentro del agregado tenant/local,409 PRODUCT_ID_CONFLICT; incluye productos inactivos. No se renombra ni borra un ID existente.
- CATC-FR-002: `unit` exige SKU no nulo existente en el mismo local y estación; `none` exige SKU nulo. No inferir estación por nombre ni incorporar recetas.
- CATC-FR-003: en update, campo omitido conserva valor; SKU explícito se procesa aunque stock_policy se omita. Cambiar a none con SKU omitido limpia el vínculo; enviar SKU no nulo con none es400. Pasar a unit sin vínculo válido es400. Todo se valida antes de mutar.
- CATC-FR-004: bloquear cualquier cambio efectivo de estación/política/SKU ante historial comercial; campos iguales pueden reenviarse. Auditoría incluye valores anterior/nuevo de todos los campos cambiados, actor, operación, motivo y versiones.
- CATC-FR-005: no modificar reservas ni pedidos históricos al editar carta. Reservas de nuevas ofertas que comparten SKU usan el stock común del núcleo.
- CATC-FR-006: void que libera reservas o reintegra unidades de stock de Caja devuelve409 RESOURCE_COUNTING durante handover prepared/declared/disputed. No congelar otras estaciones ni considerar un retorno stock si restore_stock=false y toda la cantidad ya estaba entregada.
- CATC-FR-007: rechazo no persiste estado/operación/auditoría/outbox; replay mismo operation_id mantiene resultado original y conflicto de versión sigue activo. Nunca inferir pago ni validez fiscal.
- CATC-FR-008: UI lista solo SKU de estación elegida, solicita selección explícita, muestra ausencia de SKU compatible y mantiene bloqueo histórico. No elegir cerveza automáticamente al crear un plato.

## Aceptación

- CATC-AT-001: mismoID concurrente, dos operaciones: una200, otra409, un producto y un evento; replay200 sin duplicación.
- CATC-AT-002: SKU ajeno de estación y none+SKU rechazan400 sin efectos; helado/Heladería correcto acepta.
- CATC-AT-003: edición de SKU solo cambia y audita; transición none limpia y audita vínculo; cambio conjunto válido estación/unit/SKU auditado completo.
- CATC-AT-004: edición tras pedido rechaza cambio de ruta aun después de anular; cambiar precio/nombre conserva línea/stock/ticket histórico.
- CATC-AT-005: prepared/declared/disputed conservan stock/reserva/cuenta/auditoría ante void de bebidas; al aceptar handover la operación puede ejecutarse normalmente. Cocina/Heladería no se bloquean.
- CATC-AT-006: formulario sin SKU compatible no permite alta unit; al cambiar estación solicita selección compatible y logra alta/cambio auditado.

## Límites

No se repara automáticamente catálogo histórico inconsistente; no migración SQL nueva. Límite SQL integer vs MoneyMinor, ajustes sobre días cerrados, conteos bajo reservas, historial de entregas anuladas, recetas, merma, hardware y fiscalidad real quedan pendientes explícitos. No aceptar financieramente011 por usarla de baseline.
