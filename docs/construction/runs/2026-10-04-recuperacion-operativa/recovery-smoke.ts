import { spawn } from 'node:child_process';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink, rmdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import pg from 'pg';
import { createPool, defaultDatabaseUrl } from '../../../../services/commerce/src/platform/database.js';
import { createApp } from '../../../../services/commerce/src/app.js';
const id=randomUUID().replaceAll('-',''),name='qatupos_restore_'+id,folder=resolve('.runtime/recovery-test/'+id);
if(!/^qatupos_restore_[a-f0-9]{32}$/.test(name))throw new Error('Unsafe generated rehearsal');
await mkdir(join(folder,'keys'),{recursive:true});await mkdir(join(folder,'copies'));
const key=join(folder,'keys','backup.key'),copy=join(folder,'copies','source.qatubak');await writeFile(key,randomBytes(32),{flag:'wx',mode:0o600});
const target=new URL(defaultDatabaseUrl);target.pathname='/'+name;
const env={...process.env,QATU_ENV:'local',DATABASE_URL:defaultDatabaseUrl,QATU_BACKUP_KEY_FILE:key,QATU_BACKUP_FILE:copy,QATU_GUEST_KEY_FILE:resolve('.runtime/guest-code.key'),QATU_RESTORE_DATABASE_URL:target.toString()};
const source=createPool(),dest=new pg.Pool({connectionString:target.toString()}),admin=createPool();let created=false;
const fingerprint=async(pool:pg.Pool)=>createHash('sha256').update(JSON.stringify((await pool.query('SELECT tenant_id,branch_id,version,state FROM branch_state ORDER BY tenant_id,branch_id')).rows)).digest('hex');
async function cli(mode:string){return new Promise<any>((done,reject)=>{let output='';const c=spawn(process.execPath,['--import','tsx','scripts/operational/recovery/cli.ts',mode],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});c.stdout.on('data',b=>output+=b);c.stderr.resume();c.once('error',reject);c.once('exit',code=>{if(code!==0)reject(new Error('Recovery CLI failed; no private output published'));else{try{done(JSON.parse(output));}catch{reject(new Error('Invalid safe CLI report'));}}});});}
try{
  const before=await fingerprint(source),backup=await cli('backup');await admin.query(`CREATE DATABASE "${name}"`);created=true;
  const restored=await cli('restore-verify'),after=await fingerprint(source),restoredHash=await fingerprint(dest);
  if(before!==after||before!==restoredHash)throw new Error('State fingerprint mismatch');
  const copyApp=await createApp(dest,false);let blocked=false;try{const r=await copyApp.inject({url:'/health'});blocked=r.statusCode===503&&r.json().error.code==='RECOVERY_QUARANTINE';}finally{await copyApp.close();}
  if(!blocked)throw new Error('Quarantine not enforced');
  const report={passed:true,source:'existing synthetic interactive laboratory, read-only',backup,restored,archive_sha256:createHash('sha256').update(await readFile(copy)).digest('hex'),interactive_before_sha256:before,interactive_after_sha256:after,restored_state_sha256:restoredHash,runtime_blocked:true,provider_calls:0,production_recovery:false,fixture_cleanup:'owned rehearsal/key/archive only; source preserved'};
  await writeFile(new URL('recovery-smoke.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{
  await dest.end();await source.end();try{if(created)await admin.query(`DROP DATABASE "${name}"`);}finally{await admin.end();}
  await unlink(key);await unlink(copy).catch(error=>{if(error.code!=='ENOENT')throw error;});await rmdir(join(folder,'keys'));await rmdir(join(folder,'copies'));await rmdir(folder);
}
