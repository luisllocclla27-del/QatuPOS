# Contratos —015

Fuente canónica: [OpenAPI](../../../docs/contracts/pilot.openapi.json) y [tipos](../../../packages/contracts/src/pos.ts). Servidor aplica schemas estrictos, tenant/local desde sesión y versiones de recursos.

- `staff.create`: operation_id, username, name, role, station, reason. Solo admin; crea ID del servidor con active=false, credential_ready=false, version=1. Username inmutable, normalizado y único globalmente en el esquema actual.
- `staff.update`: operation_id, staff_id, expected_version, name, role, station, active, reason. Admin, rol/estación coherentes; recursos abiertos bloquean desactivación/cambio de permisos; revoca sesiones y aumenta versión.
- `POST /v1/pos/staff/{staffId}/password`: expected_version, current_password, new_password, reason. Sesión administrativa activa, Origin/CSRF y reautenticación. Respuesta staff_id/version/credential_ready. Contraseña no entra en estado, historial, outbox o respuesta. Conflicto409; no reintento ni persistencia automática del body.
- `GET /v1/pos/runtime`: environment laboratory/operational, público y sin secretos. Snapshot autenticado refleja entorno persistido; modos cruzados rechazados, también lecturas de cliente.
- `stock.create`: operation_id, name, sku, station caja/heladeria, beverage_kind beer/soda/water/null, reason. Admin; unidad entera, stock cero. Caja exige clase explícita, Heladería null.
- `stock.receive`: operation_id, stock_item_id, expected_version, quantity, receipt_reference, reason. Admin o cajero con propia caja abierta para sus bebidas. Referencia normalizada única por SKU/local, replay sin efecto adicional. Conteo/traspaso protegen stock; no cambia caja ni implica compra/fiscalidad.
- `POST /v1/pos/quotes` y `/v1/guest/quotes`: modo operativo exige Origin exacto y X-CSRF-Token de la sesión, porque persisten order_quotes. Clientes envían el token; no controlan tenant/roles/precios/importes elegibles.

MoneyMinor0..MAX_SAFE_INTEGER; migration012 convierte seis columnas a bigint con límites; sqlMoney interpreta solo dinero. Las simulaciones de fiscal/ack de impresión/confirmación digital operativa se rechazan con UNSUPPORTED_CAPABILITY antes de efectos. Cobro efectivo operativo usa registry_ack=local_authority; no prueba pasarela digital ni aceptación SUNAT.
