# Revisión independiente — pedidos del cliente

02/10/2026 · Ejecución `2332e84d-b26e-4125-b97f-6284ec045445` · Asignación `291a423a-c441-4e97-9efe-19dceacb3411` · Revisor `runtime_contracts` · Feature `specs/005-clave-mesa` · Tareas `TBL:T022`, `TBL:T024`, `TBL:T033`.

**Resultado:** no se encontraron bloqueantes en el incremento de consulta inspeccionado. Esta revisión es estática y acotada a clasificación, navegación, roles y continuidad. No se ejecutaron tests, servidores ni operaciones sobre bases de datos. El único archivo escrito por el revisor es este informe. La aceptación integrada corresponde al coordinador con resultados de navegador y compilación sobre estos archivos.

## Controles contrastados

- `GuestOrders` utiliza exclusivamente `PosSnapshot` recibido por el circuito staff existente y selecciona `source === 'guest'`. No envía comandos, consulta endpoints adicionales ni mantiene un segundo estado comercial.
- Las tandas pendientes se calculan con `quantity - fulfilled_quantity`; una tanda se clasifica como entregada únicamente cuando todas sus unidades están entregadas. Los filtros pendientes/entregados/todos y el contador de navegación conservan este criterio independientemente del pago.
- Cocina y Heladería distinguen preparación de entrega mediante `prepared_quantity` y `fulfilled_quantity`. Las cantidades corresponden a las invariantes del núcleo inspeccionado: entrega no supera preparación ni cantidad solicitada. Caja identifica entrega directa y excluye sus bebidas del conteo por preparar; que aparezcan listas para llevar no registra su entrega ni genera ticket.
- «Cuenta pagada» se muestra como información separada: exige importe positivo totalmente pagado y ninguna retención. Una tanda pagada con unidades pendientes permanece en «Por entregar» con el texto «aún falta entregar». No se deriva entrega desde pago, revocación de clave, impresión o preparación.
- Cada tarjeta resuelve visita por `order.visit_id` y cuenta por `order.check_id`; el filtro por mesa conserva el historial asociado a esa mesa física sin sustituirlo por la ocupación vigente.
- «Ver mesa» requiere visita abierta y coincidencia `table.visit_id === visit.id`. El callback repite ambas comprobaciones, comprueba `disabled` y solo cambia la selección/pantalla. No llama al flujo que abre visitas ni crea una nueva ocupación. Una visita cerrada o una mesa reocupada deja su tarjeta histórica con botón deshabilitado «Atención cerrada».
- La sección pertenece al POS del personal: mozo, caja y administración. Las cuentas de estación conservan navegación limitada a estaciones y proyección de servidor sin cuentas/datos de caja. No se incorpora esta vista al portal del cliente ni se modifica su proyección privada. Los controles visuales no sustituyen autorización del API.
- La actualización utiliza el snapshot/refresco existente; consultar una tarjeta no vuelve a aceptar ni enviar la tanda. El pie explica expresamente que pago y entrega son estados diferentes.

## Observación resuelta

**GO-01 · claridad de indicadores, resuelta:** las tres métricas superiores agregan `pendingOrders` de todas las mesas, mientras el selector por mesa filtra únicamente las tarjetas. Se comunicó la posible confusión al coordinador, que añadió «Resumen de todas las mesas» antes de los indicadores. Se inspeccionó directamente ese rótulo en la base final y se actualizó el hash. No se modificaron cálculos, cuentas, entregas, navegación ni permisos. No quedan observaciones abiertas en este alcance.

## Pruebas inspeccionadas y límites de evidencia

Se leyó el escenario ampliado de `tests/e2e/zz-guest.spec.ts`: contempla dos navegadores cliente con pedidos separados, cuenta pagada antes de entregar, exclusión de esta sección en cocina, preparación y entrega registradas desde estaciones, filtro por mesa, traslado a «Entregados», navegación a visita vigente, cierre y reocupación de la misma mesa con navegación histórica deshabilitada. También comprueba el uso táctil de 1024×768. El coordinador comunicó 106/106 tests, 5/5 escenarios E2E, tipos y build aprobados, con repetición de build prevista tras el rótulo final. Esos resultados deben conservarse en su evidencia integrada; no se atribuye su ejecución al revisor ni se acepta una compilación pendiente por su anuncio.

El dominio, repositorio transaccional y OpenAPI mantienen los hashes de la baseline aceptada. Esta entrega no modifica cookies, scope, idempotencia, revocación de claves, reglas de cobro ni escritor comercial. No equivale a nueva validación financiera completa y no acredita producción, G2, QR/NFC físico, LAN/HTTPS, impresoras, SUNAT, Qatu.pe/Delivery o feature001 integral.

## Revisión del reporte de continuidad

Se inspeccionó `docs/evidence/CONTINUIDAD.md`. Diferencia la consulta inicial de cuota de una asignación de tokens por conversación y conserva los valores como referencia temporal: 87 % semanal usado, 13 % restante. Distingue la última base aceptada del incremento en curso, documenta carpeta aislada, propietarios de archivos, pruebas efímeras y preservación de la base interactiva. No presenta capacidades pendientes como aceptadas ni propone otro núcleo comercial. El apartado «Trabajo en curso» debe actualizarse con la entrega y resultados integrados cuando el coordinador concluya; su estado pendiente durante esta revisión es coherente. El revisor no modificó ese reporte.

## Hashes de los componentes inspeccionados

| Archivo | SHA256 |
|---|---|
| `apps/pos/src/components/guest-orders.tsx` | `8065FAEF54660AF5432F9A78745A573BFF20A7FC1023816BAEB11B222E72FE42` |
| `apps/pos/src/components/pos-app.tsx` | `80304F099641D29533658850F119252523F2D6CEF92AF05667FE796226CDEAD6` |

Hashes de control, idénticos a la baseline:

| Archivo | SHA256 |
|---|---|
| `packages/domain/src/index.ts` | `5335FCD6F693F934E7913377807340EDBD04C6917613CD33886F13691E82E3FA` |
| `services/commerce/src/authority/repository.ts` | `71E6F851839D5542C05EA162E5D73ADC78B01DD68065B186C6DBD9C90043C788` |
| `docs/contracts/pilot.openapi.json` | `5038F9A97687739B9E75CC31766AD8645292D7C53A276B56BD60CBC0A3E0BC11` |
