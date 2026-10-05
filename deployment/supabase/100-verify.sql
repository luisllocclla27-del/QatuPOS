-- AFTER canonical cloud:install. Complements doctor; not TLS/key verification.
BEGIN TRANSACTION READ ONLY;
SELECT project_ref,deployment_stage,public_origin FROM qatupos.cloud_installation;
SELECT name,sha256 FROM qatupos.schema_migrations ORDER BY name;
SELECT rolname,rolsuper,rolcreatedb,rolcreaterole,rolbypassrls
  FROM pg_roles WHERE rolname='qatu_pos_runtime';
SELECT has_schema_privilege('qatu_pos_runtime','qatupos','USAGE') AS runtime_usage,
       has_schema_privilege('qatu_pos_runtime','qatupos','CREATE') AS runtime_ddl,
       has_table_privilege('qatu_pos_runtime','qatupos.cloud_installation','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS binding_writable,
       has_table_privilege('qatu_pos_runtime','qatupos.schema_migrations','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS history_writable;
SELECT rolname,has_schema_privilege(rolname,'qatupos','USAGE,CREATE') AS exposed
  FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role');
SELECT EXISTS(SELECT 1 FROM pg_namespace n
  CROSS JOIN LATERAL aclexplode(COALESCE(n.nspacl,acldefault('n',n.nspowner))) a
  WHERE n.nspname='qatupos' AND a.grantee=0 AND a.privilege_type IN ('USAGE','CREATE')) AS public_exposed;
COMMIT;
