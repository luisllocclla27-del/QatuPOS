# Actualización019 — entrega Git y preparación cloud

**05/10/2026 · B24v2 · ready_for_review.** Repositorio identificado por humano: luisllocclla27-del/QatuPOS. Proyecto/ref Supabase y origen/proyecto Vercel no identificados; no se crearon proyectos ni bases remotas ni desplegó la aplicación.

## Cambios
- Kit portable con verificación Git/migraciones, ignores y conservación de bytes; once SQL actuales (001..013 con huecos002/003), sin modificar migraciones.
- Lanzador de configuración JSON externa con lista permitida, validaciones canónicas y limpieza de credenciales heredadas/no necesarias; sin imprimir valores. Requiere permisos privados del archivo y revisión independiente.
- Plantilla sin secretos, consultas pre/post sólo lectura, manifiesto SHA256, guía RELEASE-CLOUD y plantilla workflow sin secretos/despliegue automático. Borrador histórico de Supabase-browser señalado como reemplazado.
- No cambia lógica de negocio, API, esquema, precios, hardware o proveedores. Validación padre se conserva separada de release portable.

## Evidencia
- Baseline018:535 hashes comprobados sin diferencias y writer_finished=true antes de editar;534 paths aptos para schema WorkOrder, ruta con corchetes permanece cubierta en entrega.
-7 pruebas Node de empaquetado;19 nuevas negativas/configuración +4 cloud anteriores=23 aprobadas. typecheck y build cloud aprobados. Artifact scan:7 manifests/1655 entradas/22JS, cero referencias privadas y símbolos servidor en browser.
- Copia exacta de575 archivos desde índice Git en carpeta temporal sin proyecto padre: instalación corepack pnpm frozen-lockfile, release check, tipos y build cloud aprobados. Después sólo pruebas/documentos/evidencia cambiaron; aplicación/lanzador igual al código compilado.
-6 consultas de verificación más precheck en base PostgreSQL efímera creada por este ensayo: once checksums correctos, privilegios limitados y fingerprint de todas las tablas intacto; no se contactó Supabase.
- Spec Kit prerequisites y WorkOrderv2/5documentos/4FR/4AT/6tasks válidos;25 controles documentales del padre aprobados sin cambiar su validador.
- Huella interactiva antes/después: ba929698f99805c4c91faab5a3470b20ee511ea6a86bdf8c915685cb1510b502,2locales, sin seed/reset/migración. Web3000 y API4000 respondieron200.
- La suite455 SQL/unit y24E2E de018 no se repitió: no cambió negocio/UI/API. No se presenta esa evidencia anterior como prueba cloud real o CI remoto.

## Estado Git y siguiente dependencia
Primera subida rechazada por GitHub: el Personal Access Token no tiene scope workflow para crear .github/workflows/verify.yml. Se conserva el workflow como deployment/github-verify.template.yml, sin activar automatización; no se amplían permisos. Sólo se enmienda nuestro commit inicial aún no publicado, sin reemplazar historial ajeno ni force-push. Nueva subida pendiente de verificar.

Falta identificar Supabase nuevo/dedicado, ref, origen estable y proyecto Vercel; configurar secretos fuera del checkout; instalación/doctor y SQL reales; pruebas de persistencia y revisión independiente sensible B15..B24. Izipay/fiscal/impresoras/red física permanecen pendientes. No aprobar operación real por estas pruebas.
