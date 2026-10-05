import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createInitialState, executeCommand, createDomainQuote, type Actor } from '../../packages/domain/src/index.js';
import type { PosCommand } from '@qatu/contracts';
function h() {
  let state = createInitialState({ tenant_id: 'synthetic', branch_id: 'local' });
  const now = '2026-10-03T16:00:00Z';
  const actor = (name: string): Actor => ({ tenant_id: state.tenant_id, branch_id: state.branch.id, user: state.staff.find(u => u.username === name)! });
  const run = (input: any, name = 'caja', quote?: any) => { const r = executeCommand(state, actor(name), { ...input, operation_id: randomUUID() } as PosCommand, { now, id: randomUUID, ...(quote ? { quote } : {}) }); state = r.state; return r; };
  const cash = () => run({ type: 'cash.open', opening_minor: 0, shift_label: 'diurno', expected_day_version: state.business_day.version });
  const order = (indices = [3], qty = 5) => {
    if (!state.visits.length) run({ type: 'table.open', table_id: state.tables[0]!.id, expected_version: 1 }, 'mozo');
    const v = state.visits[0]!, q = createDomainQuote(state, v.id, indices.map(i => ({ product_id: state.products[i]!.id, quantity: qty })), now, randomUUID(), actor('mozo'));
    return run({ type: 'order.create', visit_id: v.id, expected_version: v.version, quote_id: q.id }, 'mozo', q);
  };
  const count = (quantity = 2, indices = [0], name = 'caja') => run({ type: 'inventory.count', reason: 'Conteo físico sintético', lines: indices.map(i => ({ stock_item_id: state.stock[i]!.id, expected_version: state.stock[i]!.version, counted_quantity: quantity })) }, name);
  const adjust = (id = state.inventory_counts.at(-1)!.id, text = 'Diferencia revisada') => run({ type: 'inventory.adjust', inventory_count_id: id, approval_reason: text }, 'admin');
  const close = () => run({ type: 'day.close', cash_session_id: state.cash_sessions.at(-1)!.id, expected_version: state.cash_sessions.at(-1)!.version, expected_day_version: state.business_day.version, counted_cash_minor: state.cash_sessions.at(-1)!.expected_minor, stock_counts: state.stock.filter(s => s.station === 'caja').map(s => ({ stock_item_id: s.id, counted_quantity: s.on_hand })), reason: 'Cierre sintético' });
  const next = () => { close(); run({ type: 'day.open', expected_day_version: state.business_day.version, reason: 'Nuevo día sintético' }, 'admin'); cash(); };
  const voidLine = (qty = 1, restore = false) => run({ type: 'order.line.void', line_id: state.orders[0]!.lines[0]!.id, expected_version: state.visits[0]!.version, quantity: qty, restore_stock: restore, reason: 'Anulación sintética' });
  const discount = () => run({ type: 'check.discount.apply', check_id: state.checks[0]!.id, expected_version: state.checks[0]!.version, kind: 'fixed', amount_minor: 100, reason: 'Descuento sintético' });
  const begin = () => run({ type: 'handover.begin', cash_session_id: state.cash_sessions.at(-1)!.id, expected_version: state.cash_sessions.at(-1)!.version, incoming_user_id: actor('noche').user.id });
  return { run, cash, order, count, adjust, close, next, voidLine, discount, begin, get state() { return state; } };
}
describe('013 signed day boundaries', () => {
  it('does not void prior day consumption', () => { const t = h(); t.cash(); t.order(); t.next(); const before = structuredClone(t.state); expect(() => t.voidLine()).toThrow('día'); expect(t.state).toEqual(before); });
  it('does not apply discount to a prior day check', () => { const t = h(); t.cash(); t.order(); t.next(); expect(() => t.discount()).toThrow('día'); });
  it('does not remove prior day discount', () => { const t = h(); t.cash(); t.order(); t.discount(); t.next(); expect(() => t.run({ type: 'check.discount.remove', check_id: t.state.checks[0]!.id, expected_version: t.state.checks[0]!.version, reason: 'Retirar descuento viejo' })).toThrow('día'); });
  it('allows collection of prior balance and preserves the old close', () => {
    const t = h(); t.cash(); t.order([0], 1); t.next(); const old = structuredClone(t.state.day_closes[0]);
    const a = t.run({ type: 'collection.authorize', cash_session_id: t.state.cash_sessions.at(-1)!.id, check_id: t.state.checks[0]!.id, expected_version: t.state.checks[0]!.version, method: 'cash', amount_minor: 3500 });
    t.run({ type: 'payment.confirm', authorization_id: a.entity_id, received_minor: 3500 }); t.close();
    expect(t.state.day_closes[0]).toEqual(old); expect(t.state.day_closes[1]!.prior_day_collections_minor).toBe(3500); expect(t.state.day_closes[1]!.sales_minor).toBe(0);
  });
});
describe('013 inventory declaration and safe review', () => {
  it('preserves observation and reservations if counted stock is insufficient', () => {
    const t = h(); t.cash(); t.order(); t.count(); const before = structuredClone(t.state);
    expect(() => t.adjust()).toThrow('reservadas'); expect(t.state).toEqual(before); expect(t.state.inventory_counts[0]!.lines[0]!.counted_quantity).toBe(2); expect(t.state.stock[0]).toMatchObject({ on_hand: 48, reserved: 5 });
  });
  it('retains stock for new reservations pending review', () => { const t = h(); t.cash(); t.count(48); const before = structuredClone(t.state); expect(() => t.order()).toThrow('conteo'); expect(t.state.orders).toHaveLength(0); expect(t.state.stock).toEqual(before.stock); });
  it('does not deliver stock awaiting count approval', () => { const t = h(); t.cash(); t.order(); t.count(); expect(() => t.run({ type: 'line.fulfill', line_id: t.state.orders[0]!.lines[0]!.id, expected_version: 1, quantity: 1 }, 'mozo')).toThrow('conteo'); });
  it('permits another SKU while one is counted', () => { const t = h(); t.cash(); t.count(); t.order([4], 1); expect(t.state.stock[1]!.reserved).toBe(1); });
  it('permits pending cancellation then recount/approval without fabricated stock', () => {
    const t = h(); t.cash(); t.order(); const first = t.count().entity_id; t.voidLine(3);
    expect(() => t.adjust(first)).toThrow('cambió'); const second = t.count().entity_id;
    expect(t.state.inventory_counts[0]).toMatchObject({ status: 'superseded', superseded_by: second }); expect(t.state.inventory_counts[0]!.lines[0]!.counted_quantity).toBe(2);
    t.adjust(second); expect(t.state.stock[0]).toMatchObject({ on_hand: 2, reserved: 2, available: 0 });
    t.run({ type: 'line.fulfill', line_id: t.state.orders[0]!.lines[0]!.id, expected_version: t.state.orders[0]!.lines[0]!.version, quantity: 2 }, 'mozo'); expect(t.state.stock[0]).toMatchObject({ on_hand: 0, reserved: 0 });
  });
  it('does not reintegrate physical units during pending count', () => {
    const t = h(); t.cash(); t.order([3], 1); t.run({ type: 'line.fulfill', line_id: t.state.orders[0]!.lines[0]!.id, expected_version: 1, quantity: 1 }, 'mozo'); t.count(47);
    expect(() => t.voidLine(1, true)).toThrow('conteo');
  });
  it('requires full coverage when replacing multi-SKU declaration', () => { const t = h(); t.cash(); t.count(48, [0, 1]); const before = structuredClone(t.state); expect(() => t.count(47, [0])).toThrow('todos'); expect(t.state).toEqual(before); });
  it('cannot approve a superseded declaration', () => { const t = h(); t.cash(); const first = t.count().entity_id; t.count(); expect(() => t.adjust(first)).toThrow('sustituido'); });
  it('records current business day on a new count', () => { const t = h(); t.cash(); t.count(); expect((t.state.inventory_counts[0] as any).business_day_id).toBe(t.state.business_day.id); });
  it('does not guess the day of legacy counts', () => { const t = h(); t.cash(); t.count(); delete (t.state.inventory_counts[0] as any).business_day_id; expect(() => t.adjust()).toThrow('día'); });
  it('does not approve after the business day closes', () => { const t = h(); t.cash(); t.count(); t.close(); const before = structuredClone(t.state); expect(() => t.adjust()).toThrow('cerrado'); expect(t.state).toEqual(before); });
  it('requires reason even for zero-difference approval', () => { const t = h(); t.cash(); t.count(48); expect(() => t.adjust(undefined, 'x')).toThrow('motivo'); });
  it('cashier cannot count stock of Heladería', () => { const t = h(); t.cash(); expect(() => t.count(20, [3])).toThrow('Caja'); });
  it('prevents overlapping handover over a declared count', () => { const t = h(); t.cash(); t.count(); expect(() => t.begin()).toThrow('conteo'); });
  it('does not freeze unrelated station count during beverage handover', () => { const t = h(); t.cash(); t.begin(); t.count(20, [3], 'admin'); expect(t.state.inventory_counts).toHaveLength(1); });
  it('carries pending count IDs on provisional close without resolving them', () => { const t = h(); t.cash(); const count = t.count().entity_id; t.close(); expect((t.state.day_closes[0] as any).pending_inventory_count_ids).toEqual([count]); expect(t.state.inventory_counts[0]!.status).toBe('declared'); expect(t.state.day_closes[0]!.reconciliation_notes.join(' ')).toContain('conteos'); });
});
