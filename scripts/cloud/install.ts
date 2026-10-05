import { randomUUID, createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import pg, { type Pool } from 'pg';
import type { CloudConfig } from '../../services/commerce/src/platform/cloud.js';
import { hashPassword } from '../../services/commerce/src/platform/security.js';
import { createOperationalState } from '../../packages/domain/src/operational.js';

export interface InstallInput { restaurant:string; tables:number; username:string; admin_name:string; admin_password:string; runtime_password:string }
/** Administrative operation for an empty, dedicated project, never an HTTP handler. */
export async function installCloud(pool:Pool, config:CloudConfig, input:InstallInput) {
  for(const password of [input.admin_password,input.runtime_password])if(password.length<16 || password.length>128 || password.includes('QatuDemo') || password==='qatu_lab_local_only')throw new Error('Individual protected credentials of16..128 characters are required.');
  const tenant=randomUUID(),branch=randomUUID(),admin=randomUUID();
  const state=createOperationalState({tenant_id:tenant,branch_id:branch,branch_name:input.restaurant},{id:admin,username:input.username,name:input.admin_name,role:'admin',station:null},input.tables);
  const secret=hashPassword(input.admin_password),client=await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('qatupos-cloud-install'))");
    if((await client.query("SELECT 1 FROM pg_namespace WHERE nspname='qatupos' UNION ALL SELECT 1 FROM pg_roles WHERE rolname='qatu_pos_runtime'")).rowCount)throw new Error('Project already contains a POS schema or runtime role; refusing to overwrite.');
    await client.query('CREATE SCHEMA qatupos');
    await client.query('REVOKE ALL ON SCHEMA qatupos FROM PUBLIC');
    await client.query('SET LOCAL search_path TO qatupos,pg_catalog');
    await client.query('ALTER DEFAULT PRIVILEGES IN SCHEMA qatupos REVOKE ALL ON TABLES FROM PUBLIC');
    await client.query('ALTER DEFAULT PRIVILEGES IN SCHEMA qatupos REVOKE ALL ON SEQUENCES FROM PUBLIC');
    // Supabase may have default grants to these roles. Restrict only our own schema.
    const untrusted=(await client.query("SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')")).rows;
    for(const {rolname} of untrusted) {
      const identifier=pg.escapeIdentifier(rolname);
      await client.query(`REVOKE ALL ON SCHEMA qatupos FROM ${identifier}`);
      await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA qatupos REVOKE ALL ON TABLES FROM ${identifier}`);
      await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA qatupos REVOKE ALL ON SEQUENCES FROM ${identifier}`);
    }
    await client.query('CREATE TABLE schema_migrations(name text PRIMARY KEY,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())');
    const directory=new URL('../../database/migrations/',import.meta.url);
    for(const name of (await readdir(directory)).filter(name=>name.endsWith('.sql')).sort()) {
      const sql=await readFile(new URL(name,directory),'utf8');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(name,sha256) VALUES($1,$2)',[name,createHash('sha256').update(sql).digest('hex')]);
    }
    await client.query('INSERT INTO tenants(id,name) VALUES($1,$2)',[tenant,input.restaurant]);
    await client.query('INSERT INTO branches(tenant_id,id,name) VALUES($1,$2,$3)',[tenant,branch,input.restaurant]);
    await client.query('INSERT INTO staff_memberships(id,tenant_id,branch_id,username,display_name,role,station,password_salt,password_hash,active) VALUES($1,$2,$3,$4,$5,$6,NULL,$7,$8,true)',[admin,tenant,branch,input.username,input.admin_name,'admin',secret.salt,secret.hash]);
    await client.query('INSERT INTO branch_state(tenant_id,branch_id,version,state) VALUES($1,$2,$3,$4)',[tenant,branch,state.version,JSON.stringify(state)]);
    await client.query('INSERT INTO cloud_installation(singleton,project_ref,deployment_stage,public_origin,guest_key_hash) VALUES(true,$1,$2,$3,$4)',[config.project_ref,config.stage,config.public_origin,config.guest_key_hash]);
    await client.query(`CREATE ROLE qatu_pos_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD ${pg.escapeLiteral(input.runtime_password)}`);
    await client.query('ALTER ROLE qatu_pos_runtime SET search_path TO qatupos,pg_catalog');
    await client.query("ALTER ROLE qatu_pos_runtime SET statement_timeout TO '20s'");
    await client.query("ALTER ROLE qatu_pos_runtime SET lock_timeout TO '5s'");
    await client.query("ALTER ROLE qatu_pos_runtime SET idle_in_transaction_session_timeout TO '15s'");
    await client.query('GRANT USAGE ON SCHEMA qatupos TO qatu_pos_runtime');
    await client.query('REVOKE ALL ON ALL TABLES IN SCHEMA qatupos FROM PUBLIC');
    await client.query('REVOKE ALL ON ALL SEQUENCES IN SCHEMA qatupos FROM PUBLIC');
    for(const {rolname} of untrusted) {
      await client.query(`REVOKE ALL ON ALL TABLES IN SCHEMA qatupos FROM ${pg.escapeIdentifier(rolname)}`);
      await client.query(`REVOKE ALL ON ALL SEQUENCES IN SCHEMA qatupos FROM ${pg.escapeIdentifier(rolname)}`);
    }
    const tables=(await client.query("SELECT tablename FROM pg_tables WHERE schemaname='qatupos' AND tablename NOT IN ('cloud_installation','schema_migrations')")).rows;
    for(const {tablename} of tables)await client.query(`GRANT SELECT,INSERT,UPDATE,DELETE ON qatupos.${pg.escapeIdentifier(tablename)} TO qatu_pos_runtime`);
    await client.query('GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA qatupos TO qatu_pos_runtime');
    await client.query('GRANT SELECT ON cloud_installation,schema_migrations TO qatu_pos_runtime');
    await client.query('COMMIT');
    return {installed:true,tables:tables.length,environment:'operational'};
  } catch(error){await client.query('ROLLBACK');throw error;} finally{client.release();}
}
