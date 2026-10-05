import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../services/commerce/src/app.js';
import { testDatabase,tenant,branch } from '../support/database.js';
import { guestSnapshotValid } from '../../services/commerce/src/platform/validation.js';
import type { PosCommand, PosSnapshot, CommandResponse, GuestSnapshot, GuestSessionResponse, OrderCreateCommand, QuoteResponse } from '@qatu/contracts';
type Input<T> = T extends unknown ? Omit<T,'operation_id'> : never;
type HarnessCommand = Input<PosCommand> | (Omit<Input<OrderCreateCommand>, 'quote_id'> & { quote_id?: string });
let db:Awaited<ReturnType<typeof testDatabase>>, app:Awaited<ReturnType<typeof createApp>>;
interface Identity {cookie:string;csrf:string}
async function staff(username='mozo'):Promise<Identity> {
  const r=await app.inject({method:'POST',url:'/v1/pos/session',payload:{username,password:'QatuDemo2026!'}});expect(r.statusCode).toBe(200);
  return {cookie:'qatu_session='+r.cookies[0]!.value,csrf:r.json().csrf_token};
}
async function quoteStaff(w:Identity, visitId:string, lines:{product_id:string;quantity:number}[]) {
  return app.inject({
    method: 'POST',
    url: '/v1/pos/quotes',
    headers: { cookie: w.cookie },
    payload: { visit_id: visitId, lines }
  });
}
async function command(w:Identity,input:HarnessCommand,operation_id=randomUUID()) {
  let finalInput: any = input;
  if (input.type === 'order.create' && !('quote_id' in input && input.quote_id) && 'lines' in input && input.lines) {
    const qRes = await quoteStaff(w, input.visit_id, input.lines);
    finalInput = { ...input, quote_id: qRes.statusCode === 200 ? qRes.json().quote_id : randomUUID() };
  }
  return app.inject({method:'POST',url:'/v1/pos/commands',headers:{cookie:w.cookie,'x-csrf-token':w.csrf},payload:{...finalInput,operation_id}});
}
async function ok(w:Identity,input:HarnessCommand) {const r=await command(w,input);expect(r.statusCode,r.body).toBe(200);return r.json<CommandResponse>();}
async function snapshot(w:Identity){const r=await app.inject({url:'/v1/pos/snapshot',headers:{cookie:w.cookie}});return r.json<PosSnapshot>();}
async function open(w:Identity,index=0) {
  const s=await snapshot(w);const v=await ok(w,{type:'table.open',table_id:s.tables[index]!.id,expected_version:s.tables[index]!.version});
  await ok(w,{type:'guest.access',visit_id:v.entity_id,expected_version:1,action:'activate',reason:'Mozo invita al cliente'});
  const r=await app.inject({url:'/v1/pos/guest-access/'+v.entity_id,headers:{cookie:w.cookie}});expect(r.statusCode,r.body).toBe(200);
  return {visit:v.entity_id,code:r.json().code as string};
}
async function join(code:string):Promise<Identity & {session:GuestSessionResponse}> {
  const r=await app.inject({method:'POST',url:'/v1/guest/session',payload:{code}});expect(r.statusCode,r.body).toBe(200);
  const s=r.json<GuestSessionResponse>();return {cookie:'qatu_guest='+r.cookies[0]!.value,csrf:s.csrf_token,session:s};
}
async function gview(g:Identity){const r=await app.inject({url:'/v1/guest/snapshot',headers:{cookie:g.cookie}});expect(r.statusCode,r.body).toBe(200);const view=r.json<GuestSnapshot>();expect(guestSnapshotValid(view)).toBe(true);return view;}
async function gquote(g:Identity, lines:{product_id:string;quantity:number}[]) {
  return app.inject({
    method: 'POST',
    url: '/v1/guest/quotes',
    headers: { cookie: g.cookie },
    payload: { lines }
  });
}
async function send(g:Identity,input:Record<string,unknown>) {
  if (!('quote_id' in input) && 'lines' in input && Array.isArray(input.lines)) {
    const qRes = await gquote(g, input.lines as any);
    if (qRes.statusCode === 200) {
      input.quote_id = qRes.json().quote_id;
    } else {
      input.quote_id = randomUUID();
    }
  }
  return app.inject({method:'POST',url:'/v1/guest/orders',headers:{cookie:g.cookie,'x-csrf-token':g.csrf},payload:input});
}

