# Contrato014

POST /v1/pos/commands existente, cookie/CSRF, autoridad tenant/local servidor.

- table.assign {visit_id,expected_version,waiter_id,reason}: waiter solo a sí mismo sobre mesa propia/sin responsable; admin a waiter local. Visita abierta.
- order.priority {order_id,expected_version,priority:normal|urgent,reason}: waiter/admin, pedido accepted con preparación pendiente. Versión de producción independiente (legacy1). Cambia prioridad/version, auditoría y aviso por estación; no duplica pedido/reserva ni reescribe impresión original.
- line.claim {line_id,expected_version,action:claim|release,quantity?,reason}: waiter/cashier/admin, claim cantidad lista/no anulada/no entregada, un propietario. Release dueño/admin. line.fulfill sobre reclamo ajeno409 DISPATCH_CLAIMED; cantidad <=reclamada para dueño; prepara no equivale a despacho.
- cash.close.approve {cash_session_id,expected_version,expected_day_version,counted_cash_minor,stock_counts,reason}: admin distinto del cajero; caja nocturna abierta, todos pendientes operativos resueltos, cantidades de stock iguales libro. Guarda firma/sello al estado resultante sin cerrar ni ajustar.
- day.close agrega mode opcional provisional|operational_final y approval_id UUID opcional. Omitido=provisional. Final exige caja nocturna propia/día abierto, bloqueos resueltos y stock igual libro; efectivo diferente solo aprobación vigente que coincide cantidades/versiones/sello. Errores409 OPERATIONAL_CLOSE_BLOCKED o DISCREPANCY_APPROVAL_REQUIRED/VERSION_CONFLICT. No cerrar cash ante rechazo.
- Cotizar/aceptar fuera de oferta nocturna409 SERVICE_MODE_RESTRICTED; aceptar cotización antigua vuelve a validar.
- Recibir custodia desde diurno inicia nocturno; relevar custodia nocturna conserva nocturno hasta apertura administrativa del siguiente día. Nunca alternar a diurno por repetir un traspaso. Handover.accept no permite contado menor a reservas aunque una diferencia tenga firma administrativa.
- Proyección: service_mode y available_product_ids; guest service_mode+menú filtrado. Campos legacy opcionales, nuevos efectos explícitos. Finanzas/firma ocultas a waiter/kitchen/guest.

Casos válidos: night beer; urgent con motivo/version; claim de1 preparado; cierre final contado igual sin pendientes; diferencia efectivo firmada por otro admin y cierre inmediato. Inválidos: night food (incluido quote diurno/QR); prioridad cliente; claim ajeno; final con reserved/unknown/stock faltante; firma propia o stale tras otro comando.

Esquemas estricto additionalProperties false. Rechazo/replay siguen reglas de operación/outbox existentes. Sin nuevo endpoint ni migración; consumidor de enum nuevo debe actualizarse con runtime.

Estación solo papel: line.ready.confirm {line_id,expected_version,quantity,reason} permite a waiter/cashier/admin registrar confirmación explícita de Cocina/Heladería, con actor/motivo auditados y cantidad pendiente validada. Nunca aplica Caja ni infiere preparación desde impresión/pago. UI solicita motivo; retirar/entregar siguen separados. Extiende OPS-FR/AT-004 y MAR:T063.

OPS-FR-011 / OPS-AT-011 — Recuperación de traspaso: handover.cancel {handover_id,expected_version,reason} exclusivamente administrador distinto de ambos custodios; prepared/declared/disputed y caja original contando sin sucesor. Conserva íntegros conteo, diferencias y firmas anteriores; registra cancelled_by/at/cancellation_reason; restaura la MISMA caja a open con versión incrementada, sin venta, movimiento de dinero/stock ni cambio de propietario o modo. Ingresante no ha recibido custodia. Permite al saliente conciliar pedidos/conteos y comenzar un traspaso nuevo. Un aceptado nunca se cancela. Duplicado idempotente; carrera accept/cancel tiene único ganador. MAR:T064.
