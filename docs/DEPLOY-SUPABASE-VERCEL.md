# Preparar El Encanto Huamanguino para Supabase y Vercel

Para la secuencia actual de entrega y configuración externa usar [RELEASE-CLOUD](RELEASE-CLOUD.md). El instalador aplica once archivos canónicos (001..013 con huecos002/003); el número013 es la última migración, no el conteo de archivos. `cloud:secure` permite usar un JSON protegido fuera del repositorio sin cargar variables de laboratorio. Este documento conserva el detalle técnico017.

Esta entrega prepara la instalación cloud del piloto. No se creó ningún proyecto, cuenta, base remota ni despliegue. El ensayo local ejecuta el servidor Next compilado y PostgreSQL real; no acredita conexión real a Supabase/Vercel ni proveedores/hardware.

## Arquitectura y operación del restaurante

Vercel sirve la web y `/v1/**` en el mismo origen HTTPS. La API ejecuta el núcleo existente de pedidos, inventario y caja mediante Node24; no necesita un segundo servidor ni puerto4000. Cada solicitud cierra sus conexiones SQL antes de devolver respuesta, evitando conexiones retenidas al suspenderse una función. SQL persiste sesiones, claves, presupuestos de intentos, operaciones/idempotencia y outbox. No depender de memoria ni filesystem cloud para dinero o acceso de mesas.

