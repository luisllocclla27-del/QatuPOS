import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { constants, createReadStream, createWriteStream } from 'node:fs';
import { chmod, lstat, mkdtemp, open, readFile, realpath, rmdir, unlink } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import pg, { type PoolClient } from 'pg';
import { assertDatabaseUrl } from '../../../services/commerce/src/platform/runtime.js';
import { deriveGuestCodeWithKey, normalizeGuestCode } from '../../../services/commerce/src/tables/guest-security.js';

const MAGIC=Buffer.from('QATUBK01');
export const MAX_ARCHIVE_BYTES=512*1024*1024, MAX_MANIFEST_BYTES=2*1024*1024;
const root=fileURLToPath(new URL('../../../',import.meta.url));
export class RecoveryError extends Error { constructor(public code:string) {super(code);} }
const fail=(code:string):never=>{throw new RecoveryError(code);};
async function closeFile(handle:Awaited<ReturnType<typeof open>>){
  // Pipeline can close the raw descriptor on an error; preserve the actual failure.
  await handle.close().catch(error=>{if((error as NodeJS.ErrnoException).code!=='EBADF')throw error;});
}
export interface TableFingerprint {name:string;rows:number;sha256:string}
export interface BackupManifest {format_version:1;backup_id:string;created_at:string;source_database:string;server_major:17;guest_key:string|null;tables:TableFingerprint[]}
export interface BackupOptions {sourceUrl:string;keyFile:string;backupFile:string;guestKeyFile:string;binDir?:string;environment?:Record<string,string|undefined>}
export interface RestoreOptions {targetUrl:string;keyFile:string;backupFile:string;binDir?:string}

