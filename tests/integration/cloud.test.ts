import { beforeAll,afterAll,describe,it,expect,vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { installCloud } from '../../scripts/cloud/install.js';
import { migrateCloud,verifyMigrationChecksums } from '../../scripts/cloud/migrate.js';
import { createApp } from '../../services/commerce/src/app.js';
import { createWebHandler } from '../../services/commerce/src/platform/serverless.js';
import { runtimeConfig } from '../../services/commerce/src/platform/runtime.js';
import { assertCloudInstallation } from '../../services/commerce/src/platform/cloud.js';
import { consumeSecurityAttempt,refundSecurityAttempt } from '../../services/commerce/src/platform/rate-limit.js';
import { createPool,defaultDatabaseUrl } from '../../services/commerce/src/platform/database.js';

const origin='https://pos.example.test',key=Buffer.alloc(32,29).toString('base64');
const config=runtimeConfig({QATU_DEPLOYMENT:'vercel',QATU_ENV:'production',QATU_PUBLIC_ORIGIN:origin,QATU_SUPABASE_PROJECT_REF:'abcdefghijklmnopqrst',QATU_DEPLOYMENT_STAGE:'production',QATU_GUEST_CODE_KEY_BASE64:key});
const name='qatupos_prod_cloud_test_'+randomUUID().replaceAll('-','');
const input={restaurant:'El Encanto Huamanguino',tables:4,username:'encanto_admin',admin_name:'Administrador de prueba',admin_password:'ClaveIndividualPrueba2026!',runtime_password:'RolIndividualPrueba2026!'};
const admin=new pg.Pool({connectionString:defaultDatabaseUrl,max:1});
let owner:pg.Pool,runtime:pg.Pool,first:Awaited<ReturnType<typeof createApp>>,second:Awaited<ReturnType<typeof createApp>>,installed=false,created=false;
let web:ReturnType<typeof createWebHandler>;
beforeAll(async()=>{
  if((await admin.query("SELECT 1 FROM pg_roles WHERE rolname='qatu_pos_runtime'")).rowCount)throw new Error('Existing runtime role; refusing shared fixture.');
  await admin.query(`CREATE DATABASE "${name}"`);created=true;
  const url=new URL(defaultDatabaseUrl);url.pathname='/'+name;owner=new pg.Pool({connectionString:url.toString(),max:2});
  await installCloud(owner,config.cloud!,input);installed=true;
  url.username='qatu_pos_runtime';url.password=input.runtime_password;
  runtime=new pg.Pool({connectionString:url.toString(),max:2,options:'-c search_path=qatupos,pg_catalog'});
  first=await createApp(runtime,false,config);second=await createApp(runtime,false,config);web=createWebHandler(async()=>first,true);
  vi.stubEnv('QATU_GUEST_CODE_KEY_BASE64',key);
},30000);
afterAll(async()=>{
  vi.unstubAllEnvs();await first?.close();await second?.close();await runtime?.end();await owner?.end();
  if(created && /^qatupos_prod_cloud_test_[a-f0-9]{32}$/.test(name))await admin.query(`DROP DATABASE "${name}"`);
  if(installed)await admin.query('DROP ROLE qatu_pos_runtime');await admin.end();
},30000);
function request(path:string,body?:unknown,extra:Record<string,string>={},ip='192.0.2.19') {return new Request(origin+path,{method:body===undefined?'GET':'POST',headers:{origin,'x-forwarded-for':ip,...(body===undefined?{}:{'content-type':'application/json'}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});}
async function login(ip='192.0.2.19') {const r=await web(request('/v1/pos/session',{username:input.username,password:input.admin_password},{},ip));expect(r.status).toBe(200);const cookie=r.headers.getSetCookie()[0]!.split(';')[0]!;return{cookie,csrf:(await r.json()).csrf_token};}

describe('real private-schema PostgreSQL cloud installation',()=>{
  it('starts with only one individual admin, empty catalog/stock/sales and no fiscal series',async()=>{
    const state=(await owner.query('SELECT state FROM qatupos.branch_state')).rows[0].state;
    expect(state.environment).toBe('operational');expect(state.products).toEqual([]);expect(state.stock).toEqual([]);expect(state.orders).toEqual([]);expect(state.staff).toHaveLength(1);expect(state.tables).toHaveLength(4);
    expect((await owner.query('SELECT count(*) FROM qatupos.fiscal_series')).rows[0].count).toBe('0');
    await expect(assertCloudInstallation(runtime,config.cloud!)).resolves.toBeUndefined();
  });
  it('does not overwrite an existing installation or rotate its credentials',async()=>{
    const before=(await owner.query('SELECT state FROM qatupos.branch_state')).rows;
    await expect(installCloud(owner,config.cloud!,input)).rejects.toThrow('refusing to overwrite');
    expect((await owner.query('SELECT state FROM qatupos.branch_state')).rows).toEqual(before);
  });
  it('verifies all checksums and applies no-op maintenance without changing business state',async()=>{
    const before=(await owner.query('SELECT state FROM qatupos.branch_state')).rows;
    expect(await verifyMigrationChecksums(runtime)).toBeGreaterThan(10);
    expect(await migrateCloud(owner,config.cloud!)).toEqual({applied:0,checksums_verified:true});
    expect((await owner.query('SELECT state FROM qatupos.branch_state')).rows).toEqual(before);
    await expect(assertCloudInstallation(runtime,config.cloud!)).resolves.toBeUndefined();
  });
  it('refuses mismatched maintenance binding and drifted checksums without business effects',async()=>{
    const before=(await owner.query('SELECT state FROM qatupos.branch_state')).rows;
    await expect(migrateCloud(owner,{...config.cloud!,stage:'staging'})).rejects.toThrow('binding mismatch');
    const original=(await owner.query("SELECT sha256 FROM qatupos.schema_migrations WHERE name='013_cloud_security.sql'")).rows[0].sha256;
    await owner.query("UPDATE qatupos.schema_migrations SET sha256=$1 WHERE name='013_cloud_security.sql'",['0'.repeat(64)]);
    try{await expect(verifyMigrationChecksums(runtime)).rejects.toThrow('checksum');await expect(migrateCloud(owner,config.cloud!)).rejects.toThrow('checksum');}
    finally{await owner.query("UPDATE qatupos.schema_migrations SET sha256=$1 WHERE name='013_cloud_security.sql'",[original]);}
    expect((await owner.query('SELECT state FROM qatupos.branch_state')).rows).toEqual(before);
  });
  it.each(['CREATE TABLE qatupos.attack(id integer)','ALTER TABLE qatupos.branch_state ADD COLUMN attack text','UPDATE qatupos.cloud_installation SET public_origin=\'https://evil.test\'','DELETE FROM qatupos.schema_migrations','SET ROLE qatu_lab'])('runtime rejects escalation: %s',async sql=>{
    await expect(runtime.query(sql)).rejects.toThrow();
  });
  it('browser PUBLIC has no schema usage or table grants',async()=>{
    const acl=(await owner.query("SELECT COALESCE(bool_or(a.grantee=0 AND a.privilege_type='USAGE'),false) AS exposed FROM pg_namespace n CROSS JOIN LATERAL aclexplode(n.nspacl) a WHERE n.nspname='qatupos'")).rows[0];expect(acl.exposed).toBe(false);
    const grants=(await owner.query("SELECT table_name FROM information_schema.table_privileges WHERE table_schema='qatupos' AND grantee IN ('PUBLIC','anon','authenticated','service_role')")).rows;expect(grants).toEqual([]);
  });
  it('fences accidental PUBLIC schema exposure and metadata delete privilege',async()=>{
    await owner.query('GRANT USAGE ON SCHEMA qatupos TO PUBLIC');
    try{await expect(assertCloudInstallation(runtime,config.cloud!)).rejects.toThrow('browser roles');}finally{await owner.query('REVOKE USAGE ON SCHEMA qatupos FROM PUBLIC');}
    await owner.query('GRANT DELETE ON qatupos.cloud_installation TO qatu_pos_runtime');
    try{await expect(assertCloudInstallation(runtime,config.cloud!)).rejects.toThrow('read-only');}finally{await owner.query('REVOKE DELETE ON qatupos.cloud_installation FROM qatu_pos_runtime');}
  });
  it.each(['project_ref','stage','public_origin','guest_key_hash'] as const)('fences mismatched %s before handling requests',async field=>{
    const cloud={...config.cloud!,[field]:field==='stage'?'staging':field==='project_ref'?'xxxxxxxxxxxxxxxxxxxx':'mismatch'};
    const app=await createApp(runtime,false,{...config,cloud});
    try{expect((await app.inject('/v1/pos/runtime')).statusCode).toBe(503);}finally{await app.close();}
  });
  it('fences the wrong schema even when a Pool bypasses URL validation',async()=>{
    const url=new URL(defaultDatabaseUrl);url.pathname='/'+name;const wrong=new pg.Pool({connectionString:url.toString(),max:1});
    try{await expect(assertCloudInstallation(wrong,config.cloud!)).rejects.toThrow('role or schema');}finally{await wrong.end();}
  });
});

describe('Web Request adapter using actual authority',()=>{
  it('preserves Secure HttpOnly session cookie, exact origin, csrf and no-store',async()=>{
    const a=await login();const state=await web(request('/v1/pos/snapshot',undefined,{cookie:a.cookie}));expect(state.status).toBe(200);expect(state.headers.get('cache-control')).toBe('no-store');
    const r=await web(request('/v1/pos/session',{username:input.username,password:input.admin_password},{},'192.0.2.20'));
    expect(r.headers.getSetCookie()[0]).toContain('HttpOnly');expect(r.headers.getSetCookie()[0]).toContain('Secure');expect(r.headers.getSetCookie()[0]).toContain('SameSite=Strict');
    const csrf=await web(request('/v1/pos/commands',{type:'day.open',operation_id:randomUUID()},{cookie:a.cookie}));expect(csrf.status).toBe(403);
    const external=await web(request('/v1/pos/session',{username:input.username,password:input.admin_password},{origin:'https://evil.test'}));expect(external.status).toBe(403);
  });
  it('uses existing authority for a real cash opening and idempotent duplicate',async()=>{
    const a=await login('192.0.2.21'),raw=(await owner.query('SELECT state FROM qatupos.branch_state')).rows[0].state;
    const body={type:'cash.open',operation_id:randomUUID(),opening_minor:0,shift_label:'diurno',expected_day_version:raw.business_day.version};
    const firstResult=await web(request('/v1/pos/commands',body,{cookie:a.cookie,'x-csrf-token':a.csrf},'192.0.2.21'));
    expect(firstResult.status).toBe(200);
    const duplicate=await createWebHandler(async()=>second,true)(request('/v1/pos/commands',body,{cookie:a.cookie,'x-csrf-token':a.csrf},'192.0.2.21'));
    expect(duplicate.status).toBe(200);expect((await duplicate.json()).replayed).toBe(true);
  });
  it('rejects oversized streamed body before authority effects',async()=>{
    const before=(await owner.query('SELECT version FROM qatupos.branch_state')).rows[0].version;
    const r=await web(new Request(origin+'/v1/pos/session',{method:'POST',headers:{'x-forwarded-for':'192.0.2.99'},body:'x'.repeat(65537)}));expect(r.status).toBe(413);
    expect((await owner.query('SELECT version FROM qatupos.branch_state')).rows[0].version).toBe(before);
  });
  it('rejects missing/invalid platform IP and unrelated routes',async()=>{
    expect((await web(new Request(origin+'/v1/pos/runtime'))).status).toBe(400);
    expect((await web(request('/v1/pos/runtime',undefined,{'x-forwarded-for':'not-an-ip'}))).status).toBe(400);
    expect((await web(request('/admin/database'))).status).toBe(404);
  });
  it('successful sessions survive a new authority instance',async()=>{
    const a=await login('192.0.2.22');const recreated=await createApp(runtime,false,config);
    try{expect((await createWebHandler(async()=>recreated,true)(request('/v1/pos/session',undefined,{cookie:a.cookie},'192.0.2.22'))).status).toBe(200);}finally{await recreated.close();}
  });
  it('closes request-local authority before returning and releases PostgreSQL sockets',async()=>{
    const url=new URL(defaultDatabaseUrl);url.pathname='/'+name;url.username='qatu_pos_runtime';url.password=input.runtime_password;
    const pool=new pg.Pool({connectionString:url.toString(),max:2,options:'-c search_path=qatupos,pg_catalog'});
    const once=createWebHandler(async()=>createApp(pool,true,config),true,true);
    expect((await once(request('/v1/pos/runtime'))).status).toBe(200);
    expect(pool.ended).toBe(true);expect(pool.totalCount).toBe(0);
  });
  it('awaits explicit session initialization for both pool.query and pool.connect',async()=>{
    const url=new URL(defaultDatabaseUrl);url.pathname='/'+name;url.username='qatu_pos_runtime';url.password=input.runtime_password;
    await owner.query('ALTER ROLE qatu_pos_runtime SET search_path TO public');
    const pool=createPool(url.toString(),{DATABASE_URL:url.toString(),QATU_DEPLOYMENT:'vercel',QATU_ENV:'production',QATU_PUBLIC_ORIGIN:origin,QATU_SUPABASE_PROJECT_REF:'abcdefghijklmnopqrst',QATU_DEPLOYMENT_STAGE:'production',QATU_GUEST_CODE_KEY_BASE64:key});
    try {
      const row=(await pool.query("SELECT current_schema() AS schema,current_setting('statement_timeout') AS timeout")).rows[0];expect(row.schema).toBe('qatupos');expect(row.timeout).toBe('20s');
      const client=await pool.connect();try{expect((await client.query('SELECT current_schema() AS schema')).rows[0].schema).toBe('qatupos');}finally{client.release();}
      await expect(assertCloudInstallation(pool,config.cloud!)).resolves.toBeUndefined();
    }finally{await pool.end();await owner.query('ALTER ROLE qatu_pos_runtime SET search_path TO qatupos,pg_catalog');}
  });
  it('shares failed-login quota across independent instances and trusted client IP',async()=>{
    const alternate=createWebHandler(async()=>second,true),ip='192.0.2.83';
    for(let i=0;i<8;i++)expect((await(i%2?web:alternate)(request('/v1/pos/session',{username:input.username,password:'IncorrectPassword!'},{},ip))).status).toBe(401);
    const blocked=await alternate(request('/v1/pos/session',{username:input.username,password:input.admin_password},{},ip));expect(blocked.status).toBe(429);expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
    expect((await web(request('/v1/pos/session',{username:input.username,password:input.admin_password},{},'192.0.2.84'))).status).toBe(200);
  });
  it('many legitimate users on the same NAT do not exhaust quota or erase other failures',async()=>{
    const ip='192.0.2.90';
    for(let i=0;i<3;i++)expect((await web(request('/v1/pos/session',{username:input.username,password:'IncorrectPassword!'},{},ip))).status).toBe(401);
    for(let i=0;i<15;i++)expect((await web(request('/v1/pos/session',{username:input.username,password:input.admin_password},{},ip))).status).toBe(200);
    for(let i=0;i<5;i++)expect((await web(request('/v1/pos/session',{username:input.username,password:'IncorrectPassword!'},{},ip))).status).toBe(401);
    expect((await web(request('/v1/pos/session',{username:input.username,password:input.admin_password},{},ip))).status).toBe(429);
  });
});

describe('durable concurrent security budget',()=>{
  it('only8 of30 concurrent attempts are allowed, identifiers are hashed',async()=>{
    const results=await Promise.all(Array.from({length:30},()=>consumeSecurityAttempt(runtime,'staff-login','192.0.2.100',8)));
    expect(results.filter(r=>r.allowed)).toHaveLength(8);
    const rows=(await owner.query('SELECT key_hash FROM qatupos.security_attempts')).rows;expect(rows.every(r=>/^[a-f0-9]{64}$/.test(r.key_hash))).toBe(true);
  });
  it('uses SQL-clock expiry, separate scopes and preserves quota after recreation',async()=>{
    const id=randomUUID();for(let i=0;i<5;i++)expect((await consumeSecurityAttempt(runtime,'staff-reauth',id,5)).allowed).toBe(true);
    expect((await consumeSecurityAttempt(runtime,'staff-reauth',id,5)).allowed).toBe(false);
    expect((await consumeSecurityAttempt(runtime,'guest-login',id,12)).allowed).toBe(true);
    await owner.query("UPDATE qatupos.security_attempts SET window_started_at=clock_timestamp()-interval '61 seconds' WHERE scope='staff-reauth'");
    expect((await consumeSecurityAttempt(runtime,'staff-reauth',id,5)).allowed).toBe(true);
  });
  it('a delayed success from an expired window never refunds a new failure',async()=>{
    const id=randomUUID(),old=await consumeSecurityAttempt(runtime,'guest-login',id,12);
    await owner.query("UPDATE qatupos.security_attempts SET window_started_at=clock_timestamp()-interval '61 seconds' WHERE scope=$1 AND key_hash=$2",[old.scope,old.key_hash]);
    const fresh=await consumeSecurityAttempt(runtime,'guest-login',id,12);await refundSecurityAttempt(runtime,old);
    expect((await owner.query('SELECT attempts FROM qatupos.security_attempts WHERE scope=$1 AND key_hash=$2',[fresh.scope,fresh.key_hash])).rows[0].attempts).toBe(1);
    await refundSecurityAttempt(runtime,fresh);
    expect((await owner.query('SELECT attempts FROM qatupos.security_attempts WHERE scope=$1 AND key_hash=$2',[fresh.scope,fresh.key_hash])).rows[0].attempts).toBe(0);
  });
});
