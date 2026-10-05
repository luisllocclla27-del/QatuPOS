# 014 · Salón, preparación y cierre nocturno

03/10/2026. Construcción autorizada: dos terminales táctiles, dos tablets previstas, QR/clave activada por mozo, Cocina/Heladería con ticketera y Caja con ticketera de cuenta/comprobante. Bebidas de Caja sin ticket de preparación. Sin habilitar hardware, LAN, pagos ni SUNAT reales.

## Proceso

Una atención tiene mozo responsable. Cada tanda aceptada recibe secuencia del servidor compartida por estaciones. Cocina y Heladería trabajan por llegada; excepción urgente exige motivo y personal autorizado, queda auditada y origina aviso de cambio separado del ticket original. Preparado no significa impreso ni entregado. Una persona puede reservar el retiro de una línea lista; otra no registra su entrega sin liberación/reasignación administrativa. Los pedidos QR tienen el mismo responsable/cola y conservan privacidad por sesión.

El turno nocturno activo deriva de la caja vigente del servidor, no del reloj/navegador/usuario llamado noche. Solo permite ofertas unitarias vinculadas a cerveza, gaseosa o agua de Caja. Cotización y aceptación revalidan la política; una cotización diurna no evita la restricción al cambiar turno. Productos de pedidos anteriores siguen preparados/entregados y cobrados sin añadir nuevos platos.

El cierre nocturno tiene dos salidas explícitas: corte provisional que conserva pendientes, o cierre operativo completo. Este último exige cuentas/saldos y entregas resueltos, cero unknown/autorizaciones pendientes/reservas, conteos revisados y bebidas físicas coincidentes con libro. Diferencias de stock se concilian y aprueban antes de cerrar usando013. Diferencia de efectivo requiere aprobación independiente previa, sellada a versiones/cantidades y estado; movimientos posteriores invalidan esa aprobación. Nunca convertir faltante en venta, retiro ficticio o pago confirmado. El día operativo conserva fecha aunque la noche cruce medianoche.

Conciliación operativa separada de fiscalidad y liquidación bancaria: completar caja no acepta SUNAT ni certifica abonos bancarios. El cierre fiscal general sigue provisional en laboratorio. Cortes firmados anteriores no cambian.

## Requisitos y escenarios

- OPS-FR-001 / OPS-AT-001: secuencia estable servidor para tanda, FIFO por estación con misma identidad, cantidades/anulaciones/observaciones; lectura legacy determinista sin reescribir pedidos.
- OPS-FR-002 / OPS-AT-002: order.priority solo waiter/admin, motivo y production_version; cliente/cocina/caja no deciden urgencia. Ticket original inmutable; aviso priority explícito, jamás segunda tanda ni preparación.
- OPS-FR-003 / OPS-AT-003: responsable al abrir/activar mesa; waiter toma solo mesa sin responsable o propia; admin reasigna con motivo/versiones a waiter local. UI y ticket identifican mesa/tanda/secuencia/responsable/origen.
- OPS-FR-004 / OPS-AT-004: line.claim reclama cantidad lista, libera propietario/admin con motivo; otra persona no entrega cantidad reclamada, ni kitchen la reclama. Carreras serializadas; liberación explícita, sin expiración automática que habilite doble retiro.
- OPS-FR-005 / OPS-AT-005: noche activa solo cerveza/gaseosa/agua, mismo filtro para tablet/terminal/QR y rechazo servidor de cotización/aceptación anterior. Conserva menú y pedidos históricos; no modifica active ni rutas para ocultar platos.
- OPS-FR-006 / OPS-AT-006: day.close mode operational_final exige caja nocturna propia, día abierto, sin pendientes comerciales/de entrega/reservas/conteos/unknown/autorizaciones; counted_stock igual libro, reservas cero. Rechazo sin cerrar sesión ni eventos.
- OPS-FR-007 / OPS-AT-007: cash.close.approve admin distinto del cajero, motivo, efectivo+conteos válidos, versiones de sesión/día y seal_state_version. Efectivo distinto requiere aprobación vigente exacta; prior handover diferencias mantienen aprobador. Historial de aprobación intacto, stock no se modifica por firma de efectivo.
- OPS-FR-008 / OPS-AT-008: cierre guarda operational_status separado de state fiscal, aprobador/approval_id y comparación física. Provisional conserva todos los pendientes, nunca se rotula completo. mode omitido conserva contrato anterior. Apertura siguiente día administrativa conserva pendientes en su cierre; no los resuelve.
- OPS-FR-009 / OPS-AT-009: UI táctil muestra secuencia, prioridad, minutos transcurridos, listo/reclamado/responsable; cierre nocturno guía bloqueos, conteo/efectivo/aprobación/final o provisional explícito. Caja imprime cuenta/documento simulado con flujo existente, no comanda de bebidas.
- OPS-FR-010 / OPS-AT-010: permisos tenant/local/visita, idempotencia, versiones y outbox transaccionales; proyección no filtra aprobación financiera a mozo/cocina/cliente. Tests negativos, PostgreSQL y navegador completo.

## Límites verificables

Nuevas propiedades opcionales para leer historial; nuevas operaciones escriben explícitamente. No recetas/merma, routing de impresora física, reloj SLA garantizado, delivery/ecommerce externos ni administración de usuarios. Configuración de clases de bebida/capacidad horaria futura requiere contrato. El responsable y reclamo ayudan al despacho; no prueban que se llevó un producto físicamente. Aceptación sensible independiente pendiente. MoneyMinor/SQL integer32 sigue brecha conocida.

Estación solo papel: line.ready.confirm {line_id,expected_version,quantity,reason} permite a waiter/cashier/admin registrar confirmación explícita de Cocina/Heladería, con actor/motivo auditados y cantidad pendiente validada. Nunca aplica Caja ni infiere preparación desde impresión/pago. UI solicita motivo; retirar/entregar siguen separados. Extiende OPS-FR/AT-004 y MAR:T063.

OPS-FR-011 / OPS-AT-011 — Recuperación de traspaso: handover.cancel {handover_id,expected_version,reason} exclusivamente administrador distinto de ambos custodios; prepared/declared/disputed y caja original contando sin sucesor. Conserva íntegros conteo, diferencias y firmas anteriores; registra cancelled_by/at/cancellation_reason; restaura la MISMA caja a open con versión incrementada, sin venta, movimiento de dinero/stock ni cambio de propietario o modo. Ingresante no ha recibido custodia. Permite al saliente conciliar pedidos/conteos y comenzar un traspaso nuevo. Un aceptado nunca se cancela. Duplicado idempotente; carrera accept/cancel tiene único ganador. MAR:T064.
