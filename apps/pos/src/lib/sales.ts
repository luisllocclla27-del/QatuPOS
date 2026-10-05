import type { Check, PosSnapshot } from '@qatu/contracts';
import { parseMoney } from './client';

export type AccountPaymentState = 'empty' | 'pending' | 'partial' | 'held' | 'paid';
export const paymentStateLabel: Record<AccountPaymentState,string> = {empty:'Sin importe',pending:'Por cobrar',partial:'Pago parcial',held:'Saldo retenido',paid:'Pagada'};
export function checkPaymentState(check: Check): AccountPaymentState {
  if (check.held_minor > 0) return 'held';
  if (check.total_minor === 0) return 'empty';
  if (check.paid_minor === check.total_minor) return 'paid';
  return check.paid_minor > 0 ? 'partial' : 'pending';
}
export const accountAmounts = (check: Check) => ({pending:check.total_minor-check.paid_minor,held:check.held_minor,available:check.remaining_collectible_minor});
export function cashChange(received: string, amount: number): {kind:'invalid'} | {kind:'insufficient';shortfall:number} | {kind:'change';amount:number} {
  try { const value=parseMoney(received);return value<amount?{kind:'insufficient',shortfall:amount-value}:{kind:'change',amount:value-amount}; }
  catch { return {kind:'invalid'}; }
}
export function resumableAuthorization(snapshot: PosSnapshot, userId: string, authorizationId: string) {
  const auth=snapshot.authorizations.find(a=>a.id===authorizationId && a.status==='reserved' && a.created_by===userId);
  return auth && snapshot.cash_sessions.some(c=>c.id===auth.cash_session_id && c.owner_id===userId && c.state==='open') ? auth : undefined;
}
export function limaDate(value: string) {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));
  const part=(type:string)=>parts.find(p=>p.type===type)?.value??'';
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function salesRows(snapshot: PosSnapshot, filter: {query:string;date:string;status:AccountPaymentState|'all'}) {
  const normalize=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();
  const query=normalize(filter.query);
  return snapshot.checks.map(check=>{
    const visit=snapshot.visits.find(v=>v.id===check.visit_id);
    const table=snapshot.tables.find(t=>t.id===visit?.table_id);
    const orders=snapshot.orders.filter(o=>o.check_id===check.id);
    const day=snapshot.business_days.find(d=>d.id===orders[0]?.business_day_id);
    const date=day?.business_date??(visit?limaDate(visit.opened_at):'');
    const notes=snapshot.sales_notes.filter(n=>n.check_id===check.id);
    return {check,visit,tableLabel:table?.label??'Mesa',date,orders,notes,payments:snapshot.payments.filter(p=>p.check_id===check.id),state:checkPaymentState(check)};
  }).filter(r=>(!filter.date||r.date===filter.date)&&(filter.status==='all'||r.state===filter.status)&&(!query||normalize([r.tableLabel,r.check.id,...r.notes.map(n=>n.reference)].join(' ')).includes(query)))
    .sort((a,b)=>(b.visit?.opened_at??'').localeCompare(a.visit?.opened_at??'')||a.check.id.localeCompare(b.check.id));
}
