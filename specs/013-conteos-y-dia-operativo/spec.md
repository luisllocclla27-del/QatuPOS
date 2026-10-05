# 013 · Conteos pendientes y día operativo

03/10/2026. Extiende núcleo local sobre012 probado, sin aceptación financiera inferida. Alcance sintético, autorización de construcción vigente.

## Operación

Caja declara conteo de bebidas de su custodia; Administración revisa y aprueba si es otra persona. Declarar conserva libro y dato observado, y retiene nuevas reservas/entregas/reintegros de los SKU contados hasta aprobar. Platos/otros SKU continúan. Si faltan unidades para las reservas, se conserva el conteo y se rechaza ajuste; conciliar cancelaciones pendientes y recontar sin crear stock ni borrar reservas.

Un reconteo conserva historial y sustituye las declaraciones anteriores solapadas. Debe incluir todos los SKU de cada declaración que sustituye, evitando abandonar retenciones parciales. La nueva declaración mantiene retención hasta revisión de otra persona. Una declaración sustituida no puede aprobarse ni desbloquear stock.

Al cerrar un día se conservan sus ventas y evidencia. No se permite void/aplicar/retirar descuento de consumos de días anteriores desde el comando ordinario; requiere futuro libro de ajustes. Sí se puede cobrar saldo anterior con su origen, manteniendo reportes separados.

## Requisitos y aceptación

- CDO-FR-001 / CDO-AT-001: void, discount.apply/remove solo sobre consumos del día actual abierto; devolver409 BUSINESS_DAY_LOCKED ante pedido de día anterior. Cierre anterior, cuenta, pagos y auditoría sin cambios en rechazo. Cobranza anterior vigente, no abrir nueva deuda por descuento.
- CDO-FR-002 / CDO-AT-002: InventoryCount nuevo incluye business_day_id servidor; ajustar exige día actual abierto y no inventa día para legacy sin campo. Legacy requiere reconteo; historial preservado.
- CDO-FR-003 / CDO-AT-003: todo SKU incluido en conteo declared queda retenido para nueva reserva, entrega y reintegro físico,409 RESOURCE_COUNTING. Cotizar no reserva; otros SKU/estaciones siguen. Anular reserva pendiente puede continuar, cambia versión e impone reconteo antes de aprobar.
- CDO-FR-004 / CDO-AT-004: ajuste contado<reserved rechaza409 STOCK_RESERVATIONS_EXCEED_COUNT sin mutaciones. Declaración y retención siguen vigentes. Nunca bajar reservas, ajustar disponible ficticio ni entregar unidades inexistentes para resolver diferencia.
- CDO-FR-005 / CDO-AT-005: reconteo cubre unión completa de SKU solapados; sustituye esas declaraciones con status superseded y superseded_by, preserva datos originales. Nunca approve de conteo sustituido; aprobación y reserva concurrentes tienen un solo orden transaccional.
- CDO-FR-006 / CDO-AT-006: Caja solo cuenta Caja bajo sesión propia abierta; admin cualquier estación, siempre otro actor para approve. Motivo aprobado validado incluso con diferencia cero. No ampliar permisos financieros ni firmar por otro.
- CDO-FR-007 / CDO-AT-007: conteo activo Caja impide iniciar traspaso paralelo. Durante handover, conteo/ajuste Heladería puede seguir si no toca Caja. Cierre diario provisional incluye IDs/notas de conteos pendientes sin resolverlos automáticamente.
- CDO-FR-008 / CDO-AT-008: UI permite declaración a cajero propietario y revisión admin; muestra retenciones, datos físicos declarados, reservas, faltante y reconteo necesario; bloquea autoaprobación y explica día previo en ajustes comerciales.
- CDO-FR-010 / CDO-AT-010: primera entrada de cada cantidad conserva versión observada; actualizaciones posteriores no la reemplazan silenciosamente. Cambio de versión/SKU durante entrada bloquea guardar y exige descartar valores y recontar. Servidor sigue validando una carrera no observada por polling.
- CDO-FR-009 / CDO-AT-009: scope, versiones, idempotencia y outbox existentes; todo rechazo deja cero efectos durables; reconteo/aprobación preservan historial y reservas. Reloj/día no viene del navegador.

## Límites

No libro de ajustes de días cerrados: bloqueo explícito temporal, no implementar devoluciones ni notas de crédito como pago. Conteo no confirma inventario físico automáticamente; on_hand sigue existencia registrada hasta aprobar. No nueva migración, reseed, dinero real, recetas, fiscalidad real o hardware. MoneyMinor/SQL integer32 sigue próxima brecha prioritaria.