const identifier=(name:string)=>{if(!/^[a-z][a-z0-9_]{0,62}$/.test(name))fail('UNSUPPORTED_TABLE_NAME');return '"'+name+'"';};
export function assertRestoreUrl(url:string):URL {
  let parsed:URL;try{parsed=new URL(url);}catch{return fail('INVALID_RESTORE_TARGET');}
  if(!['postgres:','postgresql:'].includes(parsed.protocol)||!['127.0.0.1','localhost','[::1]'].includes(parsed.hostname)||!/^\/qatupos_restore_[a-f0-9]{32}$/.test(parsed.pathname)||!parsed.username||!parsed.password)fail('INVALID_RESTORE_TARGET');
  return parsed;
}
export function validateManifest(value:unknown):BackupManifest {
  if(!value||typeof value!=='object'||Array.isArray(value))fail('INVALID_MANIFEST');
  const m=value as BackupManifest,keys=['format_version','backup_id','created_at','source_database','server_major','guest_key','tables'];
  if(Object.keys(m).length!==keys.length||!keys.every(k=>Object.hasOwn(m,k))||m.format_version!==1||m.server_major!==17||typeof m.backup_id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(m.backup_id)||typeof m.created_at!=='string'||!Number.isFinite(Date.parse(m.created_at))||new Date(m.created_at).toISOString()!==m.created_at||typeof m.source_database!=='string'||!/^qatupos_(?:lab|prod_)[a-z0-9_]*$/.test(m.source_database))fail('INVALID_MANIFEST');
  if(m.guest_key!==null&&(typeof m.guest_key!=='string'||Buffer.from(m.guest_key,'base64').length!==32||Buffer.from(m.guest_key,'base64').toString('base64')!==m.guest_key))fail('INVALID_MANIFEST');
  if(!Array.isArray(m.tables)||m.tables.length===0||m.tables.length>1000)fail('INVALID_MANIFEST');
  const names=new Set<string>();
  for(const t of m.tables){if(!t||typeof t!=='object'||Object.keys(t).length!==3||typeof t.name!=='string'||!/^[a-z][a-z0-9_]{0,62}$/.test(t.name)||names.has(t.name)||!Number.isSafeInteger(t.rows)||t.rows<0||typeof t.sha256!=='string'||!/^[a-f0-9]{64}$/.test(t.sha256))fail('INVALID_MANIFEST');names.add(t.name);}
  for(const required of ['branch_state','staff_memberships','staff_sessions','guest_sessions'])if(!names.has(required))fail('INVALID_MANIFEST');
  return m;
}
async function regularFile(path:string){if(!(await lstat(path)).isFile())fail('PRIVATE_FILE_REQUIRED');return realpath(path);}
async function keyBytes(path:string){const key=await readFile(await regularFile(path));if(key.length!==32){key.fill(0);fail('BACKUP_KEY_REQUIRES_32_BYTES');}return key;}
function outsideCheckout(path:string){const r=relative(root,path);return r.startsWith('..'+(process.platform==='win32'?'\\':'/'))||r==='..'||isAbsolute(r);}
async function filePaths(keyFile:string,backupFile:string,operational:boolean,creating:boolean){
  const key=await regularFile(keyFile), parent=await realpath(dirname(resolve(backupFile))),output=join(parent,resolve(backupFile).split(/[\\/]/).at(-1)!);
  if(!output.endsWith('.qatubak')||key===output||dirname(key)===parent)fail('SEPARATE_KEY_AND_BACKUP_REQUIRED');
  if(operational&&(!outsideCheckout(key)||!outsideCheckout(output)))fail('OPERATIONAL_BACKUP_OUTSIDE_CHECKOUT_REQUIRED');
  if(!creating)await regularFile(output);
  return {key,output};
}
const binaryDirectory=(directory?:string)=>resolve(directory??join(root,'.runtime/postgresql-17.11/pgsql/bin'));
/** Password is supplied only to the child environment, never in argv or errors. */
function pgEnvironment(url:URL):NodeJS.ProcessEnv {
  const env:NodeJS.ProcessEnv={NODE_ENV:'production'};for(const name of ['SystemRoot','WINDIR','PATH','TEMP','TMP','HOME','USERPROFILE'])if(process.env[name])env[name]=process.env[name];
  Object.assign(env,{PGHOST:url.hostname.replace(/^\[|\]$/g,''),PGPORT:url.port||'5432',PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGDATABASE:decodeURIComponent(url.pathname.slice(1)),PGCONNECT_TIMEOUT:'10',PGAPPNAME:'qatupos-recovery',PGOPTIONS:'-c statement_timeout=120000'});
  for(const [key,name] of [['sslmode','PGSSLMODE'],['sslrootcert','PGSSLROOTCERT'],['sslcert','PGSSLCERT'],['sslkey','PGSSLKEY']] as const)if(url.searchParams.has(key))env[name]=url.searchParams.get(key)!;
  return env;
}
function child(binary:string,args:string[],env:NodeJS.ProcessEnv) {
  const process=spawn(binary,args,{env,windowsHide:true,stdio:['ignore','pipe','pipe']});let hasWarnings=false;
  process.stderr.on('data',()=>{hasWarnings=true;});
  const completion=new Promise<boolean>(done=>{process.once('error',()=>done(false));process.once('close',code=>done(code===0&&!hasWarnings));});
  return {process,completion};
}
async function tools(directory?:string){
  const bin=binaryDirectory(directory),suffix=process.platform==='win32'?'.exe':'';
  for(const tool of ['pg_dump','pg_restore']){
    const c=child(join(bin,tool+suffix),['--version'],{NODE_ENV:'production',SystemRoot:process.env.SystemRoot});let output='';for await(const chunk of c.process.stdout)output+=chunk.toString();
    if(!await c.completion||!/^pg_(?:dump|restore) \(PostgreSQL\) 17\./.test(output))fail('POSTGRESQL_17_TOOLS_REQUIRED');
  }
  return {dump:join(bin,'pg_dump'+suffix),restore:join(bin,'pg_restore'+suffix)};
}
async function serverVersion(client:PoolClient){const rows=await client.query('SHOW server_version_num');if(Math.floor(Number(rows.rows[0].server_version_num)/10000)!==17)fail('POSTGRESQL_17_SERVER_REQUIRED');}
async function schemas(client:PoolClient){const rows=await client.query("SELECT nspname FROM pg_namespace WHERE nspname !~ '^pg_' AND nspname NOT IN ('public','information_schema')");if(rows.rowCount)fail('UNSUPPORTED_DATABASE_SCHEMA');}
/** Cursor bounds Node memory; ordering and JSON formatting are fixed in PostgreSQL. */
export async function fingerprintTables(client:PoolClient):Promise<TableFingerprint[]> {
  await schemas(client);await client.query("SET LOCAL TIME ZONE 'UTC'");await client.query("SET LOCAL DateStyle TO 'ISO, YMD'");await client.query('SET LOCAL extra_float_digits TO 3');
  const names=(await client.query("SELECT c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') ORDER BY c.relname COLLATE \"C\"")).rows.map(r=>r.name as string);
  const tables:TableFingerprint[]=[];
  for(const name of names){
    const hash=createHash('sha256');let rows=0;
    await client.query(`DECLARE recovery_rows NO SCROLL CURSOR FOR SELECT row_to_json(t)::jsonb::text AS content FROM public.${identifier(name)} t ORDER BY row_to_json(t)::jsonb::text COLLATE "C"`);
    try{while(true){const batch=await client.query('FETCH FORWARD 100 FROM recovery_rows');if(!batch.rowCount)break;for(const row of batch.rows){hash.update(row.content,'utf8').update('\n');rows++;if(!Number.isSafeInteger(rows))fail('ROW_COUNT_LIMIT');}}}finally{await client.query('CLOSE recovery_rows');}
    tables.push({name,rows,sha256:hash.digest('hex')});
  }
  return tables;
}
export async function createBackup(options:BackupOptions) {
  const env=options.environment??process.env,url=assertDatabaseUrl(options.sourceUrl,env),operational=env.QATU_ENV==='production';
  if(url.pathname.startsWith('/qatupos_restore_'))fail('QUARANTINE_SOURCE_FORBIDDEN');
  const paths=await filePaths(options.keyFile,options.backupFile,operational,true),key=await keyBytes(paths.key),bin=await tools(options.binDir);
  const pool=new pg.Pool({connectionString:url.toString(),connectionTimeoutMillis:10000,max:1});let client:PoolClient|undefined,created=false,handle:Awaited<ReturnType<typeof open>>|undefined;
  try{
    client=await pool.connect();await serverVersion(client);await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const quarantine=(await client.query("SELECT shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()")).rows[0].marker;
    if(quarantine==='QatuPOS recovery quarantine v1')fail('QUARANTINE_SOURCE_FORBIDDEN');
    if((await client.query("SELECT 1 FROM branch_state WHERE state->>'environment' IS DISTINCT FROM $1 LIMIT 1",[operational?'operational':'laboratory'])).rowCount)fail('BACKUP_ENVIRONMENT_MISMATCH');
    const snapshot=(await client.query('SELECT pg_export_snapshot() AS id')).rows[0].id as string;
    const tables=await fingerprintTables(client);
    let guestKey:Buffer|null=null;
    const state=(await client.query("SELECT EXISTS(SELECT 1 FROM branch_state WHERE jsonb_array_length(COALESCE(state->'guest_accesses','[]'::jsonb))>0) AS needs_key")).rows[0];
    try{guestKey=await keyBytes(options.guestKeyFile);}catch(error){if(state.needs_key||!(error instanceof Error)||!('code'in error)||error.code!=='ENOENT')throw error;}
    const accesses=(await client.query("SELECT id,code_hash FROM guest_access_credentials WHERE state='active'")).rows;
    for(const access of accesses)if(!guestKey||createHash('sha256').update(normalizeGuestCode(deriveGuestCodeWithKey(access.id,guestKey))).digest('hex')!==access.code_hash)fail('GUEST_KEY_DOES_NOT_MATCH');
    const manifest:BackupManifest={format_version:1,backup_id:randomUUID(),created_at:new Date().toISOString(),source_database:url.pathname.slice(1),server_major:17,guest_key:guestKey?.toString('base64')??null,tables};validateManifest(manifest);
    const header=Buffer.from(JSON.stringify(manifest),'utf8');if(header.length>MAX_MANIFEST_BYTES)fail('MANIFEST_LIMIT');const size=Buffer.alloc(4);size.writeUInt32BE(header.length);
    const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(MAGIC);
    handle=await open(paths.output,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL,0o600);created=true;await handle.write(Buffer.concat([MAGIC,iv]));
    const c=child(bin.dump,['--format=custom','--no-password','--snapshot='+snapshot,'--lock-wait-timeout=10000'],pgEnvironment(url));
    let bytes=0;const limit=new Transform({transform(chunk,_encoding,callback){bytes+=chunk.length;if(bytes>MAX_ARCHIVE_BYTES+MAX_MANIFEST_BYTES+4)callback(new RecoveryError('ARCHIVE_LIMIT'));else callback(null,chunk);}});
    try{
      async function* payload(){yield size;yield header;for await(const chunk of c.process.stdout){yield chunk;}}
      await pipeline(payload(),limit,cipher,createWriteStream(paths.output,{fd:handle.fd,autoClose:false,start:20}));
      if(!await c.completion)fail('PG_DUMP_FAILED');if(bytes-header.length-4>MAX_ARCHIVE_BYTES)fail('ARCHIVE_LIMIT');
      if(guestKey){const current=await keyBytes(options.guestKeyFile);const same=current.equals(guestKey);current.fill(0);guestKey.fill(0);if(!same)fail('GUEST_KEY_CHANGED_DURING_BACKUP');}
      await handle.write(cipher.getAuthTag(),0,16,20+bytes);await handle.sync();await client.query('COMMIT');
      return {backup_id:manifest.backup_id,created_at:manifest.created_at,tables:tables.length,bytes:20+bytes+16,encrypted:true};
    }finally{c.process.kill();await c.completion;header.fill(0);guestKey?.fill(0);}
  }catch(error){if(client)await client.query('ROLLBACK').catch(()=>{});if(handle){await closeFile(handle);handle=undefined;}if(created)await unlink(paths.output).catch(()=>{});throw error;}
  finally{key.fill(0);if(handle)await closeFile(handle);client?.release();await pool.end();}
}
async function extractArchive(backup:string,key:Buffer,dump:string):Promise<BackupManifest> {
  const input=await open(backup,'r');
  try{
    const stat=await input.stat();if(stat.size<45||stat.size>MAX_ARCHIVE_BYTES+MAX_MANIFEST_BYTES+40)fail('ARCHIVE_SIZE_INVALID');
    const prefix=Buffer.alloc(20),tag=Buffer.alloc(16);if((await input.read(prefix,0,20,0)).bytesRead!==20||(await input.read(tag,0,16,stat.size-16)).bytesRead!==16||!prefix.subarray(0,8).equals(MAGIC))fail('ARCHIVE_FORMAT_INVALID');
    const decipher=createDecipheriv('aes-256-gcm',key,prefix.subarray(8));decipher.setAAD(MAGIC);decipher.setAuthTag(tag);
    let length:number|undefined,prefixBytes=Buffer.alloc(0),header=Buffer.alloc(0),archiveBytes=0,signature=Buffer.alloc(0);
    const split=new Transform({transform(chunk:Buffer,_encoding,callback){
      try{
        if(length===undefined){const consumed=Math.min(chunk.length,4-prefixBytes.length);prefixBytes=Buffer.concat([prefixBytes,chunk.subarray(0,consumed)]);
          if(prefixBytes.length<4){callback();return;}length=prefixBytes.readUInt32BE();if(length<2||length>MAX_MANIFEST_BYTES)fail('MANIFEST_LIMIT');
          chunk=chunk.subarray(consumed);
        }
        if(header.length<length){const take=Math.min(chunk.length,length-header.length);header=Buffer.concat([header,chunk.subarray(0,take)]);chunk=chunk.subarray(take);}
        archiveBytes+=chunk.length;if(archiveBytes>MAX_ARCHIVE_BYTES)fail('ARCHIVE_LIMIT');if(signature.length<5)signature=Buffer.concat([signature,chunk.subarray(0,5-signature.length)]);callback(null,chunk);
      }catch(error){callback(error as Error);}
    }});
    try{await pipeline(createReadStream(backup,{fd:input.fd,autoClose:false,start:20,end:stat.size-17}),decipher,split,createWriteStream(dump,{flags:'wx',mode:0o600}));}
    catch{fail('ARCHIVE_AUTHENTICATION_FAILED');}
    if(header.length!==length||!signature.equals(Buffer.from('PGDMP')))fail('ARCHIVE_FORMAT_INVALID');
    let value:unknown;try{value=JSON.parse(header.toString('utf8'));}catch{fail('INVALID_MANIFEST');}finally{header.fill(0);}
    return validateManifest(value);
  }finally{await closeFile(input);}
}
export async function verifyRestore(options:RestoreOptions){
  const url=assertRestoreUrl(options.targetUrl),paths=await filePaths(options.keyFile,options.backupFile,false,false),key=await keyBytes(paths.key),bin=await tools(options.binDir);
  const scratch=await mkdtemp(join(tmpdir(),'qatu-restore-'));await chmod(scratch,0o700);const dump=join(scratch,'archive.dump');
  let pool:pg.Pool|undefined,client:PoolClient|undefined;
  try{
    // No target connection is opened until ciphertext is fully authenticated.
    const manifest=await extractArchive(paths.output,key,dump);
    pool=new pg.Pool({connectionString:url.toString(),connectionTimeoutMillis:10000,max:1});client=await pool.connect();await serverVersion(client);await schemas(client);
    // Take the tool reservation before checking emptiness to avoid competing rehearsals.
    if(!(await client.query('SELECT pg_try_advisory_lock(7160016) AS acquired')).rows[0].acquired)fail('RESTORE_TARGET_IN_USE');
    const existing=await client.query("SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' UNION ALL SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' UNION ALL SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' LIMIT 1");if(existing.rowCount)fail('RESTORE_TARGET_NOT_EMPTY');
    const others=await client.query('SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() LIMIT 1');if(others.rowCount)fail('RESTORE_TARGET_IN_USE');
    // Persistent fence survives a database rename and any failed restore. Never remove here.
    await client.query(`COMMENT ON DATABASE ${identifier(url.pathname.slice(1))} IS 'QatuPOS recovery quarantine v1'`);
    // Reservation serializes this tool; namespace blocks every app entry point throughout restore.
    const c=child(bin.restore,['--dbname='+url.pathname.slice(1),'--no-password','--single-transaction','--exit-on-error','--no-owner','--no-acl',dump],pgEnvironment(url));c.process.stdout.resume();
    if(!await c.completion)fail('PG_RESTORE_FAILED');
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
    const restored=await fingerprintTables(client);if(JSON.stringify(restored)!==JSON.stringify(manifest.tables))fail('RESTORE_FINGERPRINT_MISMATCH');
    // Guest command/quote history refers to session IDs: revoke without deleting history.
    const staff=await client.query('DELETE FROM staff_sessions'),guest=await client.query('UPDATE guest_sessions SET revoked_at=now() WHERE revoked_at IS NULL');await client.query('COMMIT');
    return {backup_id:manifest.backup_id,created_at:manifest.created_at,tables_verified:restored.length,session_counts_revoked:{staff:staff.rowCount??0,guest:guest.rowCount??0},quarantine:true};
  }catch(error){if(client)await client.query('ROLLBACK').catch(()=>{});throw error;}
  finally{key.fill(0);client?.release();await pool?.end();await unlink(dump).catch(()=>{});await rmdir(scratch);}
}
