import type { Product, ServiceMode, StockItem, Order } from '@qatu/contracts';
import type { BranchState } from './state.js';

/** Legacy laboratory SKUs are explicit; names/categories never grant night eligibility. */
const legacyKinds: Record<string, NonNullable<StockItem['beverage_kind']>> = { 'BEB-CERV-330': 'beer', 'BEB-GAS-500': 'soda', 'BEB-AGUA-625': 'water' };
export function serviceMode(state: BranchState): ServiceMode {
  return state.cash_sessions.filter(c => c.business_day_id === state.business_day.id).at(-1)?.shift_label === 'nocturno' ? 'beverages_only' : 'full_service';
}
export function productAvailableInService(state: BranchState, product: Product): boolean {
  if (!product.active) return false;
  if (serviceMode(state) === 'full_service') return true;
  const stock = state.stock.find(s => s.id === product.stock_item_id);
  return product.station === 'caja' && product.stock_policy === 'unit' && stock?.station === 'caja' && ['beer', 'soda', 'water'].includes(stock.beverage_kind ?? legacyKinds[stock.sku] ?? '');
}
export function serviceSequence(state: BranchState, order: Order): number {
  return order.service_sequence ?? state.orders.findIndex(o => o.id === order.id) + 1;
}
export function operationalCloseBlockers(state: BranchState): string[] {
  const problems: string[] = [];
  if (state.payments.some(p => p.status === 'unknown')) problems.push('Hay pagos inciertos: verifica evidencia del comercio antes de cerrar.');
  if (state.authorizations.some(a => a.status === 'reserved')) problems.push('Hay autorizaciones de cobro sin resolver.');
  if (state.checks.some(c => c.paid_minor < c.total_minor || c.held_minor > 0)) problems.push('Hay cuentas con saldo pendiente o retenido.');
  if (state.orders.some(o => o.lines.some(l => l.quantity - (l.voided_quantity ?? 0) > l.fulfilled_quantity))) problems.push('Quedan productos por entregar.');
  if (state.stock.some(s => s.reserved > 0)) problems.push('Quedan unidades reservadas en inventario.');
  if (state.inventory_counts.some(c => c.status === 'declared')) problems.push('Hay conteos de inventario pendientes de revisión.');
  if (state.handovers.some(h => ['prepared', 'declared', 'disputed'].includes(h.state))) problems.push('Hay un traspaso sin terminar.');
  if (state.handovers.some(h => h.state === 'accepted' && (h.difference_cash_minor !== 0 || h.stock_lines.some(l => l.difference_quantity !== 0)) && !h.discrepancy_approved_by)) problems.push('Hay diferencias de traspaso sin aprobación independiente.');
  return problems;
}
