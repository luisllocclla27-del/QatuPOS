# Checklist de Aceptación y Verificación

- [x] Comandos `order.line.void` y `collection.release` registrados y tipados sin tipos flotantes.
- [x] Intentos de anulación por mozo denegados con 403 `FORBIDDEN`.
- [x] Motivo obligatorio (>= 3 caracteres) requerido en cada anulación y guardado en `order_void_audit`.
- [x] Total de la cuenta y saldo por cobrar se reducen exactamente en céntimos PEN (`MoneyMinor`).
- [x] Unidades no entregadas liberan su reserva al inventario disponible.
- [x] Unidades ya entregadas solo se reintegran al inventario físico si `restore_stock === true`.
- [x] Notificación de anulación emitida a la estación correspondiente en `PrintJob`.
- [x] No se puede anular un monto superior al saldo libre por cobrar de la cuenta (`CHECK_BALANCE_EXCEEDED`).
- [x] Autorización de cobro retenida se libera correctamente mediante `collection.release`.
- [x] La interfaz de Caja permite anular con modal interactivo y confirmación.
- [x] 100% de pruebas vitest, playwright, typecheck, build y validate:sdd aprobadas.
