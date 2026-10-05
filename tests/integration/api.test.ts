import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../services/commerce/src/app.js';
import { snapshotValid } from '../../services/commerce/src/platform/validation.js';
import { testDatabase, tenant, branch } from '../support/database.js';
import type { CommandResponse, PosCommand, PosSnapshot, SessionResponse, OrderCreateCommand, UUID } from '@qatu/contracts';

type Input<T> = T extends unknown ? Omit<T, 'operation_id'> : never;
type HarnessInput = Input<PosCommand> | (Omit<Input<OrderCreateCommand>, 'quote_id'> & { quote_id?: string });
let db: Awaited<ReturnType<typeof testDatabase>>;
let app: Awaited<ReturnType<typeof createApp>>;
interface Login { cookie:string; csrf:string; user:SessionResponse['user'] }
async function login(username='mozo'):Promise<Login> {
  const r = await app.inject({method:'POST',url:'/v1/pos/session',payload:{username,password:'QatuDemo2026!'}});
  expect(r.statusCode).toBe(200);
  const s = r.json<SessionResponse>();
  return {cookie:r.cookies[0]!.name + '=' + r.cookies[0]!.value,csrf:s.csrf_token,user:s.user};
}
async function view(who:Login) {
  const r=await app.inject({url:'/v1/pos/snapshot',headers:{cookie:who.cookie}});
  expect(r.statusCode).toBe(200); const s=r.json<PosSnapshot>(); expect(snapshotValid(s)).toBe(true); return s;
}
async function quote(who:Login, visitId:string, lines:{product_id:string;quantity:number}[]) {
  return app.inject({
    method: 'POST',
    url: '/v1/pos/quotes',
    headers: { cookie: who.cookie },
    payload: { visit_id: visitId, lines }
  });
}
async function send(who:Login, input:HarnessInput, operation_id: UUID = randomUUID() as UUID) {
  let finalInput: any = input;
  if (input.type === 'order.create' && !('quote_id' in input && input.quote_id) && 'lines' in input && input.lines) {
    const qRes = await quote(who, input.visit_id, input.lines);
    if (qRes.statusCode === 200) {
      (input as any).quote_id = qRes.json().quote_id;
    } else {
      (input as any).quote_id = randomUUID();
    }
    finalInput = input;
  }
  return app.inject({method:'POST',url:'/v1/pos/commands',headers:{cookie:who.cookie,'x-csrf-token':who.csrf},payload:{...finalInput,operation_id}});
}

async function ok(who:Login,input:HarnessInput, operation_id: UUID = randomUUID() as UUID) {
  const r=await send(who,input,operation_id); expect(r.statusCode, r.body).toBe(200); return r.json<CommandResponse>();
}
async function start(who:Login, tableIndex=0, productIndices=[3]) {
  let s=await view(who); const table=s.tables[tableIndex]!;
  let r=await ok(who,{type:'table.open',table_id:table.id,expected_version:table.version});
  const visit=r.snapshot.visits.find(v=>v.id===r.entity_id)!;
  r=await ok(who,{type:'order.create',visit_id:visit.id,expected_version:visit.version,lines:productIndices.map(i=>({product_id:s.products[i]!.id,quantity:1}))});
  return r.snapshot;
}
beforeAll(async()=>{db=await testDatabase();app=await createApp(db.pool,false);},30000);
beforeEach(async()=>{await db.reset();});
afterAll(async()=>{await app?.close();await db?.close();},30000);

