import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {createInitialState,executeCommand,createDomainQuote,projectSnapshot,type Actor} from '../../../../packages/domain/src/index.js';
import type {PosCommand} from '../../../../packages/contracts/src/pos.js';
const now='2026-10-02T15:00:00.000Z';
function harness() {
 let state=createInitialState({tenant_id:'test-tenant',branch_id:'test-branch'},undefined,now);
 const actor=(name='mozo'):Actor=>({tenant_id:state.tenant_id,branch_id:state.branch.id,user:state.staff.find(u=>u.username===name)!});
 const run=(input:any,name='mozo',quote?:any)=>{const result=executeCommand(state,actor(name),{...input,operation_id:randomUUID()} as PosCommand,{now,id:randomUUID,...(quote?{quote}:{})});state=result.state;return result;};
 run({type:'table.open',table_id:state.tables[0]!.id,expected_version:1});
 const quote=()=>createDomainQuote(state,state.visits[0]!.id,[{product_id:state.products[0]!.id,quantity:2}],now,randomUUID(),actor());
 const order=(q=quote(),name='mozo')=>run({type:'order.create',visit_id:state.visits[0]!.id,expected_version:state.visits[0]!.version,quote_id:q.id},name,q);
 const discount=()=>run({type:'check.discount.apply',check_id:state.checks[0]!.id,expected_version:state.checks[0]!.version,kind:'percentage',percent:10,reason:'Descuento sintético'},'caja');
 const cash=()=>run({type:'cash.open',opening_minor:0,shift_label:'diurno',expected_day_version:state.business_day.version},'caja');
 const pay=()=>{const authorization=run({type:'collection.authorize',check_id:state.checks[0]!.id,expected_version:state.checks[0]!.version,cash_session_id:state.cash_sessions[0]!.id,method:'cash',amount_minor:state.checks[0]!.remaining_collectible_minor},'caja');run({type:'payment.confirm',authorization_id:authorization.entity_id,received_minor:state.checks[0]!.total_minor},'caja');};
 return {actor,run,quote,order,discount,cash,pay,get state(){return state;}};
}
const findings:any[]=[];
function observe(id:string,fn:()=>unknown){try{findings.push({id,observation:fn()});}catch(error){findings.push({id,error:String(error)});}}
observe('Q01',()=>{const h=harness(),q=h.quote();h.order(q);q.consumed_at=now;h.order(q);return {accepted_orders:h.state.orders.length,expected:1};});
observe('Q02',()=>{const h=harness(),q=h.quote();h.order(q,'admin');return {quote_actor:q.actor_id,accepting_actor:h.actor('admin').user.id,accepted_orders:h.state.orders.length,expected:'FORBIDDEN'};});
observe('D01',()=>{const h=harness();h.order();h.discount();h.cash();h.pay();h.run({type:'check.discount.remove',check_id:h.state.checks[0]!.id,expected_version:h.state.checks[0]!.version,reason:'Intento después del pago'},'caja');return {total:h.state.checks[0]!.total_minor,paid:h.state.checks[0]!.paid_minor,reopened_balance:h.state.checks[0]!.remaining_collectible_minor,expected:'rechazo sin reabrir'};});
observe('D02',()=>{const h=harness();h.order();h.discount();const view=projectSnapshot(h.state,h.actor('mozo'));return {waiter_audit_entries:view.discount_audit.length,expected:0};});
observe('D03',()=>{const h=harness();h.order();h.discount();h.cash();h.run({type:'day.close',cash_session_id:h.state.cash_sessions[0]!.id,expected_version:h.state.cash_sessions[0]!.version,expected_day_version:h.state.business_day.version,counted_cash_minor:0,stock_counts:h.state.stock.filter(s=>s.station==='caja').map(s=>({stock_item_id:s.id,counted_quantity:s.on_hand})),reason:'Cierre sintético con descuento'},'caja');return {close_sales:h.state.day_closes[0]!.sales_minor,net_check:h.state.checks[0]!.total_minor};});
observe('F01',()=>{const h=harness();h.order();h.cash();h.pay();h.run({type:'fiscal.document.issue',check_id:h.state.checks[0]!.id,expected_check_version:h.state.checks[0]!.version,doc_type:'boleta',customer_doc_type:'sin_documento',customer_name:'CLIENTE SINTETICO'},'caja');h.run({type:'fiscal.credit_note.issue',document_id:h.state.fiscal_documents[0]!.id,reason_code:'07',reason_description:'Devolución parcial sintética'},'caja');return {reason:'07',credited:h.state.fiscal_documents[1]!.total_minor,original_total:h.state.fiscal_documents[0]!.total_minor,original_status:h.state.fiscal_documents[0]!.status,expected:'no anular total con motivo parcial'};});
observe('F02',()=>{const h=harness();h.order();h.cash();h.pay();h.run({type:'fiscal.document.issue',check_id:h.state.checks[0]!.id,expected_check_version:h.state.checks[0]!.version,doc_type:'boleta',customer_doc_type:'sin_documento',customer_name:'CLIENTE SINTETICO'},'caja');return {check_fiscal_status:h.state.checks[0]!.fiscal_status,capability:projectSnapshot(h.state,h.actor('caja')).capabilities.fiscal_issuance,document_status:h.state.fiscal_documents[0]!.status};});
const output={environment:'synthetic-memory-only',database_touched:false,application_files_modified:false,observations:findings};
writeFileSync(new URL('./reproduction.json',import.meta.url),JSON.stringify(output,null,2)+'\n');
process.stdout.write(JSON.stringify(output,null,2)+'\n');
