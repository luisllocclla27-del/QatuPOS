# Actualización018 — ventas y recuperación de Caja

05/10/2026 · El Encanto Huamanguino · B23v5 · root único escritor. Incremento local sobre017; no despliegue, conexión con Qatu.pe/Delivery ni homologación de proveedores. Código y pruebas locales completos, listo para revisión independiente; no aceptación financiera por el autor.

## Cambios construidos

- Caja distingue consumo total, pago confirmado, pendiente total, importe retenido y libre para cobrar. Retener todo el saldo nunca muestra «100% cobrada» ni ofrece emisión fiscal como si hubiera pago confirmado.
- Recuperación por pestaña/usuario de pedidos, reserva/liberación, confirmación/unknown/resolución, nota interna y entradas/salidas de efectivo. Se guarda antes de enviar, conserva exactamente ID/contenido, bloquea nuevos envíos ante incertidumbre y nunca sobrescribe otra intención pendiente. HTTP202, respuesta ilegible o de operación incorrecta tampoco se toma como confirmación. Reintento manual, con idempotencia SQL existente.
- Reserva propia abierta puede continuarse después de recargar. La UI vuelve a comprobar creador, turno abierto y estado reservado del snapshot; no permite confirmar una reserva consumida o ajena. Recibido insuficiente muestra cuánto falta y deshabilita confirmación; vuelto exacto.
- Historial de ventas para Caja/Admin: búsqueda por mesa/cuenta/nota, día de consumo y situación del pago; incluye atenciones cerradas y distingue cada ocupación por check_id. Detalle de consumos netos/anulados, pagos, fecha/turno de recaudación, responsable, referencia, efectivo recibido/vuelto y notas internas. No es libro contable ni conciliación bancaria.
- Precuenta refleja última versión del snapshot mientras permanece abierta, netea anulaciones y muestra pendiente total separado de retención/saldo libre. Incluye corte/versión, no acredita pago o entrega. Imprimir/guardar PDF abre el diálogo del navegador y no confirma una ticketera. Se retiró la URL fiscal ficticia y la afirmación errónea de firma UBL/QR/aceptación SUNAT sobre documentos simulados.
- Historial probado en tablet1024×768; se corrigió desbordamiento de panel/tabla sin ocultar contenido. Si falta almacenamiento, el borrador se identifica como temporal; recuperación inválida bloquea nuevos envíos y conserva el registro para revisión. No se guardan contraseña, CSRF o cookie en recuperación.

## Evidencia y límites

Resultados definitivos en [delivery](../construction/runs/2026-10-05-ventas-profesionales/delivery.json):

| Verificación | Resultado |
|---|---|
| Lógica / PostgreSQL real |455 pruebas en27 archivos;35 nuevas; salida0|
| Navegador |24 recorridos completos;4 nuevos; salida0|
| Tipos / compilación local / cloud |Las tres verificaciones finalizaron con salida0|
| Artefactos cloud |7 manifiestos,1655 referencias y22 JS;0 archivos runtime/env,0 símbolos privados de servidor en navegador,0 assets privados|
| Documentación |25 validaciones parent sin cambios; WorkOrderv5 válido,6 documentos,5 FR/AT y7 tareas cualificadas|
| Laboratorio |2 locales, misma huella antes/después; sin migrar, seedear o resetear|
| Vista local |/, /cliente y /v1/pos/runtime HTTP200 en puerto3000; API4000; sesión de desarrollo43049|

Huella: ba929698f99805c4c91faab5a3470b20ee511ea6a86bdf8c915685cb1510b502. Los ensayos de reserva/pago/movimiento pierden respuesta después del commit y recuperan el mismo ID; una reserva, un pago o un movimiento. Además se prueba que HTTP202 no confirma aunque lleve un cuerpo válido. El movimiento cambia el cajón una vez y mantiene cuentas/pagos intactos. La [feature018](../../specs/018-ventas-profesionales/spec.md) contiene cinco requisitos/aceptaciones, plan/modelo/contrato, escenarios y tareas. La [orden](../construction/runs/2026-10-05-ventas-profesionales/work-order.json) delimita paths y pruebas. Backend, OpenAPI, migraciones, precios/ledger/permisos server y versiones externas no cambiaron.

El historial usa los registros disponibles en snapshot; volumen elevado necesitará consulta/paginación server antes de crecer. Recuperación sessionStorage sólo sobrevive recargas dentro de la pestaña/sesión de navegador; cerrar/eliminar datos puede perder intención local, aunque reservas/pagos/movimientos sigan en SQL. Sólo tipos enumerados se guardan; otras acciones de gestión siguen recuperación en memoria. No se configura un escritor offline. Contenido corrupto requiere revisión; no se elimina automáticamente.

Las primeras regresiones detectaron un selector ambiguo del anunciador Next, agotamiento de mesas en fixture compartida y desbordamiento real del historial por el ancho mínimo del grid. El ensayo de movimientos también detectó navegación a una sección incorrecta y un selector exacto que incluía texto de opciones; ahora recupera en Caja y selecciona por rol accesible. Se corrigieron selectores, cierre de atenciones creadas por los propios ensayos y CSS; se conservan logs de fallos y regresiones posteriores. Ningún ensayo reseteó laboratorio o eliminó atenciones de otro caso.

Antes de operación real siguen pendientes revisión independiente financiera/seguridad, puesta en marcha y recuperación cloud, agente/ticketeras y ensayos físicos, Izipay y proveedor fiscal. En operativo los pagos digitales y emisión/confirmación de impresión simuladas permanecen bloqueados. Datos y proveedores de laboratorio son sintéticos. Recetas/mermas/combos/compras/reembolsos y conexiones Qatu.pe/Delivery no se declaran construidos. No se certifica superioridad, G2 o cumplimiento fiscal por pasar tests locales.
