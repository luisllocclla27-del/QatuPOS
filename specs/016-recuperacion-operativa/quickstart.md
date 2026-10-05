# Operación de respaldo y ensayo

Esta entrega incluye respaldo manual y **restauración de ensayo**. No autoriza reabrir caja desde una copia ni sustituye PITR, fencing, homologación o aceptación independiente. El laboratorio3000 conserva datos sintéticos y no cobra ni emite documentos reales.

## Preparación del operador

1. Confirmar WorkOrder/versión, PostgreSQL17.11 y origen de confianza. Guardar configuración real fuera de Git con ACL Windows para cuenta del servicio/administrador; `mode600` en Node no acredita por sí solo permisos Windows.
2. Preparar almacenamiento protegido fuera del checkout, preferiblemente otro medio físico y copia externa al local. Una copia en el mismo disco no protege de una avería. Definir responsable, horario, retención y alerta por fallo antes del piloto; este incremento no los programa.
3. Crear una clave binaria aleatoria de exactamente32 bytes en ubicación distinta a la copia, por procedimiento seguro y archivo nuevo exclusivo. Conservar recuperación de esa clave por canal independiente. No usar texto de contraseña, certificado TLS ni clave SOL como clave de backup. No reemplazar la clave `guest-code.key` existente: la herramienta verifica que permita derivar las claves QR activas.
4. Configurar `QATU_BACKUP_KEY_FILE`, `QATU_BACKUP_FILE` (nombre nuevo `.qatubak`) y `QATU_GUEST_KEY_FILE` (ruta existente). En operativo `QATU_ENV=production` explícito y DATABASE_URL/configuración protegida de015; key y copia fuera del repositorio y en directorios distintos. QATU_PG_BIN_DIR opcional para instalación homologada17. Los valores reales nunca van a documentación, consola ni archivos de evidencia.

## Respaldo

Desde la carpeta piloto ejecutar `pnpm operational:backup`. Resultado solo muestra ID, fecha, cantidad de tablas, tamaño y cifrado. La copia captura un snapshot consistente, incluso si otros usuarios escriben después; no representa esas operaciones posteriores. Mantiene sesiones dentro del cifrado y hashes de datos para contrastar al restaurar. Límite archive512MiB; superar límite aborta. No respaldar carpeta pgdata en caliente por Explorer.

Exit0 significa que el archivo se completó y se sincronizó. Exit1 exige conservar estado y revisar permisos/motor/clave; una copia parcial no cuenta como respaldo recuperable. No overwrite: usar otro nombre para una nueva copia. El JSON no contiene contraseñas, claves ni URL; nunca publicar stderr privado del motor. Guardar únicamente reporte seguro en registro operativo.

## Ensayo aislado

Un operador provisiona una base **vacía**, exclusiva y local, denominada `qatupos_restore_<32hex>` con un ID nuevo y rol controlado. No usar qatupos_lab, una base productiva, una base compartida, ni una base con tablas/funciones/tipos preexistentes. No conectar aplicaciones/workers a ese destino. Configurar QATU_RESTORE_DATABASE_URL en entorno protegido y ejecutar `pnpm operational:restore-verify` usando copia/key indicadas.

La herramienta autentica el archivo entero antes de SQL, restaura en una transacción y compara cada tabla. Revoca personal; marca las sesiones cliente revocadas conservando relaciones históricas. Reporta `quarantine:true`. La app bloquea ese nombre con503, incluso si recibe un Pool directo. La clave QR dentro de la copia no se exporta ni se instala. El destino se conserva para inspección privada; el operador responsable elimina únicamente esa base de ensayo después de la revisión.

La extracción usa directorio temporal privado propio y lo limpia. Cifrado de disco y ACL del equipo siguen siendo requisitos de instalación, especialmente ante apagado durante extracción. Una falla de verificación puede dejar una base de ensayo restaurada, siempre bloqueada; no borrarla ni activar una segunda copia para silenciar la incidencia.

## Recuperación real, aún pendiente

Declarar incidente y preservar origen; congelar canales, comprobar fencing del escritor anterior, conciliar operaciones posteriores con bancos/proveedores y recuperar dedupe/checkpoints. No liberar unknown ni reimprimir/cobrar por inferencia. Solo una asignación nueva y aceptación independiente pueden implementar el cambio de autoridad y habilitar operación. Probar en equipos del restaurante y medir pérdida/tiempo reales; no anunciar RPO/RTO de hipótesis como resultados.

Referencias: [PostgreSQL17 pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html), [pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html), [Node24 crypto](https://nodejs.org/docs/latest-v24.x/api/crypto.html), OPS-009 del SDD. El respaldo cubre una base; roles globales, certificados TLS, binarios y configuración protegida requieren su propio procedimiento.
