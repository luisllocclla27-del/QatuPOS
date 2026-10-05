# Plan019 — B24

Root único escritor. Baseline018:535 hashes comprobados y writer_finished. Mantener Node24/pnpm12.5.1, monorepo y servidor017. No añadir dependencias. Configuración protegida reutiliza cloudConfig/assertCloudDatabaseUrl; el nuevo lanzador sólo valida/carga y ejecuta el CLI existente. Preflight portátil con Node y Git; manifiesto fijo de las once migraciones actuales (numeración001..013 tiene huecos, no inventar002/003).

Git preserva bytes para checksums y evidencia. Workflow verifica kit, tipos, pruebas puras y build cloud; pruebas PostgreSQL completas y E2E se identifican como evidencia local anterior, no se proclaman ejecutadas en CI. Consultas usan transacción READ ONLY y no muestran contraseñas, clave de mesa, datos de clientes ni saldos.

Primero especificación y pruebas negativas; después scripts/configuración/consultas/guías, pruebas focalizadas y copia limpia fuera del padre. Entregar hashes y estado ready_for_review. Subida al repositorio humano identificado, si acceso disponible, después de validar payload; no asociar Vercel ni instalar Supabase desconocidos.
