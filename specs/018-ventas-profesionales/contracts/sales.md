# Contrato018

Se conservan /v1/pos/snapshot y /v1/pos/commands del [OpenAPI](../../../docs/contracts/pilot.openapi.json). Ningún importe de UI reemplaza validación server.

Whitelist durable en pestaña: order.create, collection.authorize, collection.release, payment.confirm, payment.unknown, payment.resolve, sale.note, cash.move. Mantener sólo campos canónicos de cada comando; rechazar campos inesperados y evidencia con credenciales. Registrar antes de envío; jamás reemplazar una entrada pendiente distinta (ni cambiar importe bajo el mismo ID). Únicamente HTTP200 con respuesta válida confirma el comando;202 no es aceptación. Network/5xx, otro estado2xx o respuesta ilegible conserva entrada y bloquea nuevas operaciones. Éxito limpia; error de validación definitivo limpia; autenticación/forbidden conserva intención pendiente para revisión, sin reenviar automáticamente. Reintento manual con mismo ID. No guardar staff.password ni personal, cookie o csrf_token.

Continuar reserva: status reserved, created_by usuario actual, cash_session_id turno propio open. Liberar sigue reglas backend y no está disponible sobre unknown. Lectura SQL fresca prevalece sobre objeto previo de UI.

Historial: sólo Caja/Admin, cuentas/pagos del snapshot autorizado. Filtrar día de apertura de visita, incluyendo registros cerrados; pagos muestran día de recaudación y estado. Precuenta no es constancia de pago ni comprobante fiscal; no afirmar que se imprimió por abrir window.print.
