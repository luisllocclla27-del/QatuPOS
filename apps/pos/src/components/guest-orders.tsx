'use client';

import { useState } from 'react';
import type { PosSnapshot } from '@qatu/contracts';
import { stationName } from '../lib/client';
import { guestOrderProgress as progress } from '../lib/guest-order-progress';

function when(value:string) {return new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(value));}

export default function GuestOrders({snapshot,disabled,onOpenVisit}:{snapshot:PosSnapshot;disabled:boolean;onOpenVisit:(visitId:string)=>void}) {
  const [filter,setFilter]=useState<'pending'|'delivered'|'annulled'|'all'>('pending'),[tableId,setTableId]=useState('');
  const orders=snapshot.orders.filter(o=>o.source==='guest');
  const pendingOrders=orders.filter(o=>progress(o).pending>0);
  const forTable=orders.filter(o=>!tableId || snapshot.visits.find(v=>v.id===o.visit_id)?.table_id===tableId);
  const visible=forTable.filter(o=>filter==='all' || progress(o).status===filter).sort((a,b)=>filter==='delivered'||filter==='annulled'?b.created_at.localeCompare(a.created_at):a.created_at.localeCompare(b.created_at));
  const tables=snapshot.tables.filter(t=>orders.some(o=>snapshot.visits.find(v=>v.id===o.visit_id)?.table_id===t.id));
  return <>
    <p className="muted client-orders-intro">Tandas enviadas desde la carta del cliente, ya registradas en la cuenta. Consulta su avance y coordina la entrega con las estaciones.</p>
    <p className="small muted">Resumen de todas las mesas</p>
    <div className="client-orders-metrics"><div><span>Tandas pendientes</span><strong>{pendingOrders.length}</strong></div><div><span>Unidades listas para llevar</span><strong>{pendingOrders.reduce((s,o)=>s+progress(o).ready,0)}</strong></div><div><span>Unidades por preparar</span><strong>{pendingOrders.reduce((s,o)=>s+progress(o).toPrepare,0)}</strong></div></div>
    <div className="client-orders-toolbar"><div className="category-tabs" role="group" aria-label="Estado de pedidos cliente">{([['pending','Por entregar'],['delivered','Entregados'],['annulled','Anulados'],['all','Todos']] as const).map(([value,label])=><button key={value} className={filter===value?'selected':''} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}</div><label className="field"><span>Filtrar por mesa</span><select value={tableId} onChange={e=>setTableId(e.target.value)}><option value="">Todas las mesas</option>{tables.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></label></div>
    {!visible.length?<section className="panel client-orders-empty"><span aria-hidden>✓</span><h2>{orders.length?'Sin tandas en este filtro':'Todavía no hay pedidos del cliente'}</h2><p>{orders.length?'Prueba otra mesa o revisa Todos.':'Habilita una mesa y entrega su clave. Las tandas que el cliente confirme aparecerán aquí.'}</p></section>:<div className="client-orders-grid">{visible.map(order=>{
      const p=progress(order),visit=snapshot.visits.find(v=>v.id===order.visit_id),table=snapshot.tables.find(t=>t.id===visit?.table_id),check=snapshot.checks.find(c=>c.id===order.check_id);
      const current=visit?.status==='open' && table?.visit_id===visit.id;
      const paid=!!check && check.total_minor>0 && check.paid_minor>=check.total_minor && check.held_minor===0;
      return <article className="panel client-order-card" key={order.id} aria-label={`${table?.label ?? 'Atención'} · tanda ${order.batch_number}`}><header><div><span className="eyebrow">PEDIDO DEL CLIENTE</span><h2>{table?.label ?? 'Atención no disponible'}</h2><p>Tanda {order.batch_number} · {when(order.created_at)}</p></div><span className={`badge ${p.pending===0?'':'teal'}`}>{p.label}</span></header>
        {paid && <p className="client-order-paid">Cuenta pagada{p.pending>0?' · aún falta entregar':''}</p>}
        {order.lines.map(line=>{
          const activeQty = line.quantity - (line.voided_quantity ?? 0);
          return <div className={`client-order-line ${activeQty === 0 ? 'fully-voided' : ''}`} key={line.id}>
            <div>
              <strong style={activeQty === 0 ? { textDecoration: 'line-through', opacity: 0.6 } : undefined}>{line.quantity} × {line.product_name}</strong>
              <span>{stationName[line.station]}{line.station==='caja'?' · entrega directa':''}</span>
              {line.voided_quantity > 0 && <span className="badge danger" style={{ marginLeft: '8px' }}>Anulado: {line.voided_quantity} u.</span>}
              {line.note && <p className="line-note">{line.note}</p>}
            </div>
            <div className="client-order-progress">
              <span>{activeQty===0?'Sin unidades activas':`${line.fulfilled_quantity}/${activeQty} entregados`}</span>
              {activeQty>0 && line.station!=='caja' && <small>{line.prepared_quantity}/{activeQty} preparados</small>}
            </div>
          </div>;
        })}
        <footer><span>{p.footer}</span><button className="secondary" disabled={disabled || !current} onClick={()=>onOpenVisit(order.visit_id)}>{current?'Ver mesa':'Atención cerrada'}</button></footer>
      </article>;
    })}</div>}
    <p className="small muted client-orders-footnote">El pago no confirma entrega. Esta vista se actualiza con la operación del equipo; consultar una tanda no vuelve a enviarla.</p>
  </>;
}
