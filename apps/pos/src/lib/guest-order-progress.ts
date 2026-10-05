import type { Order } from '@qatu/contracts';
/** Commercial cancellation and physical delivery are separate facts. */
export function guestOrderProgress(order: Order) {
  let active=0, voided=0, pending=0, ready=0, toPrepare=0, delivered=0;
  for (const line of order.lines) {
    const qty=Math.max(0,line.quantity-(line.voided_quantity??0));
    active+=qty; voided+=line.voided_quantity??0;
    delivered+=line.fulfilled_quantity;
    pending+=Math.max(0,qty-line.fulfilled_quantity);
    ready+=line.station==='caja'?Math.max(0,qty-line.fulfilled_quantity):Math.max(0,Math.min(qty,line.prepared_quantity)-line.fulfilled_quantity);
    toPrepare+=line.station==='caja'?0:Math.max(0,qty-line.prepared_quantity);
  }
  const cancelled=active===0 && voided>0;
  const status=cancelled?'annulled':pending===0 && active>0?'delivered':'pending';
  const label=cancelled?'Anulado':status==='delivered'?'Entregado':ready===pending && pending>0?'Listo para entregar':order.lines.some(l=>l.prepared_quantity>0||l.fulfilled_quantity>0)?'En proceso':'Recibido';
  const footer=cancelled?'Pedido anulado · sin unidades por entregar':status==='delivered'?voided>0?'Unidades activas entregadas · incluye anulaciones':'Todas las unidades entregadas':`${pending} unidad(es) por entregar`;
  return {active,voided,pending,ready,toPrepare,delivered,status,label,footer};
}
