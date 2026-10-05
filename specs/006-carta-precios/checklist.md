# Checklist de Aceptación y Verificación

- [x] Contratos de productos y cotizaciones definidos sin tipos flotantes (céntimos enteros PEN).
- [x] Endpoint de cotización genera `quote_id` opaco con expiración exacta de 120s en servidor.
- [x] Cotización no altera saldos, stock, tickets ni visitas.
- [x] Intento de confirmar pedido con cotización cuyo precio cambió es rechazado con `PRICE_CHANGED` y cero efectos colaterales.
- [x] Confirmar pedido con cotización expirada (>120s) es rechazado con `QUOTE_EXPIRED`.
- [x] Admin puede crear nuevos productos especificando estación y control de stock válido.
- [x] Admin puede modificar precio y estado de producto con `expected_version`.
- [x] Conflicto de versión optimista detectado si dos admins editan simultáneamente (`VERSION_CONFLICT`).
- [x] Modificación de estación o vínculo de inventario prohibida si el producto tiene historial comercial (`COMMERCIAL_HISTORY_LOCKED`).
- [x] Cambios en catálogo se auditan con actor, motivo, versión previa y campos modificados.
- [x] Clientes y mozos no tienen acceso a endpoints ni auditoría administrativa.
- [x] Órdenes aceptadas previamente conservan su precio y estación originales sin importar cambios futuros en la carta.
- [x] Dos terminales intentando la última unidad de stock otorgan como máximo una aceptación y rechazan la otra sin saldo negativo.
- [x] Interfaz POS y `/cliente` presentan mensajes claros en español y controles táctiles de >= 44px sin errores de consola.
- [x] Suite completa vitest (114 pruebas), playwright (7 pruebas), typecheck, build y validate:sdd aprobados.
