import type { PosSnapshot, Order, Station, CashCloseApproval } from '@qatu/contracts';
export function productionQueue(snapshot: PosSnapshot, station: Station): Order[] {
  return snapshot.orders.filter(o => o.status === 'accepted' && o.lines.some(l => l.station === station && l.quantity - (l.voided_quantity ?? 0) > l.fulfilled_quantity))
    .sort((a, b) => Number(b.priority === 'urgent') - Number(a.priority === 'urgent') || (a.service_sequence ?? snapshot.orders.indexOf(a) + 1) - (b.service_sequence ?? snapshot.orders.indexOf(b) + 1));
}
export function elapsedMinutes(serverTime: string, accepted: string): number {
  return Math.max(0, Math.floor((Date.parse(serverTime) - Date.parse(accepted)) / 60000)) || 0;
}
export function closureProblems(snapshot: PosSnapshot): string[] {
  const items: string[] = [];
  if (snapshot.payments.some(p => p.status === 'unknown')) items.push('Resolver pagos inciertos con evidencia del comercio.');
  if (snapshot.authorizations.some(a => a.status === 'reserved')) items.push('Resolver autorizaciones de cobro pendientes.');
  if (snapshot.checks.some(c => c.paid_minor < c.total_minor || c.held_minor > 0)) items.push('Cobrar o conciliar las cuentas con saldo.');
  if (snapshot.orders.some(o => o.lines.some(l => l.quantity - (l.voided_quantity ?? 0) > l.fulfilled_quantity))) items.push('Terminar las entregas pendientes.');
  if (snapshot.stock.some(s => s.reserved === null || (s.reserved ?? 0) > 0)) items.push('Conciliar las reservas de inventario.');
  if (snapshot.inventory_counts.some(c => c.status === 'declared')) items.push('Revisar los conteos de inventario pendientes.');
  if (snapshot.handovers.some(h => ['prepared', 'declared', 'disputed'].includes(h.state))) items.push('Terminar el traspaso de caja y bebidas.');
  return items;
}
export function matchingClosingApproval(snapshot: PosSnapshot, cashId: string, counted: number, stockCounts: { stock_item_id: string; counted_quantity: number }[]): CashCloseApproval | undefined {
  const cash = snapshot.cash_sessions.find(c => c.id === cashId);
  return snapshot.cash_close_approvals?.slice().reverse().find(a => a.cash_session_id === cashId && a.actor_id !== cash?.owner_id && a.business_day_id === snapshot.business_day.id && a.cash_version === cash?.version && a.day_version === snapshot.business_day.version && a.seal_state_version === snapshot.version && a.counted_cash_minor === counted && a.stock_counts.length === stockCounts.length && a.stock_counts.every(l => stockCounts.some(c => c.stock_item_id === l.stock_item_id && c.counted_quantity === l.counted_quantity)));
}
