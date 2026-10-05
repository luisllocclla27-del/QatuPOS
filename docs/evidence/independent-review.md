# Revisión independiente del piloto presencial

01/10/2026 · Revisor `runtime_contracts` · Asignación `6fc11407-f4f9-4041-a3bf-123c039e437e` · Ejecución `40f292bc-1a38-41e6-927a-90830e432e52`.

Se inspeccionaron API, sesiones, validadores, repositorio transaccional, dominio financiero/operativo y migraciones. El revisor no modificó implementación ni pruebas. Todo se ejecutó desde `el-encanto-huamanguino`; los experimentos PostgreSQL usaron bases efímeras `qatupos_lab_test_<UUID>` y conservaron la base interactiva.

## Resultado

La revisión encontró seis fallos del dominio que el coordinador corrigió. La ejecución independiente posterior de `pnpm exec vitest run tests/unit tests/integration/api.test.ts` aprobó **62 de 62 pruebas**. Un experimento adicional de fallo de outbox confirmó rollback completo y recuperación por la misma operación. La observación sobre la cuenta del comercio fue corregida y contrastada con un experimento independiente adicional. No se concede aceptación G2 ni uso con ventas reales.

## Defectos encontrados y correcciones contrastadas

| ID | Severidad | Reproducción inicial | Corrección inspeccionada y evidencia |
|---|---|---|---|
| R01 | P1 | Tras abrir siguiente día, cerrar el nuevo día usando una caja cerrada anterior producía esperado cero, contado S/200 y diferencia cero, sin sesiones incluidas. | Cierre exige caja del día actual y última sesión de ese día; regresión incorporada al conjunto aprobado. |
| R02 | P1 | Entregar cerveza de pedido pendiente después del cierre reducía existencia 48→47 mientras el cierre conservaba conteo 48, sin custodio activo. | Entrega Caja requiere día abierto y sesión actual abierta, además de barrera de traspaso; regresión incluida. |
| R03 | P1 | Rechazar declaración dejaba `disputed`; aprobar y aceptar solo permitían `declared`, bloqueando caja/bebidas permanentemente. | Administrador independiente recupera disputed a declared conservando declaración/rechazo, luego entrante acepta. Se admite recuperación después de aprobación previa; razones de aprobaciones/rechazo quedan en entradas audit distintas. |
| R04 | P2 | Mozo podía ejecutar `line.prepare` para Cocina. | Preparación exige kitchen/admin, con ACL de estación en kitchen. |
| R05 | P2 | Cajero declaraba inventario antes de abrir/asumir caja. | Conteo del cajero exige sesión abierta propia del día actual. Administrador conserva su autorización explícita. |

El primer recorrido independiente del conjunto unitario, durante aplicación de correcciones, produjo 43 aprobadas y 3 fallidas por fixtures sin apertura de caja. El coordinador corrigió precondiciones de los tests, sin debilitar las nuevas restricciones; el conjunto integrado posterior pasó completo.

## R06 — cuenta del comercio: corregida y contrastada

**P1 en un circuito financiero habilitado:** `merchant_account` es texto libre del cliente. La unicidad `(method, merchant_account, external_reference)` puede evadirse cambiando el texto de cuenta al registrar el mismo recibo. Experimento puro independiente: dos pagos Yape parciales con referencia `SAME-RECEIPT`, cuenta `merchant-one` y luego `merchant-typo` fueron aceptados y aumentaron cobrado de cero a 2.000 céntimos.

Se propuso vincular el selector a cuentas/terminales configurados y autorizados por servidor (en laboratorio puede existir una sola cuenta sintética por medio). No basta cambiar el input visual: el servidor debe rechazar una cuenta no configurada. Corrección: servidor vincula la evidencia a la cuenta sintética configurada `comercio-laboratorio`; OpenAPI restringe el selector. Repetición independiente: primer pago con cuenta configurada aceptado por 1.000 céntimos; intento de la misma referencia con `merchant-typo` rechazado `VALIDATION_ERROR`; misma referencia con cuenta correcta rechazada `DUPLICATE_EVIDENCE`. Un pago confirmado permanece, el segundo saldo continúa retenido, sin duplicación. Las capacidades de pagos reales siguen deshabilitadas.

## Experimento PostgreSQL de interrupción transaccional

En una base efímera creada por `tests/support/database.ts`, un trigger temporal `BEFORE INSERT` sobre outbox lanzó excepción. `table.open` retornó 503 y se verificó:

- JSON y versión de `branch_state` idénticos al estado anterior.
- Cero filas nuevas en `command_operations` y outbox.
- Tras quitar el trigger, reintentar el **mismo** `operation_id` produjo 200 y un efecto.
- Repetir otra vez produjo 200 con `replayed: true`.
- La base efímera se cerró/eliminó; `qatupos_lab` no se limpió.

Esto verifica atomicidad del efecto, registro idempotente y outbox frente a fallo posterior a la mutación del estado. No acredita despacho a proveedores, exactly-once en papel ni restauración de producción.

## Controles favorables inspeccionados

La sesión deriva empresa/local/rol desde membership persistida; claves compuestas vinculan sesiones al ámbito. El servidor valida requests estrictos sin eliminar campos extras; precio, tenant, branch y rol inyectados son rechazados. PostgreSQL bloquea el agregado del local y deduplica operación antes de comprobar versión; otro actor no recupera su resultado. Evidencia digital tiene índice único por tenant y referencia del comercio. Los snapshots ocultan libros de caja/pagos a mozos y filtran estaciones de cocina; durante conteo ciego usan null y retiran libros que revelarían expectativas. Los pagos unknown mantienen retención y conservan sesión de inicio al resolverse en otro turno. Nota interna conserva leyenda no-CPE y fiscal pendiente.

## Base de la verificación integrada

SHA256 al momento del conjunto final independiente de 62 pruebas:

| Archivo | SHA256 |
|---|---|
| `services/commerce/src/app.ts` | `28FC31C641F871D1DC7CCD40D4D445434BA428F5BC1C97A44E00EA4292344A25` |
| `services/commerce/src/authority/repository.ts` | `775CB096166E09B86E117FBCB5FDF2FE52CC6C32251ABD78921FD9CAAD49C742` |
| `packages/domain/src/index.ts` | `0D86AECE9FC9E4C80947E5794DE35D55421BC0B789BBC7CDBE93E43BF2B7D2E0` |
| `database/migrations/001_core_scope.sql` | `0E180C1DD0E28D622FBE743861C4C6F4300EB0BC638BC1EDE4F3D8AA93299296` |

## Límites de aceptación

Aceptación técnica limitada a los controles y escenarios ejecutados sobre laboratorio. Siguen fuera de esta revisión: pruebas humanas de facilidad de uso, medición de carga/soak, restauración, hardware real, emisión SUNAT, cobro por proveedores, recetas/merma/refunds completos, QR/ecommerce/Delivery y continuidad hub. Un escritor basado en agregado JSON por local sirve al incremento; no demuestra todavía todos los límites/índices por entidad del modelo integral. La secuencia técnica identity de outbox no se certifica como stream comercial consecutivo sin huecos.
