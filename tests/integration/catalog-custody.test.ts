import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../services/commerce/src/app.js';
import { testDatabase, tenant, branch } from '../support/database.js';
let db: Awaited<ReturnType<typeof testDatabase>>, app: Awaited<ReturnType<typeof createApp>>;
beforeAll(async () => { db = await testDatabase(); app = await createApp(db.pool, false); }, 30000);
beforeEach(async () => { await db.reset(); });
afterAll(async () => { await app?.close(); await db?.close(); }, 30000);
async function login(name = 'admin') {
  const r = await app.inject({ method: 'POST', url: '/v1/pos/session', payload: { username: name, password: 'QatuDemo2026!' } });
  expect(r.statusCode).toBe(200); return { cookie: r.cookies[0]!.name + '=' + r.cookies[0]!.value, csrf: r.json().csrf_token };
}
async function send(w: Awaited<ReturnType<typeof login>>, payload: any) { return app.inject({ method: 'POST', url: '/v1/pos/commands', headers: { cookie: w.cookie, 'x-csrf-token': w.csrf }, payload: { operation_id: randomUUID(), ...payload } }); }
async function raw() { return (await db.pool.query('SELECT state FROM branch_state WHERE tenant_id=$1 AND branch_id=$2', [tenant, branch])).rows[0].state; }
const create = (s: any, extra: any = {}) => ({ type: 'catalog.product.create', name: 'Oferta sintética', category: 'Bebidas', price_minor: 1200, station: 'caja', stock_policy: 'unit', stock_item_id: s.stock[0].id, reason: 'Alta de prueba', ...extra });

describe('012 catalog/custody PostgreSQL', () => {
  it('serializes competing product IDs and recovers the winner without another effect', async () => {
    const a = await login(), s = await raw(), id = randomUUID(), bodies = [0, 1].map(() => ({ ...create(s, { product_id: id }), operation_id: randomUUID() }));
    const results = await Promise.all(bodies.map(body => send(a, body)));
    expect(results.map(r => r.statusCode).sort()).toEqual([200, 409]);
    const loser = results.find(r => r.statusCode === 409)!; expect(loser.json().error.code).toBe('PRODUCT_ID_CONFLICT');
    const winnerIndex = results.findIndex(r => r.statusCode === 200), replay = await send(a, bodies[winnerIndex]);
    expect(replay.statusCode).toBe(200); expect(replay.json().replayed).toBe(true);
    expect((await raw()).products.filter((p: any) => p.id === id)).toHaveLength(1);
    for (const table of ['catalog_audit', 'command_operations', 'outbox']) expect(Number((await db.pool.query(`SELECT count(*) FROM ${table}`)).rows[0].count)).toBe(1);
  });
  it('rejects incompatible SKU with no durable effect and protects another tenant', async () => {
    const a = await login(), before = await raw();
    const r = await send(a, create(before, { station: 'heladeria' })); expect(r.statusCode).toBe(400); expect(r.json().error.code).toBe('VALIDATION_ERROR');
    expect(await raw()).toEqual(before);
    expect(Number((await db.pool.query('SELECT count(*) FROM outbox')).rows[0].count)).toBe(0);
    const other = await login('otro_admin'), otherState = (await app.inject({ url: '/v1/pos/snapshot', headers: { cookie: other.cookie } })).json();
    const id = before.products[0].id;
    const uniqueOther = await send(other, create(otherState, { product_id: randomUUID() })); expect(uniqueOther.statusCode).toBe(200);
    expect(await raw()).toEqual(before);
    // Same ID is already present only in each tenant's seed; no cross-scope mutation.
    const denied = await send(a, create(before, { product_id: id })); expect(denied.statusCode).toBe(409);
  });
  it('persists complete binding audit and rejects stale edits atomically', async () => {
    const a = await login(), s = await raw(), p = s.products[0], body = { type: 'catalog.product.update', product_id: p.id, expected_version: p.version, name: p.name, category: p.category, price_minor: p.price_minor, active: p.active, station: 'heladeria', stock_policy: 'unit', stock_item_id: s.stock[3].id, reason: 'Cambiar oferta de estación' };
    expect((await send(a, body)).statusCode).toBe(200);
    const changes = (await db.pool.query('SELECT changes FROM catalog_audit')).rows[0].changes;
    expect(changes).toEqual({ station: { old: 'cocina', new: 'heladeria' }, stock_policy: { old: 'none', new: 'unit' }, stock_item_id: { old: null, new: s.stock[3].id } });
    const before = await raw(), stale = await send(a, body); expect(stale.statusCode).toBe(409); expect(stale.json().error.code).toBe('VERSION_CONFLICT'); expect(await raw()).toEqual(before);
    expect(Number((await db.pool.query('SELECT count(*) FROM catalog_audit')).rows[0].count)).toBe(1);
  });
  it('blocks reservation void during handover and leaves operations/outbox untouched', async () => {
    const w = await login('mozo'), c = await login('caja'), s = await raw();
    const opened = await send(w, { type: 'table.open', table_id: s.tables[0].id, expected_version: 1 }); expect(opened.statusCode).toBe(200);
    const v = opened.json().snapshot.visits[0];
    const q = await app.inject({ method: 'POST', url: '/v1/pos/quotes', headers: { cookie: w.cookie }, payload: { visit_id: v.id, lines: [{ product_id: s.products[3].id, quantity: 1 }] } }); expect(q.statusCode).toBe(200);
    expect((await send(w, { type: 'order.create', visit_id: v.id, expected_version: 1, quote_id: q.json().quote_id })).statusCode).toBe(200);
    const cash = await send(c, { type: 'cash.open', opening_minor: 0, shift_label: 'diurno', expected_day_version: s.business_day.version }); expect(cash.statusCode).toBe(200);
    const openedCash = cash.json().snapshot.cash_sessions[0];
    expect((await send(c, { type: 'handover.begin', cash_session_id: openedCash.id, expected_version: openedCash.version, incoming_user_id: s.staff.find((u: any) => u.username === 'noche').id })).statusCode).toBe(200);
    const before = await raw(), operation = randomUUID(), r = await send(c, { type: 'order.line.void', operation_id: operation, line_id: before.orders[0].lines[0].id, expected_version: before.visits[0].version, quantity: 1, restore_stock: false, reason: 'Anular durante conteo' });
    expect(r.statusCode).toBe(409); expect(r.json().error.code).toBe('RESOURCE_COUNTING'); expect(await raw()).toEqual(before);
    for (const table of ['command_operations', 'outbox', 'order_void_audit']) expect(Number((await db.pool.query(`SELECT count(*) FROM ${table} WHERE operation_id=$1`, [operation])).rows[0].count)).toBe(0);
  });
});
