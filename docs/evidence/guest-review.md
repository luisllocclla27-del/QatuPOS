# Revisión independiente — clave de cliente por mesa

02/10/2026 · Ejecución `1f5f5a0e-d208-419d-a440-7626fe24b835` · Asignación `caaa18da-46c7-4269-9864-75aa51311fdd` · Revisor `runtime_contracts`.

## Revisión de diseño

Se leyeron spec/plan/tasks del incremento005 y su WorkOrder. La revisión inicial correspondió a diseño; la verificación de implementación figura abajo. El único archivo escrito por este revisor es este informe. No se alteraron implementación, pruebas, datos interactivos ni planificación del proyecto padre.

El diseño conserva un escritor comercial y una cuenta primaria por atención. La cookie cliente se separa de staff; el origen de cada tanda queda identificable y la consulta invitada excluye CheckSnapshot y pedidos de otros navegadores. Pago total positivo concluye acceso; parcial/unknown no lo concluyen. La derivación HMAC permite volver a mostrar una clave al mozo autorizado sin conservar clave literal en PostgreSQL.

### Controles indispensables antes de aceptar

- Activar/rotar debe negar una atención cuyo saldo positivo ya fue pagado por completo, aunque la mesa siga físicamente ocupada. Cerrar acceso no cancela entregas pendientes.
- El final de acceso es terminal: agregar después otra tanda staff no revive clave/cookies antiguas. Reocupar mesa genera atención/acceso nuevos.
- Comprobar credencial, sesión, visita y generación **dentro del bloqueo comercial**; no basta comprobar cookie antes de iniciar transacción. La carrera pago/pedido se resuelve por el mismo escritor.
- La recuperación idempotente también respeta revocación: un navegador concluido no recupera respuesta privada por reutilizar operation_id; otra sesión no lee la intención ajena.
- Guest no elige actor staff, empresa/local, visita, precio o destino. El ejecutor técnico no concede una sesión staff y la atribución cliente permanece explícita en pedido/auditoría.
- Credencial de diez caracteres necesita límite de intentos y unicidad de digest; una colisión no reasigna otra visita. No entregar clave en URL, snapshot general o logs.
- Si falta/cambia el secreto durable, no mostrar una clave recalculada como vigente sin verificar que su digest corresponde al registro. Conservar revocación/rotación y recuperación explícitas.

Estos puntos se comunicaron al coordinador y se contrastaron posteriormente con implementación y experimentos.

## Resultado de implementación

Revisión independiente terminada sobre la base identificada por hashes abajo. **Typecheck aprobado y 106 de 106 pruebas aprobadas**, ejecutadas por el revisor con `pnpm typecheck` y `pnpm exec vitest run tests/unit tests/integration/api.test.ts tests/integration/guest.test.ts`. El conjunto incluye contratos, dominio, HTTP autenticado y PostgreSQL real en bases efímeras. No se encontraron bloqueantes adicionales del alcance local después de la corrección del límite de admisión.

Se contrastó en código que la admisión y la escritura toman el bloqueo comercial del local; el servidor revalida identidad/acceso/visita y liga idempotencia a sesión invitada antes de recuperar respuestas. Cerrar/pagar totalmente/rotar modifica metadata, credenciales y revoca sesiones dentro del mismo commit de estado/operación/outbox. Se reutiliza `order.create`; el contexto invitado solo autoriza ese comando y conserva `source: guest` y participante en pedido/auditoría. La respuesta pública no incluye snapshot del personal ni libros financieros. Credenciales/tokens se guardan por hash, cookie y CSRF invitadas son distintas de staff, y claves no se incluyen en URL ni snapshots generales.

### Hallazgo corregido — admisiones válidas bajo BFF

El límite original consumía cuota con toda entrada, incluida la clave correcta. En el frontend todas las peticiones llegan al API por loopback; esto habría bloqueado al cliente válido número 13 en un minuto. Se comunicó el defecto P2 y el coordinador cambió el contador para consumir cuota únicamente con `INVALID_GUEST_CODE`, conservando límite de fallos/Retry-After y sin confiar en un encabezado de IP enviado por cliente.

El experimento independiente sobre API/base nuevos admitió **15 entradas válidas consecutivas desde la misma IP, todas con 200**. La regresión integrada también prueba 16 clientes válidos y bloqueo tras 12 claves incorrectas.

### Experimentos independientes adicionales

En una base efímera exclusiva del revisor:

1. Se cambió temporalmente el digest de una credencial sintética. El endpoint de entrega de clave retornó `409 GUEST_KEY_UNAVAILABLE`; no mostró una clave calculada incompatible con el registro. Se restauró el digest dentro de esa misma base. **No se leyó, borró ni modificó el secreto HMAC real**; el ensayo acredita discrepancia digest/derivación, no una restauración física completa del secreto.
2. Se activó acceso, admitió navegador, registró un pedido y reservó un cobro total de 3.500 céntimos. Un trigger temporal en outbox lanzó una excepción únicamente para `payment.confirm`.
3. El intento retornó 503. JSON comercial permaneció idéntico; clave siguió active, sesión no revocada y consulta privada siguió retornando 200. La revocación no quedó adelantada a un pago revertido.
4. Tras eliminar el trigger, reintentar **la misma operación de pago** retornó 200. Consulta privada retornó 403 y reintento de **la misma operación de pedido invitado** también 403. No se recuperó una respuesta privada después de concluir el acceso.
5. Se cerró y eliminó la base efímera por su helper, sin reiniciar ni limpiar `qatupos_lab`.

