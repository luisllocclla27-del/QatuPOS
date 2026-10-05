import type { InventoryCount, PosSnapshot } from '@qatu/contracts';

/** Presentation aid only. The server revalidates authority, versions and reservations. */
export function countReviewProblem(snapshot: PosSnapshot, count: InventoryCount): string | null {
  if (count.status === 'superseded') return 'Sustituido por un reconteo; el original permanece en el historial.';
  if (count.status === 'adjusted') return 'Ajuste ya registrado.';
  if (snapshot.business_day.state !== 'open') return 'El día está cerrado. Conserva este conteo y declara un reconteo al abrir el siguiente día.';
  if (count.business_day_id !== snapshot.business_day.id) return 'Conteo de otro día o sin día registrado. Declara un reconteo; no se cambia el original.';
  if (snapshot.user.role !== 'admin') return 'Administración debe revisar y aprobar este conteo.';
  if (count.actor_id === snapshot.user.id) return 'Debe aprobar otra persona administradora; no puedes aprobar tu propio conteo.';
  const handover = snapshot.handovers.some(h => ['prepared', 'declared', 'disputed'].includes(h.state));
  for (const line of count.lines) {
    const stock = snapshot.stock.find(s => s.id === line.stock_item_id);
    if (!stock || stock.on_hand === null || stock.reserved === null) return 'Los datos de inventario no están disponibles para revisión.';
    if (stock.station === 'caja' && handover) return 'Termina el traspaso de bebidas antes de revisar este ajuste.';
    if (stock.on_hand !== line.expected_quantity || stock.version !== line.expected_stock_version) return 'Cambió el inventario o sus reservas desde el conteo. Declara un reconteo.';
    if (line.counted_quantity < stock.reserved) return `${stock.name}: faltan ${stock.reserved - line.counted_quantity} unidades para las reservas. Concilia los pedidos pendientes y declara un reconteo.`;
  }
  return null;
}

export function pendingCountFor(snapshot: PosSnapshot, stockId: string): InventoryCount | undefined {
  return snapshot.inventory_counts.find(c => c.status === 'declared' && c.lines.some(l => l.stock_item_id === stockId));
}

export function currentConsumption(snapshot: PosSnapshot, checkId: string): boolean {
  return snapshot.business_day.state === 'open' && snapshot.orders.filter(o => o.check_id === checkId).every(o => o.business_day_id === snapshot.business_day.id);
}
