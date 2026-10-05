# Actualización04/10/2026 — revisión y recuperación operativa

Se revisaron los avances existentes y se construyó el incremento016 dentro de El Encanto Huamanguino. Se verificaron116 hashes de015 antes de editar y se conservaron las mejoras del usuario en cantidades activas y badges de anulación. Root fue el único escritor bajo WorkOrder B21 versiones1..5. No se modificaron Qatu.pe, Delivery, el repositorio padre, datos comerciales reales o proveedores.

## Cambios comprobados

1. **Tandas anuladas:** filtro Anulados, detalle de unidades activas/anuladas y mensaje de cancelación. Una tanda anulada ya no aparece como entregada ni como preparación pendiente. Los contadores laterales de clientes y bebidas también excluyen unidades anuladas. Pago y entrega siguen separados.
2. **Fecha del restaurante:** en operativo, abrir un día exige fecha actual de Lima posterior al cierre. Mismo día o retroceso del reloj se rechazan sin alterar estado; no se inventa mañana. El avance sintético sigue disponible exclusivamente en laboratorio.
3. **Personal:** si falta la membership SQL de una persona, editar perfil o contraseña produce409 y rollback. No se anuncian credenciales listas ni se generan auditoría/outbox/versiones falsas. Permisos y reautenticación se conservan.
4. **Respaldo real de PostgreSQL:** archivo completo cifrado y autenticado, snapshot consistente, manifest y clave QR protegidos, verificación de la clave contra credenciales activas, hashes por tabla y salida exclusiva. Sin nuevos paquetes ni segundo backend. Archivo/key separados; operativo exige ubicación fuera del checkout.
5. **Restauración comprobada:** solo base vacía de ensayo, autenticación completa antes de SQL, archive en transacción, comparación de todas las tablas y revocación de sesiones conservando relaciones históricas. Cuarentena por namespace y comentario persistente; renombrar la copia no habilita operación ni nuevo respaldo. No existe promoción automática.
6. **Disponibilidad:** health ahora comprueba acceso a PostgreSQL y cuarentena. No responde sano ante base desconectada ni permite login/comandos en copias restauradas.

## Evidencia integrada

| Comprobación | Resultado |
|---|---|
| Dominio/contratos/HTTP/PostgreSQL | **388 pruebas en23 archivos aprobadas**,36 más que015 |
| Navegador con versión final de contadores | **20 recorridos aprobados** |
| Compilación y tipos | Aprobados |
| Respaldo/restore por CLI | **17 tablas verificadas**, mismo hash de estado en fuente/destino |
| Sesiones del ensayo |1 de personal revocada,1 de cliente revocada; historial conservado |
| Prueba operativa HTTPS | Base/rol/certificado sintéticos, login individual/cookie/origen/host/arranque compilado aprobados |
| Documentación |25 controles del padre aprobados; separados de evidencia runtime |
| WorkOrder/OpenAPI | Válidos |
| Laboratorio interactivo |2 locales, estado preservado SHA256 `ba929698f99805c4c91faab5a3470b20ee511ea6a86bdf8c915685cb1510b502` |

Las suites aíslan sus bases y eliminan sus propios fixtures. La herramienta de ensayo no sobrescribió qatupos_lab. No hubo llamadas a proveedores, impresión física, publicación ni ventas reales. API/laboratorio se reiniciaron con la versión actual en3000/4000; PostgreSQL55432. El entorno conserva etiquetas de simulación.

Evidencias: [tests](../construction/runs/2026-10-04-recuperacion-operativa/tests-final.txt), [E2E final](../construction/runs/2026-10-04-recuperacion-operativa/e2e-counters-final.txt), [respaldo/restore real](../construction/runs/2026-10-04-recuperacion-operativa/recovery-smoke.json), [arranque HTTPS](../construction/runs/2026-10-04-recuperacion-operativa/operational-smoke.json), [procedimiento](../../specs/016-recuperacion-operativa/quickstart.md), [captura](screens/tanda-anulada-016.png). Spec/plan/tasks/contracts están en feature016.

## Fallos encontrados y resueltos durante verificación

Se reprodujeron tres aperturas indebidas y dos credenciales/perfiles con éxito falso antes de corregir. Los primeros fixtures tuvieron errores de versión, id y nombre de columna; se corrigieron antes de atribuir fallos al producto. Una prueba de clave incorrecta descubrió cierre doble de descriptor; corregido preservando el error de autenticación. Una alternativa de stream bloqueó cierre y fue retirada; se limpió exclusivamente su DB/copia/key tras comprobar fin del escritor. Primer E2E nuevo apuntó a Mesa11 inexistente; corregido a la visita actual de Mesa09. Los resultados finales están aprobados; no se ocultaron fallos ni aumentaron permisos para pasar una demo. Ver [research016](../../specs/016-recuperacion-operativa/research.md).

## Estado real y siguiente entrega

**Ready_for_review, no aplicación final certificada.** MAR:T085/T086/T087 requieren revisión independiente de recuperación, aislamiento y credenciales; revisiones sensibles011..015 siguen pendientes. El autor no acepta sus controles financieros/de seguridad.

Antes de ventas reales faltan:

- **Impresión:** identificar modelo/IP/protocolo de Cocina, Heladería y Caja; construir/probar puente durable, resultados ambiguos, copias y avisos. Bebidas mantienen entrega directa sin ticket de preparación.
- **Izipay:** definir modalidad física/web y configurar integración autorizada con evidencia y conciliación; Yape/tarjeta no se confirman desde simulaciones ni desde una captura del cliente.
- **Fiscalidad:** proveedor/ruta SUNAT, series/certificado de prueba técnicamente separados, aceptación/rechazo/unknown y homologación; nota interna no es comprobante de pago.
- **Instalación y continuidad:** PC real, arranque como servicio y apagado limpio, TLS/DNS/Wi-Fi confiables en las dos pantallas/tablets/teléfonos, almacenamiento externo, automatización/retención/alertas de backup. El respaldo manual no acredita RPO/RTO ni PITR. ACL y cifrado de disco Windows no se certifican con mode600.
- **Recuperación operativa:** fencing del escritor anterior, conciliación de hechos posteriores al snapshot, checkpoints/dedupe y revisión antes de reabrir; el ensayo no contiene botón de promoción.
- **Negocio:** carta/personal/stock reales y piloto con cocina/caja/mozos/heladería/nocturno. Recetas/merma/combos/compras/devoluciones completas y ajustes posteriores al cierre siguen con alcance pendiente. No inferir stock o devolución desde fiscalidad.

Cada bloque requiere una asignación acotada sobre esta base. Qatu.pe/Delivery y operación hub/offline mantienen contratos pendientes; no se activan por cambiar una URL. [Continuidad](CONTINUIDAD.md) conserva pasos, límites y evidencia para reanudar.
