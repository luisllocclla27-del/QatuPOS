# Modelo014

- TableVisit: responsible_waiter_id/name opcionales; nuevos waiter.open/guest.access asignan responsable. Admin reasigna con versión/motivo; pedidos nuevos congelan nombre responsable en metadatos del ticket.
- Order: service_sequence entero servidor monotónico por local, priority normal/urgent, priority_reason y production_version opcionales. Lectura legacy usa orden de inserción durable. Cambio priority no altera líneas/precios/cuenta ni ticket original.
- OrderLine: dispatch_claim actor_id/name, quantity, claimed_at; opcional/null. Reclamo protege cantidad lista; fulfilled consume su cantidad, release explícito por propietario/admin. prepared_at y delivered_at opcionales para orientación de espera.
- StockItem: beverage_kind beer/soda/water opcional. Legacy sintético usa SKU conocidos, no nombre/categoría de cliente. Product elegible nocturno solo unit+Caja+stock de clase permitida.
- PrintJob: kind order/void/priority, table_label, batch_number, service_sequence, responsible_name, priority opcionales. Original durable, copy mantiene copy_of; priority aviso no producir de nuevo. Hash cubre todos los nuevos metadatos semánticos.
- Snapshot: service_mode y available_product_ids seguros; CashCloseApproval oculto a waiter/kitchen/guest y durante conteo ciego. GuestSnapshot service_mode y menú filtrado; historial propio completo.
- CashCloseApproval: id, cash_session_id, business_day_id, cash_version, day_version, seal_state_version, counted_cash_minor, stock_counts, actor_id, reason, created_at. Append-only; ninguna aprobación modifica stock/efectivo. Seal inválido si otra operación cambia state.version.
- DayClose: operational_status pending/reconciled, close_mode provisional/operational_final, cash_approval_id opcionales. state fiscal conserva provisional. Sin sobreescribir cierre para inventar aceptación posterior.

Todos los IDs referidos resueltos desde BranchState del tenant/local autenticados. No day_id/tenant/actor/importes autorizados del navegador. Nuevos campos legacy no infieren una aprobación financiera.

- ShiftHandover: state agrega cancelled; cancelled_by, cancelled_at, cancellation_reason opcionales. Cancelación preserva counted/difference/stock_lines/discrepancy_approval/pending_payment_ids y no crea successor. Caja original sigue mismo propietario/fondo/modo y vuelve open con versión nueva. Estado aceptado es irreversible en este flujo.
