import { describe, it, expect } from 'vitest';
import { createInitialState, projectSnapshot, type Actor } from '../../packages/domain/src/index.js';
import { countReviewProblem, pendingCountFor, currentConsumption } from '../../apps/pos/src/lib/inventory-review.js';
import type { InventoryCount } from '@qatu/contracts';
function fixture() {
  const s = createInitialState({ tenant_id: 'synthetic', branch_id: 'local' }), user = s.staff.find(u => u.username === 'admin')!;
  const actor: Actor = { tenant_id: s.tenant_id, branch_id: s.branch.id, user };
  const c: InventoryCount = { id: 'count', actor_id: s.staff.find(u => u.username === 'caja')!.id, business_day_id: s.business_day.id, created_at: '2026-10-03T16:00:00Z', reason: 'Conteo de prueba', status: 'declared', lines: [{ stock_item_id: s.stock[0]!.id, expected_quantity: 48, counted_quantity: 47, difference_quantity: -1, expected_stock_version: 1 }] };
  const snapshot = projectSnapshot(s, actor); snapshot.inventory_counts = [c]; return { snapshot, c };
}
describe('013 inventory review aid', () => {
  it('permits a valid independent review', () => { const { snapshot, c } = fixture(); expect(countReviewProblem(snapshot, c)).toBeNull(); expect(pendingCountFor(snapshot, snapshot.stock[0]!.id)).toBe(c); });
  it('explains shortage before approving', () => { const { snapshot, c } = fixture(); snapshot.stock[0]!.reserved = 48; expect(countReviewProblem(snapshot, c)).toContain('faltan 1'); });
  it('detects reservation change even with unchanged physical stock', () => { const { snapshot, c } = fixture(); snapshot.stock[0]!.version = 2; expect(countReviewProblem(snapshot, c)).toContain('reconteo'); });
  it('does not turn null inventory into zero', () => { const { snapshot, c } = fixture(); snapshot.stock[0]!.reserved = null; expect(countReviewProblem(snapshot, c)).toContain('no están disponibles'); });
  it('explains self approval and legacy day', () => { const { snapshot, c } = fixture(); c.actor_id = snapshot.user.id; expect(countReviewProblem(snapshot, c)).toContain('otra persona'); delete c.business_day_id; expect(countReviewProblem(snapshot, c)).toContain('sin día'); });
  it('does not use superseded count as a retention', () => { const { snapshot, c } = fixture(); c.status = 'superseded'; expect(pendingCountFor(snapshot, snapshot.stock[0]!.id)).toBeUndefined(); expect(countReviewProblem(snapshot, c)).toContain('historial'); });
  it('disables commercial adjustments when day closed', () => { const { snapshot } = fixture(); snapshot.business_day.state = 'provisionally_closed'; expect(currentConsumption(snapshot, 'check')).toBe(false); });
});
