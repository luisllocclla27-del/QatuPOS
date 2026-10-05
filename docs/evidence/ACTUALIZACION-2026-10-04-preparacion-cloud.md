# Actualización017 — preparación cloud

Cierre local: 2026-10-05T00:06:29.483078-05:00. Ejecución iniciada04/10; fecha del directorio conserva ese inicio.

## Estado

Implementación Supabase/Vercel realizada en la carpeta del piloto, único escritor root B22; comprobaciones finales aprobadas; entrega ready_for_review. No se publicó ni creó proyecto/base remota. Aceptación sensible independiente pendiente.

## Cambios

- API Node bajo /v1 en la misma web, reutilizando Fastify/dominio, cookies/CSRF/idempotencia; conexiones por request liberadas antes de suspensión.
- Clave de mesa estable desde secreto32bytes, sin disco efímero; verificación proyecto/etapa/origen/clave/rol/esquema por request.
- Esquema privado qatupos, rol limitado, TLS verificado y session/direct5432; transaction6543 rechazado. Inicialización de conexión explícita.
- Instalación vacía, personal individual, permisos restringidos; migraciones/diagnóstico por checksums.
- Intentos SQL resistentes a concurrencia/cold start, éxitos devuelven su cupo sin borrar fallos de otros clientes Wi-Fi.
- Build cloud independiente, workspace fijado, trazado excluye runtime/secretos y guía completa de instalación.

## Evidencia disponible

Pruebas nuevas SQL reales,20 E2E del piloto aprobadas, ensayo del servidor Next compilado vía HTTPS: alta/credencial/activación de mozo, turno, mesa, clave, sesión cliente y reinicio conservando ambas sesiones/clave. Resultado final: **420 pruebas en25 archivos,20 E2E, tipos y ambas compilaciones aprobadas**. HTTPS del servidor compilado y reinicio aprobados. Artefacto:7 traces/1655 entradas y22 JS browser,0 runtime/env/secretos SQL y0 assets privados. La huella del laboratorio conserva2 locales y SHA256 ba929698f99805c4c91faab5a3470b20ee511ea6a86bdf8c915685cb1510b502.25 controles documentales del padre separados del runtime, WorkOrder/enlaces017 válidos.

## Pendientes que no se ocultan

Creación/configuración real de Supabase y Vercel, prueba real de conexión/carga y respaldo/restore del proveedor; aprobación independiente de seguridad/dinero/aislamiento. Integración de impresoras mediante puente PC-cloud (modelos/protocolo aún desconocidos), homologación física Wi-Fi/pantallas/tablets/QR-NFC, proveedor fiscal e Izipay. Los éxitos simulados siguen bloqueados en modo operativo. Catálogo, personal y stock reales deben cargarse después de revisar instalación.

No se implementan en017 un hub offline, recetas/mermas/combos/compras/reembolsos completos ni conexión Qatu.pe/Delivery. Una nota de venta no sustituye un comprobante fiscal. El laboratorio continúa con datos sintéticos y no se promociona a producción.

Fallos detectados/resueltos: imports ESM .js en Turbopack, inicialización/tipos del pool, tracing de50089 archivos runtime. Se separó adaptador filesystem local y se comprobó paquete final limpio. No se publicó el paquete fallido. Primera ejecución E2E regeneró PNG sintéticos fuera del grant explícito inicial; ampliado en B22v4 antes de repetir, root único escritor; evidencia/paths finales auditados. No se ocultaron fallos ni se modificaron validadores para aprobar runtime.

Guía: [Supabase/Vercel](../DEPLOY-SUPABASE-VERCEL.md). Evidencia final: ejecución2026-10-04-preparacion-cloud.
