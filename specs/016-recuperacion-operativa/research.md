# Evidencia y decisiones016

Base015 comprobada:116 hashes íntegros; Git conserva archivos sin commits. Se detectó GuestOrders modificado respecto a entrega02/10 y se conservaron cantidades activas/badges que el usuario añadió. No hubo evidencia de un segundo backend o cambios amplios de núcleo fuera de esta carpeta.

Regresiones reales antes de corregir: `regressions-day-before.txt` reproduce tres aperturas indebidas; `regressions-credentials-before.txt` reproduce dos respuestas200 donde faltaba membership SQL. El primer borrador de fixtures usó id como string y outbox.id inexistente; se corrigieron los fixtures antes de registrar esos fallos de producto. No confundir fallos de fixture con bugs del negocio.

La DB inició recuperación automática tras apagado no limpio; PostgreSQL terminó y la huella interactiva quedó intacta. No se migró/seed/reset del laboratorio. El ensayoCLI restauró17 tablas y comprobó la misma huella de estado en origen y destino. Source contiene migration012, mientras011 permanece sin aplicar en este historial; dump/restore conservan ese hecho.

PG_dump realiza snapshot consistente bajo escritura concurrente y custom preserva estructura/datos; pg_restore permite transacción única y ausencia de owner/ACL. El snapshot se exporta desde la misma transacción que genera manifest/fingerprints. Las copias no incluyen roles/certificados del equipo. [Documentación pg_dump17](https://www.postgresql.org/docs/17/app-pgdump.html), [pg_restore17](https://www.postgresql.org/docs/17/app-pgrestore.html).

AES-256-GCM autentica archivo completo; metadatos y clave QR quedan dentro del cifrado, MAC validada antes de SQL. [Node crypto](https://nodejs.org/docs/latest-v24.x/api/crypto.html). La clave QR se contrasta con credenciales activas usando derivación canónica, sin duplicar lógica ni generarla automáticamente. Backup/key separados; ACL Windows y disco cifrado requieren instalación, no se certifican con mode600.

Se descartó promoción automática: no hay fencing/reconciliación posterior al snapshot. Namespace de ensayo y comentario persistente se comprueban en cada admisión; renombrar conserva cuarentena y no permite respaldarla como origen operativo. El operador es de confianza y propietario de DB; sus privilegios PostgreSQL podrían manipular metadatos y quedan sujetos a procedimiento independiente.

`recovery-first.txt`: fixture guest usó versión1 en vez de versión actual; corregido. `recovery-second.txt`: clave incorrecta produjo EBADF al cerrar un descriptor destruido por pipeline; fallo real de limpieza corregido sin ocultar fallo de autenticación. `recovery-third.txt`: alternativa FileHandle stream dejó pipeline esperando cierre y agotó hook; se descartó. Fixture exacta y archivos propios se eliminaron después de verificar fin del escritor (`cleanup-owned-fixture.json`). No se mataron conexiones ni borraron bases ajenas. `recovery-fourth.txt` y `tests-final.txt` verifican la versión estable.

Primer E2E nuevo apuntó a Mesa11 inexistente (fixture tiene10);19 recorridos previos pasaron y el nuevo agotó timeout. Se corrigió a la visita actual de Mesa09, conservando tandas históricas en Entregados. `e2e-focused.txt` y `e2e-final.txt` pasaron; revisión visual detectó contador lateral sin descontar anulaciones. Se corrigieron contadores cliente/bebidas y se verifica nuevamente con `e2e-counters-final.txt`.

No se ejecutan proveedores ni hardware reales; Izipay modalidad física/web sigue pendiente, proveedor SUNAT no elegido y modelos/IP/protocolos de ticketeras no confirmados. Esta evidencia acredita incremento local, no finalización mundial, cumplimiento fiscal ni RPO/RTO productivos.
