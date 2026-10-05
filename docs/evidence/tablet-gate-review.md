# Revisión independiente — tablet y entrada bloqueada

02/10/2026 · Ejecución `38b4d3cb-9b46-4bb8-ae8b-9a538740787f` · Asignación `4fa89acd-67f1-4dda-8429-dfa0001d0596` · Revisor `runtime_contracts`.

**Resultado:** no se encontraron bloqueantes en el refinamiento local inspeccionado. Revisión acotada de código/textos; no se iniciaron servidores, tareas adicionales ni cambios sobre datos interactivos. El único archivo escrito es este informe. Pruebas de navegador y compilación corresponden al coordinador y requieren su propia evidencia.

## Controles contrastados

- `guest-app.tsx` muestra «Pedidos bloqueados» sin sesión válida y explica mozo→clave→pedido→pago total. No expone catálogo/pedido antes de obtener sesión y snapshot autorizados del API.
- El bloqueo visual guía al cliente, pero no concede ni sustituye autoridad. El ingreso sigue llamando `joinTable`; los envíos usan cookie/token CSRF y el mismo endpoint validado. No se añadió autorización por número de mesa, URL o bandera de estado React.
- `table-guest-access.tsx` hace explícito «Habilitar mesa y mostrar clave» y envía `guest.access` con visita/versión/operación mediante el circuito staff existente. La clave se consulta al servidor cuando el snapshot confirma acceso active; no se genera ni se concede directamente en frontend.
- Cuenta pagada oculta la clave y los controles de habilitación; el mensaje distingue conclusión digital de entrega/liberación física. Preparación ya aceptada sigue su propio estado.
- Se conservaron recuperación por intención estable, bloqueo de recuperación ilegible, persistencia local previa a request y éxito conocido frente a fallo de limpieza. El máximo visible de cantidad ahora es 100, compatible con el contrato previamente aceptado.
- Se inspeccionó el escenario E2E con mozo en viewport táctil 1024×768 y cliente móvil 390×844: comprueba entrada bloqueada sin productos/botón de pedido, clave incorrecta, habilitación del mozo, ausencia de desbordamiento horizontal, persistencia de clave al volver a la mesa y recorrido por la cuenta existente. No se atribuye su ejecución al revisor.

## Autoridad y alcance sin cambios

Se calcularon hashes del repositorio comercial, dominio y OpenAPI y coinciden con la baseline del WorkOrder: writer/transacción, revocación por pago total, scope, cookies y contratos no se alteran por este refinamiento. La evidencia financiera/API de la revisión anterior conserva su alcance; no se amplía por textos o pruebas de viewport.

Las referencias al QR describen que su enlace abre el ingreso y **no** habilita pedidos. Los componentes no generan QR físico, no anuncian URL pública/LAN y no añaden conectividad de teléfonos a la máquina de laboratorio. El enlace disponible es `/cliente` y la interfaz conserva «Laboratorio local»/«Carta de prueba». Distribución de QR y acceso desde dispositivos reales requieren una entrega posterior explícita; no quedan acreditados aquí. Tampoco se acepta producción, G2, impresoras, fiscalidad ni feature001 integral.

## Hashes de los componentes inspeccionados

| Archivo | SHA256 |
|---|---|
| `apps/pos/src/components/table-guest-access.tsx` | `5109CBD72F62B38963E3DA583FE980898F08D330B66C3865849A4FE0E6DB6503` |
| `apps/pos/src/components/guest-app.tsx` | `F5B690C1FBB403B5A447BF22FB9F583E2B03F9F9A12664BD25B71B1FFB93ABD3` |

Hashes de control, idénticos a la baseline:

| Archivo | SHA256 |
|---|---|
| `services/commerce/src/authority/repository.ts` | `71E6F851839D5542C05EA162E5D73ADC78B01DD68065B186C6DBD9C90043C788` |
| `packages/domain/src/index.ts` | `5335FCD6F693F934E7913377807340EDBD04C6917613CD33886F13691E82E3FA` |
| `docs/contracts/pilot.openapi.json` | `5038F9A97687739B9E75CC31766AD8645292D7C53A276B56BD60CBC0A3E0BC11` |
