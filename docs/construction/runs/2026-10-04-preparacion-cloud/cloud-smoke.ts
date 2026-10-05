import { randomUUID } from 'node:crypto';
import { execFileSync,spawn,type ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer,request as httpsRequest } from 'node:https';
import { request as httpRequest } from 'node:http';
import pg from 'pg';
import { installCloud } from '../../../../scripts/cloud/install.js';
import { runtimeConfig } from '../../../../services/commerce/src/platform/runtime.js';
import { defaultDatabaseUrl } from '../../../../services/commerce/src/platform/database.js';
const root=new URL('../../../../',import.meta.url),fixture=new URL('.runtime/cloud-test/',root),pos=fileURLToPath(new URL('apps/pos/',root));
await mkdir(fixture,{recursive:true});
const cert=fileURLToPath(new URL('cert.pem',fixture)),certKey=fileURLToPath(new URL('key.pem',fixture));
execFileSync('C:/Program Files/Git/usr/bin/openssl.exe',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',certKey,'-out',cert,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore',windowsHide:true});
const ca=await readFile(cert),tlsKey=await readFile(certKey),name='qatupos_prod_cloud_test_'+randomUUID().replaceAll('-',''),origin='https://localhost:3447';
const key=Buffer.alloc(32,73).toString('base64'),password=randomUUID()+'!',dbPassword=randomUUID()+'!';
const env={...process.env,QATU_DEPLOYMENT:'vercel',QATU_ENV:'production',QATU_PUBLIC_ORIGIN:origin,QATU_SUPABASE_PROJECT_REF:'abcdefghijklmnopqrst',QATU_DEPLOYMENT_STAGE:'production',QATU_GUEST_CODE_KEY_BASE64:key,QATU_CLOUD_DIST_DIR:'.next-cloud',VERCEL:'1',VERCEL_ENV:'production'};
const config=runtimeConfig(env),admin=new pg.Pool({connectionString:defaultDatabaseUrl,max:1});
const dbUrl=new URL(defaultDatabaseUrl);dbUrl.pathname='/'+name;
let owner:pg.Pool|undefined,child:ChildProcess|undefined,created=false,installed=false;
const proxy=createServer({cert:ca,key:tlsKey},(incoming,outgoing)=>{
  const forwarded=httpRequest({hostname:'127.0.0.1',port:3317,path:incoming.url,method:incoming.method,headers:{...incoming.headers,'x-forwarded-for':'127.0.0.1',host:'localhost:3447'}},response=>{outgoing.writeHead(response.statusCode??503,response.headers);response.pipe(outgoing);});
  forwarded.on('error',()=>{outgoing.writeHead(503);outgoing.end();});incoming.pipe(forwarded);
});
function call(path:string,body?:unknown,headers:Record<string,string>={}) {
  return new Promise<{status:number;json:any;cookies:string[];headers:Record<string,unknown>}>((resolve,reject)=>{
    const text=body===undefined?undefined:JSON.stringify(body);
    const req=httpsRequest(origin+path,{ca,method:body===undefined?'GET':'POST',headers:{origin,...(text?{'content-type':'application/json','content-length':String(Buffer.byteLength(text))}:{}),...headers}},res=>{
      const chunks:Buffer[]=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>{const raw=Buffer.concat(chunks).toString();let json:any;try{json=JSON.parse(raw);}catch{json={non_json:true};}resolve({status:res.statusCode??0,json,cookies:res.headers['set-cookie']??[],headers:res.headers});});
    });req.on('error',reject);if(text)req.write(text);req.end();
  });
}
function check(condition:unknown,label:string){if(!condition)throw new Error(label);}
async function stop() {if(!child||child.exitCode!==null)return;const closed=new Promise<void>(resolve=>child!.once('exit',()=>resolve()));child.kill('SIGTERM');await Promise.race([closed,new Promise<void>((_,reject)=>setTimeout(()=>reject(new Error('Owned server shutdown timed out')),10000))]);child=undefined;}
async function start() {
  const next=createRequire(import.meta.url).resolve('next/dist/bin/next',{paths:[pos]});
  const runtimeUrl=new URL(dbUrl);runtimeUrl.username='qatu_pos_runtime';runtimeUrl.password=dbPassword;
  child=spawn(process.execPath,[next,'start','--hostname','127.0.0.1','--port','3317'],{cwd:pos,env:{...env,DATABASE_URL:runtimeUrl.toString()},stdio:['ignore','pipe','pipe'],windowsHide:true});
  let output='';child.stdout?.on('data',chunk=>{output+=chunk;});child.stderr?.on('data',chunk=>{output+=chunk;});
  for(let i=0;i<100;i++){if(child.exitCode!==null)throw new Error('Built server exited.');try{const r=await call('/v1/pos/runtime');if(r.status===200){check(r.json.environment==='operational','Operational runtime mismatch');return;}}catch{}await new Promise(resolve=>setTimeout(resolve,250));}
  // Save only a diagnostic code, never environment variables/connection strings.
  throw new Error('Built cloud server readiness timed out.');
}
try {
  if((await admin.query("SELECT 1 FROM pg_roles WHERE rolname='qatu_pos_runtime'")).rowCount)throw new Error('Existing runtime role; fixture refused.');
  await admin.query(`CREATE DATABASE "${name}"`);created=true;owner=new pg.Pool({connectionString:dbUrl.toString(),max:1});
  await installCloud(owner,config.cloud!,{restaurant:'INSTALACIÓN CLOUD EFÍMERA',tables:4,username:'prueba_admin',admin_name:'Administrador de prueba',admin_password:password,runtime_password:dbPassword});installed=true;
  await new Promise<void>((resolve,reject)=>{proxy.once('error',reject);proxy.listen(3447,'127.0.0.1',resolve);});await start();
  check((await call('/')).status===200,'Web page missing');check((await call('/cliente')).status===200,'Customer page missing');
  check((await call('/v1/pos/session',{username:'prueba_admin',password},{origin:'https://evil.test'})).status===403,'Origin not fenced');
  const session=await call('/v1/pos/session',{username:'prueba_admin',password});check(session.status===200,'Login failed');check(session.cookies.some(cookie=>cookie.includes('Secure')&&cookie.includes('HttpOnly')),'Cookie security missing');
  const staffCookie=session.cookies[0]!.split(';')[0]!,headers={cookie:staffCookie,'x-csrf-token':session.json.csrf_token};
  const staffCreated=await call('/v1/pos/commands',{type:'staff.create',operation_id:randomUUID(),username:'prueba_mozo',name:'Mozo de prueba',role:'waiter',station:null,reason:'Alta de ensayo cloud'},headers);check(staffCreated.status===200,'Individual waiter creation failed');
  const staff=staffCreated.json.snapshot.staff.find((s:any)=>s.username==='prueba_mozo');
  const credential=await call('/v1/pos/staff/'+staff.id+'/password',{expected_version:staff.version,current_password:password,new_password:password+'M',reason:'Credencial individual de ensayo'},headers);check(credential.status===200,'Waiter credential failed');
  const activatedStaff=await call('/v1/pos/commands',{type:'staff.update',operation_id:randomUUID(),staff_id:staff.id,expected_version:credential.json.version,name:staff.name,role:'waiter',station:null,active:true,reason:'Activar acceso individual de ensayo'},headers);check(activatedStaff.status===200,'Waiter activation failed');
  const waiter=await call('/v1/pos/session',{username:'prueba_mozo',password:password+'M'});check(waiter.status===200,'Waiter login failed');
  const waiterHeaders={cookie:waiter.cookies[0]!.split(';')[0]!,'x-csrf-token':waiter.json.csrf_token};
  const snapshot=await call('/v1/pos/snapshot',undefined,headers);check(snapshot.status===200,'Snapshot failed');
  const cash=await call('/v1/pos/commands',{type:'cash.open',operation_id:randomUUID(),opening_minor:0,shift_label:'diurno',expected_day_version:snapshot.json.business_day.version},headers);check(cash.status===200,'Cash open failed');
  const table=cash.json.snapshot.tables[0],opened=await call('/v1/pos/commands',{type:'table.open',operation_id:randomUUID(),table_id:table.id,expected_version:table.version},waiterHeaders);check(opened.status===200,'Table open failed');
  const visit=opened.json.snapshot.visits.find((visit:any)=>visit.id===opened.json.entity_id),activated=await call('/v1/pos/commands',{type:'guest.access',operation_id:randomUUID(),visit_id:visit.id,expected_version:visit.version,action:'activate',reason:'Mozo habilita ensayo cloud'},waiterHeaders);check(activated.status===200,'Guest activation failed: '+activated.status+' '+activated.json?.error?.code);
  const code=await call('/v1/pos/guest-access/'+visit.id,undefined,waiterHeaders);check(code.status===200&&typeof code.json.code==='string','Code disclosure failed');
  const guest=await call('/v1/guest/session',{code:code.json.code});check(guest.status===200,'Guest join failed');const guestCookie=guest.cookies[0]!.split(';')[0]!;
  await stop();await start();
  const restoredStaff=await call('/v1/pos/session',undefined,waiterHeaders),restoredGuest=await call('/v1/guest/session',undefined,{cookie:guestCookie}),stableCode=await call('/v1/pos/guest-access/'+visit.id,undefined,waiterHeaders);
  check(restoredStaff.status===200&&restoredGuest.status===200,'Session lost after restart');check(stableCode.json.code===code.json.code,'Key changed after restart');
  const report={passed:true,built_next_node_api:true,https_verified:true,secure_cookie:true,origin_csrf_authority:true,private_pg_schema:true,restricted_role:true,empty_initial_catalog:true,cash_open:true,table_activation:true,guest_join:true,staff_and_guest_survive_restart:true,stable_guest_key:true,upstream_commerce_port_required:false,external_provider_calls:0,real_supabase_vercel_homologated:false};
  await writeFile(new URL('cloud-smoke.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally {
  await stop();await new Promise<void>(resolve=>proxy.close(()=>resolve()));await owner?.end();
  if(created&&/^qatupos_prod_cloud_test_[a-f0-9]{32}$/.test(name))await admin.query(`DROP DATABASE "${name}"`);
  if(installed)await admin.query('DROP ROLE qatu_pos_runtime');await admin.end();
}
