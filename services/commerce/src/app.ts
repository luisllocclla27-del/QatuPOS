import { runtimeConfig, originAllowed as checkOrigin, type RuntimeConfig } from './platform/runtime.js';
import { assertCloudInstallation } from './platform/cloud.js';
import { consumeSecurityAttempt, refundCommittedAttempt } from './platform/rate-limit.js';
import { setStaffPassword } from './identity/repository.js';
import Fastify, { type FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import type { Pool } from 'pg';
import type { PosCommand, LoginRequest, GuestOrderInput, QuoteRequest, StaffPasswordRequest } from '@qatu/contracts';
import { createPool } from './platform/database.js';
import { digest, token, verifyPassword } from './platform/security.js';
import { readSession } from './platform/session.js';
import { loginValid, commandValid, guestCodeValid, guestOrderValid, quoteValid, staffPasswordValid } from './platform/validation.js';
import { snapshot, transact, createQuote, RepositoryError } from './authority/repository.js';
import { ended, readGuest, guestSnapshot, joinGuest, revealGuestCode } from './tables/guest-repository.js';

export async function createApp(pool:Pool=createPool(), ownsPool=true, config: RuntimeConfig=runtimeConfig()) {
  const app=Fastify({bodyLimit:65536,logger:false});
  await app.register(cookie);
  const attempts=new Map<string,{count:number,until:number}>();
  const guestAttempts=new Map<string,{count:number,until:number}>();
  const credentialAttempts = new Map<string, { count: number; until: number }>();
  const originAllowed = (origin: string | undefined) => checkOrigin(config, origin);
  // Also fence directly supplied Pools: configuration checks alone are insufficient.
  app.addHook('onRequest',async()=>{
    let database:{name:string;marker:string|null};
    try{database=(await pool.query("SELECT datname AS name,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()")).rows[0];}
    catch{throw new RepositoryError('DATABASE_UNAVAILABLE',503,'La base de datos no está disponible. Conserva el pedido y vuelve a consultar.');}
    if(database.name.startsWith('qatupos_restore_')||database.marker==='QatuPOS recovery quarantine v1')throw new RepositoryError('RECOVERY_QUARANTINE',503,'Esta copia está en revisión de recuperación y no puede operar.');
    if(config.cloud) {try {await assertCloudInstallation(pool,config.cloud);}catch {throw new RepositoryError('CLOUD_NOT_READY',503,'La instalación requiere verificación. Conserva el pedido y consulta a administración.');}}
  });
  async function requireMode(tenant: string, branch: string) {
    const rows = await pool.query("SELECT state->>'environment' AS environment FROM branch_state WHERE tenant_id=$1 AND branch_id=$2", [tenant, branch]);
    if (rows.rows[0]?.environment !== config.environment) throw new RepositoryError('ENVIRONMENT_MISMATCH', 403, 'Esta instalación no admite datos o identidades de otro entorno.');
  }
  async function requireSession(request:FastifyRequest, mutation=false) {
    const raw=request.cookies?.qatu_session;
    const session=raw?await readSession(pool,digest(raw)):null;
    if(!session) throw new RepositoryError('AUTHENTICATION_REQUIRED',401,'Inicia sesión con tu usuario.');
    if(mutation && (!originAllowed(request.headers.origin)||request.headers['x-csrf-token']!==session.csrf_token)) {
      throw new RepositoryError('CSRF_INVALID',403,'La sesión debe actualizarse antes de guardar.');
    }
    await requireMode(session.actor.tenant_id,session.actor.branch_id);
    return session;
  }
  app.addHook('onSend',async(_request,reply,payload)=>{
    reply.header('Cache-Control','no-store');
    reply.header('X-Content-Type-Options','nosniff');
    return payload;
  });
  app.get('/health',async()=>({status:'ok',environment:config.environment}));
  app.get('/v1/pos/runtime',async()=>({environment:config.environment}));
  app.post('/v1/pos/session',async(request,reply)=>{
    if(!originAllowed(request.headers.origin)) throw new RepositoryError('FORBIDDEN',403,'Origen de acceso no permitido.');
    if(!loginValid(request.body)) throw new RepositoryError('VALIDATION_ERROR',400,'Completa usuario y contraseña válidos.');
    const ip=request.ip; const now=Date.now();
    const cloudBudget=config.cloud?await consumeSecurityAttempt(pool,'staff-login',ip,8):undefined;
    if(cloudBudget && !cloudBudget.allowed){reply.header('Retry-After',String(cloudBudget.retry_after));return reply.code(429).send({error:{code:'FORBIDDEN',message:'Demasiados intentos. Espera un minuto.'}});}
    const attempt=attempts.get(ip);
    if(!config.cloud && attempt && attempt.until>now && attempt.count>=8) {
      reply.header('Retry-After','60');
      return reply.code(429).send({error:{code:'FORBIDDEN',message:'Demasiados intentos. Espera un minuto.'}});
    }
    const input=request.body as LoginRequest;
    const found=await pool.query('SELECT * FROM staff_memberships WHERE username=$1 AND active=true',[input.username.trim().toLowerCase()]);
    const row=found.rows[0];
    const valid=await verifyPassword(input.password,row?.password_salt??'invalid-synthetic-salt',row?.password_hash??'00'.repeat(64));
    if(!row||!valid) {
      if(!config.cloud){if(attempts.size>1000) attempts.clear();attempts.set(ip,{count:attempt && attempt.until>now?attempt.count+1:1,until:now+60000});}
      throw new RepositoryError('INVALID_CREDENTIALS',401,'Usuario o contraseña incorrectos.');
    }
    await requireMode(row.tenant_id,row.branch_id);
    attempts.delete(ip);
    const prior=request.cookies.qatu_session;
    const raw=token(); const csrf=token(); const expires=new Date(now+12*60*60*1000);
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT version FROM branch_state WHERE tenant_id=$1 AND branch_id=$2 FOR UPDATE',[row.tenant_id,row.branch_id]);
      const current=await client.query('SELECT active,password_salt,password_hash FROM staff_memberships WHERE tenant_id=$1 AND branch_id=$2 AND id=$3',[row.tenant_id,row.branch_id,row.id]);
      if (!current.rows[0]?.active || current.rows[0].password_hash!==row.password_hash || current.rows[0].password_salt!==row.password_salt) throw new RepositoryError('INVALID_CREDENTIALS',401,'El acceso cambió; vuelve a iniciar sesión.');
      if(prior) await client.query('DELETE FROM staff_sessions WHERE token_hash=$1',[digest(prior)]);
      await client.query('DELETE FROM staff_sessions WHERE expires_at<now()');
      await client.query('INSERT INTO staff_sessions(token_hash,csrf_token,tenant_id,branch_id,staff_id,expires_at) VALUES($1,$2,$3,$4,$5,$6)',[digest(raw),csrf,row.tenant_id,row.branch_id,row.id,expires]);
      await client.query('COMMIT');
    } catch(error){await client.query('ROLLBACK');throw error;} finally{client.release();}
    await refundCommittedAttempt(pool,cloudBudget);
    reply.setCookie('qatu_session',raw,{path:'/',httpOnly:true,sameSite:'strict',secure:config.secure_cookies,maxAge:12*60*60});
    return {user:{id:row.id,username:row.username,name:row.display_name,role:row.role,station:row.station},csrf_token:csrf,expires_at:expires.toISOString()};
  });
  app.get('/v1/pos/session',async request=>{
    const s=await requireSession(request);
    return {user:s.actor.user,csrf_token:s.csrf_token,expires_at:s.expires_at};
  });
  app.delete('/v1/pos/session',async(request,reply)=>{
    await requireSession(request,true);
    await pool.query('DELETE FROM staff_sessions WHERE token_hash=$1',[digest(request.cookies.qatu_session!)]);
    reply.clearCookie('qatu_session',{path:'/'});
    return reply.code(204).send();
  });
  app.get('/v1/pos/snapshot',async request=>{
    const s=await requireSession(request);
    return snapshot(pool,s.actor);
  });
  app.post('/v1/pos/commands',async(request)=>{
    const s=await requireSession(request,true);
    if(!commandValid(request.body)) throw new RepositoryError('VALIDATION_ERROR',400,'La acción contiene datos incompletos o no permitidos.');
    return transact(pool,s.actor,request.body as PosCommand);
  });
  app.post('/v1/pos/quotes',async(request)=>{
    const s=await requireSession(request,config.environment === 'operational');
    if(!quoteValid(request.body)) throw new RepositoryError('VALIDATION_ERROR',400,'Revisa los productos solicitados para cotizar.');
    return createQuote(pool,s.actor,request.body as QuoteRequest);
  });
  app.get<{Params:{visit_id:string}}>('/v1/pos/guest-access/:visit_id',async request=>{
    const s=await requireSession(request);
    if(!/^[a-f0-9-]{36}$/i.test(request.params.visit_id))throw new RepositoryError('VALIDATION_ERROR',400,'Atención inválida.');
    return revealGuestCode(pool,s.actor,request.params.visit_id);
  });
  async function requireGuest(request:FastifyRequest,mutation=false) {
    const raw=request.cookies.qatu_guest;
    const g=raw?await readGuest(pool,digest(raw)):null;if(!g)throw ended();
    if(mutation && (!originAllowed(request.headers.origin) || request.headers['x-csrf-token']!==g.csrf_token))throw new RepositoryError('CSRF_INVALID',403,'Actualiza tu sesión antes de enviar.');
    await requireMode(g.tenant_id,g.branch_id);
    return g;
  }
  app.post('/v1/guest/session',async(request,reply)=>{
    if(!originAllowed(request.headers.origin))throw new RepositoryError('FORBIDDEN',403,'Origen no permitido.');
    if(!guestCodeValid(request.body))throw new RepositoryError('VALIDATION_ERROR',400,'Ingresa la clave que te entregó el mozo.');
    const now=Date.now(),old=guestAttempts.get(request.ip);
    const cloudBudget=config.cloud?await consumeSecurityAttempt(pool,'guest-login',request.ip,12):undefined;
    if(cloudBudget && !cloudBudget.allowed){reply.header('Retry-After',String(cloudBudget.retry_after));return reply.code(429).send({error:{code:'FORBIDDEN',message:'Demasiados intentos de clave. Espera un minuto o solicita ayuda al mozo.'}});}
    if(!config.cloud && old && old.until>now && old.count>=12) {
      reply.header('Retry-After',String(Math.max(1,Math.ceil((old.until-now)/1000))));
      return reply.code(429).send({error:{code:'FORBIDDEN',message:'Demasiados intentos de clave. Espera un minuto o solicita ayuda al mozo.'}});
    }
    let joined:Awaited<ReturnType<typeof joinGuest>>;
    try {joined=await joinGuest(pool,(request.body as {code:string}).code,request.cookies.qatu_guest,config.environment);}
    catch(error) {
      // Successful joins share the local BFF address; only failed keys consume this quota.
      if(!config.cloud && error instanceof RepositoryError && error.code==='INVALID_GUEST_CODE') {
        const failedAt=Date.now(),latest=guestAttempts.get(request.ip);
        if(guestAttempts.size>1000)guestAttempts.clear();
        guestAttempts.set(request.ip,{count:latest && latest.until>failedAt?latest.count+1:1,until:latest && latest.until>failedAt?latest.until:failedAt+60000});
      }
      throw error;
    }
    await refundCommittedAttempt(pool,cloudBudget);
    reply.setCookie('qatu_guest',joined.raw,{path:'/v1/guest',httpOnly:true,sameSite:'strict',secure:config.secure_cookies,maxAge:12*3600});
    return joined.response;
  });
  app.get('/v1/guest/session',async request=>{
    await requireGuest(request);
    const raw=request.cookies.qatu_guest;if(!raw)throw ended();
    return (await guestSnapshot(pool,digest(raw))).session;
  });
  app.get('/v1/guest/snapshot',async request=>{
    await requireGuest(request);
    const raw=request.cookies.qatu_guest;if(!raw)throw ended();
    return (await guestSnapshot(pool,digest(raw))).view;
  });
  app.delete('/v1/guest/session',async(request,reply)=>{
    const g=await requireGuest(request,true);
    await pool.query('UPDATE guest_sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE token_hash=$1',[g.token_hash]);
    reply.clearCookie('qatu_guest',{path:'/v1/guest'});return reply.code(204).send();
  });
  app.post('/v1/guest/quotes',async(request)=>{
    const g=await requireGuest(request,config.environment === 'operational');
    if(!quoteValid(request.body)) throw new RepositoryError('VALIDATION_ERROR',400,'Revisa los productos solicitados para cotizar.');
    return createQuote(pool,g.actor,request.body as QuoteRequest,g);
  });
  app.post('/v1/guest/orders',async request=>{
    const g=await requireGuest(request,true);
    if(!guestOrderValid(request.body))throw new RepositoryError('VALIDATION_ERROR',400,'Revisa productos y cantidades. No se permiten datos ajenos a tu pedido.');
    const input=request.body as GuestOrderInput;
    const result=await transact(pool,g.actor,{...input,type:'order.create',visit_id:g.visit_id},g);
    return {operation_id:result.operation_id,replayed:result.replayed,order_id:result.entity_id,snapshot:result.guest_snapshot!};
  });
  app.post<{ Params: { staffId: string } }>('/v1/pos/staff/:staffId/password',async(request)=>{
    const session=await requireSession(request,true);
    if(!staffPasswordValid(request.body) || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(request.params.staffId)) throw new RepositoryError('VALIDATION_ERROR',400,'Completa los datos válidos de la credencial.');
    const key=session.actor.user.id, now=Date.now(), attempt=credentialAttempts.get(key);
    const cloudBudget=config.cloud?await consumeSecurityAttempt(pool,'staff-reauth',key,5):undefined;
    if(cloudBudget && !cloudBudget.allowed)throw new RepositoryError('REAUTHENTICATION_REQUIRED',429,'Espera un minuto antes de volver a verificar tu contraseña.');
    if(!config.cloud && attempt && attempt.until>now && attempt.count>=5) throw new RepositoryError('REAUTHENTICATION_REQUIRED',429,'Espera un minuto antes de volver a verificar tu contraseña.');
    try { const result=await setStaffPassword(pool,session.actor,request.params.staffId,request.body as StaffPasswordRequest);credentialAttempts.delete(key);await refundCommittedAttempt(pool,cloudBudget);return result; }
    catch(error) { if(!config.cloud && error instanceof RepositoryError && error.code==='REAUTHENTICATION_REQUIRED') { if(credentialAttempts.size>1000)credentialAttempts.clear();credentialAttempts.set(key,{count:attempt && attempt.until>now?attempt.count+1:1,until:now+60000}); } throw error; }
  });
  app.setErrorHandler((error,_request,reply)=>{
    const e=error as Error & {status?:number;statusCode?:number;code?:string;current_version?:number;details?:Record<string,unknown>};
    const known=error instanceof RepositoryError||e.name==='DomainError';
    if(known) return reply.code(e.status??e.statusCode??409).send({error:{code:e.code??'VALIDATION_ERROR',message:e.message,...(e.current_version!==undefined?{current_version:e.current_version}:{}),...(e.details?{details:e.details}:{})}});
    if(e.statusCode===400) return reply.code(400).send({error:{code:'VALIDATION_ERROR',message:'Datos de solicitud inválidos.'}});
    return reply.code(503).send({error:{code:'AUTHORITY_UNAVAILABLE',message:'No se pudo confirmar la operación. Conserva el pedido y reintenta la misma acción.'}});
  });

  if(ownsPool) app.addHook('onClose',async()=>{await pool.end();});
  return app;
}
