import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createInitialState, executeCommand, createDomainQuote, type Actor } from '../../packages/domain/src/index.js';
import type { PosCommand, Product } from '@qatu/contracts';

function harness() {
  let state = createInitialState({ tenant_id: 'synthetic', branch_id: 'local' });
  const now = '2026-10-03T15:00:00Z';
  const actor = (name = 'admin'): Actor => ({ tenant_id: state.tenant_id, branch_id: state.branch.id, user: state.staff.find(u => u.username === name)! });
  const run = (input: any, name = 'admin', quote?: any) => {
    const result = executeCommand(state, actor(name), { ...input, operation_id: randomUUID() } as PosCommand, { now, id: randomUUID, ...(quote ? { quote } : {}) });
    state = result.state; return result;
  };
  const create = (extra: any = {}) => run({ type: 'catalog.product.create', name: 'Oferta sintética', category: 'Bebidas', price_minor: 1200, station: 'caja', stock_policy: 'unit', stock_item_id: state.stock[0]!.id, reason: 'Alta sintética', ...extra });
  const update = (product: Product, extra: any = {}) => run({ type: 'catalog.product.update', product_id: product.id, expected_version: product.version, name: product.name, category: product.category, price_minor: product.price_minor, active: product.active, reason: 'Corrección sintética', ...extra });
  const order = (indices = [3], quantity = 1) => {
    if (!state.visits.length) run({ type: 'table.open', table_id: state.tables[0]!.id, expected_version: 1 }, 'mozo');
    const v = state.visits[0]!, q = createDomainQuote(state, v.id, indices.map(i => ({ product_id: state.products[i]!.id, quantity })), now, randomUUID(), actor('mozo'));
    return run({ type: 'order.create', visit_id: v.id, expected_version: v.version, quote_id: q.id }, 'mozo', q);
  };
  const cash = () => run({ type: 'cash.open', opening_minor: 0, shift_label: 'diurno', expected_day_version: state.business_day.version }, 'caja');
  const begin = () => run({ type: 'handover.begin', cash_session_id: state.cash_sessions[0]!.id, expected_version: state.cash_sessions[0]!.version, incoming_user_id: actor('noche').user.id }, 'caja');
  const count = (cashCount = 0) => run({ type: 'handover.count', handover_id: state.handovers[0]!.id, expected_version: state.handovers[0]!.version, counted_cash_minor: cashCount, stock_counts: state.stock.filter(s => s.station === 'caja').map(s => ({ stock_item_id: s.id, counted_quantity: s.on_hand })) }, 'caja');
  const voidLine = (index = 0, restore = false, name = 'caja') => run({ type: 'order.line.void', line_id: state.orders[0]!.lines[index]!.id, expected_version: state.visits[0]!.version, quantity: 1, restore_stock: restore, reason: 'Anulación sintética' }, name);
  return { run, create, update, order, cash, begin, count, voidLine, get state() { return state; } };
}

