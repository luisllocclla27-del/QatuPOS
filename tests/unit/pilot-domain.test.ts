import { describe, expect, it } from 'vitest';
import type { PosCommand, StaffUser, PaymentMethod, OrderCreateCommand } from '@qatu/contracts';
import { createInitialState, executeCommand, projectSnapshot, createDomainQuote, DomainError, type Actor, type BranchState } from '../../packages/domain/src/index.js';

type Input<T> = T extends unknown ? Omit<T, 'operation_id'> : never;
type HarnessCommand = Input<PosCommand> | (Omit<Input<OrderCreateCommand>, 'quote_id'> & { quote_id?: string });

function harness() {
  let serial = 1;
  const id = () => `a0000000-0000-4000-8000-${String(serial++).padStart(12, '0')}`;
  let state = createInitialState({ tenant_id: 'tenant-one', branch_id: 'branch-one' });
  let now = '2026-10-01T15:00:00Z';
  const actor = (username: string): Actor => ({ tenant_id: state.tenant_id, branch_id: state.branch.id, user: state.staff.find(u => u.username === username)! });
  const run = (command: HarnessCommand, username = 'mozo', quoteContext?: any) => {
    let quote = quoteContext;
    if (command.type === 'order.create' && !quote) {
      const orderCmd = command as Input<OrderCreateCommand>;
      if (!orderCmd.quote_id && orderCmd.lines) {
        quote = createDomainQuote(state, orderCmd.visit_id, orderCmd.lines, now, id(), actor(username));
        command = { ...command, quote_id: quote.id };
      }
    }
    const response = executeCommand(state, actor(username), { ...command, operation_id: id() } as PosCommand, { now, id, ...(quote ? { quote } : {}) });
    state = response.state; return response.entity_id;
  };
  const quote = (visitId: string, lines: { product_id: string; quantity: number; note?: string }[], username = 'mozo') => {
    return createDomainQuote(state, visitId, lines, now, id(), actor(username));
  };
  const open = () => run({ type: 'table.open', table_id: state.tables[0]!.id, expected_version: state.tables[0]!.version });
  const order = (indices = [0, 3, 6], quantity = 1) => {
    const visit = state.visits[0]!;
    return run({ type: 'order.create', visit_id: visit.id, expected_version: visit.version, lines: indices.map(i => ({ product_id: state.products[i]!.id, quantity })) });
  };
  const cash = () => run({ type: 'cash.open', opening_minor: 20000, shift_label: 'diurno', expected_day_version: state.business_day.version }, 'caja');
  const auth = (method: PaymentMethod, amount = state.checks[0]!.remaining_collectible_minor, username = 'caja') => {
    const c = state.cash_sessions.find(s => s.state === 'open')!;
    return run({ type: 'collection.authorize', cash_session_id: c.id, check_id: state.checks[0]!.id, expected_version: state.checks[0]!.version, method, amount_minor: amount }, username);
  };
  const evidence = (reference = 'REC-001') => ({ source: 'merchant_verified' as const, merchant_account: 'comercio-laboratorio', external_reference: reference, observed_at: now });
  const stockCounts = () => state.stock.filter(s => s.station === 'caja').map(s => ({ stock_item_id: s.id, counted_quantity: s.on_hand }));
  const begin = () => run({ type: 'handover.begin', cash_session_id: state.cash_sessions[0]!.id, expected_version: state.cash_sessions[0]!.version, incoming_user_id: actor('noche').user.id }, 'caja');
  const count = (cashCount = state.cash_sessions[0]!.expected_minor) => run({ type: 'handover.count', handover_id: state.handovers[0]!.id, expected_version: state.handovers[0]!.version, counted_cash_minor: cashCount, stock_counts: stockCounts() }, 'caja');
  const accept = () => run({ type: 'handover.accept', handover_id: state.handovers[0]!.id, expected_version: state.handovers[0]!.version }, 'noche');
  return { run, quote, open, order, cash, auth, evidence, stockCounts, begin, count, accept, actor, get state() { return state; }, setNow(value: string) { now = value; } };
}


