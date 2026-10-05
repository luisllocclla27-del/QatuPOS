import { describe, it, expect } from 'vitest';
import { createInitialState, projectSnapshot } from '../../packages/domain/src/index.js';
import { productionQueue, elapsedMinutes, closureProblems, matchingClosingApproval } from '../../apps/pos/src/lib/operations.js';
const snapshot = () => { const s = createInitialState({ tenant_id: 'test', branch_id: 'branch' }); return projectSnapshot(s, { tenant_id: s.tenant_id, branch_id: s.branch.id, user: s.staff[1]! }); };
describe('014 presentation of queue and close', () => {
  it('sorts urgency then stable accepted sequence, not updated time', () => {
    const s = snapshot(); const base = { visit_id: 'v', check_id: 'c', batch_number: 1, created_by: 'w', created_at: s.server_time, business_day_id: 'd', status: 'accepted' as const, lines: [{ station: 'cocina', quantity: 1, fulfilled_quantity: 0 }] as any };
    s.orders = [{ ...base, id: 'a', service_sequence: 2 }, { ...base, id: 'b', service_sequence: 1 }, { ...base, id: 'c', service_sequence: 3, priority: 'urgent' }];
    expect(productionQueue(s, 'cocina').map(o => o.id)).toEqual(['c', 'b', 'a']);
  });
  it('excludes delivered and fully voided lines from queue', () => { const s = snapshot(); s.orders = [{ id: 'a', status: 'accepted', lines: [{ station: 'cocina', quantity: 2, fulfilled_quantity: 1, voided_quantity: 1 }] } as any]; expect(productionQueue(s, 'cocina')).toEqual([]); });
  it('clamps elapsed time instead of negative age on clock skew', () => { expect(elapsedMinutes('2026-10-03T16:03:00Z', '2026-10-03T16:00:00Z')).toBe(3); expect(elapsedMinutes('2026-10-03T15:59:00Z', '2026-10-03T16:00:00Z')).toBe(0); });
  it('does not present unavailable inventory as resolved', () => { const s = snapshot(); s.stock[0]!.reserved = null; expect(closureProblems(s)).toContain('Conciliar las reservas de inventario.'); });
  it('does not treat a stale approval as usable', () => { const s = snapshot(); s.cash_sessions = [{ id: 'cash', owner_id: 'owner', version: 1 } as any]; s.cash_close_approvals = [{ id: 'a', cash_session_id: 'cash', business_day_id: s.business_day.id, actor_id: 'admin', cash_version: 1, day_version: s.business_day.version, seal_state_version: s.version - 1, counted_cash_minor: 0, stock_counts: [] } as any]; expect(matchingClosingApproval(s, 'cash', 0, [])).toBeUndefined(); });
});
