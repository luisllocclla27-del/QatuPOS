import { createHash } from 'node:crypto';
import { readFile,readdir } from 'node:fs/promises';
import pg,{type Pool} from 'pg';
import type { CloudConfig } from '../../services/commerce/src/platform/cloud.js';

export async function verifyMigrationChecksums(pool:Pool) {
  const directory=new URL('../../database/migrations/',import.meta.url);
  const rows=(await pool.query('SELECT name,sha256 FROM qatupos.schema_migrations ORDER BY name')).rows;
  const names=(await readdir(directory)).filter(name=>name.endsWith('.sql')).sort();
  if(rows.length!==names.length)throw new Error('Cloud schema requires migration.');
  for(const name of names) {
    const digest=createHash('sha256').update(await readFile(new URL(name,directory),'utf8')).digest('hex');
    if(rows.find(row=>row.name===name)?.sha256!==digest)throw new Error('Cloud migration checksum mismatch.');
  }
  return names.length;
}
/** Upgrade a bound installation transactionally; never use the general lab migrator. */
export async function migrateCloud(pool:Pool,config:CloudConfig) {
  const client=await pool.connect();let applied=0;
  try {
    await client.query('BEGIN');await client.query("SELECT pg_advisory_xact_lock(hashtext('qatupos-cloud-install'))");
    const bound=(await client.query('SELECT project_ref,deployment_stage,public_origin,guest_key_hash FROM qatupos.cloud_installation WHERE singleton=true FOR UPDATE')).rows[0];
    if(!bound || bound.project_ref!==config.project_ref || bound.deployment_stage!==config.stage || bound.public_origin!==config.public_origin || bound.guest_key_hash!==config.guest_key_hash)throw new Error('Cloud maintenance binding mismatch.');
    await client.query('SET LOCAL search_path TO qatupos,pg_catalog');
    const directory=new URL('../../database/migrations/',import.meta.url);
    for(const name of (await readdir(directory)).filter(name=>name.endsWith('.sql')).sort()) {
      const sql=await readFile(new URL(name,directory),'utf8'),hash=createHash('sha256').update(sql).digest('hex');
      const previous=(await client.query('SELECT sha256 FROM schema_migrations WHERE name=$1',[name])).rows[0];
      if(previous){if(previous.sha256!==hash)throw new Error('Applied cloud migration checksum mismatch.');continue;}
      await client.query(sql);await client.query('INSERT INTO schema_migrations(name,sha256) VALUES($1,$2)',[name,hash]);applied++;
    }
    const tables=(await client.query("SELECT tablename FROM pg_tables WHERE schemaname='qatupos' AND tablename NOT IN ('cloud_installation','schema_migrations')")).rows;
    // Revoke Supabase/browser defaults on newly added tables as well.
    const untrusted=(await client.query("SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')")).rows;
    await client.query('REVOKE ALL ON SCHEMA qatupos FROM PUBLIC');
    await client.query('REVOKE ALL ON ALL TABLES IN SCHEMA qatupos FROM PUBLIC');
    await client.query('REVOKE ALL ON ALL SEQUENCES IN SCHEMA qatupos FROM PUBLIC');
    for(const {rolname} of untrusted) {
      const role=pg.escapeIdentifier(rolname);
      await client.query(`REVOKE ALL ON SCHEMA qatupos FROM ${role}`);await client.query(`REVOKE ALL ON ALL TABLES IN SCHEMA qatupos FROM ${role}`);await client.query(`REVOKE ALL ON ALL SEQUENCES IN SCHEMA qatupos FROM ${role}`);
    }
    for(const {tablename} of tables)await client.query(`GRANT SELECT,INSERT,UPDATE,DELETE ON qatupos.${pg.escapeIdentifier(tablename)} TO qatu_pos_runtime`);
    await client.query('GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA qatupos TO qatu_pos_runtime');
    await client.query('REVOKE ALL ON cloud_installation,schema_migrations FROM qatu_pos_runtime');
    await client.query('GRANT SELECT ON cloud_installation,schema_migrations TO qatu_pos_runtime');
    await client.query('COMMIT');return{applied,checksums_verified:true};
  } catch(error){await client.query('ROLLBACK');throw error;} finally{client.release();}
}
