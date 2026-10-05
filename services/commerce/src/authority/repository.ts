import { requireTransactionalSession } from '../platform/session.js';
import { syncStaff } from '../identity/repository.js';
import { sqlMoney } from '../platform/money.js';
import type { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { executeCommand, projectSnapshot, createDomainQuote, type Actor, type BranchState } from '@qatu/domain';
import type { PosCommand, CommandResponse, GuestSnapshot, QuoteRequest, QuoteResponse, OrderQuote } from '@qatu/contracts';
import { canonical, digest } from '../platform/security.js';
import { RepositoryError } from '../platform/errors.js';
import { readGuest, guestView, syncGuestAccess, ended, type GuestIdentity } from '../tables/guest-repository.js';

export { RepositoryError };
export async function snapshot(pool:Pool, actor:Actor) {
  const result=await pool.query('SELECT state FROM branch_state WHERE tenant_id=$1 AND branch_id=$2',[actor.tenant_id,actor.branch_id]);
  if(!result.rows[0]) throw new RepositoryError('NOT_FOUND',404,'No existe el local autorizado.');
  return projectSnapshot(result.rows[0].state as BranchState, actor, new Date().toISOString());
}
export async function createQuote(pool:Pool, actor:Actor, input:QuoteRequest, guest?:GuestIdentity):Promise<QuoteResponse> {
  const client=await pool.connect();
  const scope=[actor.tenant_id,actor.branch_id];
  try {
    await client.query('BEGIN');
    const row=await client.query('SELECT state FROM branch_state WHERE tenant_id=$1 AND branch_id=$2 FOR UPDATE',scope);
    if(!row.rows[0]) throw new RepositoryError('NOT_FOUND',404,'No existe el local autorizado.');
    const state=row.rows[0].state as BranchState;
    await requireTransactionalSession(client, actor);
    if(guest) {
      const current=await readGuest(client,guest.token_hash);
      if(!current || current.session_id!==guest.session_id || current.tenant_id!==actor.tenant_id || current.branch_id!==actor.branch_id || current.access_id!==guest.access_id || current.visit_id!==guest.visit_id)throw ended();
      guestView(state,current);actor=current.actor;
    }
    const visitId=guest?guest.visit_id:input.visit_id;
    if(!visitId) throw new RepositoryError('VALIDATION_ERROR',400,'Se requiere el identificador de la atención para cotizar.');
    const now=new Date().toISOString();
    const quoteId=randomUUID();
    const quote=createDomainQuote(state,visitId,input.lines,now,quoteId,actor,guest?{access_id:guest.access_id,session_id:guest.session_id,visit_id:guest.visit_id}:undefined);
    await client.query(
      'INSERT INTO order_quotes(tenant_id,branch_id,id,visit_id,actor_id,principal_kind,guest_session_id,total_minor,lines,expires_at,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
      [...scope,quote.id,quote.visit_id,quote.actor_id,quote.principal_kind,quote.guest_session_id,quote.total_minor,JSON.stringify(quote.lines),quote.expires_at,quote.created_at]
    );
    await client.query('COMMIT');
    return {quote_id:quote.id,visit_id:quote.visit_id,total_minor:quote.total_minor,server_time:now,expires_at:quote.expires_at,lines:quote.lines};
  } catch(error) {await client.query('ROLLBACK');throw error;} finally {client.release();}
}
export async function transact(pool:Pool, actor:Actor, command:PosCommand, guest?:GuestIdentity):Promise<CommandResponse & {guest_snapshot?:GuestSnapshot}> {
  const client=await pool.connect();
  const scope=[actor.tenant_id,actor.branch_id];
  try {
    await client.query('BEGIN');
    // Serializes all commercial effects for this branch; no global lock across tenants.
    const row=await client.query('SELECT state,version FROM branch_state WHERE tenant_id=$1 AND branch_id=$2 FOR UPDATE',scope);
    if(!row.rows[0]) throw new RepositoryError('NOT_FOUND',404,'No existe el local autorizado.');
    const state=row.rows[0].state as BranchState;
    await requireTransactionalSession(client, actor);
    if(guest) {
      const current=await readGuest(client,guest.token_hash);
      if(!current || current.session_id!==guest.session_id || current.tenant_id!==actor.tenant_id || current.branch_id!==actor.branch_id || current.access_id!==guest.access_id || current.visit_id!==guest.visit_id)throw ended();
      guestView(state,current);actor=current.actor;
    }
    const hash=digest(canonical(guest?{command,guest_session_id:guest.session_id}:command));
    const prior=await client.query('SELECT request_sha256,actor_id,entity_id,principal_kind,guest_session_id FROM command_operations WHERE tenant_id=$1 AND branch_id=$2 AND operation_id=$3',[...scope,command.operation_id]);
    if(prior.rows[0]) {
      if(prior.rows[0].actor_id!==actor.user.id) throw new RepositoryError('FORBIDDEN',403,'Esta operación pertenece a otro empleado.');
      if(prior.rows[0].principal_kind!==(guest?'guest':'staff') || (guest && prior.rows[0].guest_session_id!==guest.session_id))throw new RepositoryError('FORBIDDEN',403,'Esta operación pertenece a otro participante.');
      if(prior.rows[0].request_sha256!==hash) throw new RepositoryError('IDEMPOTENCY_CONFLICT',409,'La operación ya existe con otro contenido.');
      await client.query('COMMIT');
      return {operation_id:command.operation_id,replayed:true,entity_id:prior.rows[0].entity_id,snapshot:projectSnapshot(state,actor,new Date().toISOString()),...(guest?{guest_snapshot:guestView(state,guest)}:{})};
    }
    let quote:OrderQuote|undefined;
    if(command.type==='order.create') {
      const qRes=await client.query('SELECT * FROM order_quotes WHERE tenant_id=$1 AND branch_id=$2 AND id=$3',[...scope,command.quote_id]);
      if(qRes.rows[0]) {
        const rowQ=qRes.rows[0];
        quote={
          id:rowQ.id,tenant_id:rowQ.tenant_id,branch_id:rowQ.branch_id,visit_id:rowQ.visit_id,actor_id:rowQ.actor_id,
          principal_kind:rowQ.principal_kind,guest_session_id:rowQ.guest_session_id,total_minor:sqlMoney(rowQ.total_minor),
          lines:typeof rowQ.lines==='string'?JSON.parse(rowQ.lines):rowQ.lines,
          expires_at:rowQ.expires_at instanceof Date?rowQ.expires_at.toISOString():new Date(rowQ.expires_at).toISOString(),
          consumed_at:rowQ.consumed_at?(rowQ.consumed_at instanceof Date?rowQ.consumed_at.toISOString():new Date(rowQ.consumed_at).toISOString()):null,
          created_at:rowQ.created_at instanceof Date?rowQ.created_at.toISOString():new Date(rowQ.created_at).toISOString()
        };
      }
    }
    const result=executeCommand(state,actor,command,{now:new Date().toISOString(),id:randomUUID,...(guest?{guest}:{}),...(quote?{quote}:{})});
    if(command.type==='order.create') {
      await client.query('UPDATE order_quotes SET consumed_at=now() WHERE tenant_id=$1 AND branch_id=$2 AND id=$3',[...scope,command.quote_id]);
    }
    if(command.type==='catalog.product.create' || command.type==='catalog.product.update') {
      const lastAudit=result.state.catalog_audit[result.state.catalog_audit.length-1];
      if(lastAudit) {
        await client.query(
          'INSERT INTO catalog_audit(id,tenant_id,branch_id,operation_id,actor_id,product_id,action,previous_version,new_version,changes,reason,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
          [lastAudit.id,...scope,lastAudit.operation_id,lastAudit.actor_id,lastAudit.product_id,lastAudit.action,lastAudit.previous_version,lastAudit.new_version,JSON.stringify(lastAudit.changes),lastAudit.reason,lastAudit.created_at]
        );
      }
    }
    if(command.type==='order.line.void') {
      const lastVoid=result.state.void_audit[result.state.void_audit.length-1];
      if(lastVoid) {
        await client.query(
          'INSERT INTO order_void_audit(tenant_id,branch_id,id,operation_id,actor_id,visit_id,order_id,line_id,quantity,amount_minor,restored_stock,reason,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
          [...scope,lastVoid.id,lastVoid.operation_id,lastVoid.actor_id,lastVoid.visit_id,lastVoid.order_id,lastVoid.line_id,lastVoid.quantity,lastVoid.amount_minor,lastVoid.restored_stock,lastVoid.reason,lastVoid.created_at]
        );
      }
    }
    if(command.type==='check.discount.apply' || command.type==='check.discount.remove') {
      const lastAudit=result.state.discount_audit?.[result.state.discount_audit.length-1];
      if(lastAudit) {
        await client.query(
          'INSERT INTO check_discount_audit(tenant_id,branch_id,id,operation_id,actor_id,check_id,visit_id,discount_minor,discount_kind,discount_percent,reason,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
          [...scope,lastAudit.id,lastAudit.operation_id,lastAudit.actor_id,lastAudit.check_id,lastAudit.visit_id,lastAudit.discount_minor,lastAudit.discount_kind,lastAudit.discount_percent??null,lastAudit.reason,lastAudit.created_at]
        );
      }
    }
    if(command.type==='fiscal.document.issue') {
      const lastDoc=result.state.fiscal_documents?.[result.state.fiscal_documents.length-1];
      if(lastDoc) {
        await client.query(
          'UPDATE fiscal_series SET current_number=$3, updated_at=now() WHERE tenant_id=$1 AND branch_id=$2 AND doc_type=$4',
          [...scope,lastDoc.number,lastDoc.doc_type]
        );
        await client.query(
          `INSERT INTO fiscal_documents(
            tenant_id, branch_id, id, check_id, visit_id, doc_type, series, number, full_number,
            customer_doc_type, customer_doc_number, customer_name, customer_address, currency,
            op_gravada_minor, igv_minor, total_minor, digest_hash, qr_payload, items, status,
            actor_id, created_at
          ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`,
          [
            ...scope,lastDoc.id,lastDoc.check_id,lastDoc.visit_id,lastDoc.doc_type,
            lastDoc.series,lastDoc.number,lastDoc.full_number,
            lastDoc.customer_doc_type,lastDoc.customer_doc_number,lastDoc.customer_name,
            lastDoc.customer_address,lastDoc.currency,lastDoc.op_gravada_minor,lastDoc.igv_minor,
            lastDoc.total_minor,lastDoc.digest_hash,lastDoc.qr_payload,
            JSON.stringify(lastDoc.items),lastDoc.status,lastDoc.actor_id,lastDoc.created_at
          ]
        );
      }
    }
    if(command.type==='fiscal.credit_note.issue') {
      const lastDoc=result.state.fiscal_documents?.[result.state.fiscal_documents.length-1];
      if(lastDoc && lastDoc.doc_type==='nota_credito') {
        const seriesDocType = lastDoc.series === 'BC01' ? 'nota_credito_boleta' : 'nota_credito_factura';
        await client.query(
          'UPDATE fiscal_series SET current_number=$3, updated_at=now() WHERE tenant_id=$1 AND branch_id=$2 AND doc_type=$4',
          [...scope,lastDoc.number,seriesDocType]
        );
        await client.query(
          `INSERT INTO fiscal_documents(
            tenant_id, branch_id, id, check_id, visit_id, doc_type, series, number, full_number,
            customer_doc_type, customer_doc_number, customer_name, customer_address, currency,
            op_gravada_minor, igv_minor, total_minor, digest_hash, qr_payload, items, status,
            actor_id, created_at, modified_document_id, modified_document_full_number,
            sunat_reason_code, sunat_reason_description
          ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)`,
          [
            ...scope,lastDoc.id,lastDoc.check_id,lastDoc.visit_id,lastDoc.doc_type,
            lastDoc.series,lastDoc.number,lastDoc.full_number,
            lastDoc.customer_doc_type,lastDoc.customer_doc_number,lastDoc.customer_name,
            lastDoc.customer_address,lastDoc.currency,lastDoc.op_gravada_minor,lastDoc.igv_minor,
            lastDoc.total_minor,lastDoc.digest_hash,lastDoc.qr_payload,
            JSON.stringify(lastDoc.items),lastDoc.status,lastDoc.actor_id,lastDoc.created_at,
            lastDoc.modified_document_id,lastDoc.modified_document_full_number,
            lastDoc.sunat_reason_code,lastDoc.sunat_reason_description
          ]
        );
        if(lastDoc.modified_document_id) {
          await client.query(
            'UPDATE fiscal_documents SET status=$3, credit_note_id=$4, credit_note_full_number=$5 WHERE tenant_id=$1 AND branch_id=$2 AND id=$6',
            [...scope, 'annulled', lastDoc.id, lastDoc.full_number, lastDoc.modified_document_id]
          );
        }
      }
    }
    await syncStaff(client,scope,state,result.state,command);
    await syncGuestAccess(client,state,result.state);
    for(const payment of result.state.payments) {
      if(payment.status!=='succeeded'||!payment.evidence||payment.method==='cash') continue;
      const old=state.payments.find(p=>p.id===payment.id);
      if(old?.status==='succeeded') continue;
      await client.query('INSERT INTO external_receipts(tenant_id,branch_id,method,merchant_account,external_reference,payment_id) VALUES($1,$2,$3,$4,$5,$6)',[...scope,payment.method,payment.evidence.merchant_account,payment.evidence.external_reference,payment.id]);
    }
    await client.query('UPDATE branch_state SET state=$3,version=$4,updated_at=now() WHERE tenant_id=$1 AND branch_id=$2',[...scope,JSON.stringify(result.state),result.state.version]);
    await client.query('INSERT INTO command_operations(tenant_id,branch_id,operation_id,actor_id,request_sha256,command_type,entity_id,principal_kind,guest_session_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[...scope,command.operation_id,actor.user.id,hash,command.type,result.entity_id,guest?'guest':'staff',guest?.session_id??null]);
    await client.query('INSERT INTO outbox(tenant_id,branch_id,operation_id,type,entity_id) VALUES($1,$2,$3,$4,$5)',[...scope,command.operation_id,command.type,result.entity_id]);
    const guestSnapshot=guest?guestView(result.state,guest):undefined;
    await client.query('COMMIT');
    return {operation_id:command.operation_id,replayed:false,entity_id:result.entity_id,snapshot:result.snapshot,...(guestSnapshot?{guest_snapshot:guestSnapshot}:{})};
  } catch(error) {
    await client.query('ROLLBACK');
    if((error as {code?:string}).code==='23505' && command.type === 'staff.create') throw new RepositoryError('STAFF_USERNAME_CONFLICT',409,'Ese usuario ya está registrado; usa uno distinto.');
    if((error as {code?:string}).code==='23505') throw new RepositoryError('DUPLICATE_EVIDENCE',409,'La referencia digital ya fue registrada; revisa el pago existente.');
    throw error;
  } finally {client.release();}
}
