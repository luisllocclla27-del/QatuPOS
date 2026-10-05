# 019 — Entrega Git y preparación cloud

La petición autoriza preparar una entrega portable y el usuario identifica el repositorio GitHub `luisllocclla27-del/QatuPOS`. Aún no identifica proyecto Supabase, dominio/origen ni proyecto Vercel. No ejecutar instalación en un proyecto supuesto ni publicar una demo como operación real.

## Requisitos
- MAR-FR-031: desde el repositorio independiente se verifica el payload, workspace, configuración de despliegue y hashes de migraciones sin archivos del proyecto padre. Git conserva los bytes de migraciones aplicadas e informes históricos; excluye datos, secretos y artefactos generados.
- MAR-FR-032: mantenimiento cloud admite configuración JSON protegida fuera del checkout, con lista explícita de claves, limpieza de variables heredadas y validación de proyecto/rol/puerto/TLS/origen/etapa. No imprime valores ni ejecuta archivos como código. `check` no conecta ni escribe SQL.
- MAR-FR-033: las migraciones siguen siendo las canónicas; instalación transaccional mediante el instalador existente. Consultas de diagnóstico de sólo lectura separadas para antes/después; manifiesto SHA256 reproducible, sin semillas ni segundo esquema. No pegar migraciones individualmente omitiendo roles/binding/admin.
- MAR-FR-034: instrucciones Git→Supabase→Vercel y CI reproducible, separando pruebas locales, acceso a GitHub y validación real del proveedor. No confundir una compilación con instalación, despliegue o aceptación financiera.

## Aceptación
- MAR-AT-031: preflight falla ante path privado, credencial remota literal, workspace incompleto o checksum cambiado; escanea también archivos ya seguidos por Git. Copia sin padre supera instalación frozen-lockfile y build cloud.
- MAR-AT-032: negativas de archivo dentro del checkout, enlace, claves extra, configuración parcial, mezcla de etapas, rol/puerto/TLS inválidos. Configuración válida no depende de variables de laboratorio. Revisión independiente del control de secretos pendiente.
- MAR-AT-033: las consultas se ejecutan sin alterar una fixture PostgreSQL privada; manifiesto coincide con cada SQL actual. Instalador mantiene rechazo de base ya inicializada.
- MAR-AT-034: CI sólo usa comandos presentes y verificables, sin credenciales cloud ni despliegue automático. Informe registra exactamente pruebas y acciones externas realizadas o pendientes.

No se modifica negocio, API, migraciones ni proveedores; revisión sensible de B15..B23 permanece pendiente. Datos interactivos se conservan. [Contrato de entrega](contracts/release.md).
