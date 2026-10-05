# Modelo de datos —015

`BranchState.environment` y `PosSnapshot.environment`: laboratory/operational. La autoridad única del piloto reside en la PC. Se conserva la etiqueta lógica `cloud` del núcleo para autoridad central; no significa despliegue cloud ni habilita el protocolo hub/offline. `node_id` operativo identifica el local.

`StaffUser.active`, `version`, `credential_ready`: nuevos perfiles false/1/false; historial legacy admite true/1/true cuando faltan esos campos. La credencial usable se verifica en `staff_memberships`, donde se guarda scrypt con salt. Sesiones vinculadas al mismo tenant/local/usuario; se eliminan cuando cambian permisos o contraseña. `auth_session_token_hash` solo existe en el actor servidor durante la petición; nunca en estado, respuesta ni eventos.

Dinero: seis columnas SQL pasan a bigint con CHECK0..MAX_SAFE_INTEGER. Estado JSON mantiene céntimos enteros exactos. `sqlMoney` convierte únicamente columnas de dinero; no modifica el parser global de IDs/versiones/secuencias. `registry_ack`: laboratory_local/local_authority; autoridad local de cobro en efectivo no prueba confirmación de pasarela.

Bootstrap operativo: IDs aleatorios para tenant/local/administrador/mesas/día/cajón, fecha de Lima, carta e inventario vacíos; sin cuentas de demostración, movimientos de apertura, ventas ni series fiscales. Rechaza bases ya inicializadas.

`StockMovement.kind='receipt'` agrega `receipt_reference`; referencia normalizada (trim, uppercase, espacios únicos) única para ese SKU/local. `stock.create` comienza a cero; `stock.receive` suma on_hand, conserva reserved, recalcula available e incrementa versión. Ningún movimiento de caja, venta o evidencia fiscal se deduce del ingreso físico.
