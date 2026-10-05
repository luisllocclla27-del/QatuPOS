-- SQL Editor of the dedicated candidate project BEFORE cloud:install.
-- READ ONLY; false,false is necessary, not sufficient for project selection.
BEGIN TRANSACTION READ ONLY;
SELECT current_database() AS database_name,
       EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='qatupos') AS pos_schema_exists,
       EXISTS(SELECT 1 FROM pg_roles WHERE rolname='qatu_pos_runtime') AS pos_role_exists;
COMMIT;
