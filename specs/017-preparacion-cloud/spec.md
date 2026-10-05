# 017 — Preparación Supabase y Vercel

Petición: terminar la preparación del piloto para iniciar despliegue, dejando hardware, homologación física, proveedor fiscal e Izipay pendientes. No autoriza publicar ni crear cuentas/proyectos.

## Requisitos
- MAR-FR-020: Vercel sirve UI y API del mismo origen mediante Node y el núcleo existente. No requiere puerto4000 ni otro backend; no cachea sesiones o respuestas. Cookies y CSRF mantienen garantías anteriores.
- MAR-FR-021: clave de mesa estable desde secreto32bytes del servidor, sin depender del filesystem efímero; fallo cerrado si falta en cloud.
- MAR-FR-022: SQL Supabase en esquema privado qatupos, rol runtime limitado, conexión5432 directa/session con TLS verificado. No Data API del navegador ni credenciales públicas. No soportar6543 mientras dependamos de search_path de sesión.
- MAR-FR-023: instalación nueva vacía, migraciones verificadas, vínculo proyecto/entorno/origen/clave, sin cambios a instalación existente. Preview no utiliza instalación production.
- MAR-FR-024: intentos de acceso cloud limitados transaccionalmente por PostgreSQL; cold starts no borran presupuesto.
- MAR-FR-025: scripts instalación/diagnóstico y guía reproducible; no secretos en artifacts. Catálogo/stock/usuarios se configuran antes de abrir caja.

## Aceptación
MAR-AT-020: API real a través del adaptador Node preserva cookie y bloqueo de origen; cuerpo mayor64KiB rechazado. MAR-AT-021: dos instancias derivan mismo código y rechazan secreto inválido. MAR-AT-022: rol no puede DDL ni acceso público directo; proyecto incorrecto/6543/TLS inseguro rechazados. MAR-AT-023: bootstrap no sobrescribe estado y binding distinto impide servir. MAR-AT-024: concurrencia y recreación conservan límite. MAR-AT-025: regresiones, navegador, compilación cloud y laboratorio intacto con evidencia.

## Límites explícitos
Autoridad cloud requiere internet. No confirmar venta offline; conservar borrador/reintentar misma operación. Impresión requiere futuro agente de PC autenticado con confirmación real; no enviar RAW TCP desde Vercel a LAN. Izipay/SUNAT nunca se simulan como éxito operativo. Recuperación local016 no respalda automáticamente Supabase: antes de operación exigir backup administrado, exportación y ensayo restauración del proyecto cloud, incluyendo secreto de mesa. Aceptación sensible independiente y homologación real siguen pendientes.