Supabase se usa como PostgreSQL privado, no como acceso directo del navegador. Esquema `qatupos`, rol de aplicación `qatu_pos_runtime`, tablas de configuración/migraciones de solo lectura para ese rol. El servidor aplica tenant/local/roles: esta entrega no afirma aislamiento de tenants mediante RLS. No publicar el esquema en Data API, no añadir permisos anon/authenticated/service_role ni entregar claves Supabase al cliente. [Grants y exposición API](https://supabase.com/docs/guides/api/securing-your-api).

Seleccionamos conexión directa5432 o pool compartido en modo **session5432**. El núcleo usa contexto de sesión `search_path`; el modo transaction6543 queda rechazado. Se inicializa explícitamente cada conexión y se verifican esquema, rol y vínculo en cada request. TLS verifica certificado/hostname; nunca `rejectUnauthorized=false`. [Opciones de conexión Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).

La PC, las dos pantallas y tablets entran al mismo dominio HTTPS. Los clientes escanean una etiqueta que abre `/cliente` y necesitan la clave que activa el mozo para esa atención; escanear no abre pedidos. La clave termina al pago total confirmado. Código fijo en etiqueta/NFC abre la web; no imprimir la clave temporal en una etiqueta permanente. En esta versión la clave identifica la atención/mesa; no se genera todavía un PDF de etiquetas QR/NFC ni se administra hardware NFC.

Cloud requiere internet para confirmar operaciones. Borradores y acciones con respuesta perdida mantienen sus identificadores para consultar/reintentar; no existe un hub offline ni aprobación local paralela. La PC no se convierte en segunda autoridad. Conservar Cocina/Heladería como estaciones separadas, Caja entrega bebidas sin ticket de preparación, prioridad/FIFO y responsable de entrega, turno nocturno bebidas y conteo/caja final. Traspaso no es venta; unknown no se convierte en pago al cerrar.

## 1. Crear proyectos y dominio cuando se inicie el despliegue

Crear **un proyecto Supabase dedicado** para producción y otro para staging. No reutilizar Qatu.pe/Delivery ni una base con ventas existentes. Seleccionar región y capacidad junto con Vercel; probar latencia y concurrencia de dos terminales/tablets y QR antes de abrir al público. La disponibilidad y límites dependen del plan contratado; esta entrega no promete servicio gratuito ni capacidad ilimitada.

Definir un dominio HTTPS fijo de producción y otro fijo de staging. Copiar el project ref y la conexión **session5432** desde Connect del proyecto. Un custom role usa username `qatu_pos_runtime.PROJECTREF` en el pooler, y `qatu_pos_runtime` en conexión directa. Contraseña URL debe estar codificada correctamente. Descargar el certificado de base cuando corresponda y guardar su PEM como base64 en la variable CA; no incluir archivos privados en el repositorio.

## 2. Instalar la base vacía desde un equipo administrativo

Ejecutar desde `el-encanto-huamanguino`, con dependencias fijadas mediante `pnpm install --frozen-lockfile`. Introducir variables en un archivo protegido fuera del checkout o en un gestor de secretos; no escribir valores reales en comandos, chat, ejemplos o evidencia. La CLI lee variables ya cargadas; no carga `.env.example`.

| Variable | Uso |
|---|---|
| `QATU_DEPLOYMENT` | `vercel` |
| `QATU_ENV` | `production`; staging también usa datos operativos propios, sin demo |
| `QATU_DEPLOYMENT_STAGE` | `production` o `staging` |
| `QATU_SUPABASE_PROJECT_REF` | Referencia del proyecto correspondiente |
| `QATU_PUBLIC_ORIGIN` | Origen HTTPS exacto, sin slash final, ruta, query o credenciales |
| `QATU_GUEST_CODE_KEY_BASE64` | Secreto estable de32 bytes aleatorios criptográficos, base64 canónico |
| `QATU_DATABASE_CA_BASE64` | PEM CA en base64 si requerido para verificar conexión |
| `QATU_MAINTENANCE_DATABASE_URL` | Conexión administrativa `postgres`/`postgres.PROJECTREF`,5432, `sslmode=verify-full` |
| `QATU_RUNTIME_DATABASE_PASSWORD` | Contraseña individual aleatoria16..128 caracteres para el rol runtime |
| `QATU_ADMIN_USERNAME`, `QATU_ADMIN_NAME` | Administrador individual inicial |
| `QATU_ADMIN_PASSWORD` | Contraseña16..128 caracteres, diferente del laboratorio |
| `QATU_RESTAURANT_NAME`, `QATU_TABLE_COUNT` | Nombre y número real de mesas,1..500 |

Guardar una copia cifrada del secreto de mesa en un lugar distinto de la base; perderlo invalida claves activas. No regenerarlo en cada despliegue. No reutilizar secretos entre staging y producción. Generarlo mediante gestor de secretos/CSPRNG, no una palabra, UUID, contraseña humana ni el valor sintético de los tests.

Ejecutar `pnpm cloud:install`. La transacción crea solo el esquema/rol POS, aplica migraciones y checksums, inicializa administrador/mesas con **carta/stock/ventas vacíos** y sin series fiscales, restringe permisos y registra el vínculo proyecto/entorno/origen/clave. Si ya existe esquema o rol, se niega a sobrescribir. No ejecutar `setup:local`, seed o migrador general sobre Supabase.

Crear `DATABASE_URL` con el rol runtime y su contraseña, mismo proyecto y `sslmode=verify-full`; luego ejecutar `pnpm cloud:doctor`. Su `ready:true` certifica únicamente configuración SQL, binding, permisos y checksums, **no autorización de puesta en marcha, cumplimiento fiscal ni hardware**. El diagnóstico no imprime secretos. Un fallo muestra mensaje genérico deliberadamente; revisar variables/permisos en equipo administrativo sin compartir credenciales.

Retirar contraseña administrativa inicial, contraseña runtime separada y conexión administrativa del entorno de ejecución tras instalar. Mantener solo `DATABASE_URL` runtime. Preservar credenciales administrativas en el gestor de secretos para mantenimiento autorizado.

## 3. Configurar Vercel

Usar este piloto como repositorio/proyecto. **Root Directory: `apps/pos`**; habilitar inclusión de archivos fuente fuera de Root Directory para `services`, `packages` y el OpenAPI canónico. Configuración `apps/pos/vercel.json`: Next.js, instalación `corepack pnpm install --frozen-lockfile`, build `corepack pnpm build`. No subir `.runtime`, `.env`, respaldos, PostgreSQL portable ni evidencia privada. `.vercelignore` y exclusiones de tracing protegen estos archivos; el contrato JSON sí forma parte del bundle de servidor.

Seleccionar Node24.x y `ENABLE_EXPERIMENTAL_COREPACK=1`; el workspace fija pnpm12.5.1 y lockfile, sin nuevas versiones externas. [Node soportado](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [package managers/Corepack](https://vercel.com/docs/package-managers).

Variables de **Production**: deployment/env/stage/projectref/origen/secreto mesa/CA/DATABASE_URL y Corepack anteriores. Nunca usar `NEXT_PUBLIC_` para estos valores. No cargar conexión administrativa ni contraseña inicial de admin. Vercel provee `VERCEL`/`VERCEL_ENV`; el adaptador confía en IP de plataforma solo allí. [Cabeceras verificadas de Vercel](https://vercel.com/docs/headers/request-headers).

Variables de **Preview**: proyecto y secretos staging, stage `staging`, origen HTTPS fijo de staging. No compartir Production variables con Preview. Una preview con binding production queda bloqueada. Los dominios aleatorios de preview no se admiten como nuevos orígenes automáticamente; probar desde el alias HTTPS staging configurado. No usar `vercel dev` con instalación operativa real.

No subir `QATU_CLOUD_DIST_DIR`: es solo para el ensayo local `.next-cloud`. Vercel utiliza `.next`. `pnpm build:cloud` prepara artefacto local independiente; no publica nada. Compilación explícita webpack resuelve imports ESM `.js` a las fuentes TS del núcleo. En laboratorio la web sigue delegando al servicio commerce existente, sin duplicar autoridad.

## 4. Verificar después de desplegar en staging

Consultar `/v1/pos/runtime`: debe responder `operational` y no-store, o503 si rol/esquema/binding/migraciones son incorrectos. La portada estática200 no acredita base disponible. Iniciar admin, crear personal individual (cuentas inicialmente inactivas), establecer credenciales, activar roles, cargar carta con estación/stock apropiado y recibir existencias reales. No importar historial sintético.

Probar desde ambas terminales y tablets: abrir turno con fondo, abrir mesa, asignar mozo, activar clave, entrar cliente, cotizar/enviar dos tandas concurrentes, cocina/heladería y entrega directa de bebidas, pago parcial/total efectivo, clave finalizada, traspaso con conteo ciego, noche solo bebidas, discrepancia con firma de otro administrador y cierre total. Caída de red/respuesta perdida debe conservar borrador/ID y nunca duplicar ventas. Medir latencia y conexiones bajo carga; máximo2 conexiones por solicitud no equivale a capacidad ilimitada por proyecto.

Intentos incorrectos/en vuelo comparten cupo SQL por IP; un acceso correcto devuelve únicamente su reserva y conserva fallos ajenos. Una devolución tardía no afecta una ventana nueva. Esto permite varios ingresos legítimos desde el Wi-Fi sin perder protección ante ataques. Las sesiones viven en SQL y los códigos en un secreto estable, no en la memoria de una función.

## 5. Mantenimiento y recuperación antes de operación real

Guardar backup administrado de Supabase conforme al plan y retención elegidos, exportación segura del esquema POS y secreto de mesa, alertas y ensayo de restauración en **proyecto separado**. Los scripts016 para bases locales `public`/`qatupos_prod_*` **no son un backup Supabase** y no deben apuntarse a `/postgres`. No hay ensayo real de backup/PITR Supabase en esta entrega. Antes de atender ventas reales, validar recuperación, sesiones revocadas, fencing del escritor original y conciliación de pagos/outbox posteriores al snapshot. Restaurar un binding production en otro proyecto no lo habilita para operar; el guard bloquea cambios de projectref/etapa/origen/clave. Una recuperación exige procedimiento autorizado, nunca borrar o editar binding para saltarse protección.

Para una actualización posterior, realizar backup y revisar cambios; ejecutar `pnpm cloud:migrate` con conexión administrativa protegida y el mismo binding. Valida checksums de lo aplicado, ejecuta solo lo nuevo y conserva grants privados, todo en una transacción. `pnpm cloud:doctor` verifica después. No editar una migración ya aplicada ni volver a instalar. Planificar compatibilidad/rollback de código y migración; revertir Vercel no revierte SQL.

Retener auditoría y unknown. Establecer mantenimiento de las filas de intentos expiradas; no ejecutar limpieza indiscriminada de sesiones/pedidos/outbox. Programación de backups/mantenimiento y alertas del proveedor se configura al crear el proyecto y se verifica antes de operación.

## Conexiones y validación pendientes

Impresoras: identificar modelo/IP/protocolo Cocina, Heladería y Caja, implementar/homologar puente PC ↔ cloud con autenticación, cola durable, confirmación/unknown y copia con motivo. Vercel no alcanza directamente una ticketera privada LAN. Bebidas no generan preparación. No asumir ESC/POS/9100 solo porque son de red.

Izipay: definir modalidad física/web y credenciales de prueba; correlación, notificación verificada, consulta, unknown, conciliación y devolución deben probarse antes de habilitar cobro digital. Fiscal: elegir proveedor/series de prueba y homologar boletas, facturas y notas de crédito; una nota de venta interna no sustituye comprobante fiscal. Estos caminos siguen bloqueados en modo operativo mientras no exista integración verificable.

Ensayo físico: PC, Wi-Fi/internet, dos pantallas, tablets, etiquetas QR/NFC, certificados y corte/reinicio. Aceptación independiente de seguridad/dinero/aislamiento y formación del personal antes de puesta en marcha. Recetas/mermas/combos/compras/reembolsos completos, Qatu.pe/Delivery e infraestructura offline son ampliaciones todavía pendientes; esta entrega no las declara implementadas.
