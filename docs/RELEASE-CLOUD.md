# Entrega Git → Supabase → Vercel

**05/10/2026 · kit019.** Destino humano: [QatuPOS](https://github.com/luisllocclla27-del/QatuPOS). Esta carpeta es la raíz del repositorio; no subir el proyecto padre, datos locales, bases, respaldos ni archivos protegidos. La aplicación conserva el servidor017 y los procesos018. Preparar instalación/publicación no certifica ventas reales.

## 1. Revisar y subir Git

Requiere Node24 y pnpm12.5.1. Desde la raíz:

```powershell
corepack pnpm install --frozen-lockfile
pnpm release:check
pnpm release:test
pnpm exec vitest run tests/unit/cloud-protected.test.ts
pnpm typecheck
pnpm build:cloud
```

release:check revisa archivos seguidos y nuevos no ignorados, hashes SQL y estructura/configuración. Sus patrones de secretos son limitados; revisar también el contenido antes del commit. Dos literales sintéticos históricos tienen excepciones documentadas ligadas al SHA256 exacto; cambiar el archivo obliga a volver a revisar. .gitattributes conserva bytes, incluida migración012 con CRLF. No normalizar SQL ya aplicado.

Revisar git status y git diff --cached --stat antes de commit/push. Destino https://github.com/luisllocclla27-del/QatuPOS.git, rama main. Nunca force-push ni borrar historial remoto. Si Vercel ya está conectado a main, un push podría iniciar un despliegue automático. La plantilla deployment/github-verify.template.yml verifica kit, negativas de configuración, tipos y build; no tiene credenciales ni despliega. No está activada: GitHub rechazó crear .github/workflows/verify.yml porque el token actual no tiene permiso workflow. Para activarla, crear ese archivo desde GitHub con la plantilla o usar una credencial con ese permiso; no enviar tokens en chat. No reemplaza la suite SQL/E2E.

El script histórico validate:sdd valida planificación del proyecto padre y necesita su entorno Python; no es una comprobación portable del repositorio publicado. release:check comprueba empaquetado independientemente. Ambas evidencias son distintas.

## 2. Identificar Supabase antes de escribir

Usar proyecto **nuevo y dedicado**, distinto de Qatu.pe/Delivery y otro para staging. Registrar ref exacto, nombre y dominio HTTPS final de Vercel. No hacer bootstrap en una base existente por inferencia. Ejecutar [000-precheck.sql](../deployment/supabase/000-precheck.sql) en el SQL Editor de ese proyecto: pos_schema_exists=false y pos_role_exists=false son necesarias, no prueban por sí solas que sea el proyecto correcto o esté vacío.

Conexión PostgreSQL directo5432 o session pooler5432, sslmode=verify-full. El pooler sirve donde no hay IPv6 directo; transaction6543 no es compatible con nuestro search_path de sesión. Copiar host/región reales desde Connect; no inventarlos. [Documentación Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).

## 3. Guardar configuración privada

Copiar [plantilla de nombres](../deployment/cloud-settings.example.json) a un JSON **fuera del checkout**, en carpeta privada con lectura restringida a la cuenta operadora, o provisionarlo desde gestor de secretos. No pegar valores en chat, Git ni comandos con eco. Plantilla vacía no funciona.

Completar ref, etapa, origen exacto https://dominio sin barra final, mesas reales y administrador individual con contraseña16..128. Generar con gestor/CSPRNG clave estable32bytes en base64 canónico y respaldarla cifrada. No regenerar por deploy; staging usa otra clave. Contraseña runtime individual16..128: DATABASE_URL contiene esa misma contraseña codificada como componente URL. Mantenimiento usa credencial separada.

Runtime directo: qatu_pos_runtime; pooler: qatu_pos_runtime.REF. Mantenimiento directo: postgres; pooler: postgres.REF. Base /postgres, puerto explícito5432 y único parámetro sslmode=verify-full. CA oficial en base64 si es necesaria; nunca desactivar verificación. El lanzador acepta sólo claves documentadas, resuelve enlaces y rechaza archivos dentro del checkout. No verifica permisos del sistema: configurarlos es parte operativa.

```powershell
pnpm cloud:secure check --config "C:\RUTA-PRIVADA\encanto.protected.json"
```

check valida configuración sin contactar la base. Al ejecutar mantenimiento elimina variables heredadas del laboratorio/preview y no imprime secretos. No configura Vercel.

## 4. Instalar y ejecutar nuestros SQL

Después de confirmar proyecto dedicado vacío y configuración:

```powershell
pnpm cloud:secure install --config "C:\RUTA-PRIVADA\encanto.protected.json"
pnpm cloud:secure doctor --config "C:\RUTA-PRIVADA\encanto.protected.json"
```

Install ejecuta **once migraciones existentes**, ordenadas001..013 (002/003 no existen), en una transacción con lock. Crea esquema qatupos, administrador individual, mesas, rol restringido y binding de ref/etapa/origen/clave. Rechaza instalación existente. No ejecuta seed: carta, stock, historia y series fiscales empiezan vacíos. [Manifiesto y hashes](../deployment/migrations.manifest.json).

**No pegar migraciones sueltas en SQL Editor:** omitiría bootstrap, permisos, checksums y binding. No hay instalador paralelo. Después ejecutar [100-verify.sql](../deployment/supabase/100-verify.sql), sólo lectura. Resultado: ref/etapa/origen correctos; once hashes iguales al manifiesto; rol sin privilegios elevados; runtime_usage=true, runtime_ddl=false; metadata no escribible; roles browser sin exposición y public_exposed=false. Doctor comprueba conexión runtime y binding; no certifica hardware ni operación completa.

Futuras migraciones: cloud:secure migrate --config ..., luego doctor. No repetir install ni reescribir SQL aplicado o saltar errores. Si falla, revisar configuración/proyecto/certificado; no publicar logs con URLs/contraseñas. Retirar credenciales iniciales/admin del archivo diario cuando no se necesiten y conservarlas en gestor.

## 5. Importar en Vercel

Importar QatuPOS. **Root Directory apps/pos**, habilitar acceso a fuentes fuera de esa carpeta para services, packages y OpenAPI. Node24.x; comandos de apps/pos/vercel.json; frozen-lockfile en la raíz y Next.js/webpack. [Monorepos Vercel](https://vercel.com/docs/monorepos).

Variables Production del servidor:

| Variable | Valor |
|---|---|
| QATU_DEPLOYMENT | vercel |
| QATU_ENV | production |
| QATU_DEPLOYMENT_STAGE | production |
| QATU_SUPABASE_PROJECT_REF | ref dedicada |
| QATU_PUBLIC_ORIGIN | mismo origen HTTPS del binding SQL |
| QATU_GUEST_CODE_KEY_BASE64 | misma clave estable de esa instalación |
| DATABASE_URL | conexión runtime; nunca postgres administrador |
| QATU_DATABASE_CA_BASE64 | CA verificada si es necesaria |
| ENABLE_EXPERIMENTAL_COREPACK | 1 |

Nunca subir JSON privado completo: excluir QATU_MAINTENANCE_DATABASE_URL, QATU_ADMIN_PASSWORD y QATU_RUNTIME_DATABASE_PASSWORD separado. No usar NEXT_PUBLIC para secretos; navegador no necesita anon/service_role/Data API. No fijar VERCEL* ni QATU_CLOUD_DIST_DIR. Cloud usa .next; build:cloud local usa .next-cloud para preservar servidor3000.

Staging necesita proyecto/clave/origen propios y etapa staging. Previews aleatorios no constituyen origen operativo; no conectarlos a producción. HTTPS cloud necesita internet; hub/offline pendiente de homologación.

## 6. Verificar antes del piloto

/v1/pos/runtime debe responder200, entorno operational y no-store; portada200 no prueba conexión SQL. Entrar con administrador individual, verificar sesiones/permisos/CSRF, carta vacía, altas y mesas. Configurar carta real, stock físico y personal. Ensayar pedidos/tablets/turnos con datos de staging, sin importar historia sintética local.

Probar persistencia contra Supabase real y después de deploy. Verificar respaldos/restore en **otro proyecto** con la clave estable conservada. Scripts de backup local016 no restauran Supabase. Revisión independiente financiera/de aislamiento B15..B24 pendiente. Izipay, emisor fiscal, puente autenticado a ticketeras y pruebas físicas se homologan aparte; Vercel no llega directamente a la LAN de impresoras.

Si falla un paso conservar evidencia; no inferir conexión, cobro o impresión. Continuidad registra lo ejecutado realmente.

