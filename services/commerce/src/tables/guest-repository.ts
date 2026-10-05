import type { Pool, PoolClient } from 'pg';
import { randomUUID } from 'node:crypto';
import { serviceMode, productAvailableInService, type Actor, type BranchState, type GuestPrincipal } from '@qatu/domain';
import type { GuestAccessView, GuestSessionResponse, GuestSnapshot } from '@qatu/contracts';
import { RepositoryError } from '../platform/errors.js';
import { digest,token } from '../platform/security.js';
import { deriveGuestCode,normalizeGuestCode } from './guest-security.js';

export interface GuestIdentity extends GuestPrincipal {tenant_id:string;branch_id:string;token_hash:string;csrf_token:string;expires_at:string;actor:Actor}
export const ended=()=>new RepositoryError('GUEST_ACCESS_ENDED',403,'La atención concluyó o el mozo cambió la clave. Solicita ayuda al personal.');
export function guestView(state:BranchState,guest:GuestPrincipal):GuestSnapshot {
  const visit=state.visits.find(v=>v.id===guest.visit_id),access=state.guest_accesses.find(a=>a.id===guest.access_id);
  if(!visit||visit.status!=='open'||access?.state!=='active')throw ended();
  const table=state.tables.find(t=>t.id===visit.table_id)!;
  return {visit_id:visit.id,visit_version:visit.version,table_label:table.label,restaurant:state.branch.name,server_time:new Date().toISOString(),ordering_allowed:state.business_day.state==='open' && !state.orders.some(o=>o.visit_id===visit.id && o.business_day_id!==state.business_day.id),
    service_mode:serviceMode(state),products:state.products.filter(p=>productAvailableInService(state,p)).map(({id,name,category,price_minor,station})=>({id,name,category,price_minor,station})),
    orders:state.orders.filter(o=>o.visit_id===visit.id && o.guest_session_id===guest.session_id && o.source==='guest').map(o=>({id:o.id,batch_number:o.batch_number,created_at:o.created_at,lines:o.lines.map(({product_name,quantity,unit_price_minor,note,prepared_quantity,fulfilled_quantity})=>({product_name,quantity,unit_price_minor,note,prepared_quantity,fulfilled_quantity}))}))};
}
export async function syncGuestAccess(client:PoolClient,before:BranchState,after:BranchState) {
  const scope=[after.tenant_id,after.branch.id];
  // Retire old generations before inserting a rotated key's new active generation.
  for(const access of after.guest_accesses) {
    const old=before.guest_accesses.find(a=>a.id===access.id);
    if(old?.state==='active' && access.state!=='active') {
      await client.query('UPDATE guest_access_credentials SET state=$4 WHERE tenant_id=$1 AND branch_id=$2 AND id=$3',[...scope,access.id,access.state]);
      await client.query('UPDATE guest_sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE tenant_id=$1 AND branch_id=$2 AND access_id=$3',[...scope,access.id]);
    }
  }
  for(const access of after.guest_accesses.filter(a=>!before.guest_accesses.some(o=>o.id===a.id))) {
    await client.query('INSERT INTO guest_access_credentials(tenant_id,branch_id,id,visit_id,created_by,code_hash,state) VALUES($1,$2,$3,$4,$5,$6,$7)',[...scope,access.id,access.visit_id,access.created_by,digest(normalizeGuestCode(deriveGuestCode(access.id))),access.state]);
  }
}
export async function readGuest(pool:Pool|PoolClient,hash:string):Promise<GuestIdentity|null> {
  const r=await pool.query(`SELECT s.*,a.visit_id,m.id AS staff_id,m.username,m.display_name,m.role,m.station
    FROM guest_sessions s JOIN guest_access_credentials a ON a.id=s.access_id AND a.tenant_id=s.tenant_id AND a.branch_id=s.branch_id
    JOIN staff_memberships m ON m.id=a.created_by AND m.tenant_id=a.tenant_id AND m.branch_id=a.branch_id
    WHERE s.token_hash=$1 AND s.expires_at>now() AND s.revoked_at IS NULL AND a.state='active' AND m.active=true AND m.role='waiter'`,[hash]);
  const row=r.rows[0];if(!row)return null;
  const actor:Actor={tenant_id:row.tenant_id,branch_id:row.branch_id,user:{id:row.staff_id,username:row.username,name:row.display_name,role:row.role,station:row.station}};
  return {tenant_id:row.tenant_id,branch_id:row.branch_id,access_id:row.access_id,session_id:row.id,visit_id:row.visit_id,token_hash:hash,csrf_token:row.csrf_token,expires_at:new Date(row.expires_at).toISOString(),actor};
}
export async function revealGuestCode(pool:Pool,actor:Actor,visitId:string):Promise<GuestAccessView> {
  if(actor.user.role!=='waiter')throw new RepositoryError('FORBIDDEN',403,'Solo un mozo puede entregar la clave al cliente.');
  const r=await pool.query('SELECT id,code_hash FROM guest_access_credentials WHERE tenant_id=$1 AND branch_id=$2 AND visit_id=$3 AND state=$4',[actor.tenant_id,actor.branch_id,visitId,'active']);
  if(!r.rows[0])throw new RepositoryError('NOT_FOUND',404,'Esta atención no tiene una clave activa.');
  const code=deriveGuestCode(r.rows[0].id);
  if(digest(normalizeGuestCode(code))!==r.rows[0].code_hash)throw new RepositoryError('GUEST_KEY_UNAVAILABLE',409,'No se puede recuperar esta clave. El mozo debe rotarla conservando la atención.');
  return {access_id:r.rows[0].id,visit_id:visitId,code};
}
export function sessionView(state:BranchState,g:GuestIdentity):GuestSessionResponse {
  const view=guestView(state,g);
  return {session_id:g.session_id,visit_id:g.visit_id,restaurant:view.restaurant,table_label:view.table_label,csrf_token:g.csrf_token,expires_at:g.expires_at};
}
export async function guestSnapshot(pool:Pool,hash:string) {
  // One scoped database snapshot also authorizes the private read, avoiding a read/revoke gap.
  const client=await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const g=await readGuest(client,hash);if(!g)throw ended();
    const r=await client.query('SELECT state FROM branch_state WHERE tenant_id=$1 AND branch_id=$2',[g.tenant_id,g.branch_id]);
    const state=r.rows[0]?.state as BranchState;if(!state)throw ended();
    const view=guestView(state,g);await client.query('COMMIT');return {view,session:sessionView(state,g)};
  } catch(error){await client.query('ROLLBACK');throw error;} finally{client.release();}
}
export async function joinGuest(pool:Pool,code:string,priorToken?:string, expectedEnvironment?: BranchState['environment']) {
  const hash=digest(normalizeGuestCode(code));
  const found=await pool.query('SELECT tenant_id,branch_id FROM guest_access_credentials WHERE code_hash=$1 AND state=$2',[hash,'active']);
  const scope=found.rows[0];const invalid=()=>new RepositoryError('INVALID_GUEST_CODE',401,'La clave no es válida o la atención ya concluyó. Solicita una clave al mozo.');
  if(!scope)throw invalid();
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const r=await client.query('SELECT state FROM branch_state WHERE tenant_id=$1 AND branch_id=$2 FOR UPDATE',[scope.tenant_id,scope.branch_id]);
    const state=r.rows[0]?.state as BranchState;if(!state)throw invalid();
    if(expectedEnvironment && state.environment !== expectedEnvironment) throw invalid();
    const active=await client.query('SELECT id FROM guest_access_credentials WHERE tenant_id=$1 AND branch_id=$2 AND code_hash=$3 AND state=$4',[scope.tenant_id,scope.branch_id,hash,'active']);
    const access=state.guest_accesses.find(a=>a.id===active.rows[0]?.id && a.state==='active');if(!access)throw invalid();
    const old=priorToken?await readGuest(client,digest(priorToken)):null;
    if(old && old.access_id===access.id && old.tenant_id===scope.tenant_id && old.branch_id===scope.branch_id) {
      const response=sessionView(state,old);await client.query('COMMIT');return {raw:priorToken!,response};
    }
    const raw=token(),csrf=token(),id=randomUUID(),expires=new Date(Date.now()+12*3600000);
    const membership=await client.query('SELECT * FROM staff_memberships WHERE id=$1 AND tenant_id=$2 AND branch_id=$3 AND active=true AND role=$4',[access.created_by,scope.tenant_id,scope.branch_id,'waiter']);if(!membership.rows[0])throw invalid();
    if(priorToken)await client.query('UPDATE guest_sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE token_hash=$1',[digest(priorToken)]);
    await client.query('INSERT INTO guest_sessions(tenant_id,branch_id,id,access_id,token_hash,csrf_token,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7)',[scope.tenant_id,scope.branch_id,id,access.id,digest(raw),csrf,expires]);
    const view=guestView(state,{access_id:access.id,visit_id:access.visit_id,session_id:id});
    const response:GuestSessionResponse={session_id:id,visit_id:access.visit_id,table_label:view.table_label,restaurant:view.restaurant,csrf_token:csrf,expires_at:expires.toISOString()};
    await client.query('COMMIT');return {raw,response};
  } catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
