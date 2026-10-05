# Plan016

Stack existente Node24, TypeScript6, pg8, PostgreSQL17.11, Next/React ya fijados; sin nuevas dependencias ni lockfile. Reutilizar servicios/commerce y packages/domain. Código de mantenimiento local en scripts/operational/recovery; ningún backend duplicado.

1. Baseline y WorkOrder antes de editar; snapshot de laboratorio sin migrar/seed. Spec Kit por proceso a esta feature, puntero global013 intacto.
2. Contrato de archivo/CLI antes de implementar, regresiones de lógica/seguridad primero.
3. Backup consistente: transacción repeatable read read only, pg_export_snapshot, hashes por tabla en ese snapshot, pg_dump --snapshot en proceso con credenciales por entorno restringido. Escribir solo ciphertext con archivo exclusivo, sync y limpieza propia ante fallo. Límite512MiB de archive y2MiB de manifest; hashes por fila streaming/cursor sin acumular tablas. Binaries17 explícitos y server17.
4. Restore: archivo cerrado y autenticado antes de SQL; dump temporal privado en directorio temporal propio, eliminación solo de archivos propios. pg_restore --single-transaction --exit-on-error --no-owner --no-acl. Destino ya creado, vacío, nombre reservado. Recuentos/hashes verifican integridad semántica; borrar sesiones en transacción. Nunca iniciar workers, proxy, impresoras ni aplicaciones allí. La verificación no restaura identidad operativa.
5. Guards de namespace en runtime y admisión HTTP (incluido Pool directo), health PostgreSQL. Correcciones core y UI preservan cambios del usuario. No nuevo endpoint de restauración ni backup desde navegador.
6. Pruebas reales en bases efímeras, mismo laboratorio interactivo preservado. Suite Vitest, Playwright secuencial, compilación y validator documental. Registro de limitaciones, hashes finales y ready_for_review; sensibles pendientes.

## Archivos y dependencias

MAR:T082 baseline → T083 spec/contrato → T084 regresiones. T085 respaldo → T086 restore y guard. T087 fechas/credenciales y T088 UI dependen de T084. T089 evidencia integra todos; T090 revisión independiente pendiente. Paths autorizados en WorkOrder; cambios fuera requieren nueva versión antes de escribir. Next docs locales use-client revisadas antes de editar componentes.
