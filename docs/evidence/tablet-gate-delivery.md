# Refinamiento · Tablet del mozo y entrada bloqueada

02/10/2026. El usuario plantea mozo con tablet, QR inicialmente bloqueado, clave entregada por mozo y conclusión al pagar la cuenta. Este incremento ajusta las vistas del piloto a ese recorrido y conserva el núcleo aceptado; no se crea un backend ni una regla financiera adicional.

## Recorrido construido

La entrada `/cliente`, sin sesión autorizada, presenta **Pedidos bloqueados** y tres pasos: abrir el enlace del QR, habilitación por el mozo e ingreso de clave, pedir hasta pago total. No carga catálogo/pedidos ni abre atención por consultar la URL. El mozo entra a la mesa desde tablet o terminal y pulsa **Habilitar mesa y mostrar clave**. Una atención habilitada muestra su clave vigente al volver a entrar. Mozo y cliente pueden pedir sobre la misma cuenta. El pago total positivo confirmado concluye el acceso; parcial/unknown mantienen su estado. La entrega pendiente y liberación física siguen separadas.

La página describe el destino del QR futuro; **este incremento no genera, imprime ni certifica lectura física de un QR**, ni activa una URL pública/LAN. El enlace es fijo y no incorpora clave. Los dispositivos reales necesitarán acceso HTTPS/red y validación física antes de operar ventas reales.

## Evidencia sobre la base integrada

- Typecheck y compilación optimizada aprobados.
- **106 pruebas de dominio/contratos/HTTP PostgreSQL aprobadas**; no se cambiaron dominios, repositorio, cookies ni OpenAPI.
- **5 escenarios de navegador aprobados**, incluido mozo táctil de **1024 × 768** y cliente de **390 × 844**: entrada sin permisos, clave incorrecta sigue bloqueada, habilitación, regreso a misma mesa conserva clave, pedidos privados sobre cuenta compartida, pago completo cierra navegadores y rechaza clave antigua. También recuperación de respuesta perdida, rotación y fallos de almacenamiento.
- **25 comprobaciones documentales aprobadas**; los documentos compartidos permanecen fuera de los cambios del piloto.
- [Revisión independiente](tablet-gate-review.md) contrastó componentes, contrato y hashes del escritor/dominio; sin bloqueantes para este alcance local. Sus resultados son inspección, no atribución de los tests del coordinador.
- [Entrada bloqueada](screens/cliente-bloqueado.png) y [mozo en tablet](screens/mozo-tablet.png) inspeccionados visualmente. Las capturas no homologan uso de dispositivos físicos ni facilidad con personal real.

Los primeros intentos de tests no pudieron conectar con PostgreSQL porque el proceso local estaba detenido; hubo dos suites de API fallidas y 28 casos omitidos por setup, y E2E no inició. Se arrancó la base portable existente, sin limpiar los datos interactivos, y se reejecutaron pruebas reales: 106/106 y 5/5 aprobadas. No se sustituyó PostgreSQL por mock ni se alteraron las pruebas para ocultar el fallo.

## Estado del producto

La base presencial y el acceso por clave funcionan en laboratorio con datos sintéticos. **El desarrollo del producto completo no ha terminado**. Siguen pendientes catálogo/personal reales, prueba física de red/tablets/QR, puente y ticketeras, SUNAT, integraciones Qatu.pe/Delivery, continuidad offline, recetas/combos/merma, anulaciones/devoluciones y aceptación con el restaurante. No se acepta producción ni G2 por este refinamiento.

Spec Kit: [especificación](../../specs/005-clave-mesa/spec.md), [plan](../../specs/005-clave-mesa/plan.md), [tareas](../../specs/005-clave-mesa/tasks.md). Usar el [runbook](../runbooks/guest-access.md) para el ensayo en este equipo.
