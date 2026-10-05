# Plan017

Conservar Next16, Node24, Fastify5, pg8 y dominio existente; versiones fijadas. Un adaptador de Web Request usa Fastify.inject sin abrir sockets. Autoridad por solicitud, pool máximo2 cerrado antes de retornar para evitar sockets suspendidos y sin autoridad en memoria; SQL guarda sesiones/comandos/outbox. Importar OpenAPI estáticamente para bundling.

Cloud explícito QATU_DEPLOYMENT=vercel, QATU_ENV=production, QATU_DEPLOYMENT_STAGE=production|staging, QATU_SUPABASE_PROJECT_REF. PostgreSQL5432 session/direct; search_path qatupos,pg_catalog mediante inicialización explícita aguardada por conexión, sin confiar en options de pooler, y verificación por request. Roles: dueño instalación versus qatu_pos_runtime login restringido. Schema no expuesto a Data API; revocar PUBLIC/anon/authenticated/service_role; runtime solo SELECT/INSERT/UPDATE/DELETE. Tabla binding persistente hace fallar configuración distinta.

Instalación por CLI administrada, nunca en request: crear esquema y rol, aplicar migraciones checksum, inicializar admin/catálogo vacío transaccionalmente y vincular entorno. CLI separa DATABASE_URL runtime de QATU_MAINTENANCE_DATABASE_URL; contraseña rol/admin y secreto fuera de artifacts. No modifica otros schemas de Supabase. Tests usan PG real efímero privado, sin sustituir persistencia por mock.

Root único escritor B22. No nuevas librerías externas. Root Directory Vercel apps/pos con workspace accesible. Pruebas locales distintas de homologación cloud real.