async function order(g:Identity,product=0,operation_id=randomUUID()) {const s=await gview(g);return send(g,{operation_id,expected_version:s.visit_version,lines:[{product_id:s.products[product]!.id,quantity:1}]});}
async function pay(c:Identity,checkId:string,amount:number,method:'cash'|'yape'='cash',uncertain=false) {
  const s=await snapshot(c),cash=s.cash_sessions.find(x=>x.state==='open')!,check=s.checks.find(x=>x.id===checkId)!;
  const a=await ok(c,{type:'collection.authorize',cash_session_id:cash.id,check_id:check.id,expected_version:check.version,method,amount_minor:amount});
  return uncertain?ok(c,{type:'payment.unknown',authorization_id:a.entity_id,reason:'Respuesta incierta en laboratorio'}):ok(c,{type:'payment.confirm',authorization_id:a.entity_id,received_minor:amount});
}

beforeAll(async()=>{db=await testDatabase();app=await createApp(db.pool,false);},30000);
beforeEach(async()=>{await app.close();await db.reset();app=await createApp(db.pool,false);});
afterAll(async()=>{await app?.close();await db?.close();},30000);

describe('waiter-activated table guest access',()=>{
  it('denies activation to cashier/kitchen, and unknown keys never reveal tables',async()=>{
    const w=await staff();const s=await snapshot(w);const v=await ok(w,{type:'table.open',table_id:s.tables[0]!.id,expected_version:1});
    for(const role of ['caja','admin','cocina'])expect((await command(await staff(role),{type:'guest.access',visit_id:v.entity_id,expected_version:1,action:'activate',reason:'Rol no admitido'})).statusCode).toBe(403);
    expect((await app.inject({method:'POST',url:'/v1/guest/session',payload:{code:'AAAAAAAAAA'}})).statusCode).toBe(401);
  });
  it('creates a readable secret, persists only hashes and reuses an active key',async()=>{
    const w=await staff();const a=await open(w);expect(a.code).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);const s=await snapshot(w);
    expect(JSON.stringify(s)).not.toContain(a.code);
    await ok(w,{type:'guest.access',visit_id:a.visit,expected_version:s.visits[0]!.version,action:'activate',reason:'Consultar de nuevo acceso'});
    const r=await app.inject({url:'/v1/pos/guest-access/'+a.visit,headers:{cookie:w.cookie}});expect(r.json().code).toBe(a.code);
    const row=(await db.pool.query('SELECT * FROM guest_access_credentials')).rows[0];expect(row.code_hash).toHaveLength(64);expect(JSON.stringify(row)).not.toContain(a.code);
    await app.close();app=await createApp(db.pool,false);expect((await app.inject({url:'/v1/pos/guest-access/'+a.visit,headers:{cookie:w.cookie}})).json().code).toBe(a.code);
    expect((await join(a.code.toLowerCase())).session.visit_id).toBe(a.visit);
  });
  it('uses the same account and stations but each guest sees only its own orders',async()=>{
    const w=await staff();const a=await open(w),g=await join(a.code),g2=await join(a.code);
    expect((await order(g)).statusCode).toBe(200);expect((await order(g2,6)).statusCode).toBe(200);
    const own=await gview(g),other=await gview(g2);expect(own.orders).toHaveLength(1);expect(other.orders).toHaveLength(1);expect(own.orders[0]!.id).not.toBe(other.orders[0]!.id);
    expect(JSON.stringify(own)).not.toContain('paid_minor');expect(JSON.stringify(own)).not.toContain('created_by');
    const s=await snapshot(w);expect(s.checks[0]!.total_minor).toBe(4300);expect(s.orders.every(o=>o.source==='guest')).toBe(true);expect(s.orders[0]!.guest_session_id).toBe(g.session.session_id);
    expect(s.print_jobs.map(j=>j.station).sort()).toEqual(['cocina','heladeria']);
    const scope=await app.inject({url:'/v1/pos/snapshot',headers:{cookie:g.cookie}});expect(scope.statusCode).toBe(401);
  });
  it('protects guest requests with CSRF and rejects injected staff fields',async()=>{
    const w=await staff();const a=await open(w),g=await join(a.code),s=await gview(g);
    const input={operation_id:randomUUID(),expected_version:s.visit_version,lines:[{product_id:s.products[0]!.id,quantity:1}]};
    expect((await app.inject({method:'POST',url:'/v1/guest/orders',headers:{cookie:g.cookie},payload:input})).statusCode).toBe(403);
    for(const extra of [{visit_id:randomUUID()},{tenant_id:randomUUID()},{price_minor:1},{role:'admin'}])expect((await send(g,{...input,...extra})).statusCode).toBe(400);
  });
  it('binds idempotency to guest identity and rejects another guest or the executing waiter replay',async()=>{
    const w=await staff();const a=await open(w),g=await join(a.code),g2=await join(a.code),s=await gview(g);
    const id=randomUUID(),input={operation_id:id,expected_version:s.visit_version,lines:[{product_id:s.products[0]!.id,quantity:1}]};
    expect((await send(g,input)).statusCode).toBe(200);expect((await send(g,input)).json().replayed).toBe(true);
    expect((await send(g2,input)).statusCode).toBe(403);
    expect((await command(w,{type:'order.create',visit_id:a.visit,expected_version:s.visit_version,lines:input.lines},id)).statusCode).toBe(403);
    expect((await snapshot(w)).orders).toHaveLength(1);
  });
  it('keeps access on partial/unknown and revokes on confirmed full payment before physical table release',async()=>{
    const w=await staff(),c=await staff('caja');const a=await open(w),g=await join(a.code);expect((await order(g)).statusCode).toBe(200);
    await ok(c,{type:'cash.open',opening_minor:0,shift_label:'diurno',expected_day_version:1});let s=await snapshot(c);const check=s.checks[0]!.id;
    await pay(c,check,1000);expect((await gview(g)).ordering_allowed).toBe(true);
    await pay(c,check,2500,'yape',true);expect((await gview(g)).ordering_allowed).toBe(true);s=await snapshot(c);const payment=s.payments.find(p=>p.status==='unknown')!;
    await ok(c,{type:'payment.resolve',payment_id:payment.id,expected_version:payment.version,cash_session_id:s.cash_sessions[0]!.id,evidence:{source:'merchant_verified',merchant_account:'comercio-laboratorio',external_reference:'YAPE-GUEST-TEST',observed_at:new Date().toISOString()}});
    expect((await app.inject({url:'/v1/guest/snapshot',headers:{cookie:g.cookie}})).statusCode).toBe(403);
    expect((await app.inject({method:'POST',url:'/v1/guest/session',payload:{code:a.code}})).statusCode).toBe(401);
    s=await snapshot(w);expect(s.visits[0]!.status).toBe('open');expect(s.guest_accesses[0]!.state).toBe('settled');
    expect((await command(w,{type:'order.create',visit_id:a.visit,expected_version:s.visits[0]!.version,lines:[{product_id:s.products[0]!.id,quantity:1}]})).statusCode).toBe(409);
  });
  it('rotation revokes current browsers; closing an empty visit and reoccupying never revives the old key',async()=>{
    const w=await staff();const a=await open(w),g=await join(a.code);let s=await snapshot(w);
    await ok(w,{type:'guest.access',visit_id:a.visit,expected_version:s.visits[0]!.version,action:'rotate',reason:'Rotar clave compartida'});
    expect((await app.inject({url:'/v1/guest/snapshot',headers:{cookie:g.cookie}})).statusCode).toBe(403);
    expect((await app.inject({method:'POST',url:'/v1/guest/session',payload:{code:a.code}})).statusCode).toBe(401);
    const rotated=(await app.inject({url:'/v1/pos/guest-access/'+a.visit,headers:{cookie:w.cookie}})).json().code;expect(rotated).not.toBe(a.code);
    s=await snapshot(w);await ok(w,{type:'table.close',visit_id:a.visit,expected_version:s.visits[0]!.version});const next=await open(w);
    expect(next.code).not.toBe(rotated);expect((await app.inject({method:'POST',url:'/v1/guest/session',payload:{code:rotated}})).statusCode).toBe(401);
  });
  it('serializes full payment versus a new guest order without accepting an order after settled',async()=>{
    const w=await staff(),c=await staff('caja');const a=await open(w),g=await join(a.code);await order(g);await ok(c,{type:'cash.open',opening_minor:0,shift_label:'diurno',expected_day_version:1});
    const s=await snapshot(c);const auth=await ok(c,{type:'collection.authorize',cash_session_id:s.cash_sessions[0]!.id,check_id:s.checks[0]!.id,expected_version:s.checks[0]!.version,method:'cash',amount_minor:3500});
    const gs=await gview(g);const [paid,ordered]=await Promise.all([command(c,{type:'payment.confirm',authorization_id:auth.entity_id,received_minor:3500}),send(g,{operation_id:randomUUID(),expected_version:gs.visit_version,lines:[{product_id:gs.products[0]!.id,quantity:1}]})]);
    expect(paid.statusCode).toBe(200);expect([200,403]).toContain(ordered.statusCode);
    const final=await snapshot(c);expect(final.checks[0]!.paid_minor).toBe(3500);expect(final.checks[0]!.total_minor).toBe(ordered.statusCode===200?7000:3500);
    expect(final.guest_accesses[0]!.state).toBe(ordered.statusCode===200?'active':'settled');
  });
  it('scopes code revelation and client orders even when catalogs and table numbers overlap',async()=>{
    const w=await staff(),other=await staff('otro_mozo');const a=await open(w),b=await open(other);
    expect(a.code).not.toBe(b.code);
    expect((await app.inject({url:'/v1/pos/guest-access/'+a.visit,headers:{cookie:other.cookie}})).statusCode).toBe(404);
    const ga=await join(a.code),gb=await join(b.code);await order(ga,0);await order(gb,6);
    expect((await gview(ga)).orders[0]!.lines[0]!.product_name).toBe('Ceviche clásico');
    expect((await gview(gb)).orders[0]!.lines[0]!.product_name).toBe('Refresco de maracuyá');
    expect((await snapshot(w)).checks[0]!.total_minor).toBe(3500);expect((await snapshot(other)).checks[0]!.total_minor).toBe(800);
    expect((await app.inject({url:'/v1/guest/snapshot',headers:{cookie:'qatu_guest=forged'}})).statusCode).toBe(403);
  });
  it('keeps private history on same-browser reentry but logout/expiry/revocation deny even replays',async()=>{
    const w=await staff(),a=await open(w),g=await join(a.code),view=await gview(g);
    const input={operation_id:randomUUID(),expected_version:view.visit_version,lines:[{product_id:view.products[0]!.id,quantity:1}]};
    await send(g,input);
    const same=await app.inject({method:'POST',url:'/v1/guest/session',headers:{cookie:g.cookie},payload:{code:a.code}});
    expect(same.json().session_id).toBe(g.session.session_id);expect((await gview(g)).orders).toHaveLength(1);
    const other=await join(a.code);await db.pool.query('UPDATE guest_sessions SET expires_at=now()-interval \'1 second\' WHERE id=$1',[other.session.session_id]);
    expect((await app.inject({url:'/v1/guest/snapshot',headers:{cookie:other.cookie}})).statusCode).toBe(403);
    expect((await app.inject({method:'DELETE',url:'/v1/guest/session',headers:{cookie:g.cookie,'x-csrf-token':g.csrf}})).statusCode).toBe(204);
    expect((await send(g,input)).statusCode).toBe(403);expect((await gview(await join(a.code))).orders).toHaveLength(0);
    const s=await snapshot(w);await ok(w,{type:'guest.access',visit_id:a.visit,expected_version:s.visits[0]!.version,action:'revoke',reason:'Cliente solicita desactivar acceso'});
    expect((await app.inject({method:'POST',url:'/v1/guest/session',payload:{code:a.code}})).statusCode).toBe(401);
    expect((await snapshot(w)).orders).toHaveLength(1);
  });
  it('rolls back guest stock/order/outbox together and retries the same intention once',async()=>{
    const w=await staff(),a=await open(w),g=await join(a.code),v=await gview(g);
    const input={operation_id:randomUUID(),expected_version:v.visit_version,lines:[{product_id:v.products[3]!.id,quantity:1}]};
    await db.pool.query("CREATE FUNCTION reject_guest_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Guest outbox fault'; END $$");
    await db.pool.query('CREATE TRIGGER guest_outbox_fault BEFORE INSERT ON outbox FOR EACH ROW EXECUTE FUNCTION reject_guest_outbox()');
    try {expect((await send(g,input)).statusCode).toBe(503);expect((await snapshot(w)).orders).toHaveLength(0);expect((await snapshot(await staff('caja'))).stock[0]!.reserved).toBe(0);}
    finally {await db.pool.query('DROP TRIGGER guest_outbox_fault ON outbox');await db.pool.query('DROP FUNCTION reject_guest_outbox()');}
    expect((await send(g,input)).statusCode).toBe(200);expect((await send(g,input)).json().replayed).toBe(true);expect((await snapshot(w)).orders).toHaveLength(1);
    expect((await db.pool.query('SELECT count(*) FROM command_operations WHERE principal_kind=\'guest\'')).rows[0].count).toBe('1');
  });
  it('rolls back payment and credential revocation together on failed outbox commit',async()=>{
    const w=await staff(),c=await staff('caja'),a=await open(w),g=await join(a.code);await order(g);
    await ok(c,{type:'cash.open',opening_minor:0,shift_label:'diurno',expected_day_version:1});const s=await snapshot(c);
    const auth=await ok(c,{type:'collection.authorize',cash_session_id:s.cash_sessions[0]!.id,check_id:s.checks[0]!.id,expected_version:s.checks[0]!.version,method:'cash',amount_minor:3500});
    const id=randomUUID(),input={type:'payment.confirm' as const,authorization_id:auth.entity_id,received_minor:3500};
    await db.pool.query("CREATE FUNCTION reject_payment_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Payment outbox fault'; END $$");
    await db.pool.query('CREATE TRIGGER payment_outbox_fault BEFORE INSERT ON outbox FOR EACH ROW EXECUTE FUNCTION reject_payment_outbox()');
    try {expect((await command(c,input,id)).statusCode).toBe(503);expect((await snapshot(c)).checks[0]!.paid_minor).toBe(0);expect((await gview(g)).orders).toHaveLength(1);expect((await db.pool.query('SELECT state FROM guest_access_credentials')).rows[0].state).toBe('active');}
    finally {await db.pool.query('DROP TRIGGER payment_outbox_fault ON outbox');await db.pool.query('DROP FUNCTION reject_payment_outbox()');}
    expect((await command(c,input,id)).statusCode).toBe(200);
    expect((await app.inject({url:'/v1/guest/snapshot',headers:{cookie:g.cookie}})).statusCode).toBe(403);
    const final=await snapshot(w);expect((await command(w,{type:'guest.access',visit_id:a.visit,expected_version:final.visits[0]!.version,action:'activate',reason:'Intento de reabrir cuenta pagada'})).statusCode).toBe(403);
    expect((await command(w,{type:'guest.access',visit_id:a.visit,expected_version:final.visits[0]!.version,action:'rotate',reason:'Rotar después de pagar'})).statusCode).toBe(403);
  });
  it('protects the last beer across guest visits and preserves rejected drafts as conflicts',async()=>{
    const state=(await db.pool.query('SELECT state FROM branch_state WHERE tenant_id=$1 AND branch_id=$2',[tenant,branch])).rows[0].state;
    state.stock[0].on_hand=1;state.stock[0].available=1;await db.pool.query('UPDATE branch_state SET state=$3 WHERE tenant_id=$1 AND branch_id=$2',[tenant,branch,JSON.stringify(state)]);
    const w=await staff(),a=await open(w),b=await open(w,1),ga=await join(a.code),gb=await join(b.code);
    const results=await Promise.all([order(ga,3),order(gb,3)]);expect(results.map(r=>r.statusCode).sort()).toEqual([200,409]);
    const final=await snapshot(await staff('caja'));expect(final.orders).toHaveLength(1);expect(final.stock[0]).toMatchObject({on_hand:1,reserved:1,available:0});
  });
  it('never shows a recalculated key with a mismatched digest and permits audited rotation',async()=>{
    const w=await staff(),a=await open(w);await db.pool.query('UPDATE guest_access_credentials SET code_hash=$1',['f'.repeat(64)]);
    const mismatch=await app.inject({url:'/v1/pos/guest-access/'+a.visit,headers:{cookie:w.cookie}});expect(mismatch.statusCode).toBe(409);expect(mismatch.json().error.code).toBe('GUEST_KEY_UNAVAILABLE');expect(mismatch.body).not.toContain(a.code);
    const s=await snapshot(w);await ok(w,{type:'guest.access',visit_id:a.visit,expected_version:s.visits[0]!.version,action:'rotate',reason:'Recuperar clave tras pérdida del secreto'});
    const fresh=await app.inject({url:'/v1/pos/guest-access/'+a.visit,headers:{cookie:w.cookie}});expect(fresh.statusCode).toBe(200);expect((await join(fresh.json().code)).session.visit_id).toBe(a.visit);
  });
  it('rejects cross-origin joins/submissions and bounds repeated code attempts',async()=>{
    const w=await staff(),a=await open(w),g=await join(a.code),s=await gview(g);
    expect((await app.inject({method:'POST',url:'/v1/guest/session',headers:{origin:'https://evil.invalid'},payload:{code:a.code}})).statusCode).toBe(403);
    expect((await app.inject({method:'POST',url:'/v1/guest/orders',headers:{cookie:g.cookie,'x-csrf-token':g.csrf,origin:'https://evil.invalid'},payload:{operation_id:randomUUID(),expected_version:s.visit_version,lines:[{product_id:s.products[0]!.id,quantity:1}]}})).statusCode).toBe(403);
    for(let i=0;i<12;i++)expect((await app.inject({method:'POST',url:'/v1/guest/session',payload:{code:'AAAAAAAAAA'}})).statusCode).toBe(401);
    expect((await app.inject({method:'POST',url:'/v1/guest/session',payload:{code:'AAAAAAAAAA'}})).statusCode).toBe(429);
    expect((await gview(g)).ordering_allowed).toBe(true);
  });
  it('does not throttle a group of valid clients sharing the restaurant BFF address',async()=>{
    const w=await staff(),a=await open(w);
    for(let i=0;i<16;i++)expect((await join(a.code)).session.visit_id).toBe(a.visit);
  });
  it('enforces price review flow: guest quotes S/35, admin raises to S/38, guest order rejects with PRICE_CHANGED until confirmed at S/38', async () => {
    const w = await staff(), adm = await staff('admin');
    const a = await open(w), g = await join(a.code), s = await gview(g);
    const ceviche = s.products.find(p => p.name === 'Ceviche clásico')!;
    expect(ceviche.price_minor).toBe(3500);

    const quoteRes = await gquote(g, [{ product_id: ceviche.id, quantity: 1 }]);
    expect(quoteRes.statusCode).toBe(200);
    const quoteData = quoteRes.json<QuoteResponse>();
    expect(quoteData.total_minor).toBe(3500);

    const adminSnap = await snapshot(adm);
    const pInAdmin = adminSnap.products.find(p => p.id === ceviche.id)!;
    const updateRes = await ok(adm, {
      type: 'catalog.product.update',
      product_id: ceviche.id,
      expected_version: pInAdmin.version,
      name: pInAdmin.name,
      category: pInAdmin.category,
      price_minor: 3800,
      active: true,
      reason: 'Incremento de insumos de pescado'
    });
    expect(updateRes.snapshot.products.find(p => p.id === ceviche.id)!.price_minor).toBe(3800);

    const orderRes = await app.inject({
      method: 'POST',
      url: '/v1/guest/orders',
      headers: { cookie: g.cookie, 'x-csrf-token': g.csrf },
      payload: {
        operation_id: randomUUID(),
        expected_version: s.visit_version,
        quote_id: quoteData.quote_id
      }
    });
    expect(orderRes.statusCode).toBe(409);
    const errBody = orderRes.json();
    expect(errBody.error.code).toBe('PRICE_CHANGED');
    expect(errBody.error.message).toContain('Ceviche clásico');
    expect(errBody.error.details.changed_products).toEqual([
      {
        product_id: ceviche.id,
        product_name: 'Ceviche clásico',
        old_price_minor: 3500,
        new_price_minor: 3800
      }
    ]);

    const staffSnap = await snapshot(w);
    expect(staffSnap.orders).toHaveLength(0);

    const freshQuoteRes = await gquote(g, [{ product_id: ceviche.id, quantity: 1 }]);
    expect(freshQuoteRes.statusCode).toBe(200);
    const freshQuote = freshQuoteRes.json<QuoteResponse>();
    expect(freshQuote.total_minor).toBe(3800);

    const confirmRes = await app.inject({
      method: 'POST',
      url: '/v1/guest/orders',
      headers: { cookie: g.cookie, 'x-csrf-token': g.csrf },
      payload: {
        operation_id: randomUUID(),
        expected_version: s.visit_version,
        quote_id: freshQuote.quote_id
      }
    });
    expect(confirmRes.statusCode).toBe(200);
    const finalSnap = await snapshot(w);
    expect(finalSnap.orders).toHaveLength(1);
    expect(finalSnap.checks[0]!.total_minor).toBe(3800);
  });
});

