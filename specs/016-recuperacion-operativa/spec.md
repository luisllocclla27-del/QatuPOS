# 016 — Recuperación operativa y correcciones

Usuario autoriza revisar sus avances y seguir construyendo. Root es el único escritor bajo WorkOrder B21; se conserva la vista de anulaciones que el usuario añadió. Base015:116 hashes verificados. No se declara aplicación final ni se activan proveedores, impresoras o instalaciones reales.

## Requisitos verificables

- REC-FR-001: Respaldo completo PostgreSQL mediante pg_dump custom17 sobre snapshot exportado y transacción de lectura consistente. Incluye estado, dinero exacto, reservas, unknown, dedupe, outbox, fiscalidad, configuración/esquema y hash de cada tabla. No se copian archivos abiertos del motor ni se respaldan roles globales del cluster.
- REC-FR-002: Archivo `.qatubak` autenticado con AES-256-GCM; clave aleatoria32 bytes en archivo separado, IV nuevo por copia. Manifest y clave estable de acceso QR incluidos dentro del cifrado. Salida creada exclusivamente, permisos restrictivos, nunca contraseñas/URL/clave/logs privados en evidencia. Clave de respaldo y archivo deben estar separados; en operativo ambos fuera del repositorio y directorios distintos. Binaries y tamaño máximos explícitos.
- REC-FR-003: Restore es exclusivamente un ensayo a una base vacía loopback `qatupos_restore_<32hex>`, existente y separada. Autenticar archivo entero antes de iniciar SQL; usar pg_restore17, transacción única, sin clean/create/owner/ACL. Ningún destino arbitrario o poblado se sobrescribe. App rechaza ese namespace aun con Pool suministrado directamente. No existe promoción a operativo en este incremento.
- REC-FR-004: Comparar hashes y recuentos exactos de TODAS las tablas restauradas con snapshot. Revocar sesiones de personal/cliente solo tras comprobación satisfactoria; mantener dinero, reservas, unknown, dedupe, IDs y accesos QR como evidencia. La clave QR recuperada permanece cifrada: no se instala para reabrir atención. Diagnóstico seguro de copia/fecha/tablas sin payloads ni claves. Fallo no concede permiso para operar.
- REC-FR-005: Abrir día operativo solo en fecha actual de Lima y si es posterior a fecha cerrada; mismo día/reloj atrás no puede crear mañana. Laboratorio conserva avance sintético para ensayos existentes. Noche no altera día automáticamente, fiscal pendiente/unknown no se confirman al avanzar.
- REC-FR-006: Password y perfil exigen exactamente una membership SQL perteneciente al local; deriva detectada genera conflicto409 y rollback sin auditoría/outbox/versión/sesiones nuevas. No crear identidades para tapar inconsistencia.
- REC-FR-007: Vista de tandas separa anuladas, entregadas y pendientes; anulación total nunca aparece como entrega. Parciales muestran unidades activas/anuladas y no suman a preparar/entregar lo anulado. Pago continúa independiente de entrega. Contadores laterales de clientes/bebidas excluyen unidades anuladas.
- REC-FR-008: Health comprueba PostgreSQL y namespace; falla con503 sin filtrar detalles si base indisponible o en cuarentena. Evidencia reproducible, conservación del laboratorio, tipos/build/E2E/documentos y reporte de continuidad.

## Aceptación

REC-AT-001: Copia sintética y restauración PostgreSQL reales, con pagos unknown y reservas conservados; tablas iguales antes de revocar sesiones. Repetir comando no duplica efecto en origen.
REC-AT-002: IVs distintos para copias iguales; archivo modificado/clave incorrecta/truncado rechazados, base vacía sin cambio. Destino poblado/ruta existente/origen prohibido bloqueados.
REC-AT-003: Runtime normal y Pool directo rechazan base de ensayo; HTTP/health no permiten login ni efectos. Fuente preservada, sin emitir/cobrar/imprimir en ensayo.
REC-AT-004: Fechas UTC alrededor de medianoche Lima, mismo día y reloj atrás; apertura válida tras varios días toma hoy.
REC-AT-005: Membership ausente bloquea perfil/password con cero efectos PostgreSQL y mensajes comprensibles.
REC-AT-006: Anulación total/parcial/multilínea, bebidas directas, preparadas y entregadas; navegador verifica tanda totalmente anulada fuera de Entregados.

## Límites explícitos

El ensayo aislado no es recuperación productiva. Pendientes fencing del escritor anterior, reconciliación posterior al snapshot, política de retención y copias fuera de PC, programación/alertas y ensayo con hardware real. No se promete RPO/RTO ni PITR con respaldos manuales. Fuentes de diseño: OPS-009 del SDD, documentación PostgreSQL17 pg_dump/pg_restore y Node24 crypto. Revisión independiente de seguridad/finanzas obligatoria para aceptación.
