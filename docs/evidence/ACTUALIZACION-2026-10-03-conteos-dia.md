# Actualización · conteos y día operativo

03/10/2026, America/Lima. Incremento **013-conteos-y-dia-operativo**, construido sobre012: sus65 hashes concordaron antes de asignar archivos. Desarrollo exclusivo dentro de El Encanto Huamanguino; sin cambios en Qatu.pe, Delivery o planificación padre. Estado **ready_for_review**, sin aceptación financiera independiente.

## Mejoras aplicadas

**Los cierres anteriores conservan su integridad.** Una cuenta con consumos de otro día no admite descuentos, retiro de descuentos ni anulaciones ordinarias. El servidor devuelve BUSINESS_DAY_LOCKED y la interfaz explica el bloqueo. Su cobranza pendiente sigue permitida y se informa como cobro de día anterior, sin cambiar el cierre original. El libro de ajustes posteriores al cierre todavía no está construido.

**Caja declara faltantes reales aunque existan reservas.** La declaración registra día, responsable, cantidades y versiones; conserva existencias del libro hasta revisión. Los SKU declarados quedan retenidos para nuevas reservas, entregas y reintegros físicos. Los productos ajenos al conteo siguen operando. Una cotización no reserva ni permite entregar un producto retenido.

**Administración revisa con otro responsable.** No puede aprobar su propio conteo, cantidades inferiores a reservas u observaciones de otro día/versión. Se validan todas las líneas antes de aplicar el ajuste transaccional. Un rechazo conserva declaración, stock y reservas, sin una operación aprobada ni evento de salida.

**Recontar conserva la observación original.** La declaración nueva sustituye la anterior con vínculo explícito y debe cubrir todos sus SKU. La anterior no puede aprobarse después. Liberar una reserva pendiente permite conciliar pedidos, pero cambia la versión: exige recontar antes de aprobar. No se borran reservas para aparentar disponibilidad ni se inventan devoluciones físicas.

**Inventario acompaña el trabajo de Caja.** Caja declara solo sus bebidas y necesita su propia sesión abierta. Administración puede contar Heladería durante un traspaso de bebidas. Un conteo pendiente de Caja impide iniciar el traspaso. El cierre diario registra los conteos pendientes y conserva su condición provisional.

**La interfaz detecta cambios mientras se cuenta.** Captura versiones al comenzar a ingresar cantidades. Si otro mozo cambia una reserva, bloquea el envío y exige descartar valores y volver a contar. Muestra registrado, reservado, disponible/retención, diferencia física y causas que impiden aprobar.

## Evidencia y resultados

| Comprobación | Resultado |
|---|---|
| Dominio, contratos, interfaz y HTTP/PostgreSQL |237 pruebas aprobadas en13 archivos |
| Nuevos casos |33:20 dominio,6 PostgreSQL y7 selector de revisión |
| Navegador completo |13 recorridos aprobados, incluyendo Caja→Administración, faltante, reconteo y reserva concurrente |
| Tipos y compilación de producción |Aprobados |
| OpenAPI y WorkOrder |Validación estricta aprobada |
| Documentación padre |25 controles aprobados; alcance documental |
| Datos interactivos |2 locales; fingerprint branch_state antes/después idéntico |

Antes del correctivo fallaron18 regresiones unitarias. PostgreSQL estaba detenido: los primeros5 casos de integración no se ejecutaron por conexión rechazada; después de iniciar la instancia existente, esos5 casos fallaron contra el código anterior. Se conservan ambos resultados, sin confundir infraestructura con evidencia de negocio.

El primer recorrido nuevo encontró una reserva que cambió antes de declarar: el servidor rechazó la versión antigua. Se incorporó captura de versiones y reinicio explícito de la observación. La primera suite completa tuvo12 recorridos aprobados y un fallo del nuevo test: selector de estado ambiguo en una mesa con acceso QR ya activo. Se corrigió el selector y se reconoció el historial acumulado de esa mesa. Se conservaron fallos y aserciones; la suite completa final aprobó13 recorridos.

PostgreSQL real en bases efímeras qatupos_lab_test_*, con rollback, carrera declaración/reserva y aislamiento entre tenants distintos que comparten IDs sintéticos de inventario. Sin migración, reseed ni limpieza de qatupos_lab. El reinicio de PostgreSQL recuperó el estado existente; no constituye prueba de restore desde backup. Lockfile y dependencias no cambiaron.

## Archivos y contrato

[Feature013](../../specs/013-conteos-y-dia-operativo/spec.md), [plan](../../specs/013-conteos-y-dia-operativo/plan.md), [modelo](../../specs/013-conteos-y-dia-operativo/data-model.md), [cambios de contrato](../../specs/013-conteos-y-dia-operativo/contracts/changes.md) y [trazabilidad](../../specs/013-conteos-y-dia-operativo/analysis.md).

Dominio y contratos actualizados; panel de inventario extraído con selector de revisión; controles de consumo anterior incorporados al POS. Nuevas pruebas counts-day, inventory-review y recorrido navegador de inventario. OpenAPI conserva el endpoint existente, agrega estados/campos de lectura y errores específicos, sin otro backend ni migración.

[WorkOrder](../construction/runs/2026-10-03-conteos-dia/work-order.json), [verificación](../construction/runs/2026-10-03-conteos-dia/verification.json), [entrega con archivos/hashes](../construction/runs/2026-10-03-conteos-dia/delivery.json) y [captura de revisión](screens/conteo-revision-013.png).

## Estado operativo y siguiente dependencia

Servidor reiniciado con013: interfaz3000, API4000, PostgreSQL55432; health laboratory y /cliente200. API sin recarga automática: inspeccionar procesos y reiniciar después de cambiar dominio. Proveedores/datos sintéticos; no SUNAT, cobros externos o impresoras reales habilitados.

MAR:T053/T054 implementadas y probadas, pendientes de aceptación financiera/inventario/aislamiento por otro revisor. MAR:T057 pendiente;011/012 conservan el mismo límite. No se marcan gates padre. El autor no acepta sus propios cambios sensibles.

Seed con un administrador: Caja→Administración funciona con responsables distintos. Un conteo declarado por Administración, por ejemplo de Heladería, requiere otro administrador configurado para aprobar. No se ampliaron permisos de Caja ni se eliminó separación de responsabilidades.

Prioridad siguiente: MoneyMinor safeinteger frente a columnas monetarias integer32 SQL, con límites y acumulaciones probados antes de datos reales. Luego libro de ajustes de días cerrados, trazabilidad de devoluciones/merma y cuentas administrativas adicionales. Validar con el restaurante cobertura completa al recontar y retención durante conteos/traspasos. Recetas, compras, hardware, restore, LAN/hub y conexiones ecommerce/Delivery necesitan sus propios contratos y pruebas.

[Continuidad para retomar](CONTINUIDAD.md).
