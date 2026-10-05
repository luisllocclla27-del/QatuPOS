import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../services/commerce/src/app.js';
import { testDatabase, tenant, branch } from '../support/database.js';
let db: Awaited<ReturnType<typeof testDatabase>>, app: Awaited<ReturnType<typeof createApp>>;
beforeAll(async () => { db = await testDatabase(); app = await createApp(db.pool, false); }, 30000);
beforeEach(async () => { await db.reset(); }); afterAll(async () => { await app?.close(); await db?.close(); }, 30000);
async function login(user: string) { const r = await app.inject({ method: 'POST', url: '/v1/pos/session', payload: { username: user, password: 'QatuDemo2026!' } }); expect(r.statusCode).toBe(200); return { cookie: r.cookies[0]!.name + '=' + r.cookies[0]!.value, csrf: r.json().csrf_token }; }
async function send(a: Awaited<ReturnType<typeof login>>, body: any) { return app.inject({ method: 'POST', url: '/v1/pos/commands', headers: { cookie: a.cookie, 'x-csrf-token': a.csrf }, payload: { operation_id: randomUUID(), ...body } }); }
async function raw() { return (await db.pool.query('SELECT state FROM branch_state WHERE tenant_id=$1 AND branch_id=$2', [tenant, branch])).rows[0].state; }
async function setup(shift = 'diurno', opening = 0) {
  const w = await login('mozo'), c = await login(shift === 'diurno' ? 'caja' : 'noche'), admin = await login('admin'), kitchen = await login('cocina'), s = await raw();
  expect((await send(c, { type: 'cash.open', shift_label: shift, opening_minor: opening, expected_day_version: s.business_day.version })).statusCode).toBe(200);
  return { w, c, admin, kitchen };
}
async function quote(w: Awaited<ReturnType<typeof login>>, p = 0) {
  let s = await raw(); if (!s.visits.length) { expect((await send(w, { type: 'table.open', table_id: s.tables[0].id, expected_version: 1 })).statusCode).toBe(200); s = await raw(); }
  const r = await app.inject({ method: 'POST', url: '/v1/pos/quotes', headers: { cookie: w.cookie }, payload: { visit_id: s.visits[0].id, lines: [{ product_id: s.products[p].id, quantity: 1 }] } }); return r;
}
async function order(w: Awaited<ReturnType<typeof login>>, p = 0) { const q = await quote(w, p); expect(q.statusCode).toBe(200); const s = await raw(); const r = await send(w, { type: 'order.create', visit_id: s.visits[0].id, expected_version: s.visits[0].version, quote_id: q.json().quote_id }); expect(r.statusCode).toBe(200); return r; }
function closing(s: any, counted: number) { const c = s.cash_sessions.at(-1); return { cash_session_id: c.id, expected_version: c.version, expected_day_version: s.business_day.version, counted_cash_minor: counted, stock_counts: s.stock.filter((x: any) => x.station === 'caja').map((x: any) => ({ stock_item_id: x.id, counted_quantity: x.on_hand })), reason: 'Cierre nocturno sintético' }; }
async function noEffects(op: string, before: any) { expect(await raw()).toEqual(before); for (const table of ['command_operations', 'outbox']) expect(Number((await db.pool.query(`SELECT count(*) FROM ${table} WHERE operation_id=$1`, [op])).rows[0].count)).toBe(0); }
describe('014 PostgreSQL real operation', () => {
  it('serializes two claimants and denies non-owner delivery without effects', async () => {
    const t = await setup(); await order(t.w); let s = await raw(), l = s.orders[0].lines[0];
    expect((await send(t.kitchen, { type: 'line.prepare', line_id: l.id, expected_version: l.version, quantity: 1 })).statusCode).toBe(200);
    s = await raw(); l = s.orders[0].lines[0]; const command = { type: 'line.claim', line_id: l.id, expected_version: l.version, quantity: 1, action: 'claim', reason: 'Retiro coordinado de plato' };
    const rs = await Promise.all([send(t.w, command), send(t.c, command)]); expect(rs.map(r => r.statusCode).sort()).toEqual([200, 409]);
    const loser = rs[0].statusCode === 200 ? t.c : t.w, before = await raw(), op = randomUUID();
    const r = await send(loser, { type: 'line.fulfill', line_id: l.id, expected_version: before.orders[0].lines[0].version, quantity: 1, operation_id: op }); expect(r.json().error.code).toBe('DISPATCH_CLAIMED'); await noEffects(op, before);
  });
  it('replays urgency once without duplicating station order/reservation', async () => {
    const t = await setup(); await order(t.w); const before = await raw(); const command = { type: 'order.priority', operation_id: randomUUID(), order_id: before.orders[0].id, expected_version: 1, priority: 'urgent', reason: 'Incidencia verificada por mozo' };
    const a = await send(t.w, command), b = await send(t.w, command); expect(a.statusCode).toBe(200); expect(b.json().replayed).toBe(true);
    const after = await raw(); expect(after.orders).toHaveLength(1); expect(after.print_jobs).toHaveLength(2); expect(after.print_jobs[0]).toEqual(before.print_jobs[0]); expect(after.checks).toEqual(before.checks);
    const foreign = await login('otro_mozo'); expect((await send(foreign, { ...command, operation_id: randomUUID() })).statusCode).toBe(404); expect(await raw()).toEqual(after);
  });
  it('rejects daytime quote after nocturnal transfer without consuming quote', async () => {
    const t = await setup(); const q = await quote(t.w); expect(q.statusCode).toBe(200); let s = await raw(); const h = await send(t.c, { type: 'handover.begin', cash_session_id: s.cash_sessions[0].id, expected_version: s.cash_sessions[0].version, incoming_user_id: s.staff.find((u: any) => u.username === 'noche').id }); expect(h.statusCode).toBe(200);
    s = await raw(); expect((await send(t.c, { type: 'handover.count', handover_id: h.json().entity_id, expected_version: 1, counted_cash_minor: 0, stock_counts: closing(s, 0).stock_counts })).statusCode).toBe(200);
    const night = await login('noche'); expect((await send(night, { type: 'handover.accept', handover_id: h.json().entity_id, expected_version: 2 })).statusCode).toBe(200);
    const before = await raw(), op = randomUUID(), r = await send(t.w, { type: 'order.create', operation_id: op, visit_id: before.visits[0].id, expected_version: before.visits[0].version, quote_id: q.json().quote_id }); expect(r.json().error.code).toBe('SERVICE_MODE_RESTRICTED'); await noEffects(op, before);
    expect((await db.pool.query('SELECT consumed_at FROM order_quotes WHERE id=$1', [q.json().quote_id])).rows[0].consumed_at).toBeNull();
  });
  it('QR sees only night beverages and cannot submit a daytime food quote', async () => {
    const t = await setup(); await quote(t.w); let s = await raw(); expect((await send(t.w, { type: 'guest.access', visit_id: s.visits[0].id, expected_version: s.visits[0].version, action: 'activate', reason: 'Atención mesa cliente QR' })).statusCode).toBe(200);
    const code = await app.inject({ url: `/v1/pos/guest-access/${s.visits[0].id}`, headers: { cookie: t.w.cookie } }); expect(code.statusCode).toBe(200);
    const joined = await app.inject({ method: 'POST', url: '/v1/guest/session', payload: { code: code.json().code } }); expect(joined.statusCode).toBe(200); const cookie = joined.cookies[0]!.name + '=' + joined.cookies[0]!.value;
    const q = await app.inject({ method: 'POST', url: '/v1/guest/quotes', headers: { cookie }, payload: { lines: [{ product_id: s.products[0].id, quantity: 1 }] } }); expect(q.statusCode).toBe(200);
    s = await raw(); const hand = await send(t.c, { type: 'handover.begin', cash_session_id: s.cash_sessions[0].id, expected_version: s.cash_sessions[0].version, incoming_user_id: s.staff.find((u: any) => u.username === 'noche').id }); expect(hand.statusCode).toBe(200);
    expect((await send(t.c, { type: 'handover.count', handover_id: hand.json().entity_id, expected_version: 1, counted_cash_minor: 0, stock_counts: closing(s, 0).stock_counts })).statusCode).toBe(200);
    expect((await send(await login('noche'), { type: 'handover.accept', handover_id: hand.json().entity_id, expected_version: 2 })).statusCode).toBe(200);
    const view = await app.inject({ url: '/v1/guest/snapshot', headers: { cookie } }); expect(view.statusCode).toBe(200); expect(view.json().products).toHaveLength(3); expect(view.json().service_mode).toBe('beverages_only'); expect(view.json()).not.toHaveProperty('cash_close_approvals');
    const op = randomUUID(), before = await raw(), r = await app.inject({ method: 'POST', url: '/v1/guest/orders', headers: { cookie, 'x-csrf-token': joined.json().csrf_token }, payload: { operation_id: op, expected_version: before.visits[0].version, quote_id: q.json().quote_id } }); expect(r.statusCode).toBe(409); expect(r.json().error.code).toBe('SERVICE_MODE_RESTRICTED'); await noEffects(op, before);
  });
  it('requires independent cash signature then final closes once without accepting fiscal state', async () => {
    const t = await setup('nocturno', 10000); let s = await raw(), op = randomUUID(); const denied = await send(t.c, { type: 'day.close', mode: 'operational_final', operation_id: op, ...closing(s, 9000) }); expect(denied.json().error.code).toBe('DISCREPANCY_APPROVAL_REQUIRED'); await noEffects(op, s);
    const approval = await send(t.admin, { type: 'cash.close.approve', ...closing(s, 9000) }); expect(approval.statusCode).toBe(200); s = await raw();
    const command = { type: 'day.close', mode: 'operational_final', operation_id: randomUUID(), ...closing(s, 9000), approval_id: approval.json().entity_id }; expect((await send(t.c, command)).statusCode).toBe(200); expect((await send(t.c, command)).json().replayed).toBe(true);
    s = await raw(); expect(s.day_closes).toHaveLength(1); expect(s.day_closes[0]).toMatchObject({ state: 'provisionally_closed', operational_status: 'reconciled', cash_difference_minor: -1000 });
    expect((await app.inject({ url: '/v1/pos/snapshot', headers: { cookie: t.w.cookie } })).json().cash_close_approvals).toEqual([]);
  });
  it('serializes signed final closure vs another cash movement', async () => {
    const t = await setup('nocturno', 10000); let s = await raw(); const a = await send(t.admin, { type: 'cash.close.approve', ...closing(s, 9000) }); expect(a.statusCode).toBe(200); s = await raw();
    const rs = await Promise.all([send(t.c, { type: 'day.close', mode: 'operational_final', ...closing(s, 9000), approval_id: a.json().entity_id }), send(t.c, { type: 'cash.move', cash_session_id: s.cash_sessions[0].id, expected_version: s.cash_sessions[0].version, kind: 'paid_in', amount_minor: 1, reason: 'Entrada externa posterior' })]);
    expect(rs.map(r => r.statusCode).sort()).toEqual([200, 409]); const after = await raw(); if (rs[0].statusCode === 200) { expect(after.cash_movements).toHaveLength(0); expect(after.cash_sessions[0].state).toBe('closed'); } else { expect(after.day_closes).toHaveLength(0); expect(after.cash_sessions[0].state).toBe('open'); }
  });
});


