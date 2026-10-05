import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { guestEnvironmentKey } from '../tables/guest-security.js';

export interface CloudConfig { project_ref: string; stage: 'production' | 'staging'; public_origin: string; guest_key_hash: string }
export function cloudConfig(env: Record<string, string | undefined> = process.env): CloudConfig | undefined {
  if (!env.QATU_DEPLOYMENT) return undefined;
  if (env.QATU_DEPLOYMENT !== 'vercel' || env.QATU_ENV !== 'production') throw new Error('Cloud requires explicit operational deployment.');
  if (!/^[a-z0-9]{20}$/.test(env.QATU_SUPABASE_PROJECT_REF ?? '')) throw new Error('Cloud requires a project reference.');
  const stage = env.QATU_DEPLOYMENT_STAGE;
  if (stage !== 'production' && stage !== 'staging') throw new Error('Cloud requires an explicit deployment stage.');
  if ((env.VERCEL_ENV === 'preview' && stage !== 'staging') || (env.VERCEL_ENV === 'production' && stage !== 'production')) throw new Error('Preview and production installations must be separate.');
  if(env.VERCEL_ENV && !['preview','production'].includes(env.VERCEL_ENV))throw new Error('Local Vercel development must not use an operational cloud installation.');
  let origin: URL; try { origin = new URL(env.QATU_PUBLIC_ORIGIN ?? ''); } catch { throw new Error('Cloud requires an exact HTTPS origin.'); }
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.origin !== env.QATU_PUBLIC_ORIGIN) throw new Error('Cloud requires an exact HTTPS origin.');
  return { project_ref: env.QATU_SUPABASE_PROJECT_REF!, stage, public_origin: origin.origin, guest_key_hash: createHash('sha256').update(guestEnvironmentKey(env)!).digest('hex') };
}
export function assertCloudDatabaseUrl(url: URL, config: CloudConfig, maintenance = false) {
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.port !== '5432' || url.searchParams.get('sslmode') !== 'verify-full' || !url.password) throw new Error('Cloud requires session/direct5432 and verified TLS.');
  if ([...url.searchParams.keys()].some(key => key !== 'sslmode')) throw new Error('Unsupported database URL parameters.');
  const user = decodeURIComponent(url.username);
  const role = maintenance ? 'postgres' : 'qatu_pos_runtime';
  const direct = url.hostname === `db.${config.project_ref}.supabase.co`;
  const pooler = /^aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(url.hostname);
  if (url.pathname !== '/postgres' || !((direct && user === role) || (pooler && user === `${role}.${config.project_ref}`))) throw new Error('Cloud database project or restricted role does not match.');
}
/** No cache: changes in role, schema or installation binding fence the next request. */
export async function assertCloudInstallation(pool: Pool, config: CloudConfig) {
  const role = (await pool.query('SELECT current_schema() AS schema, current_user AS name, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname=current_user')).rows[0];
  if (role?.schema !== 'qatupos' || role.name !== 'qatu_pos_runtime' || role.rolsuper || role.rolbypassrls || role.rolcreatedb || role.rolcreaterole) throw new Error('Cloud runtime role or schema is unsafe.');
  const binding = (await pool.query('SELECT project_ref,deployment_stage,public_origin,guest_key_hash FROM cloud_installation WHERE singleton=true')).rows[0];
  if (!binding || binding.project_ref !== config.project_ref || binding.deployment_stage !== config.stage || binding.public_origin !== config.public_origin || binding.guest_key_hash !== config.guest_key_hash) throw new Error('Cloud installation binding mismatch.');
  const checks = (await pool.query("SELECT has_schema_privilege(current_user,'qatupos','CREATE') AS ddl, EXISTS(SELECT 1 FROM schema_migrations WHERE name='013_cloud_security.sql') AS migrated")).rows[0];
  if (checks.ddl || !checks.migrated) throw new Error('Cloud installation is not ready.');
  // Runtime may use POS data, never alter deployment binding or schema history.
  const writable = (await pool.query("SELECT has_table_privilege(current_user,'qatupos.cloud_installation','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_table_privilege(current_user,'qatupos.schema_migrations','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS writable")).rows[0];
  if (writable.writable) throw new Error('Cloud metadata must be read-only.');
  const exposure=(await pool.query(`SELECT
    EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') AND has_schema_privilege(rolname,'qatupos','USAGE,CREATE')) OR
    EXISTS(SELECT 1 FROM pg_namespace n CROSS JOIN LATERAL aclexplode(COALESCE(n.nspacl,acldefault('n',n.nspowner))) a WHERE n.nspname='qatupos' AND a.grantee=0 AND a.privilege_type IN ('USAGE','CREATE')) AS exposed`)).rows[0];
  if(exposure.exposed)throw new Error('Cloud schema must not be accessible through browser roles.');
}
