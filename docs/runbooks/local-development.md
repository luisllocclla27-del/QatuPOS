# Instalación local del piloto

Toda escritura ocurre bajo `el-encanto-huamanguino`. Node 24.16.0, pnpm 12.5.1, Next 16.3.8 y PostgreSQL portable 17.11 son las versiones probadas. Las dependencias npm se fijan con `pnpm-lock.yaml`.

## Primera instalación en Windows

```powershell
pnpm install --frozen-lockfile
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/database/install-local.ps1
pnpm setup:local
pnpm dev
```

El instalador descarga el paquete Windows x64 de EDB, verifica el SHA256 del artefacto utilizado en este laboratorio y lo expande en `.runtime`. El checksum identifica el paquete probado; no es una certificación fiscal ni de seguridad del producto. No instala servicios globales.

`setup:local` inicia PostgreSQL en 127.0.0.1:55432, aplica migraciones comprobando hashes y añade datos sintéticos sin borrar operaciones existentes. `dev` inicia API 4000 y web 3000, ambas en loopback. No exponer estos puertos ni las credenciales sintéticas a internet. Dos contextos de navegador del mismo equipo permiten ensayar el flujo entre usuarios; conectar los dos equipos físicos requiere una configuración LAN/HTTPS y verificación específica posterior.

## Pruebas

```powershell
pnpm typecheck
pnpm test
pnpm exec playwright install chromium
pnpm test:e2e
pnpm build
```

Las suites PostgreSQL crean `qatupos_lab_test_<UUID>`, aplican las mismas migraciones y eliminan solamente esa base propia al finalizar. No truncan la base interactiva `qatupos_lab`. Si una ejecución se interrumpe abruptamente, puede dejar una base efímera; inspeccionarla antes de cualquier limpieza. Los resultados del navegador y capturas permanecen dentro de esta carpeta.

## Detener y conservar datos

Ctrl+C detiene web/API. Para detener PostgreSQL después de cerrar las pruebas/aplicación:

```powershell
& ./.runtime/postgresql-17.11/pgsql/bin/pg_ctl.exe stop -D ./.runtime/pgdata -m fast -w
```

No borrar `.runtime/pgdata` al actualizar código. Los reportes, cobros y stock sobreviven al reinicio normal. El ensayo de restauración desde backup sigue pendiente antes de piloto con ventas reales; persistencia no equivale a restauración homologada.