describe('012 catalog identity and route integrity', () => {
  for (const inactive of [false, true]) it('rejects duplicate identity even when inactive=' + inactive, () => {
    const h = harness(), p = h.state.products[3]!; p.active = !inactive;
    const before = structuredClone(h.state);
    expect(() => h.create({ product_id: p.id })).toThrow('identificador'); expect(h.state).toEqual(before);
  });
  it('rejects stock from another station', () => {
    const h = harness(); expect(() => h.create({ station: 'heladeria' })).toThrow('estación'); expect(h.state.catalog_audit).toHaveLength(0);
  });
  it('compares UUID identity irrespective of letter casing', () => {
    const h = harness(), id = 'abcdefab-0000-4000-8000-000000000001'; h.create({ product_id: id });
    expect(() => h.create({ product_id: id.toUpperCase() })).toThrow('identificador');
  });
  it('two offers sharing a SKU cannot reserve more than its common stock', () => {
    const h = harness(); h.state.stock[0]!.on_hand = 1; h.state.stock[0]!.available = 1; h.create();
    expect(() => h.order([3, 9])).toThrow('stock'); expect(h.state.stock[0]!.reserved).toBe(0); expect(h.state.orders).toHaveLength(0);
  });
  it('rejects explicit null SKU on a unit update', () => {
    const h = harness(); expect(() => h.update(h.state.products[3]!, { stock_item_id: null })).toThrow('no existe');
  });
  it('does not silently discard a stock binding on none policy', () => {
    const h = harness(); expect(() => h.create({ stock_policy: 'none' })).toThrow('sin control');
  });
  it('accepts stocked ice cream at Heladería', () => {
    const h = harness(), r = h.create({ station: 'heladeria', stock_item_id: h.state.stock[3]!.id });
    expect(h.state.products.find(p => p.id === r.entity_id)!.station).toBe('heladeria');
  });
  it('changes and audits SKU even if stock_policy is omitted', () => {
    const h = harness(), p = h.state.products[3]!, old = p.stock_item_id, next = h.state.stock[1]!.id;
    h.update(p, { stock_item_id: next });
    expect(h.state.products[3]!.stock_item_id).toBe(next);
    expect(h.state.catalog_audit[0]!.changes).toEqual({ stock_item_id: { old, new: next } });
  });
  it('audits the entire operational binding before changing it', () => {
    const h = harness(), p = h.state.products[0]!, stock = h.state.stock[3]!.id;
    h.update(p, { station: 'heladeria', stock_policy: 'unit', stock_item_id: stock });
    expect(h.state.catalog_audit[0]!.changes).toEqual({ station: { old: 'cocina', new: 'heladeria' }, stock_policy: { old: 'none', new: 'unit' }, stock_item_id: { old: null, new: stock } });
  });
  it('clears and audits omitted SKU when unit changes to none', () => {
    const h = harness(), p = h.state.products[3]!, old = p.stock_item_id; h.update(p, { stock_policy: 'none' });
    expect(h.state.products[3]!.stock_item_id).toBeNull();
    expect(h.state.catalog_audit[0]!.changes).toEqual({ stock_policy: { old: 'unit', new: 'none' }, stock_item_id: { old, new: null } });
  });
  it('preserves binding when all route fields are omitted', () => {
    const h = harness(), p = h.state.products[3]!; h.update(p, { name: 'Nombre corregido' }); expect(h.state.products[3]!.stock_item_id).toBe(p.stock_item_id);
  });
  it('rejects contradictory update without changing state', () => {
    const h = harness(), before = structuredClone(h.state);
    expect(() => h.update(h.state.products[3]!, { stock_policy: 'none', stock_item_id: h.state.stock[0]!.id })).toThrow('sin control'); expect(h.state).toEqual(before);
  });
  it('locks routing after a completely voided commercial order', () => {
    const h = harness(); h.order(); h.voidLine();
    expect(() => h.update(h.state.products[3]!, { stock_item_id: h.state.stock[1]!.id })).toThrow('historial');
  });
  it('price/name edits leave accepted lines, reservations and tickets intact', () => {
    const h = harness(); h.order([7]); const orders = structuredClone(h.state.orders), stock = structuredClone(h.state.stock), jobs = structuredClone(h.state.print_jobs);
    h.update(h.state.products[7]!, { price_minor: 900, name: 'Helado actualizado' });
    expect(h.state.orders).toEqual(orders); expect(h.state.stock).toEqual(stock); expect(h.state.print_jobs).toEqual(jobs);
  });
});

describe('012 cancellations during beverage custody handover', () => {
  for (const phase of ['prepared', 'declared', 'disputed']) it('blocks reserve release during ' + phase, () => {
    const h = harness(); h.order(); h.cash(); h.begin();
    if (phase !== 'prepared') h.count();
    if (phase === 'disputed') h.run({ type: 'handover.reject', handover_id: h.state.handovers[0]!.id, expected_version: h.state.handovers[0]!.version, reason: 'Revisar custodia' }, 'noche');
    expect(h.state.handovers[0]!.state).toBe(phase);
    const before = structuredClone(h.state); expect(() => h.voidLine()).toThrow('traspaso'); expect(h.state).toEqual(before);
  });
  it('blocks physical stock return during a count', () => {
    const h = harness(); h.order(); h.cash(); h.run({ type: 'line.fulfill', line_id: h.state.orders[0]!.lines[0]!.id, expected_version: 1, quantity: 1 }, 'mozo'); h.begin();
    const before = structuredClone(h.state); expect(() => h.voidLine(0, true)).toThrow('traspaso'); expect(h.state).toEqual(before);
  });
  it('allows commercial void of an entirely delivered beverage without return', () => {
    const h = harness(); h.order(); h.cash(); h.run({ type: 'line.fulfill', line_id: h.state.orders[0]!.lines[0]!.id, expected_version: 1, quantity: 1 }, 'mozo'); h.begin();
    const stock = structuredClone(h.state.stock), cash = structuredClone(h.state.cash_sessions); h.voidLine();
    expect(h.state.stock).toEqual(stock); expect(h.state.cash_sessions).toEqual(cash); expect(h.state.checks[0]!.total_minor).toBe(0);
  });
  for (const index of [0, 7]) it('allows cancellation of other station product=' + index, () => {
    const h = harness(); h.order([index]); h.cash(); h.begin(); h.voidLine(); expect(h.state.checks[0]!.total_minor).toBe(0);
    expect(h.state.stock.filter(s => s.station === 'caja').every(s => s.reserved === 0)).toBe(true);
  });
  it('allows reserve release after accepted handover', () => {
    const h = harness(); h.order(); h.cash(); h.begin(); h.count();
    h.run({ type: 'handover.accept', handover_id: h.state.handovers[0]!.id, expected_version: h.state.handovers[0]!.version }, 'noche'); h.voidLine(0, false, 'noche');
    expect(h.state.stock[0]!.reserved).toBe(0); expect(h.state.stock[0]!.on_hand).toBe(48);
  });
});
