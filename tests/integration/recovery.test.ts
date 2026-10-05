import { beforeAll, afterAll, it, expect } from 'vitest';
import { createHash, randomUUID, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile, readdir, unlink, rmdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import pg from 'pg';
import { testDatabase, tenant, branch } from '../support/database.js';
import { defaultDatabaseUrl, createPool } from '../../services/commerce/src/platform/database.js';
import { createApp } from '../../services/commerce/src/app.js';
import { createBackup, verifyRestore } from '../../scripts/operational/recovery/archive.js';

let db:Awaited<ReturnType<typeof testDatabase>>, app:Awaited<ReturnType<typeof createApp>>,directory:string;
let backup:string,key:string,guestKey:string,sourceBefore:string,orderOperation:object;
const targets:{name:string;pool:pg.Pool;url:string}[]=[],identities:Record<string,{cookie:string;csrf:string}>={};
const raw=async()=> (await db.pool.query('SELECT state FROM branch_state WHERE tenant_id=$1 AND branch_id=$2',[tenant,branch])).rows[0].state;
async function send(who:string,body:object){const a=identities[who]!,r=await app.inject({method:'POST',url:'/v1/pos/commands',headers:{cookie:a.cookie,'x-csrf-token':a.csrf},payload:{operation_id:randomUUID(),...body}});expect(r.statusCode,r.body).toBe(200);return r.json();}
async function target(){const name='qatupos_restore_'+randomUUID().replaceAll('-',''),admin=createPool(defaultDatabaseUrl);try{await admin.query(`CREATE DATABASE "${name}"`);}finally{await admin.end();}const u=new URL(defaultDatabaseUrl);u.pathname='/'+name;const t={name,url:u.toString(),pool:new pg.Pool({connectionString:u.toString(),max:1})};targets.push(t);return t;}
const options=()=>({sourceUrl:db.url,keyFile:key,backupFile:backup,guestKeyFile:guestKey,environment:{QATU_ENV:'local'}});
const restore=(url:string,file=backup,keyFile=key)=>verifyRestore({targetUrl:url,backupFile:file,keyFile});
beforeAll(async()=>{
  db=await testDatabase();app=await createApp(db.pool,false);directory=resolve('.runtime/recovery-test/'+randomUUID());await mkdir(join(directory,'keys'),{recursive:true});await mkdir(join(directory,'copies'));
  key=join(directory,'keys','backup.key');backup=join(directory,'copies','source.qatubak');guestKey=resolve('.runtime/guest-code.key');await writeFile(key,randomBytes(32),{flag:'wx',mode:0o600});
  for(const username of ['admin','mozo','caja']){const r=await app.inject({method:'POST',url:'/v1/pos/session',payload:{username,password:'QatuDemo2026!'}});expect(r.statusCode).toBe(200);identities[username]={cookie:r.cookies[0]!.name+'='+r.cookies[0]!.value,csrf:r.json().csrf_token};}
  let s=await raw();await send('caja',{type:'cash.open',shift_label:'diurno',opening_minor:0,expected_day_version:s.business_day.version});await send('mozo',{type:'table.open',table_id:s.tables[0].id,expected_version:1});s=await raw();const v=s.visits[0];
  await send('mozo',{type:'guest.access',visit_id:v.id,expected_version:v.version,action:'activate',reason:'Acceso de respaldo sintético'});const access=await app.inject({url:'/v1/pos/guest-access/'+v.id,headers:{cookie:identities.mozo!.cookie}});const joined=await app.inject({method:'POST',url:'/v1/guest/session',payload:{code:access.json().code}});expect(joined.statusCode).toBe(200);
  const g={cookie:joined.cookies[0]!.name+'='+joined.cookies[0]!.value,csrf:joined.json().csrf_token},q=await app.inject({method:'POST',url:'/v1/guest/quotes',headers:{cookie:g.cookie,'x-csrf-token':g.csrf},payload:{lines:[{product_id:s.products.find((p:any)=>p.station==='caja'&&p.stock_policy==='unit').id,quantity:2}]}});expect(q.statusCode).toBe(200);
  const ordered=await app.inject({method:'POST',url:'/v1/guest/orders',headers:{cookie:g.cookie,'x-csrf-token':g.csrf},payload:{operation_id:randomUUID(),expected_version:(await raw()).visits[0].version,quote_id:q.json().quote_id}});expect(ordered.statusCode,ordered.body).toBe(200);
  s=await raw();const check=s.checks[0],auth=await send('caja',{type:'collection.authorize',check_id:check.id,expected_version:check.version,cash_session_id:s.cash_sessions[0].id,method:'yape',amount_minor:check.total_minor});await send('caja',{type:'payment.unknown',authorization_id:auth.entity_id,reason:'Proveedor no responde; reserva sigue retenida'});
  // Staff operation replay proves idempotency survives backup without creating a second effect.
  orderOperation={type:'stock.receive',operation_id:randomUUID(),stock_item_id:s.stock[1].id,expected_version:s.stock[1].version,quantity:7,receipt_reference:'RECOVERY-001',reason:'Recepción sintética antes del respaldo'};await send('admin',orderOperation);
  sourceBefore=createHash('sha256').update(JSON.stringify(await raw())).digest('hex');await createBackup(options());
},30000);
afterAll(async()=>{
  await app?.close();for(const t of targets){await t.pool.end();const admin=createPool(defaultDatabaseUrl);try{if(!/^qatupos_(?:restore_|lab_test_)[a-f0-9]{32}$/.test(t.name))throw new Error('Unsafe owned target');await admin.query(`DROP DATABASE "${t.name}"`);}finally{await admin.end();}}
  await db?.close();if(directory){for(const child of ['keys','copies']){for(const name of await readdir(join(directory,child)))await unlink(join(directory,child,name));await rmdir(join(directory,child));}await rmdir(directory);}
},30000);
it('actually restores every table, unknown/held money, stock reserves, guest history and outbox',async()=>{
  const t=await target(),result=await restore(t.url);expect(result.quarantine).toBe(true);expect(result.tables_verified).toBeGreaterThan(10);expect(result.session_counts_revoked).toEqual({staff:3,guest:1});
  const restored=(await t.pool.query('SELECT state FROM branch_state WHERE tenant_id=$1 AND branch_id=$2',[tenant,branch])).rows[0].state;expect(restored).toEqual(await raw());expect(restored.payments[0].status).toBe('unknown');expect(restored.checks[0].held_minor).toBe(restored.payments[0].amount_minor);expect(restored.stock.some((x:any)=>x.reserved>0)).toBe(true);
  expect((await t.pool.query('SELECT * FROM command_operations ORDER BY operation_id')).rows).toEqual((await db.pool.query('SELECT * FROM command_operations ORDER BY operation_id')).rows);expect((await t.pool.query('SELECT * FROM outbox ORDER BY operation_id')).rows).toEqual((await db.pool.query('SELECT * FROM outbox ORDER BY operation_id')).rows);
  expect((await t.pool.query('SELECT count(*) FROM staff_sessions')).rows[0].count).toBe('0');expect((await t.pool.query('SELECT revoked_at FROM guest_sessions')).rows[0].revoked_at).not.toBeNull();
  expect(JSON.stringify(result)).not.toContain((await readFile(key)).toString('base64'));
});
it('blocks a directly supplied restored Pool on health, login and commands',async()=>{
  const t=await target();await restore(t.url);const copy=await createApp(t.pool,false);try{for(const request of [{url:'/health'},{method:'POST' as const,url:'/v1/pos/session',payload:{username:'admin',password:'QatuDemo2026!'}},{method:'POST' as const,url:'/v1/pos/commands',payload:orderOperation}]){const r=await copy.inject(request);expect(r.statusCode).toBe(503);expect(r.json().error.code).toBe('RECOVERY_QUARANTINE');}}finally{await copy.close();}
});
it.each(['tamper','wrong-key','truncated'])('rejects %s before any target SQL effects',async(kind)=>{
  const t=await target(),file=join(directory,'copies',kind+'.qatubak'),bytes=await readFile(backup);let chosenKey=key;
  if(kind==='tamper')bytes[Math.floor(bytes.length/2)]!^=1;if(kind==='wrong-key'){chosenKey=join(directory,'keys','wrong.key');await writeFile(chosenKey,randomBytes(32));}
  await writeFile(file,kind==='truncated'?bytes.subarray(0,bytes.length-8):bytes);await expect(restore(t.url,file,chosenKey)).rejects.toThrow('ARCHIVE_AUTHENTICATION_FAILED');expect((await t.pool.query("SELECT count(*) FROM pg_tables WHERE schemaname='public'")).rows[0].count).toBe('0');
});
it('refuses an already populated target without overwriting it',async()=>{const t=await target();await t.pool.query('CREATE TABLE sentinel(value text)');await t.pool.query("INSERT INTO sentinel VALUES('preserve')");await t.pool.end(); // close unrelated connection before the rehearsal
  t.pool=new pg.Pool({connectionString:t.url,max:1});await expect(restore(t.url)).rejects.toThrow('RESTORE_TARGET_NOT_EMPTY');expect((await t.pool.query('SELECT value FROM sentinel')).rows[0].value).toBe('preserve');
});
it('refuses overwrite of a backup and produces a different IV for the next snapshot',async()=>{await expect(createBackup(options())).rejects.toMatchObject({code:'EEXIST'});const next=join(directory,'copies','next.qatubak');await createBackup({...options(),backupFile:next});const a=await readFile(backup),b=await readFile(next);expect(a.subarray(0,8).toString()).toBe('QATUBK01');expect(a.subarray(8,20).equals(b.subarray(8,20))).toBe(false);});
it('requires the existing QR key, and rejects a mismatched key',async()=>{const copy=join(directory,'copies','bad-guest.qatubak');await expect(createBackup({...options(),backupFile:copy,guestKeyFile:join(directory,'keys','missing.key')})).rejects.toMatchObject({code:'ENOENT'});await expect(createBackup({...options(),backupFile:copy,guestKeyFile:key})).rejects.toThrow('GUEST_KEY_DOES_NOT_MATCH');});
it('source state remains exact and retries keep only one stock effect',async()=>{expect(createHash('sha256').update(JSON.stringify(await raw())).digest('hex')).toBe(sourceBefore);expect((await send('admin',orderOperation)).replayed).toBe(true);expect(createHash('sha256').update(JSON.stringify(await raw())).digest('hex')).toBe(sourceBefore);});
it('a renamed restored copy retains the persistent quarantine and cannot become a new backup source',async()=>{
  const t=await target();await restore(t.url);await t.pool.end();const admin=createPool(defaultDatabaseUrl),renamed='qatupos_lab_test_'+randomUUID().replaceAll('-','');
  try{await admin.query(`ALTER DATABASE "${t.name}" RENAME TO "${renamed}"`);}finally{await admin.end();}
  t.name=renamed;const u=new URL(t.url);u.pathname='/'+renamed;t.url=u.toString();t.pool=new pg.Pool({connectionString:t.url,max:1});const copy=await createApp(t.pool,false);
  try{const r=await copy.inject({url:'/health'});expect(r.statusCode).toBe(503);expect(r.json().error.code).toBe('RECOVERY_QUARANTINE');}finally{await copy.close();}
  await expect(createBackup({...options(),sourceUrl:t.url,backupFile:join(directory,'copies','renamed.qatubak')})).rejects.toThrow('QUARANTINE_SOURCE_FORBIDDEN');
});
it('refuses concurrent unrelated connections to an otherwise empty target',async()=>{const t=await target();await t.pool.query('SELECT 1');await expect(restore(t.url)).rejects.toThrow('RESTORE_TARGET_IN_USE');expect((await t.pool.query("SELECT count(*) FROM pg_tables WHERE schemaname='public'")).rows[0].count).toBe('0');});
it('refuses hidden preexisting functions as well as tables',async()=>{const t=await target();await t.pool.query("CREATE FUNCTION public.existing() RETURNS integer LANGUAGE SQL AS 'SELECT 1'");await t.pool.end();t.pool=new pg.Pool({connectionString:t.url,max:1});await expect(restore(t.url)).rejects.toThrow('RESTORE_TARGET_NOT_EMPTY');});
it('health detects a stopped connection without publishing database details',async()=>{const closed=createPool(db.url);await closed.end();const broken=await createApp(closed,false);try{const r=await broken.inject({url:'/health'});expect(r.statusCode).toBe(503);expect(r.json().error.code).toBe('DATABASE_UNAVAILABLE');expect(r.body).not.toContain('qatu_lab_local_only');}finally{await broken.close();}});