describe('marisquería authoritative domain', () => {
  it('restricts kitchen preparation to station staff or administration', () => {
    const h=harness();h.open();h.order([0]);
    expect(()=>h.run({type:'line.prepare',line_id:h.state.orders[0]!.lines[0]!.id,expected_version:1,quantity:1})).toThrow('perfil');
    expect(()=>h.run({type:'line.prepare',line_id:h.state.orders[0]!.lines[0]!.id,expected_version:1,quantity:1},'caja')).toThrow('perfil');
  });
  it('requires active beverage custody and denies stock consumption after the signed close', () => {
    const h=harness();h.open();h.order([3]);const line=h.state.orders[0]!.lines[0]!;
    expect(()=>h.run({type:'line.fulfill',line_id:line.id,expected_version:1,quantity:1})).toThrow('custodia');h.cash();
    const c=h.state.cash_sessions[0]!;h.run({type:'day.close',cash_session_id:c.id,expected_version:c.version,expected_day_version:h.state.business_day.version,counted_cash_minor:20000,stock_counts:h.stockCounts(),reason:'Conteo final sellado'},'caja');
    expect(()=>h.run({type:'line.fulfill',line_id:line.id,expected_version:1,quantity:1})).toThrow('cerrado');expect(h.state.stock[0]!.on_hand).toBe(48);
  });
  it('never closes a new day with a former day cash session or changes its old count', () => {
    const h=harness();h.cash();const cash=h.state.cash_sessions[0]!;
    h.run({type:'day.close',cash_session_id:cash.id,expected_version:cash.version,expected_day_version:h.state.business_day.version,counted_cash_minor:20000,stock_counts:h.stockCounts(),reason:'Fin del primer día'},'caja');
    h.run({type:'day.open',expected_day_version:h.state.business_day.version,reason:'Comenzar siguiente día'},'admin');
    expect(()=>h.run({type:'day.close',cash_session_id:cash.id,expected_version:h.state.cash_sessions[0]!.version,expected_day_version:h.state.business_day.version,counted_cash_minor:20000,stock_counts:h.stockCounts(),reason:'Reutilizar caja antigua'},'caja')).toThrow('actual');
    expect(h.state.business_day.state).toBe('open');expect(h.state.day_closes).toHaveLength(1);
  });
  it('recovers a disputed handover independently, preserving both approval reasons and rejection', () => {
    const h=harness();h.cash();h.begin();h.count(19000);const key=h.state.handovers[0]!.id;
    h.run({type:'handover.approve',handover_id:key,expected_version:2,reason:'Primera aprobación de faltante'},'admin');
    h.run({type:'handover.reject',handover_id:key,expected_version:3,reason:'Receptor solicita verificación'},'noche');
    expect(()=>h.accept()).toThrow();
    h.run({type:'handover.approve',handover_id:key,expected_version:4,reason:'Segunda revisión con evidencia'},'admin');h.accept();
    expect(h.state.handovers[0]).toMatchObject({state:'accepted',counted_cash_minor:19000,reason:'Receptor solicita verificación'});
    expect(h.state.audit.filter(a=>a.action==='handover.approve').map(a=>a.reason)).toEqual(['Primera aprobación de faltante','Segunda revisión con evidencia']);
    expect(h.state.audit.find(a=>a.action==='handover.reject')!.reason).toBe('Receptor solicita verificación');
  });
  it('creates a single visit and denies a stale second terminal', () => {
    const h = harness(); h.open();
    expect(() => h.run({ type: 'table.open', table_id: h.state.tables[0]!.id, expected_version: 1 })).toThrow('información cambió');
    expect(h.state.visits).toHaveLength(1);
  });
  it('rejects cross-tenant and forged roles before accessing entity IDs', () => {
    const h = harness();
    const command: PosCommand = { type: 'cash.open', operation_id: 'x', opening_minor: 0, shift_label: 'diurno', expected_day_version: 1 };
    expect(() => executeCommand(h.state, { ...h.actor('caja'), tenant_id: 'other' }, command, { now: h.state.last_event_at, id: () => 'x' })).toThrow('pertenece');
    const forged = { ...h.actor('mozo'), user: { ...h.actor('mozo').user, role: 'admin' as const } };
    expect(() => executeCommand(h.state, forged, command, { now: h.state.last_event_at, id: () => 'x' })).toThrow('permisos');
  });
  it('routes mixed orders into exactly two print jobs and no beverage printer', () => {
    const h = harness(); h.open(); h.order();
    expect(h.state.print_jobs.map(p => p.station).sort()).toEqual(['cocina', 'heladeria']);
    expect(h.state.checks[0]!.total_minor).toBe(5300);
    expect(h.state.stock[0]!.reserved).toBe(1);
    expect(h.state.stock[0]!.on_hand).toBe(48);
  });
  it('adds batches with preserved actor and prevents lost edits', () => {
    const h = harness(); h.open(); const old = h.state.visits[0]!.version; h.order([0]);
    expect(() => h.run({ type: 'order.create', visit_id: h.state.visits[0]!.id, expected_version: old, lines: [{ product_id: h.state.products[1]!.id, quantity: 1 }] }, 'caja')).toThrow();
    h.order([1]); expect(h.state.orders.map(o => o.batch_number)).toEqual([1, 2]);
    expect(h.state.checks[0]!.total_minor).toBe(6700);
  });
  it('does not commit partial stock reservations when a later line is invalid', () => {
    const h = harness(); h.open(); const before = structuredClone(h.state);
    expect(() => h.run({ type: 'order.create', visit_id: h.state.visits[0]!.id, expected_version: 1, lines: [{ product_id: h.state.products[3]!.id, quantity: 2 }, { product_id: 'missing', quantity: 1 }] })).toThrow();
    expect(h.state).toEqual(before);
  });
  it('rejects aggregate stock overselling even with duplicate product lines', () => {
    const h = harness(); h.open();
    expect(() => h.run({ type: 'order.create', visit_id: h.state.visits[0]!.id, expected_version: 1, lines: [{ product_id: h.state.products[3]!.id, quantity: 30 }, { product_id: h.state.products[3]!.id, quantity: 30 }] })).toThrow('stock');
    expect(h.state.stock[0]!.reserved).toBe(0);
  });
  it.each([0, -1, 1.2, Number.NaN, 1000000000])('rejects non-whole sale units %s in laboratory', qty => {
    const h = harness(); h.open(); expect(() => h.order([3], qty)).toThrow();
  });
  it('directly fulfills one of two beers once, preserving the remaining reservation', () => {
    const h = harness(); h.open(); h.order([3], 2); h.cash(); const line = h.state.orders[0]!.lines[0]!;
    h.run({ type: 'line.fulfill', line_id: line.id, expected_version: 1, quantity: 1 });
    expect(h.state.stock[0]).toMatchObject({ on_hand: 47, reserved: 1, available: 46 });
    expect(() => h.run({ type: 'line.fulfill', line_id: line.id, expected_version: 1, quantity: 1 })).toThrow('información cambió');
    expect(h.state.stock_movements.filter(m => m.kind === 'fulfillment')).toHaveLength(1);
  });
  it('does not fulfill kitchen items before preparation or consume stocked ice cream twice', () => {
    const h = harness(); h.open(); h.order([7]); const line = h.state.orders[0]!.lines[0]!;
    expect(() => h.run({ type: 'line.fulfill', line_id: line.id, expected_version: 1, quantity: 1 })).toThrow('Primero');
    h.run({ type: 'line.prepare', line_id: line.id, expected_version: 1, quantity: 1 }, 'heladeria');
    expect(h.state.stock[3]!.on_hand).toBe(20);
    h.run({ type: 'line.fulfill', line_id: line.id, expected_version: 2, quantity: 1 });
    expect(h.state.stock[3]!.on_hand).toBe(19);
  });
  it('forbids another station from preparing or acknowledging its ticket', () => {
    const h = harness(); h.open(); h.order([0]);
    expect(() => h.run({ type: 'line.prepare', line_id: h.state.orders[0]!.lines[0]!.id, expected_version: 1, quantity: 1 }, 'heladeria')).toThrow('otra estación');
    expect(() => h.run({ type: 'print.ack', print_job_id: h.state.print_jobs[0]!.id, expected_version: 1, state: 'bridge_received', evidence: 'Recibida localmente' }, 'heladeria')).toThrow('otra estación');
  });
  it('keeps print ambiguity terminal and creates an explicit copy without duplicating commerce', () => {
    const h = harness(); h.open(); h.order([0]); const job = h.state.print_jobs[0]!;
    h.run({ type: 'print.ack', print_job_id: job.id, expected_version: 1, state: 'ambiguous', evidence: 'Se perdió respuesta' }, 'caja');
    expect(() => h.run({ type: 'print.ack', print_job_id: job.id, expected_version: 2, state: 'bridge_received', evidence: 'Reenviar' }, 'caja')).toThrow('incierto');
    h.run({ type: 'print.copy', print_job_id: job.id, expected_version: 2, reason: 'Cocina solicita copia' }, 'caja');
    expect(h.state.print_jobs[1]!.copy_of).toBe(job.id); expect(h.state.orders).toHaveLength(1); expect(h.state.checks[0]!.total_minor).toBe(3500);
  });
  it('denies collection to waiters and prevents even an admin using another cashier drawer', () => {
    const h = harness(); h.open(); h.order(); h.cash();
    expect(() => h.auth('cash', 1000, 'mozo')).toThrow('perfil');
    expect(() => h.auth('cash', 1000, 'admin')).toThrow('otro responsable');
  });
  it('supports mixed payments and nets physical cash after change exactly once', () => {
    const h = harness(); h.open(); h.order(); h.cash();
    let a = h.auth('cash', 2000); h.run({ type: 'payment.confirm', authorization_id: a, received_minor: 5000 }, 'caja');
    a = h.auth('card', 2000); h.run({ type: 'payment.confirm', authorization_id: a, evidence: h.evidence('CARD-001') }, 'caja');
    a = h.auth('yape', 1300); h.run({ type: 'payment.confirm', authorization_id: a, evidence: h.evidence('YAPE-001') }, 'caja');
    expect(h.state.checks[0]).toMatchObject({ paid_minor: 5300, held_minor: 0, remaining_collectible_minor: 0 });
    expect(h.state.cash_sessions[0]!.expected_minor).toBe(22000); expect(h.state.payments[0]!.change_minor).toBe(3000);
  });
  it('rejects insufficient cash received without consuming authorization', () => {
    const h = harness(); h.open(); h.order(); h.cash(); const a = h.auth('cash', 1000);
    expect(() => h.run({ type: 'payment.confirm', authorization_id: a, received_minor: 900 }, 'caja')).toThrow('menor');
    expect(h.state.authorizations[0]!.status).toBe('reserved'); expect(h.state.payments).toHaveLength(0);
  });
  it('unknown retains its quota and cannot be charged again as cash', () => {
    const h = harness(); h.open(); h.order([3]); h.cash(); const a = h.auth('yape');
    h.run({ type: 'payment.unknown', authorization_id: a, reason: 'App del comercio sin respuesta' }, 'caja');
    expect(h.state.checks[0]).toMatchObject({ paid_minor: 0, held_minor: 1000, remaining_collectible_minor: 0 });
    expect(() => h.auth('cash', 1000)).toThrow('saldo libre');
  });
  it('enforces unique merchant evidence across two partial payments', () => {
    const h = harness(); h.open(); h.order(); h.cash(); let a = h.auth('yape', 1000);
    h.run({ type: 'payment.confirm', authorization_id: a, evidence: h.evidence() }, 'caja'); a = h.auth('yape', 1000);
    expect(() => h.run({ type: 'payment.confirm', authorization_id: a, evidence: h.evidence() }, 'caja')).toThrow('referencia');
    expect(h.state.payments).toHaveLength(1); expect(h.state.checks[0]!.held_minor).toBe(1000);
  });
  it('binds receipt identity to the configured merchant, preventing free-text account bypass', () => {
    const h=harness();h.open();h.order();h.cash();let a=h.auth('yape',1000);
    h.run({type:'payment.confirm',authorization_id:a,evidence:h.evidence('SAME-RECEIPT')},'caja');a=h.auth('yape',1000);
    expect(()=>h.run({type:'payment.confirm',authorization_id:a,evidence:{...h.evidence('SAME-RECEIPT'),merchant_account:'another-account'}},'caja')).toThrow('configurada');
    expect(h.state.payments).toHaveLength(1);expect(h.state.checks[0]!.paid_minor).toBe(1000);expect(h.state.checks[0]!.held_minor).toBe(1000);
  });
  it('prevents cutting a still unused authorization', () => {
    const h = harness(); h.open(); h.order(); h.cash(); h.auth('cash', 1000);
    expect(() => h.begin()).toThrow('autorizaciones');
    expect(h.state.cash_sessions[0]!.state).toBe('open');
  });
  it('freezes beverage effects and cash but permits a kitchen batch during count', () => {
    const h = harness(); h.open(); h.order([3]); h.cash(); h.begin();
    expect(() => h.run({ type: 'line.fulfill', line_id: h.state.orders[0]!.lines[0]!.id, expected_version: 1, quantity: 1 })).toThrow('congeladas');
    expect(() => h.run({ type: 'collection.authorize', cash_session_id: h.state.cash_sessions[0]!.id, check_id: h.state.checks[0]!.id, expected_version: h.state.checks[0]!.version, method: 'cash', amount_minor: 1000 }, 'caja')).toThrow('conteo'); h.order([0]);
    expect(h.state.orders).toHaveLength(2);
  });
  it('redacts expectations and reconstruction ledgers from blind-count participants', () => {
    const h = harness(); h.cash(); h.begin(); const view = projectSnapshot(h.state, h.actor('caja'));
    expect(view.cash_sessions[0]!.expected_minor).toBeNull(); expect(view.stock[0]!.on_hand).toBeNull();
    expect(view.handovers[0]!.expected_cash_minor).toBeNull(); expect(view.stock_movements).toEqual([]);
    h.count(); expect(projectSnapshot(h.state, h.actor('caja')).cash_sessions[0]!.expected_minor).toBe(20000);
  });
  it('opens a single successor without artificial stock movements or cash collections', () => {
    const h = harness(); h.cash(); const before = h.state.stock_movements.length; h.begin(); h.count(); h.accept();
    expect(h.state.cash_sessions.filter(s => s.state === 'open')).toHaveLength(1); expect(h.state.stock_movements).toHaveLength(before); expect(h.state.payments).toEqual([]);
    expect(() => h.accept()).toThrow(); expect(h.state.cash_sessions).toHaveLength(2);
  });
  it('requires an independent administrator approval for cash or stock differences', () => {
    const h = harness(); h.cash(); h.begin(); h.count(19000);
    expect(() => h.accept()).toThrow('diferencias');
    expect(() => h.run({ type: 'handover.approve', handover_id: h.state.handovers[0]!.id, expected_version: 2, reason: 'Autorizar faltante' }, 'noche')).toThrow('perfil');
    h.run({ type: 'handover.approve', handover_id: h.state.handovers[0]!.id, expected_version: 2, reason: 'Faltante investigado y autorizado' }, 'admin'); h.accept();
    expect(h.state.cash_sessions[1]!.opening_minor).toBe(19000); expect(h.state.cash_sessions[0]!.difference_minor).toBe(-1000);
  });
  it('resolves unknown after transfer into the collecting shift without rewriting the initiated shift', () => {
    const h = harness(); h.open(); h.order([3]); h.cash(); const a = h.auth('yape'); h.run({ type: 'payment.unknown', authorization_id: a, reason: 'Sin respuesta externa' }, 'caja');
    h.begin(); h.count(); h.accept();
    const p = h.state.payments[0]!;
    h.run({ type: 'payment.resolve', payment_id: p.id, expected_version: p.version, cash_session_id: h.state.cash_sessions[1]!.id, evidence: h.evidence() }, 'noche');
    expect(h.state.payments[0]!.initiated_cash_session_id).toBe(h.state.cash_sessions[0]!.id); expect(h.state.payments[0]!.cash_session_id).toBe(h.state.cash_sessions[1]!.id);
    expect(h.state.checks[0]!.held_minor).toBe(0); expect(h.state.cash_sessions[0]!.expected_minor).toBe(20000);
  });
  it('preserves business date across midnight and excludes internal float in close', () => {
    const h = harness(); h.open(); h.order([3]); h.cash(); let a = h.auth('cash', 1000); h.run({ type: 'payment.confirm', authorization_id: a }, 'caja');
    h.begin(); h.count(); h.accept(); h.setNow('2026-10-02T06:00:00Z');
    const night = h.state.cash_sessions[1]!;
    h.run({ type: 'day.close', cash_session_id: night.id, expected_version: night.version, expected_day_version: h.state.business_day.version, counted_cash_minor: 21000, stock_counts: h.stockCounts(), reason: 'Cierre después de medianoche' }, 'noche');
    const close = h.state.day_closes[0]!;
    expect(h.state.business_day.business_date).toBe('2026-10-01'); expect(close.initial_external_float_minor).toBe(20000); expect(close.collections_minor).toBe(1000); expect(close.expected_final_cash_minor).toBe(21000); expect(close.state).toBe('provisionally_closed');
  });
  it('keeps unknown and open balances visible in provisional day closure', () => {
    const h = harness(); h.open(); h.order([3]); h.cash(); const a = h.auth('card'); h.run({ type: 'payment.unknown', authorization_id: a, reason: 'Respuesta incierta' }, 'caja');
    const c = h.state.cash_sessions[0]!; h.run({ type: 'day.close', cash_session_id: c.id, expected_version: c.version, expected_day_version: h.state.business_day.version, counted_cash_minor: 20000, stock_counts: h.stockCounts(), reason: 'Cierre con pendientes' }, 'caja');
    expect(h.state.day_closes[0]!.unknown_payment_ids).toHaveLength(1); expect(h.state.day_closes[0]!.open_check_ids).toHaveLength(1); expect(h.state.checks[0]!.held_minor).toBe(1000);
  });
  it('advances laboratory day preserving history and collects old balance without new sale', () => {
    const h = harness(); h.open(); h.order([3]); h.cash(); const c = h.state.cash_sessions[0]!;
    h.run({ type: 'day.close', cash_session_id: c.id, expected_version: c.version, expected_day_version: h.state.business_day.version, counted_cash_minor: 20000, stock_counts: h.stockCounts(), reason: 'Pendiente de cobro' }, 'caja');
    const oldClose = structuredClone(h.state.day_closes[0]);
    h.run({ type: 'day.open', expected_day_version: h.state.business_day.version, reason: 'Avance de laboratorio autorizado' }, 'admin'); h.cash();
    expect(h.state.business_day.business_date).toBe('2026-10-02'); expect(h.state.business_days).toHaveLength(2); expect(() => h.order([0])).toThrow('día anterior');
    const a = h.auth('cash'); h.run({ type: 'payment.confirm', authorization_id: a }, 'caja'); const nc = h.state.cash_sessions[1]!;
    h.run({ type: 'day.close', cash_session_id: nc.id, expected_version: nc.version, expected_day_version: h.state.business_day.version, counted_cash_minor: 21000, stock_counts: h.stockCounts(), reason: 'Cobranza de saldo anterior' }, 'caja');
    expect(h.state.day_closes[1]!.sales_minor).toBe(0); expect(h.state.day_closes[1]!.prior_day_collections_minor).toBe(1000); expect(h.state.day_closes[0]).toEqual(oldClose);
  });
  it('requires separate inventory declaration and a different approving identity', () => {
    const h = harness(); h.cash(); const stock = h.state.stock[0]!;
    const count = h.run({ type: 'inventory.count', reason: 'Conteo diario', lines: [{ stock_item_id: stock.id, expected_version: stock.version, counted_quantity: 47 }] }, 'caja');
    expect(h.state.stock[0]!.on_hand).toBe(48);
    h.run({ type: 'inventory.adjust', inventory_count_id: count, approval_reason: 'Faltante documentado' }, 'admin');
    expect(h.state.stock[0]!.on_hand).toBe(47); expect(h.state.stock_movements.at(-1)!.kind).toBe('adjustment');
    expect(() => h.run({ type: 'inventory.adjust', inventory_count_id: count, approval_reason: 'Otra vez' }, 'admin')).toThrow();
  });
  it('does not allow adjustment after a pending cancellation changed the stock version', () => {
    const h = harness(); h.cash(); h.open(); h.order([3]); const stock = h.state.stock[0]!;
    const count = h.run({ type: 'inventory.count', reason: 'Conteo diario', lines: [{ stock_item_id: stock.id, expected_version: stock.version, counted_quantity: 47 }] }, 'caja');
    h.run({ type: 'order.line.void', line_id: h.state.orders[0]!.lines[0]!.id, expected_version: h.state.visits[0]!.version, quantity: 1, restore_stock: false, reason: 'Conciliar pendiente contado' }, 'caja');
    expect(() => h.run({ type: 'inventory.adjust', inventory_count_id: count, approval_reason: 'Faltante autorizado' }, 'admin')).toThrow('cambió');
  });
  it('does not leak cashier evidence and cash books to waiters or other stations', () => {
    const h = harness(); h.open(); h.order(); h.cash(); const a = h.auth('cash'); h.run({ type: 'payment.confirm', authorization_id: a }, 'caja');
    const waiter = projectSnapshot(h.state, h.actor('mozo')); expect(waiter.payments).toEqual([]); expect(waiter.cash_sessions).toEqual([]); expect(waiter.audit).toEqual([]);
    const kitchen = projectSnapshot(h.state, h.actor('cocina')); expect(kitchen.checks).toEqual([]); expect(kitchen.orders[0]!.lines.every(l => l.station === 'cocina')).toBe(true); expect(kitchen.print_jobs.every(p => p.station === 'cocina')).toBe(true);
  });
  it('never treats internal note as accepted fiscal document', () => {
    const h = harness(); h.open(); h.order([3]); h.cash(); const a = h.auth('cash'); h.run({ type: 'payment.confirm', authorization_id: a }, 'caja');
    h.run({ type: 'sale.note', check_id: h.state.checks[0]!.id, expected_version: h.state.checks[0]!.version }, 'caja');
    expect(h.state.sales_notes[0]!.legend).toBe('NOTA DE VENTA INTERNA - NO ES COMPROBANTE DE PAGO'); expect(h.state.checks[0]!.fiscal_status).toBe('pending');
  });
  it('rejects order with PRICE_CHANGED when catalog price is updated after quoting', () => {
    const h = harness(); h.open();
    const ceviche = h.state.products[0]!;
    expect(ceviche.price_minor).toBe(3500);
    const visit = h.state.visits[0]!;
    // 1. Quoting at S/ 35.00
    const quote = h.quote(visit.id, [{ product_id: ceviche.id, quantity: 1 }]);
    expect(quote.total_minor).toBe(3500);

    // 2. Admin updates price to S/ 38.00
    h.run({
      type: 'catalog.product.update',
      product_id: ceviche.id,
      expected_version: ceviche.version,
      name: ceviche.name,
      category: ceviche.category,
      price_minor: 3800,
      active: true,
      reason: 'Ajuste de costo por temporada'
    }, 'admin');
    expect(h.state.products[0]!.price_minor).toBe(3800);

    // 3. Attempting to place order with old quote fails with PRICE_CHANGED
    let caught: any;
    try {
      h.run({
        type: 'order.create',
        visit_id: visit.id,
        expected_version: visit.version,
        quote_id: quote.id
      }, 'mozo', quote);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(DomainError);
    expect(caught.code).toBe('PRICE_CHANGED');
    expect(caught.status).toBe(409);
    expect(caught.details?.changed_products).toEqual([
      {
        product_id: ceviche.id,
        product_name: ceviche.name,
        old_price_minor: 3500,
        new_price_minor: 3800
      }
    ]);
    expect(h.state.orders).toHaveLength(0);

    // 4. Requoting at S/ 38.00 succeeds
    const newQuote = h.quote(visit.id, [{ product_id: ceviche.id, quantity: 1 }]);
    expect(newQuote.total_minor).toBe(3800);
    h.run({
      type: 'order.create',
      visit_id: visit.id,
      expected_version: visit.version,
      quote_id: newQuote.id
    }, 'mozo', newQuote);
    expect(h.state.orders).toHaveLength(1);
    expect(h.state.checks[0]!.total_minor).toBe(3800);
  });
  it('rejects order with QUOTE_EXPIRED when quote exceeds 120s TTL', () => {
    const h = harness(); h.open();
    const ceviche = h.state.products[0]!;
    const visit = h.state.visits[0]!;
    const quote = h.quote(visit.id, [{ product_id: ceviche.id, quantity: 1 }]);
    // Advance time past 120 seconds
    h.setNow('2026-10-01T15:02:05Z');
    let caught: any;
    try {
      h.run({
        type: 'order.create',
        visit_id: visit.id,
        expected_version: visit.version,
        quote_id: quote.id
      }, 'mozo', quote);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(DomainError);
    expect(caught.code).toBe('QUOTE_EXPIRED');
    expect(caught.status).toBe(409);
    expect(h.state.orders).toHaveLength(0);
  });
  it('locks station and stock policy modification when product has commercial history', () => {
    const h = harness(); h.open();
    h.order([0]); // Order ceviche (cocina)
    const ceviche = h.state.products[0]!;
    expect(() => h.run({
      type: 'catalog.product.update',
      product_id: ceviche.id,
      expected_version: ceviche.version,
      name: ceviche.name,
      category: ceviche.category,
      price_minor: ceviche.price_minor,
      active: true,
      station: 'heladeria',
      reason: 'Mover ceviche a heladería'
    }, 'admin')).toThrow('historial comercial');
  });
  it('allows admin to create new product and records catalog audit', () => {
    const h = harness();
    expect(() => h.run({
      type: 'catalog.product.create',
      name: 'Chicha Morada 1L',
      category: 'Bebidas',
      price_minor: 1200,
      station: 'caja',
      stock_policy: 'none',
      reason: 'Nuevo producto'
    }, 'mozo')).toThrow('perfil');

    h.run({
      type: 'catalog.product.create',
      name: 'Chicha Morada 1L',
      category: 'Bebidas',
      price_minor: 1200,
      station: 'caja',
      stock_policy: 'none',
      reason: 'Nuevo producto'
    }, 'admin');

    const created = h.state.products.find(p => p.name === 'Chicha Morada 1L')!;
    expect(created).toBeDefined();
    expect(created.price_minor).toBe(1200);
    expect(created.version).toBe(1);
    expect(created.active).toBe(true);

    const audit = h.state.catalog_audit.find(a => a.product_id === created.id)!;
    expect(audit).toBeDefined();
    expect(audit.action).toBe('create');
    expect(audit.reason).toBe('Nuevo producto');
  });
  it('detects catalog version conflicts on concurrent updates', () => {
    const h = harness();
    const p = h.state.products[0]!;
    expect(() => h.run({
      type: 'catalog.product.update',
      product_id: p.id,
      expected_version: p.version + 99,
      name: p.name,
      category: p.category,
      price_minor: 4000,
      active: true,
      reason: 'Precio con version desactualizada'
    }, 'admin')).toThrow('información cambió');
  });

  describe('anulaciones de comanda y liberación de cobros (007)', () => {
    it('US1: cashier voids unfulfilled beverage with automatic reservation release and check recalculation', () => {
      const h = harness(); h.open();
      h.order([0, 3]); // Ceviche (3500) + Cerveza (1000) = 4500
      const visit = h.state.visits[0]!;
      const beerLine = h.state.orders[0]!.lines.find(l => l.product_name === 'Cerveza personal')!;
      expect(h.state.stock[0]!.reserved).toBe(1);
      expect(h.state.stock[0]!.available).toBe(47);
      expect(h.state.checks[0]!.total_minor).toBe(4500);

      h.run({
        type: 'order.line.void',
        line_id: beerLine.id,
        expected_version: visit.version,
        quantity: 1,
        restore_stock: false,
        reason: 'Comensal canceló la bebida'
      }, 'caja');

      expect(h.state.stock[0]!.reserved).toBe(0);
      expect(h.state.stock[0]!.available).toBe(48);
      expect(h.state.stock[0]!.on_hand).toBe(48);
      expect(h.state.checks[0]!.total_minor).toBe(3500);
      expect(h.state.checks[0]!.remaining_collectible_minor).toBe(3500);

      const updatedLine = h.state.orders[0]!.lines.find(l => l.id === beerLine.id)!;
      expect(updatedLine.voided_quantity).toBe(1);
      expect(updatedLine.void_reason).toBe('Comensal canceló la bebida');

      const audit = h.state.void_audit.find(a => a.line_id === beerLine.id)!;
      expect(audit).toBeDefined();
      expect(audit.quantity).toBe(1);
      expect(audit.amount_minor).toBe(1000);
      expect(audit.restored_stock).toBe(false);
    });

    it('US1: voids kitchen dish emitting cancellation print job to cocina', () => {
      const h = harness(); h.open();
      h.order([0]); // Ceviche clásico (3500)
      const visit = h.state.visits[0]!;
      const cevicheLine = h.state.orders[0]!.lines[0]!;

      h.run({
        type: 'order.line.void',
        line_id: cevicheLine.id,
        expected_version: visit.version,
        quantity: 1,
        restore_stock: false,
        reason: 'Alergia al marisco informada a tiempo'
      }, 'caja');

      const voidJob = h.state.print_jobs.find(j => j.reason?.includes('ANULACIÓN'));
      expect(voidJob).toBeDefined();
      expect(voidJob!.station).toBe('cocina');
      expect(voidJob!.lines[0]!.product_name).toContain('[ANULADO]');
    });

    it('US2: cashier voids delivered item with physical stock restitution (restore_stock: true)', () => {
      const h = harness(); h.open(); h.cash();
      h.order([3]); // Cerveza personal (1000)
      const beerLine = h.state.orders[0]!.lines[0]!;
      h.run({ type: 'line.fulfill', line_id: beerLine.id, expected_version: beerLine.version, quantity: 1 }, 'caja');
      expect(h.state.stock[0]!.on_hand).toBe(47);
      expect(h.state.stock[0]!.reserved).toBe(0);

      const visit = h.state.visits[0]!;
      h.run({
        type: 'order.line.void',
        line_id: beerLine.id,
        expected_version: visit.version,
        quantity: 1,
        restore_stock: true,
        reason: 'Botella cerrada devuelta por el cliente'
      }, 'caja');

      expect(h.state.stock[0]!.on_hand).toBe(48);
      expect(h.state.stock[0]!.available).toBe(48);
      const adjMovement = h.state.stock_movements.find(m => m.kind === 'adjustment')!;
      expect(adjMovement).toBeDefined();
      expect(adjMovement.quantity_delta).toBe(1);
      expect(adjMovement.reason).toContain('Botella cerrada devuelta');
    });

    it('US2: cashier voids delivered item as waste (restore_stock: false) preserving physical count', () => {
      const h = harness(); h.open(); h.cash();
      h.order([3]);
      const beerLine = h.state.orders[0]!.lines[0]!;
      h.run({ type: 'line.fulfill', line_id: beerLine.id, expected_version: beerLine.version, quantity: 1 }, 'caja');
      expect(h.state.stock[0]!.on_hand).toBe(47);

      const visit = h.state.visits[0]!;
      h.run({
        type: 'order.line.void',
        line_id: beerLine.id,
        expected_version: visit.version,
        quantity: 1,
        restore_stock: false,
        reason: 'Bebida derramada / merma'
      }, 'caja');

      expect(h.state.stock[0]!.on_hand).toBe(47);
      expect(h.state.stock_movements.some(m => m.kind === 'adjustment')).toBe(false);
    });

    it('US3: denies waiter attempt to void order line with HTTP 403', () => {
      const h = harness(); h.open(); h.order([0]);
      const visit = h.state.visits[0]!;
      const line = h.state.orders[0]!.lines[0]!;
      expect(() => h.run({
        type: 'order.line.void',
        line_id: line.id,
        expected_version: visit.version,
        quantity: 1,
        restore_stock: false,
        reason: 'Intento de anulación directa por mozo'
      }, 'mozo')).toThrow('perfil');
    });

    it('US4: cashier releases held authorization and unlocks check balance', () => {
      const h = harness(); h.open(); h.cash();
      h.order([0]); // Ceviche 3500
      const authId = h.auth('card', 2000, 'caja');
      expect(h.state.checks[0]!.held_minor).toBe(2000);
      expect(h.state.checks[0]!.remaining_collectible_minor).toBe(1500);

      h.run({
        type: 'collection.release',
        authorization_id: authId,
        expected_version: h.state.checks[0]!.version,
        reason: 'Cliente cambió de opinión y pagará todo en efectivo'
      }, 'caja');

      const auth = h.state.authorizations.find(a => a.id === authId)!;
      expect(auth.status).toBe('released');
      expect(h.state.checks[0]!.held_minor).toBe(0);
      expect(h.state.checks[0]!.remaining_collectible_minor).toBe(3500);

      // Cannot confirm a released authorization
      expect(() => h.run({
        type: 'payment.confirm',
        authorization_id: authId,
        evidence: h.evidence('AUTH-REL')
      }, 'caja')).toThrow('consumida');
    });

    it('rejects voiding more units than active quantity', () => {
      const h = harness(); h.open(); h.order([0], 2);
      const visit = h.state.visits[0]!;
      const line = h.state.orders[0]!.lines[0]!;
      expect(() => h.run({
        type: 'order.line.void',
        line_id: line.id,
        expected_version: visit.version,
        quantity: 3,
        restore_stock: false,
        reason: 'Supera cantidad'
      }, 'caja')).toThrow('supera la cantidad');
    });

    it('rejects voiding when paid amount exceeds resulting total (CHECK_BALANCE_EXCEEDED)', () => {
      const h = harness(); h.open(); h.cash();
      h.order([0, 3]); // Ceviche 3500 + Cerveza 1000 = 4500
      // Pay 3500 in cash
      const authId = h.auth('cash', 3500, 'caja');
      h.run({ type: 'payment.confirm', authorization_id: authId, received_minor: 3500 }, 'caja');
      expect(h.state.checks[0]!.paid_minor).toBe(3500);
      expect(h.state.checks[0]!.remaining_collectible_minor).toBe(1000);

      // Attempt to void Ceviche (3500): new total would be 1000, but already paid is 3500
      const visit = h.state.visits[0]!;
      const cevicheLine = h.state.orders[0]!.lines.find(l => l.product_name === 'Ceviche clásico')!;
      expect(() => h.run({
        type: 'order.line.void',
        line_id: cevicheLine.id,
        expected_version: visit.version,
        quantity: 1,
        restore_stock: false,
        reason: 'Anular plato ya pagado'
      }, 'caja')).toThrow('saldo libre');
    });

    it('allows closing table cleanly when all remaining unvoided items are fulfilled', () => {
      const h = harness(); h.open(); h.cash();
      h.order([3], 2); // 2 Cervezas (2000 minor)
      const visit = h.state.visits[0]!;
      const beerLine = h.state.orders[0]!.lines[0]!;

      // Void 1 cerveza
      h.run({
        type: 'order.line.void',
        line_id: beerLine.id,
        expected_version: visit.version,
        quantity: 1,
        restore_stock: false,
        reason: 'Cliente canceló una de las dos cervezas'
      }, 'caja');

      expect(h.state.checks[0]!.total_minor).toBe(1000);

      // Fulfill the remaining 1 cerveza using the updated line version
      const currentBeerLine = h.state.orders[0]!.lines[0]!;
      h.run({ type: 'line.fulfill', line_id: currentBeerLine.id, expected_version: currentBeerLine.version, quantity: 1 }, 'caja');

      // Pay the remaining 1000 minor
      const authId = h.auth('cash', 1000, 'caja');
      h.run({ type: 'payment.confirm', authorization_id: authId, received_minor: 1000 }, 'caja');

      // Table can close!
      const currentVisit = h.state.visits[0]!;
      h.run({ type: 'table.close', visit_id: currentVisit.id, expected_version: currentVisit.version }, 'mozo');
      expect(h.state.visits[0]!.status).toBe('closed');
    });
  });

  describe('fiscal.document.issue', () => {
    it('emits boleta B001 for paid check with exact IGV 18% and keeps check.fiscal_status pending', () => {
      const h = harness(); h.open(); h.cash();
      h.order([0, 3]); // Ceviche (3500) + Cerveza (1000) = 4500 (S/ 45.00)
      const authId = h.auth('cash', 4500, 'caja');
      h.run({ type: 'payment.confirm', authorization_id: authId, received_minor: 4500 }, 'caja');
      const check = h.state.checks[0]!;

      const docId = h.run({
        type: 'fiscal.document.issue',
        check_id: check.id,
        expected_check_version: check.version,
        doc_type: 'boleta',
        customer_doc_type: 'sin_documento',
        customer_name: 'CLIENTES VARIOS'
      }, 'caja');

      expect(docId).toBeDefined();
      expect(h.state.checks[0]!.fiscal_status).toBe('pending');
      expect(h.state.fiscal_documents).toHaveLength(1);

      const doc = h.state.fiscal_documents[0]!;
      expect(doc.doc_type).toBe('boleta');
      expect(doc.series).toBe('B001');
      expect(doc.number).toBe(1);
      expect(doc.full_number).toBe('B001-00000001');
      expect(doc.customer_name).toBe('CLIENTES VARIOS');
      expect(doc.total_minor).toBe(4500);
      expect(doc.op_gravada_minor).toBe(3814); // 4500 * 100 / 118 = 3813.56 -> 3814
      expect(doc.igv_minor).toBe(686); // 4500 - 3814 = 686
      expect(doc.op_gravada_minor + doc.igv_minor).toBe(4500);
      expect(doc.digest_hash).toBeDefined();
      expect(doc.qr_payload).toContain('00000000000|03|B001|00000001'); // Placeholder, not a configured taxpayer.
      expect(doc.items).toHaveLength(2);
    });

    it('emits factura F001 with valid 11-digit RUC and business name', () => {
      const h = harness(); h.open(); h.cash();
      h.order([0], 2); // 2 Ceviches = 7000 (S/ 70.00)
      const authId = h.auth('cash', 7000, 'caja');
      h.run({ type: 'payment.confirm', authorization_id: authId, received_minor: 7000 }, 'caja');
      const check = h.state.checks[0]!;

      h.run({
        type: 'fiscal.document.issue',
        check_id: check.id,
        expected_check_version: check.version,
        doc_type: 'factura',
        customer_doc_type: 'ruc',
        customer_doc_number: '20601234567',
        customer_name: 'CORPORACION GASTRONOMICA SAC',
        customer_address: 'Av. Los Próceres 123'
      }, 'caja');

      expect(h.state.fiscal_documents).toHaveLength(1);
      const doc = h.state.fiscal_documents[0]!;
      expect(doc.doc_type).toBe('factura');
      expect(doc.series).toBe('F001');
      expect(doc.number).toBe(1);
      expect(doc.full_number).toBe('F001-00000001');
      expect(doc.customer_doc_number).toBe('20601234567');
      expect(doc.customer_name).toBe('CORPORACION GASTRONOMICA SAC');
      expect(doc.qr_payload).toContain('00000000000|01|F001|00000001'); // No real fiscal issuer in this simulator.
    });

    it('rejects factura with invalid RUC or missing business name', () => {
      const h = harness(); h.open(); h.cash();
      h.order([0], 1);
      const authId = h.auth('cash', 3500, 'caja');
      h.run({ type: 'payment.confirm', authorization_id: authId, received_minor: 3500 }, 'caja');
      const check = h.state.checks[0]!;

      // Invalid RUC (only 10 digits)
      expect(() => h.run({
        type: 'fiscal.document.issue',
        check_id: check.id,
        expected_check_version: check.version,
        doc_type: 'factura',
        customer_doc_type: 'ruc',
        customer_doc_number: '2060123456',
        customer_name: 'EMPRESA TEST'
      }, 'caja')).toThrow('11 dígitos');

      // Invalid RUC starting with 15
      expect(() => h.run({
        type: 'fiscal.document.issue',
        check_id: check.id,
        expected_check_version: check.version,
        doc_type: 'factura',
        customer_doc_type: 'ruc',
        customer_doc_number: '15601234567',
        customer_name: 'EMPRESA TEST'
      }, 'caja')).toThrow('10 o 20');
    });

    it('rejects double issuance on check already issued (ALREADY_ISSUED)', () => {
      const h = harness(); h.open(); h.cash();
      h.order([0], 1);
      const authId = h.auth('cash', 3500, 'caja');
      h.run({ type: 'payment.confirm', authorization_id: authId, received_minor: 3500 }, 'caja');
      const check = h.state.checks[0]!;

      h.run({
        type: 'fiscal.document.issue',
        check_id: check.id,
        expected_check_version: check.version,
        doc_type: 'boleta',
        customer_doc_type: 'sin_documento',
        customer_name: 'CLIENTES VARIOS'
      }, 'caja');

      // Attempt second issuance
      const currentCheck = h.state.checks[0]!;
      expect(() => h.run({
        type: 'fiscal.document.issue',
        check_id: currentCheck.id,
        expected_check_version: currentCheck.version,
        doc_type: 'boleta',
        customer_doc_type: 'sin_documento',
        customer_name: 'CLIENTES VARIOS'
      }, 'caja')).toThrow('ya tiene un comprobante');
    });

    it('rejects emission by waiter role (FORBIDDEN)', () => {
      const h = harness(); h.open(); h.cash();
      h.order([0], 1);
      const authId = h.auth('cash', 3500, 'caja');
      h.run({ type: 'payment.confirm', authorization_id: authId, received_minor: 3500 }, 'caja');
      const check = h.state.checks[0]!;

      expect(() => h.run({
        type: 'fiscal.document.issue',
        check_id: check.id,
        expected_check_version: check.version,
        doc_type: 'boleta',
        customer_doc_type: 'sin_documento',
        customer_name: 'CLIENTES VARIOS'
      }, 'mozo')).toThrow('Tu perfil no permite');
    });
  });

  describe('Commercial Discounts and Table Comps', () => {
    it('applies percentage discount and recalculates check balance with audit', () => {
      const h = harness(); h.open();
      h.order([0], 2); // 2 Ceviches = 7000
      const check = h.state.checks[0]!;
      expect(check.total_minor).toBe(7000);
      expect(check.remaining_collectible_minor).toBe(7000);

      h.run({
        type: 'check.discount.apply',
        check_id: check.id,
        expected_version: check.version,
        kind: 'percentage',
        percent: 10,
        reason: 'Convenio corporativo 10%'
      }, 'caja');

      const updated = h.state.checks[0]!;
      expect(updated.discount_minor).toBe(700);
      expect(updated.total_minor).toBe(6300);
      expect(updated.remaining_collectible_minor).toBe(6300);
      expect(updated.discount_kind).toBe('percentage');
      expect(updated.discount_percent).toBe(10);
      expect(updated.discount_reason).toBe('Convenio corporativo 10%');

      // Verify audit
      expect(h.state.discount_audit.length).toBe(1);
      expect(h.state.discount_audit[0]!.discount_minor).toBe(700);
      expect(h.state.discount_audit[0]!.reason).toBe('Convenio corporativo 10%');
    });

    it('applies fixed discount in PEN cents', () => {
      const h = harness(); h.open();
      h.order([0], 1); // 1 Ceviche = 3500
      const check = h.state.checks[0]!;

      h.run({
        type: 'check.discount.apply',
        check_id: check.id,
        expected_version: check.version,
        kind: 'fixed',
        amount_minor: 500,
        reason: 'Cortesía por demora'
      }, 'caja');

      const updated = h.state.checks[0]!;
      expect(updated.discount_minor).toBe(500);
      expect(updated.total_minor).toBe(3000);
      expect(updated.remaining_collectible_minor).toBe(3000);
    });

    it('rejects discount application by waiter role (FORBIDDEN)', () => {
      const h = harness(); h.open();
      h.order([0], 1);
      const check = h.state.checks[0]!;

      expect(() => h.run({
        type: 'check.discount.apply',
        check_id: check.id,
        expected_version: check.version,
        kind: 'percentage',
        percent: 15,
        reason: 'Descuento no autorizado'
      }, 'mozo')).toThrow('Tu perfil no permite');
    });

    it('rejects discount exceeding collectible balance', () => {
      const h = harness(); h.open(); h.cash();
      h.order([0], 1); // 3500
      const authId = h.auth('cash', 3000, 'caja');
      h.run({ type: 'payment.confirm', authorization_id: authId, received_minor: 3000 }, 'caja');

      const check = h.state.checks[0]!;
      expect(check.remaining_collectible_minor).toBe(500);

      // Attempting 1000 discount when only 500 remains collectible
      expect(() => h.run({
        type: 'check.discount.apply',
        check_id: check.id,
        expected_version: check.version,
        kind: 'fixed',
        amount_minor: 1000,
        reason: 'Descuento excesivo'
      }, 'caja')).toThrow('debajo de lo ya cobrado');
    });

    it('allows removing an applied discount and restores original gross total', () => {
      const h = harness(); h.open();
      h.order([0], 2); // 7000
      let check = h.state.checks[0]!;

      h.run({
        type: 'check.discount.apply',
        check_id: check.id,
        expected_version: check.version,
        kind: 'percentage',
        percent: 20,
        reason: 'Error inicial'
      }, 'caja');

      check = h.state.checks[0]!;
      expect(check.total_minor).toBe(5600);

      h.run({
        type: 'check.discount.remove',
        check_id: check.id,
        expected_version: check.version,
        reason: 'Cliente prefirió pagar completo'
      }, 'caja');

      check = h.state.checks[0]!;
      expect(check.discount_minor).toBe(0);
      expect(check.total_minor).toBe(7000);
      expect(check.remaining_collectible_minor).toBe(7000);
    });

    it('fiscal issuance computes taxes on net total after discount', () => {
      const h = harness(); h.open(); h.cash();
      h.order([0], 2); // 7000
      let check = h.state.checks[0]!;

      // 10% discount -> 6300 net
      h.run({
        type: 'check.discount.apply',
        check_id: check.id,
        expected_version: check.version,
        kind: 'percentage',
        percent: 10,
        reason: 'Cliente VIP'
      }, 'caja');

      check = h.state.checks[0]!;
      // Pay full net amount
      const authId = h.auth('cash', 6300, 'caja');
      h.run({ type: 'payment.confirm', authorization_id: authId, received_minor: 6300 }, 'caja');

      check = h.state.checks[0]!;
      // Issue Factura
      h.run({
        type: 'fiscal.document.issue',
        check_id: check.id,
        expected_check_version: check.version,
        doc_type: 'factura',
        customer_doc_type: 'ruc',
        customer_doc_number: '20601234567',
        customer_name: 'RESTAURANTE MARITIMO SAC'
      }, 'caja');

      const doc = h.state.fiscal_documents[0]!;
      expect(doc.total_minor).toBe(6300);
      expect(doc.op_gravada_minor).toBe(5339);
      expect(doc.igv_minor).toBe(961);
      expect(doc.op_gravada_minor + doc.igv_minor).toBe(6300);
    });
  });

  describe('notas de crédito electrónicas SUNAT (010)', () => {
    it('NCR-AC-001: issues BC01 credit note for boleta with exact tax reversal and annulled status', () => {
      const h = harness(); h.open(); h.cash();
      h.order([0]); // Ceviche (3500)
      let check = h.state.checks[0]!;
      const authId = h.auth('cash', 3500, 'caja');
      h.run({ type: 'payment.confirm', authorization_id: authId, received_minor: 3500 }, 'caja');
      check = h.state.checks[0]!;

      // Issue Boleta
      h.run({
        type: 'fiscal.document.issue',
        check_id: check.id,
        expected_check_version: check.version,
        doc_type: 'boleta',
        customer_doc_type: 'sin_documento',
        customer_name: 'CLIENTES VARIOS'
      }, 'caja');

      const boleta = h.state.fiscal_documents.find(d => d.doc_type === 'boleta')!;
      expect(boleta).toBeDefined();
      expect(boleta.full_number).toBe('B001-00000001');

      // Issue Credit Note BC01
      h.run({
        type: 'fiscal.credit_note.issue',
        document_id: boleta.id,
        reason_code: '01',
        reason_description: 'Anulación de la operación por error de mesa'
      }, 'caja');

      const nc = h.state.fiscal_documents.find(d => d.doc_type === 'nota_credito')!;
      expect(nc).toBeDefined();
      expect(nc.series).toBe('BC01');
      expect(nc.number).toBe(1);
      expect(nc.full_number).toBe('BC01-00000001');
      expect(nc.modified_document_id).toBe(boleta.id);
      expect(nc.modified_document_full_number).toBe('B001-00000001');
      expect(nc.sunat_reason_code).toBe('01');
      expect(nc.sunat_reason_description).toBe('Anulación de la operación por error de mesa');
      expect(nc.total_minor).toBe(3500);
      expect(nc.op_gravada_minor).toBe(boleta.op_gravada_minor);
      expect(nc.igv_minor).toBe(boleta.igv_minor);
      expect(nc.qr_payload).toContain('|07|BC01|00000001|');

      // Boleta original status should be annulled with credit note reference
      const updatedBoleta = h.state.fiscal_documents.find(d => d.id === boleta.id)!;
      expect(updatedBoleta.status).toBe('annulled');
      expect(updatedBoleta.credit_note_id).toBe(nc.id);
      expect(updatedBoleta.credit_note_full_number).toBe('BC01-00000001');

      // Check fiscal_status is reverted to pending
      check = h.state.checks[0]!;
      expect(check.fiscal_status).toBe('pending');
    });

    it('NCR-AC-002: issues FC01 credit note for factura with reason code 02 (error in RUC)', () => {
      const h = harness(); h.open(); h.cash();
      h.order([0]); // Ceviche (3500)
      let check = h.state.checks[0]!;
      const authId = h.auth('cash', 3500, 'caja');
      h.run({ type: 'payment.confirm', authorization_id: authId, received_minor: 3500 }, 'caja');
      check = h.state.checks[0]!;

      // Issue Factura
      h.run({
        type: 'fiscal.document.issue',
        check_id: check.id,
        expected_check_version: check.version,
        doc_type: 'factura',
        customer_doc_type: 'ruc',
        customer_doc_number: '20608974512',
        customer_name: 'CORPORACION HUAMANGA SAC'
      }, 'caja');

      const factura = h.state.fiscal_documents.find(d => d.doc_type === 'factura')!;
      expect(factura.full_number).toBe('F001-00000001');

      // Issue Credit Note FC01
      h.run({
        type: 'fiscal.credit_note.issue',
        document_id: factura.id,
        reason_code: '02',
        reason_description: 'Anulación por error en el RUC del adquirente'
      }, 'admin');

      const nc = h.state.fiscal_documents.find(d => d.doc_type === 'nota_credito')!;
      expect(nc.series).toBe('FC01');
      expect(nc.number).toBe(1);
      expect(nc.full_number).toBe('FC01-00000001');
      expect(nc.modified_document_full_number).toBe('F001-00000001');
      expect(nc.sunat_reason_code).toBe('02');
      const updatedFactura = h.state.fiscal_documents.find(d => d.id === factura.id)!;
      expect(updatedFactura.status).toBe('annulled');
      expect(updatedFactura.credit_note_full_number).toBe('FC01-00000001');
    });

    it('NCR-AC-003: rejects duplicate credit note issuance on already annulled document', () => {
      const h = harness(); h.open(); h.cash();
      h.order([0]);
      let check = h.state.checks[0]!;
      const authId = h.auth('cash', 3500, 'caja');
      h.run({ type: 'payment.confirm', authorization_id: authId, received_minor: 3500 }, 'caja');
      check = h.state.checks[0]!;

      h.run({
        type: 'fiscal.document.issue',
        check_id: check.id,
        expected_check_version: check.version,
        doc_type: 'boleta',
        customer_doc_type: 'sin_documento',
        customer_name: 'CLIENTES VARIOS'
      }, 'caja');

      const boleta = h.state.fiscal_documents[0]!;

      // First NC
      h.run({
        type: 'fiscal.credit_note.issue',
        document_id: boleta.id,
        reason_code: '01',
        reason_description: 'Primera anulación'
      }, 'caja');

      // Second NC on same document should fail
      expect(() => h.run({
        type: 'fiscal.credit_note.issue',
        document_id: boleta.id,
        reason_code: '01',
        reason_description: 'Intento duplicado de anulación'
      }, 'caja')).toThrow('ya fue anulado');
    });

    it('NCR-AC-004: forbids waiters from issuing credit notes', () => {
      const h = harness(); h.open(); h.cash();
      h.order([0]);
      let check = h.state.checks[0]!;
      const authId = h.auth('cash', 3500, 'caja');
      h.run({ type: 'payment.confirm', authorization_id: authId, received_minor: 3500 }, 'caja');
      check = h.state.checks[0]!;

      h.run({
        type: 'fiscal.document.issue',
        check_id: check.id,
        expected_check_version: check.version,
        doc_type: 'boleta',
        customer_doc_type: 'sin_documento',
        customer_name: 'CLIENTES VARIOS'
      }, 'caja');

      const boleta = h.state.fiscal_documents[0]!;

      expect(() => h.run({
        type: 'fiscal.credit_note.issue',
        document_id: boleta.id,
        reason_code: '01',
        reason_description: 'Intento por mozo'
      }, 'mozo')).toThrow('Tu perfil no permite esta operación');
    });

    it('rejects invalid reason codes or short descriptions', () => {
      const h = harness(); h.open(); h.cash();
      h.order([0]);
      let check = h.state.checks[0]!;
      const authId = h.auth('cash', 3500, 'caja');
      h.run({ type: 'payment.confirm', authorization_id: authId, received_minor: 3500 }, 'caja');
      check = h.state.checks[0]!;

      h.run({
        type: 'fiscal.document.issue',
        check_id: check.id,
        expected_check_version: check.version,
        doc_type: 'boleta',
        customer_doc_type: 'sin_documento',
        customer_name: 'CLIENTES VARIOS'
      }, 'caja');

      const boleta = h.state.fiscal_documents[0]!;

      // Invalid reason code
      expect(() => h.run({
        type: 'fiscal.credit_note.issue',
        document_id: boleta.id,
        // @ts-expect-error invalid code test
        reason_code: '99',
        reason_description: 'Motivo inválido'
      }, 'caja')).toThrow('Código de motivo SUNAT inválido');

      // Reason description too short
      expect(() => h.run({
        type: 'fiscal.credit_note.issue',
        document_id: boleta.id,
        reason_code: '01',
        reason_description: 'no'
      }, 'caja')).toThrow('mínimo 3 caracteres');
    });
  });
});