describe('PostgreSQL authority via authenticated HTTP',()=>{
  it('rolls back when outbox insertion fails, then recovers the same operation exactly once',async()=>{
    const w=await login();const s=await view(w);const id=randomUUID();
    const input={type:'table.open' as const,table_id:s.tables[0]!.id,expected_version:1};
    await db.pool.query("CREATE FUNCTION reject_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected outbox failure'; END $$");
    await db.pool.query('CREATE TRIGGER outbox_fault BEFORE INSERT ON outbox FOR EACH ROW EXECUTE FUNCTION reject_outbox()');
    try {
      expect((await send(w,input,id)).statusCode).toBe(503);
      expect((await view(w)).version).toBe(s.version);expect((await view(w)).visits).toEqual([]);
      expect((await db.pool.query('SELECT count(*) FROM command_operations')).rows[0].count).toBe('0');
      expect((await db.pool.query('SELECT count(*) FROM outbox')).rows[0].count).toBe('0');
    } finally {await db.pool.query('DROP TRIGGER outbox_fault ON outbox');await db.pool.query('DROP FUNCTION reject_outbox()');}
    expect((await send(w,input,id)).statusCode).toBe(200);expect((await send(w,input,id)).json().replayed).toBe(true);
    expect((await view(w)).visits).toHaveLength(1);
  });
  it('requires a real session, rejects role injection and protects mutations with CSRF/origin',async()=>{
    expect((await app.inject({url:'/v1/pos/snapshot'})).statusCode).toBe(401);
    expect((await app.inject({method:'POST',url:'/v1/pos/session',payload:{username:'admin',password:'wrong'}})).statusCode).toBe(401);
    expect((await app.inject({method:'POST',url:'/v1/pos/session',payload:{username:'mozo',password:'QatuDemo2026!',role:'admin'}})).statusCode).toBe(400);
    const w=await login();const s=await view(w);const payload={type:'table.open',operation_id:randomUUID(),table_id:s.tables[0]!.id,expected_version:1};
    expect((await app.inject({method:'POST',url:'/v1/pos/commands',headers:{cookie:w.cookie},payload})).statusCode).toBe(403);
    expect((await app.inject({method:'POST',url:'/v1/pos/commands',headers:{cookie:w.cookie,'x-csrf-token':w.csrf,origin:'https://evil.invalid'},payload})).statusCode).toBe(403);
    const forbidden=await send(w,{type:'cash.open',opening_minor:0,shift_label:'diurno',expected_day_version:1});expect(forbidden.statusCode).toBe(403);
    expect((await view(w)).cash_sessions).toEqual([]);
  });
  it('never accepts client prices, tenant or branch as authority',async()=>{
    const w=await login();const s=await view(w);
    for(const extra of [{tenant_id:tenant},{branch_id:branch},{price_minor:1}]) {
      const r=await app.inject({method:'POST',url:'/v1/pos/commands',headers:{cookie:w.cookie,'x-csrf-token':w.csrf},payload:{type:'table.open',operation_id:randomUUID(),table_id:s.tables[0]!.id,expected_version:1,...extra}});
      expect(r.statusCode).toBe(400);
    }
    expect((await view(w)).visits).toHaveLength(0);
  });
  it('serializes duplicate commands from two terminals to one state effect and one outbox event',async()=>{
    const w=await login(), w2=await login(); const s=await view(w);const id=randomUUID();const input={type:'table.open' as const,table_id:s.tables[0]!.id,expected_version:1};
    const r=await Promise.all([send(w,input,id),send(w2,input,id)]);expect(r.map(x=>x.statusCode)).toEqual([200,200]);
    expect(r.map(x=>x.json().replayed).sort()).toEqual([false,true]);expect(new Set(r.map(x=>x.json().entity_id)).size).toBe(1);
    const ledger=await db.pool.query('SELECT (SELECT count(*) FROM command_operations) AS commands,(SELECT count(*) FROM outbox) AS events');expect(ledger.rows[0]).toEqual({commands:'1',events:'1'});
    expect((await view(w)).visits).toHaveLength(1);
    expect((await send(w,{...input,expected_version:2},id)).json().error.code).toBe('IDEMPOTENCY_CONFLICT');
    expect((await send(await login('caja'),input,id)).statusCode).toBe(403);
  });
  it('returns a conflict for simultaneous edits and preserves the accepted batch',async()=>{
    const w=await login();let s=await start(w,0,[0]);const visit=s.visits[0]!;
    const input={type:'order.create' as const,visit_id:visit.id,expected_version:visit.version,lines:[{product_id:s.products[1]!.id,quantity:1}]};
    const r=await Promise.all([send(w,input),send(w,input)]);expect(r.map(x=>x.statusCode).sort()).toEqual([200,409]);
    s=await view(w);expect(s.orders).toHaveLength(2);expect(s.checks[0]!.total_minor).toBe(6700);
  });
  it('protects the last beer across orders on different tables under real row locks',async()=>{
    const state=(await db.pool.query('SELECT state FROM branch_state WHERE tenant_id=$1 AND branch_id=$2',[tenant,branch])).rows[0].state;
    state.stock[0].on_hand=1;state.stock[0].available=1;
    await db.pool.query('UPDATE branch_state SET state=$3 WHERE tenant_id=$1 AND branch_id=$2',[tenant,branch,JSON.stringify(state)]);
    const w=await login();const s=await view(w);const visits=[];
    for(const table of s.tables.slice(0,2)) visits.push((await ok(w,{type:'table.open',table_id:table.id,expected_version:1})).entity_id);
    const r=await Promise.all(visits.map(visit_id=>send(w,{type:'order.create',visit_id,expected_version:1,lines:[{product_id:s.products[3]!.id,quantity:1}]})));
    expect(r.map(x=>x.statusCode).sort()).toEqual([200,409]);const final=await view(await login('caja'));expect(final.stock[0]).toMatchObject({on_hand:1,reserved:1,available:0});expect(final.orders).toHaveLength(1);
  });
  it('rolls back a failed mixed order including stock, audit, operation and outbox',async()=>{
    const w=await login();const s=await view(w);const opened=await ok(w,{type:'table.open',table_id:s.tables[0]!.id,expected_version:1});
    const r=await send(w,{type:'order.create',visit_id:opened.entity_id,expected_version:1,lines:[{product_id:s.products[3]!.id,quantity:1},{product_id:randomUUID(),quantity:1}]});expect(r.statusCode).toBe(404);
    const v=await view(await login('caja'));expect(v.stock[0]!.reserved).toBe(0);expect(v.orders).toEqual([]);expect(v.audit).toHaveLength(1);
    expect((await db.pool.query('SELECT count(*) FROM outbox')).rows[0].count).toBe('1');
  });
  it('isolates entity IDs and replay keys even when catalog/table IDs overlap between tenants',async()=>{
    const w=await login();const s=await start(w);const other=await login('otro_mozo');expect((await view(other)).orders).toEqual([]);
    const attempt=await send(other,{type:'order.create',visit_id:s.visits[0]!.id,expected_version:s.visits[0]!.version,lines:[{product_id:s.products[3]!.id,quantity:1}]});expect(attempt.statusCode).toBe(404);
    expect((await view(w)).orders).toHaveLength(1);
  });
  it('persists financial state across API recreation and replays a cash payment only once',async()=>{
    const w=await login(), c=await login('caja');let s=await start(w);
    const cash=(await ok(c,{type:'cash.open',opening_minor:20000,shift_label:'diurno',expected_day_version:1})).entity_id;
    const a=(await ok(c,{type:'collection.authorize',cash_session_id:cash,check_id:s.checks[0]!.id,expected_version:s.checks[0]!.version,method:'cash',amount_minor:1000})).entity_id;
    const id=randomUUID();const input={type:'payment.confirm' as const,authorization_id:a,received_minor:2000};expect((await send(c,input,id)).statusCode).toBe(200);
    await app.close();app=await createApp(db.pool,false);
    const r=await send(c,input,id);expect(r.json().replayed).toBe(true);s=await view(c);
    expect(s.payments).toHaveLength(1);expect(s.payments[0]!.change_minor).toBe(1000);expect(s.cash_sessions[0]!.expected_minor).toBe(21000);expect(s.checks[0]!.paid_minor).toBe(1000);
  });
  it('retains uncertain payment balance across cash handover and confirms in the receiving shift',async()=>{
    const w=await login(), c=await login('caja'), n=await login('noche');let s=await start(w);
    s=(await ok(c,{type:'cash.open',opening_minor:20000,shift_label:'diurno',expected_day_version:1})).snapshot;
    const cash=s.cash_sessions[0]!;const a=(await ok(c,{type:'collection.authorize',cash_session_id:cash.id,check_id:s.checks[0]!.id,expected_version:s.checks[0]!.version,method:'yape',amount_minor:1000})).entity_id;
    s=(await ok(c,{type:'payment.unknown',authorization_id:a,reason:'Aplicación del comercio sin respuesta'})).snapshot;
    expect(s.checks[0]!.held_minor).toBe(1000);
    expect((await send(c,{type:'collection.authorize',cash_session_id:cash.id,check_id:s.checks[0]!.id,expected_version:s.checks[0]!.version,method:'cash',amount_minor:1000})).statusCode).toBe(409);
    const stocks=s.stock.filter(x=>x.station==='caja').map(x=>({stock_item_id:x.id,counted_quantity:x.on_hand!}));
    s=(await ok(c,{type:'handover.begin',cash_session_id:cash.id,expected_version:s.cash_sessions[0]!.version,incoming_user_id:n.user.id})).snapshot;
    expect(s.cash_sessions[0]!.expected_minor).toBeNull();expect(s.stock[0]!.on_hand).toBeNull();expect(s.payments).toEqual([]);
    s=(await ok(c,{type:'handover.count',handover_id:s.handovers[0]!.id,expected_version:1,counted_cash_minor:20000,stock_counts:stocks})).snapshot;
    const next=await ok(n,{type:'handover.accept',handover_id:s.handovers[0]!.id,expected_version:2});s=next.snapshot;
    const p=s.payments[0]!;s=(await ok(n,{type:'payment.resolve',payment_id:p.id,expected_version:p.version,cash_session_id:next.entity_id,evidence:{source:'merchant_verified',merchant_account:'comercio-laboratorio',external_reference:'YAPE-TEST-1',observed_at:new Date().toISOString()}})).snapshot;
    expect(s.payments[0]!.initiated_cash_session_id).toBe(cash.id);expect(s.payments[0]!.cash_session_id).toBe(next.entity_id);expect(s.checks[0]!.held_minor).toBe(0);expect(s.checks[0]!.paid_minor).toBe(1000);expect(s.cash_sessions[1]!.expected_minor).toBe(20000);
    expect((await db.pool.query('SELECT count(*) FROM external_receipts')).rows[0].count).toBe('1');
  });
  it('hides money/evidence from waiter and restricts kitchen to its own tickets',async()=>{
    const w=await login();await start(w,0,[0,3,6]);const kitchen=await view(await login('cocina'));
    expect(kitchen.orders[0]!.lines.map(l=>l.station)).toEqual(['cocina']);expect(kitchen.print_jobs.map(j=>j.station)).toEqual(['cocina']);expect(kitchen.checks).toEqual([]);
    const waiter=await view(w);expect(waiter.stock).toEqual([]);expect(waiter.audit).toEqual([]);expect(waiter.payments).toEqual([]);
    const cashier=await view(await login('caja'));expect(cashier.print_jobs.map(j=>j.station).sort()).toEqual(['cocina','heladeria']);expect(cashier.capabilities.network_printing).toBe(false);
  });
  it('revokes server sessions on logout and immediately denies deactivated staff',async()=>{
    const w=await login();expect((await app.inject({method:'DELETE',url:'/v1/pos/session',headers:{cookie:w.cookie,'x-csrf-token':w.csrf}})).statusCode).toBe(204);
    expect((await app.inject({url:'/v1/pos/session',headers:{cookie:w.cookie}})).statusCode).toBe(401);
    const c=await login('caja');await db.pool.query('UPDATE staff_memberships SET active=false WHERE id=$1',[c.user.id]);
    expect((await app.inject({url:'/v1/pos/snapshot',headers:{cookie:c.cookie}})).statusCode).toBe(401);
  });
  it('allows admin to create and update products, denies non-admin, and records catalog_audit', async () => {
    const w = await login('mozo');
    const adm = await login('admin');

    // Waiter cannot create product
    const waiterAttempt = await send(w, {
      type: 'catalog.product.create',
      name: 'Parihuela',
      category: 'Platos Fuertes',
      price_minor: 4200,
      station: 'cocina',
      stock_policy: 'none',
      reason: 'Intento no autorizado'
    });
    expect(waiterAttempt.statusCode).toBe(403);

    // Admin creates product
    const createRes = await ok(adm, {
      type: 'catalog.product.create',
      name: 'Parihuela',
      category: 'Platos Fuertes',
      price_minor: 4200,
      station: 'cocina',
      stock_policy: 'none',
      reason: 'Nuevo plato en carta'
    });
    const createdProduct = createRes.snapshot.products.find(p => p.name === 'Parihuela')!;
    expect(createdProduct).toBeDefined();
    expect(createdProduct.price_minor).toBe(4200);
    expect(createdProduct.version).toBe(1);

    // Verify catalog_audit row in PostgreSQL
    const auditRows = await db.pool.query('SELECT * FROM catalog_audit WHERE product_id=$1', [createdProduct.id]);
    expect(auditRows.rows).toHaveLength(1);
    expect(auditRows.rows[0].action).toBe('create');
    expect(auditRows.rows[0].reason).toBe('Nuevo plato en carta');

    // Admin updates product price
    const updateRes = await ok(adm, {
      type: 'catalog.product.update',
      product_id: createdProduct.id,
      expected_version: createdProduct.version,
      name: createdProduct.name,
      category: createdProduct.category,
      price_minor: 4500,
      active: true,
      reason: 'Ajuste de precio por demanda'
    });
    const updatedProduct = updateRes.snapshot.products.find(p => p.id === createdProduct.id)!;
    expect(updatedProduct.price_minor).toBe(4500);
    expect(updatedProduct.version).toBe(2);

    const auditRowsAfter = await db.pool.query('SELECT * FROM catalog_audit WHERE product_id=$1 ORDER BY created_at ASC', [createdProduct.id]);
    expect(auditRowsAfter.rows).toHaveLength(2);
    expect(auditRowsAfter.rows[1].action).toBe('update');
    expect(auditRowsAfter.rows[1].previous_version).toBe(1);
    expect(auditRowsAfter.rows[1].new_version).toBe(2);
  });
  it('persists durable order_quotes and marks consumed_at on successful order creation', async () => {
    const w = await login('mozo');
    const s = await view(w);
    const table = s.tables[0]!;
    const opened = await ok(w, { type: 'table.open', table_id: table.id, expected_version: table.version });
    const visitId = opened.entity_id;

    // Create quote
    const qRes = await quote(w, visitId, [{ product_id: s.products[0]!.id, quantity: 1 }]);
    expect(qRes.statusCode).toBe(200);
    const quoteData = qRes.json();

    const quoteRowBefore = await db.pool.query('SELECT * FROM order_quotes WHERE id=$1', [quoteData.quote_id]);
    expect(quoteRowBefore.rows).toHaveLength(1);
    expect(quoteRowBefore.rows[0].consumed_at).toBeNull();
    expect(quoteRowBefore.rows[0].total_minor).toBe('3500');

    // Create order with quote
    await ok(w, {
      type: 'order.create',
      visit_id: visitId,
      expected_version: opened.snapshot.visits.find(v => v.id === visitId)!.version,
      quote_id: quoteData.quote_id
    });

    const quoteRowAfter = await db.pool.query('SELECT * FROM order_quotes WHERE id=$1', [quoteData.quote_id]);
    expect(quoteRowAfter.rows[0].consumed_at).not.toBeNull();
  });

  it('handles order line voids, PostgreSQL audit persistence, and collection release in commercial flow', async () => {
    const w = await login('mozo');
    const c = await login('caja');
    const s = await view(w);
    const table = s.tables[0]!;

    // Waiter opens table
    const opened = await ok(w, { type: 'table.open', table_id: table.id, expected_version: table.version });
    const visitId = opened.entity_id;

    // Quote and order Ceviche (0) + Cerveza (3)
    const cevicheProduct = s.products.find(p => p.name === 'Ceviche clásico')!;
    const beerProduct = s.products.find(p => p.name === 'Cerveza personal')!;
    const qRes = await quote(w, visitId, [
      { product_id: cevicheProduct.id, quantity: 1 },
      { product_id: beerProduct.id, quantity: 1 }
    ]);
    const quoteData = qRes.json();
    const ordered = await ok(w, {
      type: 'order.create',
      visit_id: visitId,
      expected_version: opened.snapshot.visits.find(v => v.id === visitId)!.version,
      quote_id: quoteData.quote_id
    });

    const beerLine = ordered.snapshot.orders[0]!.lines.find(l => l.product_name === 'Cerveza personal')!;
    const visitAfterOrder = ordered.snapshot.visits.find(v => v.id === visitId)!;

    // Waiter cannot void order line -> 403 Forbidden
    const voidOpId1 = randomUUID();
    const waiterRes = await send(w, {
      type: 'order.line.void',
      line_id: beerLine.id,
      expected_version: visitAfterOrder.version,
      quantity: 1,
      restore_stock: false,
      reason: 'Mozo intentando anular'
    }, voidOpId1);
    expect(waiterRes.statusCode).toBe(403);
    expect(waiterRes.json().error.code).toBe('FORBIDDEN');

    // Cashier opens cash drawer
    const cashierSnap = await view(c);
    const cashOpenRes = await ok(c, {
      type: 'cash.open',
      opening_minor: 10000,
      shift_label: 'diurno',
      expected_day_version: cashierSnap.business_day.version
    });

    // Cashier voids the beer line
    const voidOpId2 = randomUUID();
    const voidRes = await ok(c, {
      type: 'order.line.void',
      line_id: beerLine.id,
      expected_version: visitAfterOrder.version,
      quantity: 1,
      restore_stock: false,
      reason: 'Cliente canceló la cerveza'
    }, voidOpId2);

    expect(voidRes.snapshot.checks[0]!.total_minor).toBe(3500);
    expect(voidRes.snapshot.checks[0]!.remaining_collectible_minor).toBe(3500);

    // Verify PostgreSQL persistence in order_void_audit
    const auditRows = await db.pool.query('SELECT * FROM order_void_audit WHERE line_id=$1', [beerLine.id]);
    expect(auditRows.rows).toHaveLength(1);
    expect(auditRows.rows[0].quantity).toBe(1);
    expect(auditRows.rows[0].amount_minor).toBe('1000');
    expect(auditRows.rows[0].restored_stock).toBe(false);
    expect(auditRows.rows[0].reason).toBe('Cliente canceló la cerveza');

    // Idempotent replay of void returns replayed: true
    const replayVoidRes = await send(c, {
      type: 'order.line.void',
      line_id: beerLine.id,
      expected_version: visitAfterOrder.version,
      quantity: 1,
      restore_stock: false,
      reason: 'Cliente canceló la cerveza'
    }, voidOpId2);
    expect(replayVoidRes.statusCode).toBe(200);
    expect(replayVoidRes.json().replayed).toBe(true);

    // Cashier authorizes digital collection of 2000 minor
    const checkAfterVoid = voidRes.snapshot.checks.find(ch => ch.visit_id === visitId)!;
    const authRes = await ok(c, {
      type: 'collection.authorize',
      cash_session_id: cashOpenRes.entity_id,
      check_id: checkAfterVoid.id,
      expected_version: checkAfterVoid.version,
      method: 'card',
      amount_minor: 2000
    });
    expect(authRes.snapshot.checks[0]!.held_minor).toBe(2000);
    expect(authRes.snapshot.checks[0]!.remaining_collectible_minor).toBe(1500);

    // Customer decides to pay fully in cash -> cashier releases authorization
    const checkAfterAuth = authRes.snapshot.checks.find(ch => ch.visit_id === visitId)!;
    const releaseOpId = randomUUID();
    const releaseRes = await ok(c, {
      type: 'collection.release',
      authorization_id: authRes.entity_id,
      expected_version: checkAfterAuth.version,
      reason: 'Cliente pagará en efectivo'
    }, releaseOpId);
    expect(releaseRes.snapshot.checks[0]!.held_minor).toBe(0);
    expect(releaseRes.snapshot.checks[0]!.remaining_collectible_minor).toBe(3500);

    // Replay of release returns replayed: true
    const replayReleaseRes = await send(c, {
      type: 'collection.release',
      authorization_id: authRes.entity_id,
      expected_version: checkAfterAuth.version,
      reason: 'Cliente pagará en efectivo'
    }, releaseOpId);
    expect(replayReleaseRes.statusCode).toBe(200);
    expect(replayReleaseRes.json().replayed).toBe(true);

    // Pay full remaining amount (3500) in cash
    const checkAfterRelease = releaseRes.snapshot.checks.find(ch => ch.visit_id === visitId)!;
    const finalAuth = await ok(c, {
      type: 'collection.authorize',
      cash_session_id: cashOpenRes.entity_id,
      check_id: checkAfterRelease.id,
      expected_version: checkAfterRelease.version,
      method: 'cash',
      amount_minor: 3500
    });
    const payRes = await ok(c, {
      type: 'payment.confirm',
      authorization_id: finalAuth.entity_id,
      received_minor: 3500
    });
    const checkPaid = payRes.snapshot.checks.find(ch => ch.visit_id === visitId)!;
    expect(checkPaid.paid_minor).toBe(3500);
    expect(checkPaid.remaining_collectible_minor).toBe(0);

    // Issue Boleta Electrónica B001
    const fiscalOpId = randomUUID();
    const issueRes = await ok(c, {
      type: 'fiscal.document.issue',
      check_id: checkPaid.id,
      expected_check_version: checkPaid.version,
      doc_type: 'boleta',
      customer_doc_type: 'sin_documento',
      customer_name: 'CLIENTES VARIOS'
    }, fiscalOpId);

    expect(issueRes.snapshot.checks[0]!.fiscal_status).toBe('pending');
    expect(issueRes.snapshot.fiscal_documents).toHaveLength(1);
    const doc = issueRes.snapshot.fiscal_documents[0]!;
    expect(doc.full_number).toBe('B001-00000001');
    expect(doc.doc_type).toBe('boleta');
    expect(doc.total_minor).toBe(3500);
    expect(doc.op_gravada_minor + doc.igv_minor).toBe(3500);

    // Verify row persisted in PostgreSQL fiscal_documents table
    const docRows = await db.pool.query('SELECT * FROM fiscal_documents WHERE check_id=$1', [checkPaid.id]);
    expect(docRows.rowCount).toBe(1);
    expect(docRows.rows[0].full_number).toBe('B001-00000001');
    expect(docRows.rows[0].doc_type).toBe('boleta');

    // Idempotent replay of fiscal.document.issue returns replayed: true
    const replayFiscalRes = await send(c, {
      type: 'fiscal.document.issue',
      check_id: checkPaid.id,
      expected_check_version: checkPaid.version,
      doc_type: 'boleta',
      customer_doc_type: 'sin_documento',
      customer_name: 'CLIENTES VARIOS'
    }, fiscalOpId);
    expect(replayFiscalRes.statusCode).toBe(200);
    expect(replayFiscalRes.json().replayed).toBe(true);

    // Second issuance with another operation_id is rejected with ALREADY_ISSUED
    const secondIssueRes = await send(c, {
      type: 'fiscal.document.issue',
      check_id: checkPaid.id,
      expected_check_version: issueRes.snapshot.checks[0]!.version,
      doc_type: 'boleta',
      customer_doc_type: 'sin_documento',
      customer_name: 'CLIENTES VARIOS'
    }, randomUUID());
    expect(secondIssueRes.statusCode).toBe(409);
    expect(secondIssueRes.json().error.code).toBe('ALREADY_ISSUED');
  });

  it('persists commercial discount, audits to check_discount_audit in PostgreSQL, and recalculates check balance', async () => {
    const w = await login('mozo');
    const c = await login('caja');
    const s = await view(w);
    const table = s.tables[1]!;

    const opened = await ok(w, { type: 'table.open', table_id: table.id, expected_version: table.version });
    const visitId = opened.entity_id;

    const cevicheProduct = s.products.find(p => p.name === 'Ceviche clásico')!;
    const qRes = await quote(w, visitId, [{ product_id: cevicheProduct.id, quantity: 2 }]);
    const ordered = await ok(w, {
      type: 'order.create',
      visit_id: visitId,
      expected_version: opened.snapshot.visits.find(v => v.id === visitId)!.version,
      quote_id: qRes.json().quote_id
    });

    const check = ordered.snapshot.checks.find(ch => ch.visit_id === visitId)!;
    expect(check.total_minor).toBe(7000);

    // Waiter role forbidden
    const waiterRes = await send(w, {
      type: 'check.discount.apply',
      check_id: check.id,
      expected_version: check.version,
      kind: 'percentage',
      percent: 10,
      reason: 'Descuento no autorizado'
    }, randomUUID());
    expect(waiterRes.statusCode).toBe(403);

    // Cashier opens drawer if needed
    const cashierSnap = await view(c);
    if (!cashierSnap.cash_sessions.some(cs => cs.state === 'open')) {
      await ok(c, {
        type: 'cash.open',
        opening_minor: 10000,
        shift_label: 'diurno',
        expected_day_version: cashierSnap.business_day.version
      });
    }

    // Cashier applies 10% discount
    const discountOpId = randomUUID();
    const discountRes = await ok(c, {
      type: 'check.discount.apply',
      check_id: check.id,
      expected_version: check.version,
      kind: 'percentage',
      percent: 10,
      reason: 'Descuento cliente frecuente'
    }, discountOpId);

    const discountedCheck = discountRes.snapshot.checks.find(ch => ch.id === check.id)!;
    expect(discountedCheck.discount_minor).toBe(700);
    expect(discountedCheck.total_minor).toBe(6300);
    expect(discountedCheck.remaining_collectible_minor).toBe(6300);

    // Verify row in PostgreSQL check_discount_audit table
    const auditRows = await db.pool.query('SELECT * FROM check_discount_audit WHERE check_id=$1', [check.id]);
    expect(auditRows.rowCount).toBe(1);
    expect(auditRows.rows[0].discount_minor).toBe('700');
    expect(auditRows.rows[0].discount_kind).toBe('percentage');
    expect(auditRows.rows[0].discount_percent).toBe(10);
    expect(auditRows.rows[0].reason).toBe('Descuento cliente frecuente');

    // Idempotent replay
    const replayRes = await send(c, {
      type: 'check.discount.apply',
      check_id: check.id,
      expected_version: check.version,
      kind: 'percentage',
      percent: 10,
      reason: 'Descuento cliente frecuente'
    }, discountOpId);
    expect(replayRes.statusCode).toBe(200);
    expect(replayRes.json().replayed).toBe(true);
  });

  it('persists fiscal credit note BC01 in PostgreSQL and marks modified document as annulled', async () => {
    const w = await login('mozo');
    const c = await login('caja');
    const s = await view(w);
    const table = s.tables[0]!;
    const opened = await ok(w, { type: 'table.open', table_id: table.id, expected_version: table.version });
    const visitId = opened.entity_id;

    // Quote and order
    const qRes = await quote(w, visitId, [{ product_id: s.products[0]!.id, quantity: 1 }]);
    const ordered = await ok(w, {
      type: 'order.create',
      visit_id: visitId,
      expected_version: opened.snapshot.visits.find(v => v.id === visitId)!.version,
      quote_id: qRes.json().quote_id
    });

    const check = ordered.snapshot.checks.find(ch => ch.visit_id === visitId)!;

    // Cashier opens drawer if needed
    const cashierSnap = await view(c);
    let cashSession = cashierSnap.cash_sessions.find(cs => cs.state === 'open');
    if (!cashSession) {
      const openRes = await ok(c, {
        type: 'cash.open',
        opening_minor: 10000,
        shift_label: 'diurno',
        expected_day_version: cashierSnap.business_day.version
      });
      cashSession = openRes.snapshot.cash_sessions.find(cs => cs.state === 'open')!;
    }

    // Pay full check
    const authRes = await ok(c, {
      type: 'collection.authorize',
      check_id: check.id,
      expected_version: check.version,
      cash_session_id: cashSession.id,
      method: 'cash',
      amount_minor: check.total_minor
    });
    const auth = authRes.snapshot.authorizations.find(a => a.id === authRes.entity_id)!;
    const confirmRes = await ok(c, {
      type: 'payment.confirm',
      authorization_id: auth.id,
      received_minor: check.total_minor
    });
    const paidCheck = confirmRes.snapshot.checks.find(ch => ch.id === check.id)!;

    // Issue Boleta
    const issueRes = await ok(c, {
      type: 'fiscal.document.issue',
      check_id: paidCheck.id,
      expected_check_version: paidCheck.version,
      doc_type: 'boleta',
      customer_doc_type: 'sin_documento',
      customer_name: 'CLIENTES VARIOS'
    });
    const boleta = issueRes.snapshot.fiscal_documents.find(d => d.doc_type === 'boleta')!;
    expect(boleta.full_number).toBe('B001-00000001');

    // Issue Credit Note BC01
    const ncOpId = randomUUID();
    const ncRes = await ok(c, {
      type: 'fiscal.credit_note.issue',
      document_id: boleta.id,
      reason_code: '01',
      reason_description: 'Anulación de la operación por error de digitación'
    }, ncOpId);

    const creditNote = ncRes.snapshot.fiscal_documents.find(d => d.doc_type === 'nota_credito')!;
    expect(creditNote).toBeDefined();
    expect(creditNote.full_number).toBe('BC01-00000001');
    expect(creditNote.modified_document_id).toBe(boleta.id);
    expect(creditNote.sunat_reason_code).toBe('01');

    // Verify row in PostgreSQL fiscal_documents
    const ncRows = await db.pool.query('SELECT * FROM fiscal_documents WHERE doc_type=$1', ['nota_credito']);
    expect(ncRows.rowCount).toBe(1);
    expect(ncRows.rows[0].full_number).toBe('BC01-00000001');
    expect(ncRows.rows[0].modified_document_id).toBe(boleta.id);
    expect(ncRows.rows[0].sunat_reason_code).toBe('01');
    expect(ncRows.rows[0].sunat_reason_description).toBe('Anulación de la operación por error de digitación');

    // Verify original boleta is marked annulled in PostgreSQL
    const boletaRows = await db.pool.query('SELECT * FROM fiscal_documents WHERE id=$1', [boleta.id]);
    expect(boletaRows.rows[0].status).toBe('annulled');
    expect(boletaRows.rows[0].credit_note_full_number).toBe('BC01-00000001');

    // Verify series updated in PostgreSQL
    const seriesRows = await db.pool.query('SELECT * FROM fiscal_series WHERE tenant_id=$1 AND branch_id=$2 AND doc_type=$3', [tenant, branch, 'nota_credito_boleta']);
    expect(seriesRows.rows[0].current_number).toBe(1);

    // Idempotent replay of credit note
    const replayNc = await send(c, {
      type: 'fiscal.credit_note.issue',
      document_id: boleta.id,
      reason_code: '01',
      reason_description: 'Anulación de la operación por error de digitación'
    }, ncOpId);
    expect(replayNc.statusCode).toBe(200);
    expect(replayNc.json().replayed).toBe(true);
  });
});

