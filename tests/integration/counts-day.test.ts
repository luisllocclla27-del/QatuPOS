import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../services/commerce/src/app.js';
import { testDatabase, tenant, branch } from '../support/database.js';
let db: Awaited<ReturnType<typeof testDatabase>>, app: Awaited<ReturnType<typeof createApp>>;
beforeAll(async () => { db = await testDatabase(); app = await createApp(db.pool, false); }, 30000);
beforeEach(async () => { await db.reset(); }); afterAll(async () => { await app?.close(); await db?.close(); }, 30000);
async function login(username: string) { const r = await app.inject({ method: 'POST', url: '/v1/pos/session', payload: { username, password: 'QatuDemo2026!' } }); expect(r.statusCode).toBe(200); return { cookie: r.cookies[0]!.name + '=' + r.cookies[0]!.value, csrf: r.json().csrf_token }; }
async function send(a: Awaited<ReturnType<typeof login>>, body: any) { return app.inject({ method: 'POST', url: '/v1/pos/commands', headers: { cookie: a.cookie, 'x-csrf-token': a.csrf }, payload: { operation_id: randomUUID(), ...body } }); }
async function raw() { return (await db.pool.query('SELECT state FROM branch_state WHERE tenant_id=$1 AND branch_id=$2', [tenant, branch])).rows[0].state; }
async function setup(qty = 5) {
  const c = await login('caja'), w = await login('mozo'), admin = await login('admin'), s = await raw();
  expect((await send(c, { type: 'cash.open', opening_minor: 0, shift_label: 'diurno', expected_day_version: s.business_day.version })).statusCode).toBe(200);
  expect((await send(w, { type: 'table.open', table_id: s.tables[0].id, expected_version: 1 })).statusCode).toBe(200); const state = await raw();
  const q = await app.inject({ method: 'POST', url: '/v1/pos/quotes', headers: { cookie: w.cookie }, payload: { visit_id: state.visits[0].id, lines: [{ product_id: s.products[3].id, quantity: qty }] } }); expect(q.statusCode).toBe(200);
  return { c, w, admin, q: q.json(), state };
}
const orderBody = (t: Awaited<ReturnType<typeof setup>>) => ({ type: 'order.create', visit_id: t.state.visits[0].id, expected_version: t.state.visits[0].version, quote_id: t.q.quote_id });
async function count(c: Awaited<ReturnType<typeof login>>, qty: number) { const s = await raw(); return send(c, { type: 'inventory.count', reason: 'Conteo físico sintético', lines: [{ stock_item_id: s.stock[0].id, expected_version: s.stock[0].version, counted_quantity: qty }] }); }
describe('013 PG atomic review', () => {
  it('does not freeze another tenant with the same seeded SKU IDs or approve its foreign count', async () => {
    const t = await setup(); const declared = await count(t.c, 2); expect(declared.statusCode).toBe(200);
    const otherCash = await login('otro_caja'), otherWaiter = await login('otro_mozo'), otherAdmin = await login('otro_admin');
    const other = (await app.inject({ url: '/v1/pos/snapshot', headers: { cookie: otherCash.cookie } })).json();
    expect(other.stock[0].id).toBe(t.state.stock[0].id);
    expect((await send(otherCash, { type: 'cash.open', opening_minor: 0, shift_label: 'diurno', expected_day_version: other.business_day.version })).statusCode).toBe(200);
    const opened = await send(otherWaiter, { type: 'table.open', table_id: other.tables[0].id, expected_version: 1 }); expect(opened.statusCode).toBe(200);
    const v = opened.json().snapshot.visits[0], q = await app.inject({ method: 'POST', url: '/v1/pos/quotes', headers: { cookie: otherWaiter.cookie }, payload: { visit_id: v.id, lines: [{ product_id: other.products[3].id, quantity: 1 }] } }); expect(q.statusCode).toBe(200);
    expect((await send(otherWaiter, { type: 'order.create', visit_id: v.id, expected_version: v.version, quote_id: q.json().quote_id })).statusCode).toBe(200);
    const before = await raw(), denied = await send(otherAdmin, { type: 'inventory.adjust', inventory_count_id: declared.json().entity_id, approval_reason: 'No debe cruzar empresa' }); expect(denied.statusCode).toBe(404); expect(await raw()).toEqual(before);
    expect(before.stock[0].reserved).toBe(0); expect(before.inventory_counts[0].status).toBe('declared');
  });
  it('holds stock after count and rejects effect with no operation/outbox', async () => {
    const t = await setup(); expect((await count(t.c, 2)).statusCode).toBe(200); const before = await raw(), id = randomUUID();
    const r = await send(t.w, { ...orderBody(t), operation_id: id }); expect(r.statusCode).toBe(409); expect(r.json().error.code).toBe('RESOURCE_COUNTING'); expect(await raw()).toEqual(before);
    for (const table of ['command_operations', 'outbox']) expect(Number((await db.pool.query(`SELECT count(*) FROM ${table} WHERE operation_id=$1`, [id])).rows[0].count)).toBe(0);
  });
  it('preserves shortage count and original reservations on denied approval', async () => {
    const t = await setup(); expect((await send(t.w, orderBody(t))).statusCode).toBe(200); const counted = await count(t.c, 2); expect(counted.statusCode).toBe(200); const before = await raw(), op = randomUUID();
    const r = await send(t.admin, { type: 'inventory.adjust', operation_id: op, inventory_count_id: counted.json().entity_id, approval_reason: 'Revisión sintética' }); expect(r.statusCode).toBe(409); expect(r.json().error.code).toBe('STOCK_RESERVATIONS_EXCEED_COUNT'); expect(await raw()).toEqual(before);
    expect(Number((await db.pool.query('SELECT count(*) FROM outbox WHERE operation_id=$1', [op])).rows[0].count)).toBe(0);
  });
  it('serializes count vs existing quote and never delivers a held SKU', async () => {
    const t = await setup(); const results = await Promise.all([count(t.c, 2), send(t.w, orderBody(t))]); expect(results[0].statusCode).toBe(200); expect([200, 409]).toContain(results[1].statusCode);
    const s = await raw(); expect(s.inventory_counts[0].status).toBe('declared'); expect(s.stock[0].on_hand).toBe(48); expect(s.stock[0].reserved).toBe(s.orders.length ? 5 : 0);
    if (s.orders.length) { const r = await send(t.w, { type: 'line.fulfill', line_id: s.orders[0].lines[0].id, expected_version: 1, quantity: 1 }); expect(r.statusCode).toBe(409); expect(r.json().error.code).toBe('RESOURCE_COUNTING'); }
    else expect(results[1].json().error.code).toBe('RESOURCE_COUNTING');
  });
  it('recounts once, supersedes history and restores available only after independent review', async () => {
    const t = await setup(); const first = await count(t.c, 2); expect(first.statusCode).toBe(200); const second = await count(t.c, 48); expect(second.statusCode).toBe(200); let s = await raw();
    expect(s.inventory_counts[0].status).toBe('superseded'); expect(s.inventory_counts[0].lines[0].counted_quantity).toBe(2);
    expect((await send(t.w, orderBody(t))).statusCode).toBe(409);
    const body = { type: 'inventory.adjust', operation_id: randomUUID(), inventory_count_id: second.json().entity_id, approval_reason: 'Reconteo verificado' };
    expect((await send(t.admin, body)).statusCode).toBe(200); const replay = await send(t.admin, body); expect(replay.json().replayed).toBe(true);
    expect((await send(t.w, orderBody(t))).statusCode).toBe(200); s = await raw(); expect(s.stock[0].reserved).toBe(5); expect(s.inventory_counts[1].status).toBe('adjusted');
  });
  it('does not alter prior day check or close through ordinary discount', async () => {
    const t = await setup(); expect((await send(t.w, orderBody(t))).statusCode).toBe(200); let s = await raw(); const cash = s.cash_sessions[0];
    expect((await send(t.c, { type: 'day.close', cash_session_id: cash.id, expected_version: cash.version, expected_day_version: s.business_day.version, counted_cash_minor: 0, stock_counts: s.stock.filter((x: any) => x.station === 'caja').map((x: any) => ({ stock_item_id: x.id, counted_quantity: x.on_hand })), reason: 'Cierre con saldo pendiente' })).statusCode).toBe(200);
    s = await raw(); expect((await send(t.admin, { type: 'day.open', expected_day_version: s.business_day.version, reason: 'Abrir siguiente día' })).statusCode).toBe(200); const before = await raw();
    const r = await send(t.c, { type: 'check.discount.apply', check_id: before.checks[0].id, expected_version: before.checks[0].version, kind: 'fixed', amount_minor: 100, reason: 'Cambiar consumo anterior' }); expect(r.statusCode).toBe(409); expect(r.json().error.code).toBe('BUSINESS_DAY_LOCKED'); expect(await raw()).toEqual(before);
  });
});