describe('014 transfer recovery atomicity', () => {
  async function cut() { const t = await setup(); let s = await raw(); const b = await send(t.c, { type: 'handover.begin', cash_session_id: s.cash_sessions[0].id, expected_version: s.cash_sessions[0].version, incoming_user_id: s.staff.find((u: any) => u.username === 'noche').id }); expect(b.statusCode).toBe(200); s = await raw(); expect((await send(t.c, { type: 'handover.count', handover_id: b.json().entity_id, expected_version: 1, counted_cash_minor: 0, stock_counts: closing(s, 0).stock_counts })).statusCode).toBe(200); return t; }
  it('cancel conserves observations and replays once; cross tenant and custodians cannot cancel', async () => { const t = await cut(); const before = await raw(), body = { type: 'handover.cancel', handover_id: before.handovers[0].id, expected_version: 2, reason: 'Recontar sin cambiar custodia' }; let op = randomUUID(); expect((await send(t.c, { ...body, operation_id: op })).statusCode).toBe(403); await noEffects(op, before); op = randomUUID(); expect((await send(await login('otro_admin'), { ...body, operation_id: op })).statusCode).toBe(404); await noEffects(op, before); const command = { ...body, operation_id: randomUUID() }; expect((await send(t.admin, command)).statusCode).toBe(200); expect((await send(t.admin, command)).json().replayed).toBe(true); const s = await raw(); expect(s.handovers[0]).toMatchObject({ state: 'cancelled', stock_lines: before.handovers[0].stock_lines }); expect(s.cash_sessions).toHaveLength(1); expect(s.cash_sessions[0]).toMatchObject({ state: 'open', owner_id: before.cash_sessions[0].owner_id }); expect(s.stock).toEqual(before.stock); expect(s.cash_movements).toEqual(before.cash_movements); });
  it('accept racing cancel yields a single transition and cannot cancel an accepted transfer', async () => { const t = await cut(); const night = await login('noche'), before = await raw(), rs = await Promise.all([send(t.admin, { type: 'handover.cancel', handover_id: before.handovers[0].id, expected_version: 2, reason: 'Revisar corte con saliente' }), send(night, { type: 'handover.accept', handover_id: before.handovers[0].id, expected_version: 2 })]); expect(rs.map(x => x.statusCode).sort()).toEqual([200, 409]); const s = await raw(); expect(s.cash_sessions).toHaveLength(rs[0].statusCode === 200 ? 1 : 2); expect(s.handovers[0].state).toBe(rs[0].statusCode === 200 ? 'cancelled' : 'accepted'); const op = randomUUID(); expect((await send(t.admin, { type: 'handover.cancel', operation_id: op, handover_id: s.handovers[0].id, expected_version: s.handovers[0].version, reason: 'No puede cancelar otra vez' })).statusCode).toBe(409); await noEffects(op, s); });
});
