# Almacenamiento y límites del incremento

PostgreSQL mantiene un agregado JSON por tenant/local, bloqueado por fila durante cada comando. Un solo escritor lógico calcula precios, saldos, reserva de stock, entrega y caja. El efecto, clave idempotente y evento outbox se confirman en la misma transacción; ninguna confirmación del navegador sustituye COMMIT.

La sesión persistida determina tenant, local e identidad. Las claves de memberships, sesiones, operaciones, sucursal y outbox tienen FK compuestas. La unicidad del recibo digital incluye tenant, medio, cuenta configurada por servidor y referencia. Las proyecciones del servidor ocultan caja/evidencia a mozos y estaciones, y saldos esperados a participantes de conteo ciego.

Esta implementación es deliberadamente de laboratorio. El agregado JSON no tiene todas las FK, índices, controles SQL por entidad ni escalabilidad del esquema relacional objetivo del SDD. Antes de producción se requiere normalización/migración trazable, pruebas de volumen, auditoría resistente a manipulación administrativa, restauración y reconciliación. La cola outbox todavía no despacha proveedores; no demuestra exactly-once físico ni continuidad hub/WAN.

La caja y custodia son del día actual. El cierre usa su última sesión y conserva el conteo original. Rechazar traspaso bloquea recursos hasta revisión de un administrador distinto de los dos custodios. La revisión recupera la declaración sellada para una nueva aceptación del receptor; conserva motivos anteriores en auditoría. Preparación requiere estación/admin; mozos pueden registrar la entrega de unidades previamente preparadas.

La evidencia manual de pago es sintética y la cuenta está fijada a `comercio-laboratorio`. No es una verificación bancaria automática. Unknown retiene saldo; no hay expiración automática que lo libere. Los importes están en céntimos PEN enteros y las cantidades de venta son unidades enteras; ingredientes fraccionados requieren la posterior implementación de recetas/unidades exactas.
