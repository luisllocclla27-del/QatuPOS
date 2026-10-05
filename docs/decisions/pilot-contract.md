# Contrato del incremento presencial de laboratorio

01/10/2026 · Orden B01 / MAR:T003 · Ejecución `40f292bc-1a38-41e6-927a-90830e432e52`.

Esta entrega cierra el contrato HTTP staff del primer incremento. No acepta dependencias ajenas ni declara piloto G2, integración bancaria, emisión SUNAT o compatibilidad de ticketeras. Fuente verificable: [OpenAPI](../contracts/pilot.openapi.json); tipos de consumo: [pos.ts](../../packages/contracts/src/pos.ts). Los módulos del núcleo ejecutan comandos; la interfaz no lleva un segundo libro financiero.

## Sesión y autoridad

`POST /v1/pos/session` recibe usuario/contraseña personales de laboratorio. El servidor comprueba hash, membership, rol y local; un selector visual no concede permisos. `GET` devuelve identidad y token CSRF; `DELETE` revoca la sesión persistida. Cookie `qatu_session`, HttpOnly, SameSite=Strict y Secure cuando hay HTTPS. Logout y comandos exigen `X-CSRF-Token`; login también comprueba Origin permitido. No copiar credenciales reales de Qatu.

La autoridad del incremento es un escritor cloud local de laboratorio. PostgreSQL conserva efecto, resultado idempotente y outbox en la misma transacción. `operation_id` queda ligado al actor, ámbito y cuerpo canónico: reintento igual recupera el efecto; cuerpo distinto o actor distinto no comparte resultado. Consultar deduplicación antes de rechazar una versión ya avanzada por el primer intento. Ningún command recibe tenant, branch, rol, precio o importe externo como fuente de autorización. Los importes de autorización se solicitan pero el Check controla el saldo admisible.

## Recorrido y límites exactos

| Recorrido | Comandos | Transacción y control |
|---|---|---|
| Mesa y tanda | `table.open`, `table.close`, `order.create` | Una visita/cuenta primaria por mesa; versión de mesa/visita, precio y ruta desde catálogo. Cierre exige saldos resueltos y entregas completas. |
| Preparación/entrega | `line.prepare`, `line.fulfill` | Cantidad parcial entera; no superar pendiente. Cocina/Heladería preparan antes de entregar. Caja entrega directo y consume reserva unitariamente una vez. |
| Impresión simulada | `print.ack`, `print.copy` | ACL por estación y versión. Solo Cocina/Heladería. Recibido por puente no prueba papel; ambigüedad requiere revisión/copia explícita, sin repetir venta/stock. |
| Cobro | `collection.authorize`, `payment.confirm`, `payment.unknown`, `payment.resolve` | Retener saldo antes de pedir pago externo; ACK `laboratory_local` durable. Unknown conserva retención. Efectivo recibido/cambio; digital verificado en comercio, referencia deduplicada. |
| Caja | `cash.open`, `cash.move` | Dueño individual y un cajón activo; movimientos externos con motivo, distintos de ingreso por ventas. |
| Traspaso | `handover.begin`, `handover.count`, `handover.approve`, `handover.accept`, `handover.reject` | Corte/barrera del cajón y bebidas; declaración inmutable, aprobación independiente de diferencias, un sucesor. Aprobar guarda aprobación; aceptar aplica ajuste autorizado de stock una vez con el sucesor. No venta ni movimiento ficticio por cambio de custodio. |
| Inventario | `inventory.count`, `inventory.adjust` | Conteo no ajusta. Administrador distinto del declarante aprueba; rechazar conteo obsoleto y aplicar compensación append-only una vez. |
| Cierre del día | `day.close` | IDs únicos de pagos/sesiones/ventas, fondos internos cancelados, cobranza de saldo anterior separada y corte final firmado. Pending/unknown/diferencias obligan estado provisional. |
| Abrir siguiente día | `day.open` | Solo cajero/admin tras día cerrado y sin caja activa; historial preservado, origen de cuentas/pagos anterior intacto. Fecha del servidor, avance +1 únicamente en laboratorio. |
| Documento interno | `sale.note` | Leyenda literal no-CPE, contador interno y total de cuenta; no segunda venta ni resolución de obligación fiscal. |

Cantidades comerciales del incremento son unidades enteras (máximo 100 por línea), precios PEN en céntimos y catálogo de prueba con políticas `unit` o `none`. Recetas, combos, cancelación con merma, ajustes/devoluciones comerciales conservan sus especificaciones completas pero necesitan su propio cierre contractual/implementación. No reemplazar su ausencia con stock negativo, borrado de pedido o refund sin ajuste/capacidad. Cerrar el día no lo reabre automáticamente. `day.open` requiere versión del día cerrado y ausencia de caja activa; conserva IDs, cierres y pendientes históricos. La fecha la fija el servidor en America/Lima; avanzar la fecha anterior +1 cuando se repite el ensayo el mismo día es solo simulación de laboratorio, sin fecha elegida por cliente.

## Permisos y proyecciones

| Actor | Vista y acciones permitidas |
|---|---|
| Mozo | Mesas, catálogo, tandas, entregas y resumen de saldo de Check. Sin evidencias de pagos, caja, movimientos financieros, traspasos, cierres, notas internas o auditoría. |
| Cocina/Heladería | Solo líneas/jobs de estación asignada y estados de preparación/entrega. Sin cuentas financieras ni stock ajeno. |
| Cajero | Cobrar y operar su sesión, declarar traspaso propio/aceptar si nominado, conteos, notas internas y conciliación. Rol no sustituye ownership. |
| Administrador | Control del local y aprobación de discrepancias/ajustes; debe ser distinto de los participantes/declarantes al aprobar estos flujos. |

Todos los snapshots se filtran en servidor. Durante conteo ciego, `ProjectedCashSession`, `ProjectedHandover` y `ProjectedStockItem` usan `null` para expectativas ocultas; el estado interno sigue siendo exacto. No enviar el valor oculto y taparlo con CSS. El conteo sellado permite revelar comparación. El stock no relacionado al corte conserva su comportamiento normal.

Un pago desconocido conserva `initiated_cash_session_id` y `created_at`. Al resolver después de cambiar turno, su `cash_session_id`/día de cobranza se atribuye a una sesión actual abierta y `confirmed_at` registra confirmación, preservando origen e historia. La evidencia del comercio conserva `observed_at`. No editar snapshots firmados de turnos anteriores ni declarar liquidación bancaria por confirmar tarjeta/Yape.

## Evidencia de esta entrega

Se validó OpenAPI 3.1 con `openapi-spec-validator` y los schemas con JSON Schema 2020-12/formatos. Resultado inicial: 3 paths, 5 operaciones HTTP, 62 schemas, 23 variantes de comando. Sus 23 ejemplos positivos fueron aceptados; los 3 negativos embebidos (importe negativo, rol inyectado, comando desconocido) fueron rechazados.

Son pruebas de estructura de contrato. Concurrencia PostgreSQL, permisos/ownership, cambio de turno, deduplicación de referencia, blind count y recuperación deben demostrarse en implementación y revisión independiente. La lectura de interfaces TypeScript no constituye prueba de typecheck hasta que el integrador ejecute el toolchain real.

El laboratorio tiene todas las capacidades externas en `false`: QR, ecommerce, Delivery, pagos reales, emisión fiscal, impresión de red y escritor offline. Antes de ventas reales se necesita proveedor/ruta fiscal válida, compatibilidad de ticketeras, restauración probada, datos operativos y ensayos humanos; estos límites ya pertenecen a los gates del SDD.
