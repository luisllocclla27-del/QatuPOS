'use client';
import { useState } from 'react';
import type { PosSnapshot } from '@qatu/contracts';
import type { PrecuentaData } from './thermal-receipt-modal';
import { money } from '../lib/client';
import { accountAmounts, paymentStateLabel, salesRows, type AccountPaymentState } from '../lib/sales';

export default function SalesHistoryPanel({snapshot,onPrecuenta}:{snapshot:PosSnapshot;onPrecuenta:(data:PrecuentaData)=>void}) {
  const [query,setQuery]=useState(''),[date,setDate]=useState(''),[status,setStatus]=useState<AccountPaymentState|'all'>('all'),[selected,setSelected]=useState('');
  if(!['cashier','admin'].includes(snapshot.user.role))return null;
  const rows=salesRows(snapshot,{query,date,status}),row=rows.find(r=>r.check.id===selected);
  const human=(id:string)=>snapshot.staff.find(s=>s.id===id)?.name??'Personal';
  const datetime=(value:string)=>new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',dateStyle:'short',timeStyle:'short'}).format(new Date(value));
  return <section className="sales-history">
    <div className="panel"><h2>Historial de ventas</h2><p className="muted">Consumos por atención y cobros registrados. Una cuenta pagada puede tener entregas pendientes.</p>
      <div className="sales-filters">
        <label className="field"><span>Buscar mesa, cuenta o nota interna</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Mesa 01 o NV-000001" /></label>
        <label className="field"><span>Día de consumo</span><select value={date} onChange={e=>setDate(e.target.value)}><option value="">Todos los días disponibles</option>{[...new Set(salesRows(snapshot,{query:'',date:'',status:'all'}).map(r=>r.date))].filter(Boolean).sort().reverse().map(d=><option key={d} value={d}>{d}</option>)}</select></label>
        <label className="field"><span>Situación del pago</span><select value={status} onChange={e=>setStatus(e.target.value as AccountPaymentState|'all')}><option value="all">Todas</option>{Object.entries(paymentStateLabel).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      </div><p className="small muted">{rows.length} atenciones encontradas · corte {datetime(snapshot.server_time)} · importes en soles.</p>
      <div className="table-scroll"><table><thead><tr><th>Mesa / atención</th><th>Día de consumo</th><th>Total</th><th>Pagado</th><th>Retenido</th><th>Situación</th><th>Detalle</th></tr></thead><tbody>{rows.map(r=><tr key={r.check.id}><td><strong>{r.tableLabel}</strong><br/><small>{r.visit?datetime(r.visit.opened_at):'Fecha no disponible'} · {r.visit?.status==='closed'?'Atención cerrada':'En atención'}</small></td><td>{r.date}</td><td>{money(r.check.total_minor)}</td><td>{money(r.check.paid_minor)}</td><td>{money(r.check.held_minor)}</td><td><span className={`badge ${r.state==='paid'?'teal':r.state==='held'?'amber':''}`}>{paymentStateLabel[r.state]}</span></td><td><button type="button" className="secondary" aria-label={`Ver atención ${r.tableLabel} ${r.check.id}`} onClick={()=>setSelected(r.check.id)}>Ver detalle</button></td></tr>)}</tbody></table></div>
      {!rows.length&&<p className="empty-state">No hay atenciones que coincidan con estos filtros.</p>}
    </div>
    {row&&<section className="panel sales-detail" aria-label="Detalle de venta"><div className="panel-heading"><div><h2>{row.tableLabel} · detalle de atención</h2><p className="small muted">Cuenta {row.check.id}</p></div><button type="button" className="secondary" onClick={()=>setSelected('')}>Cerrar detalle</button></div>
      <div className="summary-grid"><div className="metric"><span>Consumo total</span><strong>{money(row.check.total_minor)}</strong></div><div className="metric"><span>Pagado confirmado</span><strong>{money(row.check.paid_minor)}</strong></div><div className="metric"><span>Pendiente total</span><strong>{money(accountAmounts(row.check).pending)}</strong></div></div>
      <p className="small">Retenido {money(row.check.held_minor)} · libre para cobrar {money(row.check.remaining_collectible_minor)}. Preparación, entrega y emisión fiscal tienen estados separados.</p>
      {row.visit&&<button type="button" className="secondary" onClick={()=>onPrecuenta({tableLabel:row.tableLabel,visit:row.visit!,check:row.check,orders:row.orders,cutAt:snapshot.server_time})}>Ver precuenta de esta atención</button>}
      <h3>Consumos registrados</h3><div className="table-scroll"><table><thead><tr><th>Tanda / producto</th><th>Activo</th><th>Anulado</th><th>Entregado</th><th>Importe neto</th></tr></thead><tbody>{row.orders.flatMap(o=>o.lines.map(l=><tr key={l.id}><td>Tanda {o.batch_number} · {l.product_name}</td><td>{l.quantity-(l.voided_quantity??0)}</td><td>{l.voided_quantity??0}</td><td>{l.fulfilled_quantity}</td><td>{money(l.unit_price_minor*(l.quantity-(l.voided_quantity??0)))}</td></tr>))}</tbody></table></div>
      <h3>Cobros de esta cuenta</h3><p className="small muted">La fecha del cobro puede ser posterior al día del consumo. El registro no confirma abono bancario ni liquidación de Izipay.</p>
      <div className="table-scroll"><table><thead><tr><th>Fecha / turno</th><th>Medio</th><th>Importe</th><th>Recibido / vuelto</th><th>Estado / responsable</th><th>Referencia</th></tr></thead><tbody>{row.payments.map(p=><tr key={p.id}><td>{datetime(p.confirmed_at??p.created_at)}<br/><small>{snapshot.business_days.find(d=>d.id===p.business_day_id)?.business_date??'Día no disponible'} · {snapshot.cash_sessions.find(c=>c.id===p.cash_session_id)?.shift_label??'Turno no disponible'}</small></td><td>{p.method==='cash'?'Efectivo':p.method==='yape'?'Yape':'Tarjeta'}</td><td>{money(p.amount_minor)}</td><td>{p.method==='cash'?`${money(p.received_minor??0)} / ${money(p.change_minor??0)}`:'No aplica'}</td><td><span className={`badge ${p.status==='unknown'?'amber':'teal'}`}>{p.status==='unknown'?'Incierto · saldo protegido':'Confirmado'}</span><br/><small>{human(p.actor_id)}</small></td><td>{p.evidence?.external_reference??'Registro de efectivo'}<br/><small>Pago {p.id}</small></td></tr>)}</tbody></table></div>
      {!row.payments.length&&<p className="muted">No hay pagos registrados. Las reservas no equivalen a un pago.</p>}
      {row.notes.map(n=><p key={n.id} className="small"><strong>{n.reference} · {money(n.total_minor)}</strong><br/>{n.legend}</p>)}
    </section>}
  </section>;
}
