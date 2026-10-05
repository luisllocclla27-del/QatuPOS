# Actualización · operación de salón y noche

03/10/2026, America/Lima. Incremento **014-operacion-salon-noche** sobre013, con73 hashes verificados antes de asignar escritura. Desarrollo exclusivo en El Encanto Huamanguino. Estado **ready_for_review**; aceptación sensible independiente pendiente.

## Mejoras construidas

**Cocina y Heladería tienen una cola compartida y ordenada.** Cada tanda recibe secuencia durable del servidor, mesa, observaciones y responsable. Se muestra primero urgencia excepcional con motivo y después llegada; ambas categorías conservan su orden. Una prioridad genera aviso separado, claramente identificado, sin repetir pedido ni alterar ticket original, saldo o reserva. Originales, avisos, anulaciones y copias tienen semántica distinta.

**Las tablets coordinan el retiro.** El mozo queda responsable de mesa; otro puede ayudar y Administración puede reasignar con motivo. Una unidad lista puede reservarse para retiro: otra persona no registra su entrega mientras esté reclamada. La liberación es explícita por propietario o Administración con motivo. La pantalla de salón pide reservar antes de entregar Cocina/Heladería. El servidor conserva entrega directa legacy para estación/admin; no hay evidencia automática de movimiento físico.

**La operación con ticketera de papel sigue siendo viable.** No se exige pantalla en Cocina/Heladería: mozo/caja/admin puede registrar confirmación explícita de unidades listas con motivo y responsable. Preparado, impreso, reclamado, entregado y pagado son estados separados. Minutos y orden son visibles, pero el sistema no prueba que un cocinero leyó el papel. La ticketera de Caja sirve cuentas/documentos del flujo existente; bebidas siguen directas sin comanda de preparación.

**Noche solo vende cerveza, gaseosa y agua.** La política deriva de la última caja vigente del día operativo y se aplica a terminales, tablets y cliente QR, en cotización y aceptación. No basta ocultar botones: la API rechaza platos y cotizaciones diurnas antiguas. Un relevo nocturno mantiene modo nocturno. Pedidos de comida ya aceptados pueden terminarse y cobrarse; medianoche no cambia jornada ni reinicia menú.

**El cierre completo tiene condiciones verificables.** Exige caja nocturna propia, todas las entregas y saldos resueltos, cero pagos inciertos/autorizaciones/reservas/conteos/cortes pendientes y unidades físicas coincidentes con libro. Diferencia de stock se concilia primero mediante conteos013. Efectivo distinto requiere firma de Administración diferente del dueño, exacta para conteo y versiones; cambios posteriores invalidan la firma. Las diferencias quedan visibles. El corte provisional conserva pendientes, sin presentarse como conciliado.

**Un corte fallido no queda atrapado.** Recibir existencias inferiores a reservas sigue bloqueado. Administrador distinto de ambos custodios puede cancelar un traspaso no recibido con motivo: conserva conteo/diferencias/firmas, reabre la MISMA caja del saliente y no mueve dinero ni stock. Permite conciliar y empezar otro corte; un traspaso aceptado no se cancela. Carreras de aceptación/cancelación tienen único ganador.

**El cierre operativo y SUNAT permanecen separados.** Se muestra caja y bebidas conciliadas operativamente, fiscal pendiente; no se acepta un pago unknown, abono bancario o documento SUNAT por cerrar. El reporte de sesiones utiliza únicamente los turnos incluidos en ese cierre, evitando mezclar días anteriores. Un cierre operativo firmado no se modifica ni se degrada a provisional.

## Evidencia

| Comprobación | Resultado |
|---|---|
| Dominio, HTTP/PostgreSQL, contratos y presentación |290 aprobadas en16 archivos;53 nuevas contra237 de013 |
| Nuevas pruebas014 |40 dominio,8 PostgreSQL,5 presentación |
| Navegador completo |17 recorridos aprobados:13 existentes y4 nuevos |
| Tipos y compilación de producción |Aprobados |
| OpenAPI y WorkOrder estrictos |Aprobados |
| Validador documental padre |25 controles aprobados; alcance documental, no certificación runtime |
| Estado interactivo |2 locales; hash idéntico antes/después, sin reseed/migración |
| Servicio actualizado |API014 health laboratory; /cliente200; frontend3000, API4000 |
| Revisión independiente de dinero/stock/aislamiento |Pendiente; MAR:T064/T065/T067 sin aceptación |

Logs, contratos y hashes: [entrega014](../construction/runs/2026-10-03-operacion-salon-noche/delivery.json). Operación detallada: [procesos del restaurante](../../specs/014-operacion-salon-noche/procesos-restaurante.md), [spec](../../specs/014-operacion-salon-noche/spec.md), [análisis](../../specs/014-operacion-salon-noche/analysis.md).

Fallos preservados y límites de evidencia: el primer intento de27 regresiones incluía19 defectos del fixture por evaluar estado antes de abrir mesa; no afirmar27 fallos funcionales del código anterior. Se corrigió el fixture. Pruebas PG corrigieron una ruta de lectura de clave inventada por el test. Navegador corrigió selectores y esperó actualización real de la pantalla antes de contar; el bloqueo de conteo obsoleto se mantuvo. Un primer recorrido completo falló esperando login del segundo contexto; se añadió comprobación explícita de cookie ausente/sesión401, sin omitir login ni ampliar permisos. No volvió a reproducirse en recorridos posteriores; causa original no aislada. Una ejecución posterior se interrumpió para corregir el nombre de versión del test nuevo antes de verificar el código final. Los logs fallidos/interrumpidos no se borraron. Traces con sesiones permanecen fuera de evidencia entregada.

## Uso y pendientes

En [POS local](http://127.0.0.1:3000), entrar con usuarios sintéticos. Mozo: Mesas → abrir/habilitar clave → tomar pedido → Estaciones → confirmar listo o estación prepara → reservar retiro → entregar. Caja: Mi turno → corte/conteo → noche recibe → solo bebidas → resolver pendientes/conciliar inventario → Cierre del día → conteo físico → firma independiente si diferencia → revisar y confirmar cierre completo.

Aplicación funcional de laboratorio, todavía no habilitada para operación real. Revisiones financieras011/012/013/014 pendientes. Impresoras de red/modelos, tablet/Wi‑Fi/LAN/HTTPS, identidades individuales, respaldo/restauración y conectividad deben validarse en el local. SUNAT/CDR, proveedores financieros, Qatu/Delivery reales, hub/offline, recetas/compras/merma, devoluciones monetarias y ajustes posteriores a cierre siguen pendientes. La clasificación de bebidas usa SKU legacy explícitos o atributo de stock; no hay aún formulario de clasificación nuevo. MoneyMinor safeinteger vs integer32 SQL continúa como siguiente corrección prioritaria.