La suite integrada aprobada cubre además usuarios/ámbitos ajenos, privacidad de dos navegadores, CSRF e inyección de campos, reintentos ligados a participante, parcial/unknown/total, rotación/reocupación, logout/vencimiento, carrera pago/pedido, rollback de stock/pedido/outbox y rechazo de nuevas tandas sobre cuenta ya pagada.

## Revisión final de interfaz y recuperación

El revisor inspeccionó los ajustes posteriores de `guest-app.tsx`, `pos-app.tsx` y el caso de almacenamiento en `zz-guest.spec.ts`, y ejecutó nuevamente **typecheck con resultado aprobado**. El API/dominio financiero conserva la base verificada por las 106 pruebas; no se repitió ese conjunto por cambios exclusivamente de interfaz.

- El acceso móvil a «Mi selección» desplaza la página, sin enviar intención comercial.
- Si `sessionStorage.setItem` falla, la interfaz presenta «No enviamos el pedido» y sale antes de solicitar el endpoint: un envío nunca empieza sin registro local de su operación.
- Si `removeItem` falla **después de una respuesta 200 conocida**, se conserva éxito, se limpia la selección en pantalla y el registro restante permite recuperar la misma intención al recargar. No se convierte un pedido confirmado en fracaso ni se genera otra operación automáticamente.
- Un registro de recuperación ilegible mantiene productos y envío bloqueados y solicita asistencia del mozo.
- Descartar borrador de una atención pagada solo cambia estado local del usuario; no ejecuta pedido, anulación, compensación ni movimiento de stock/caja.

Durante esta inspección se encontró que JSON sintácticamente válido pero sin `operation_id` aún podía convertirse en pending, recibir 400 y liberar una nueva intención. Se comunicó y corrigió antes de cerrar revisión: `recoverOrder` ahora exige estructura cerrada, UUID de operación/producto, versión entera segura positiva, una a 100 líneas, cantidades enteras 1..100 y nota string de hasta 300 caracteres. La intención inválida queda `recoveryUnreadable`, sin envío recuperado ni pedido nuevo.

Se inspeccionó el escenario E2E que inyecta fallos de setItem/removeItem y una recuperación JSON válida sin identificador. El coordinador comunicó aprobación de los **3 escenarios guest reejecutados sobre la interfaz final**; la suite completa anterior había aprobado 5. El revisor no atribuye esos recorridos de navegador a una ejecución propia.

## Base inspeccionada

SHA256 de API/dominio verificados con 106 pruebas y de la interfaz final inspeccionada, cuyo typecheck se repitió independientemente:

| Archivo | SHA256 |
|---|---|
| `packages/domain/src/index.ts` | `5335FCD6F693F934E7913377807340EDBD04C6917613CD33886F13691E82E3FA` |
| `services/commerce/src/app.ts` | `004A3B7152AD6EBB763362FC2DC7D1316C3D6BE6CB4CAD01A5686A41BBA6E628` |
| `services/commerce/src/authority/repository.ts` | `71E6F851839D5542C05EA162E5D73ADC78B01DD68065B186C6DBD9C90043C788` |
| `services/commerce/src/tables/guest-repository.ts` | `97A35EF5E7A68265CB28636FB31D2D3E58619D587CA128A66FEE612FB76DFCD4` |
| `services/commerce/src/tables/guest-security.ts` | `6425FE096A3AAC4648B4F02DD3780F5BFC0D5438137786DC2C6F3775DD55CCCF` |
| `database/migrations/005_guest_access.sql` | `BBDAA360C2055836FAABB41D2E7B4156774A8063DF9EA7216BD3CF0E5784745E` |
| `apps/pos/src/components/guest-app.tsx` | `CC3D1CE3E9E58BB12FC1ACC0FD82FDBE4F286485A21C894E18125D7BBBA72F1B` |
| `apps/pos/src/components/pos-app.tsx` | `5074839A2DE51A267FC484119E23186A87527463F180C46B2FC0632A9117593C` |
| `tests/e2e/zz-guest.spec.ts` | `5332C47FB16E2FA5C5716F4058D5EA60C76665EC038A5BBE5D0818547EF32142` |

## Alcance

Laboratorio local. El revisor inspeccionó recuperación explícita de intención en interfaz; no ejecutó Playwright en paralelo al coordinador ni realizó ensayo humano con mozos/clientes. Resultado de navegador del coordinador se registra en su propia evidencia. No acredita LAN/Internet para móviles, QR/NFC físico, impresoras reales, emisión fiscal, aceptación G2 ni toda la feature001 del SDD principal.
