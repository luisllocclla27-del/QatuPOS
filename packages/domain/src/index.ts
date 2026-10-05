import { createHash } from 'node:crypto';
import type { PosCommand, PosSnapshot, StaffUser, OrderLine, Check, CashSession, MerchantEvidence, StockCountLine, PrintJob, Product, OrderQuote, QuoteLineInput, QuoteLineView, CatalogAuditEntry, OrderVoidAuditEntry, FiscalDocument, FiscalItem, CheckDiscountAuditEntry, SunatCreditReasonCode } from '@qatu/contracts';
import { addExact, invariant, minor, roundRatio, DomainError } from './exact.js';
import { createInitialState, syntheticStaff, type Actor, type BranchState, type Scope } from './state.js';
import { serviceMode, productAvailableInService, serviceSequence, operationalCloseBlockers } from './operations.js';
export { serviceMode, productAvailableInService, operationalCloseBlockers } from './operations.js';
export { createInitialState, syntheticStaff, DomainError };
export type { Actor, BranchState, Scope };
export interface GuestPrincipal { access_id: string; session_id: string; visit_id: string }
export interface CommandContext { now: string; id: () => string; guest?: GuestPrincipal; quote?: OrderQuote }

function member(state: BranchState, actor: Actor): StaffUser {
  invariant(actor.tenant_id === state.tenant_id && actor.branch_id === state.branch.id, 'FORBIDDEN', 'La sesión no pertenece a este local.', 403);
  const user = state.staff.find(u => u.id === actor.user.id);
  invariant(user && user.active !== false && user.role === actor.user.role && user.station === actor.user.station, 'FORBIDDEN', 'La identidad o sus permisos ya no son válidos.', 403);
  return user;
}
function staffProfile(name: string, staffRole: string, station: string | null): void {
  invariant(typeof name === 'string' && name.trim().length >= 2 && name.length <= 100, 'VALIDATION_ERROR', 'Nombre entre 2 y 100 caracteres.', 400);
  invariant(['waiter', 'cashier', 'kitchen', 'admin'].includes(staffRole) && (['waiter', 'admin'].includes(staffRole) ? station === null : staffRole === 'cashier' ? station === 'caja' : ['cocina', 'heladeria'].includes(station ?? '')), 'VALIDATION_ERROR', 'El perfil y la estación no son compatibles.', 400);
}
function role(user: StaffUser, ...allowed: StaffUser['role'][]): void {
  invariant(user.active !== false && allowed.includes(user.role), 'FORBIDDEN', 'Tu perfil no permite esta operación.', 403);
}
function find<T extends { id: string }>(array: T[], id: string): T {
  const value = array.find(item => item.id === id);
  invariant(value, 'NOT_FOUND', 'No se encontró el recurso en este local.', 404);
  return value;
}
function version(value: { version: number }, expected: number): void {
  invariant(value.version === expected, 'VERSION_CONFLICT', 'La información cambió. Actualiza antes de continuar.');
}
function units(value: number, zero = false): number {
  invariant(Number.isSafeInteger(value) && value >= (zero ? 0 : 1) && value <= 999999999, 'VALIDATION_ERROR', 'La cantidad debe ser una unidad entera válida.', 400);
  return value;
}
function reason(value: string): string {
  invariant(typeof value === 'string' && value.trim().length >= 3 && value.length <= 500, 'VALIDATION_ERROR', 'Escribe un motivo de al menos tres caracteres.', 400);
  return value.trim();
}
function openDay(state: BranchState): void {
  invariant(state.business_day.state === 'open', 'INVALID_TRANSITION', 'El día operativo está cerrado; no se pueden añadir nuevas ventas.');
}
function ownedCash(state: BranchState, user: StaffUser, id: string): CashSession {
  role(user, 'cashier', 'admin');
  const cash = find(state.cash_sessions, id);
  invariant(cash.owner_id === user.id, 'FORBIDDEN', 'Esta caja pertenece a otro responsable.', 403);
  invariant(cash.state === 'open', 'CASH_NOT_OPEN', 'La caja está cerrada o en conteo.');
  invariant(cash.business_day_id === state.business_day.id && state.business_day.state === 'open', 'CASH_NOT_OPEN', 'Abre una caja del día operativo actual.');
  return cash;
}
function beverageFrozen(state: BranchState): boolean {
  return state.handovers.some(h => ['prepared', 'declared', 'disputed'].includes(h.state));
}
function pendingStockCount(state: BranchState, stockId: string): boolean {
  return state.inventory_counts.some(c => c.status === 'declared' && c.lines.some(l => l.stock_item_id === stockId));
}
function editableConsumptionDay(state: BranchState, check: Check): void {
  invariant(state.orders.filter(o => o.check_id === check.id).every(o => o.business_day_id === state.business_day.id), 'BUSINESS_DAY_LOCKED', 'El consumo pertenece a un día operativo anterior. Conserva su cierre y utiliza un flujo de ajustes posteriores, todavía no habilitado.');
}
function validateProductBinding(state: BranchState, product: Pick<Product, 'station' | 'stock_policy' | 'stock_item_id'>): void {
  invariant(['cocina', 'heladeria', 'caja'].includes(product.station), 'VALIDATION_ERROR', 'Estación inválida.', 400);
  invariant(['none', 'unit'].includes(product.stock_policy), 'VALIDATION_ERROR', 'Política de stock inválida.', 400);
  if (product.stock_policy === 'none') {
    invariant(product.stock_item_id === null, 'VALIDATION_ERROR', 'Un producto sin control de stock no puede vincular inventario.', 400);
    return;
  }
  const stock = state.stock.find(s => s.id === product.stock_item_id);
  invariant(stock, 'VALIDATION_ERROR', 'El recurso de inventario vinculado no existe en este local.', 400);
  invariant(stock.station === product.station, 'VALIDATION_ERROR', 'El inventario debe pertenecer a la misma estación del producto.', 400);
}
function lineIn(state: BranchState, id: string): OrderLine {
  const line = state.orders.flatMap(order => order.lines).find(item => item.id === id);
  invariant(line, 'NOT_FOUND', 'La línea no pertenece al local.', 404);
  return line;
}
function lineAccess(user: StaffUser, line: OrderLine): void {
  role(user, 'waiter', 'cashier', 'admin', 'kitchen');
  if (user.role === 'kitchen') invariant(user.station === line.station, 'FORBIDDEN', 'La línea pertenece a otra estación.', 403);
}
function cashDelta(state: BranchState, cash: CashSession, delta: number): void {
  cash.expected_minor = addExact(cash.expected_minor, delta);
  invariant(cash.expected_minor >= 0, 'CHECK_BALANCE_EXCEEDED', 'El retiro supera el efectivo esperado.');
  cash.version++;
}
function evidence(state: BranchState, value: MerchantEvidence | undefined, method: string, now: string, except?: string): MerchantEvidence {
  invariant(value && value.source === 'merchant_verified' && value.merchant_account.trim().length >= 2 && value.external_reference.trim().length >= 3 && Number.isFinite(Date.parse(value.observed_at)) && Date.parse(value.observed_at) <= Date.parse(now) + 300000, 'VALIDATION_ERROR', 'Se requiere evidencia verificada en la cuenta del comercio.', 400);
  const normalized = { ...value, merchant_account: value.merchant_account.trim(), external_reference: value.external_reference.trim() };
  invariant(normalized.merchant_account === 'comercio-laboratorio', 'VALIDATION_ERROR', 'Usa la cuenta del comercio configurada para este laboratorio.', 400);
  invariant(!state.payments.some(p => p.id !== except && p.method === method && p.evidence?.merchant_account === normalized.merchant_account && p.evidence?.external_reference === normalized.external_reference), 'DUPLICATE_EVIDENCE', 'La referencia ya se aplicó a otro pago.');
  return normalized;
}
function countedStock(state: BranchState, counts: { stock_item_id: string; counted_quantity: number }[], cajaOnly: boolean): StockCountLine[] {
  const expectedItems = state.stock.filter(s => !cajaOnly || s.station === 'caja');
  invariant(counts.length === expectedItems.length && new Set(counts.map(c => c.stock_item_id)).size === counts.length, 'VALIDATION_ERROR', 'Declara una vez cada producto incluido en el conteo.', 400);
  return expectedItems.map(s => {
    const count = counts.find(c => c.stock_item_id === s.id);
    invariant(count, 'VALIDATION_ERROR', 'Falta un producto en el conteo.', 400);
    const counted = units(count.counted_quantity, true);
    return { stock_item_id: s.id, expected_quantity: s.on_hand, counted_quantity: counted, difference_quantity: counted - s.on_hand };
  });
}
function validateNightClosing(state: BranchState, cash: CashSession, lines: StockCountLine[]): void {
  openDay(state);
  invariant(cash.shift_label === 'nocturno', 'OPERATIONAL_CLOSE_BLOCKED', 'El cierre operativo final corresponde al turno nocturno.');
  invariant(cash.state === 'open' && cash.business_day_id === state.business_day.id && state.cash_sessions.filter(c => c.business_day_id === state.business_day.id).at(-1)?.id === cash.id, 'CASH_NOT_OPEN', 'Usa la última sesión nocturna abierta del día actual.');
  invariant(state.cash_sessions.filter(c => c.id !== cash.id && c.business_day_id === state.business_day.id).every(c => c.state === 'closed'), 'CASH_NOT_OPEN', 'Todavía hay otra caja abierta.');
  const problems = operationalCloseBlockers(state);
  invariant(problems.length === 0, 'OPERATIONAL_CLOSE_BLOCKED', problems.join(' '));
  invariant(lines.every(l => l.difference_quantity === 0), 'OPERATIONAL_CLOSE_BLOCKED', 'Concilia el inventario de bebidas mediante conteo y aprobación antes del cierre final.');
}

/** Server-side projection. No fiscal/payment/cash detail reaches waiter or station accounts. */
export function projectSnapshot(state: BranchState, actor: Actor, serverTime = state.last_event_at): PosSnapshot {
  const user = member(state, actor);
  const { tenant_id: _tenant, last_event_at: _time, count_versions: _counts, ...base } = structuredClone(state);
  const snapshot: PosSnapshot = {
    ...base, server_time: serverTime, user: structuredClone(user),
    service_mode: serviceMode(state), available_product_ids: state.products.filter(p => productAvailableInService(state, p)).map(p => p.id), cash_close_approvals: base.cash_close_approvals ?? [],
    fiscal_documents: base.fiscal_documents ?? [],
    capabilities: { qr_orders: false, ecommerce: false, delivery: false, real_payments: false, fiscal_issuance: false, network_printing: false, offline_writer: false },
  };
  if (user.role !== 'admin') {
    snapshot.catalog_audit = [];
  }
  if (user.role === 'waiter' || user.role === 'kitchen') {
    snapshot.cash_close_approvals = [];
    snapshot.staff = [];
    snapshot.stock = []; snapshot.stock_movements = []; snapshot.authorizations = []; snapshot.payments = [];
    snapshot.cash_sessions = []; snapshot.cash_movements = []; snapshot.handovers = []; snapshot.inventory_counts = [];
    snapshot.day_closes = []; snapshot.sales_notes = []; snapshot.audit = [];
    snapshot.void_audit = [];
    snapshot.discount_audit = [];
    snapshot.checks = snapshot.checks.map(check => ({ ...check, discount_reason: null }));
    snapshot.fiscal_documents = [];
  }
  if (user.role === 'kitchen') {
    snapshot.guest_accesses = [];
    snapshot.products = snapshot.products.filter(p => p.station === user.station);
    snapshot.orders = snapshot.orders.map(o => ({ ...o, lines: o.lines.filter(l => l.station === user.station) })).filter(o => o.lines.length);
    const orderIds = new Set(snapshot.orders.map(o => o.id));
    snapshot.print_jobs = snapshot.print_jobs.filter(p => p.station === user.station && orderIds.has(p.order_id));
    snapshot.checks = [];
    snapshot.visits = snapshot.visits.filter(v => snapshot.orders.some(o => o.visit_id === v.id));
    snapshot.tables = snapshot.tables.filter(t => snapshot.visits.some(v => v.table_id === t.id));
  }
  const blind = state.handovers.find(h => h.state === 'prepared' && (h.outgoing_user_id === user.id || h.incoming_user_id === user.id));
  if (blind) {
    snapshot.cash_close_approvals = [];
    snapshot.cash_sessions = snapshot.cash_sessions.map(s => s.id === blind.cash_session_id ? { ...s, expected_minor: null } : s);
    snapshot.handovers = snapshot.handovers.map(h => h.id === blind.id ? { ...h, expected_cash_minor: null, stock_lines: h.stock_lines.map(l => ({ ...l, expected_quantity: null, difference_quantity: null })) } : h);
    snapshot.stock = snapshot.stock.map(s => s.station === 'caja' ? { ...s, on_hand: null, reserved: null, available: null } : s);
    // Prevent reconstruction of expected totals from the cash/stock ledgers during the blind declaration.
    snapshot.payments = []; snapshot.cash_movements = []; snapshot.stock_movements = []; snapshot.day_closes = [];
    snapshot.inventory_counts = []; snapshot.authorizations = [];
    snapshot.fiscal_documents = []; snapshot.discount_audit = [];
  }
  for (const check of snapshot.checks) {
    if (check.fiscal_status === 'issued' && state.fiscal_documents?.some(d => d.check_id === check.id && ['accepted_simulated', 'annulled'].includes(d.status))) check.fiscal_status = 'pending';
  }
  for (const order of snapshot.orders) {
    order.service_sequence = serviceSequence(state, order);
    order.production_version ??= 1; order.priority ??= 'normal';
    const visit = state.visits.find(v => v.id === order.visit_id);
    order.responsible_name ??= visit?.responsible_waiter_name ?? state.staff.find(s => s.id === visit?.opened_by)?.name ?? 'Responsable por asignar';
  }
  return snapshot;
}

/** Deterministic business rules; caller commits returned state + outbox + idempotency in one scoped PostgreSQL transaction. */
export function executeCommand(original: BranchState, actor: Actor, command: PosCommand, context: CommandContext): { state: BranchState; entity_id: string; snapshot: PosSnapshot } {
  const state = structuredClone(original);
  const user = member(state, actor);
  const { now, id } = context;
  invariant(Number.isFinite(Date.parse(now)), 'VALIDATION_ERROR', 'Hora del servidor inválida.', 400);
  if(context.guest) {
    const access=state.guest_accesses.find(a=>a.id===context.guest!.access_id && a.visit_id===context.guest!.visit_id);
    invariant(command.type==='order.create' && command.visit_id===context.guest.visit_id && access?.state==='active', 'GUEST_ACCESS_ENDED', 'La atención del cliente concluyó o su clave cambió.',403);
  }
  let entityId = '';
  if (state.environment === 'operational') {
    invariant(!['fiscal.document.issue', 'fiscal.credit_note.issue', 'print.ack', 'payment.resolve', 'payment.unknown'].includes(command.type), 'UNSUPPORTED_CAPABILITY', 'Esta integración aún no está conectada; no se permite confirmar una simulación.');
    if (command.type === 'collection.authorize') invariant(command.method === 'cash', 'UNSUPPORTED_CAPABILITY', 'Configura y verifica el registro de tarjeta/Yape antes de habilitarlo.');
    if (command.type === 'payment.confirm') invariant(find(state.authorizations, command.authorization_id).method === 'cash', 'UNSUPPORTED_CAPABILITY', 'La confirmación digital requiere integración verificada.');
  }
  switch (command.type) {
    case 'guest.access': {
      role(user,'waiter');
      const visit=find(state.visits,command.visit_id);version(visit,command.expected_version);
      if (!visit.responsible_waiter_id) { visit.responsible_waiter_id = user.id; visit.responsible_waiter_name = user.name; }
      const check=find(state.checks,visit.check_id);
      invariant(visit.status==='open' && check.status==='open' && !(check.total_minor>0 && check.paid_minor===check.total_minor && check.held_minor===0),'GUEST_ACCESS_ENDED','Esta atención ya concluyó; no puede reactivarse la clave.',403);
      const active=state.guest_accesses.find(a=>a.visit_id===visit.id && a.state==='active');reason(command.reason);
      if(command.action==='revoke' || command.action==='rotate') {
        invariant(active,'INVALID_TRANSITION','No hay una clave activa para cambiar.');
        active.state='revoked';active.ended_at=now;
      }
      if(command.action==='revoke') entityId=active!.id;
      else if(command.action==='activate' && active) entityId=active.id;
      else {
        openDay(state);entityId=id();
        state.guest_accesses.push({id:entityId,visit_id:visit.id,state:'active',created_by:user.id,created_at:now,ended_at:null});
      }
      visit.version++;break;
    }
    case 'stock.create': {
      role(user, 'admin'); openDay(state); reason(command.reason);
      invariant(typeof command.name === 'string' && command.name.trim().length >= 2 && command.name.length <= 100 && /^[A-Z0-9][A-Z0-9_-]{1,49}$/.test(command.sku), 'VALIDATION_ERROR', 'Nombre y SKU válidos obligatorios.', 400);
      invariant(['caja', 'heladeria'].includes(command.station) && (command.station === 'caja' ? ['beer', 'soda', 'water'].includes(command.beverage_kind ?? '') : command.beverage_kind === null), 'VALIDATION_ERROR', 'La clase de bebida debe corresponder a Caja y la estación debe ser válida.', 400);
      invariant(!state.stock.some(s => s.sku === command.sku), 'VALIDATION_ERROR', 'Ese SKU ya existe en este local.', 400);
      invariant(command.station !== 'caja' || !beverageFrozen(state), 'RESOURCE_COUNTING', 'No se cambia el inventario de Caja durante el corte.');
      const stockId = id(); state.stock.push({ id: stockId, name: command.name.trim(), sku: command.sku, station: command.station, unit: 'unit', on_hand: 0, reserved: 0, available: 0, version: 1, ...(command.beverage_kind ? { beverage_kind: command.beverage_kind } : {}) }); entityId = stockId; break;
    }
    case 'stock.receive': {
      role(user, 'admin', 'cashier'); openDay(state); const stock = find(state.stock, command.stock_item_id); version(stock, command.expected_version);
      if (user.role === 'cashier') { invariant(stock.station === 'caja', 'FORBIDDEN', 'Caja recibe solamente sus bebidas.', 403); const cash = state.cash_sessions.find(c => c.owner_id === user.id && c.business_day_id === state.business_day.id && c.state === 'open'); invariant(cash, 'CASH_NOT_OPEN', 'Necesitas tu propia caja abierta para recibir bebidas.'); ownedCash(state, user, cash.id); }
      invariant(!pendingStockCount(state, stock.id), 'RESOURCE_COUNTING', 'Resuelve el conteo pendiente antes de recibir nuevas unidades.');
      invariant(stock.station !== 'caja' || !beverageFrozen(state), 'RESOURCE_COUNTING', 'Caja y bebidas están protegidas durante el corte.');
      invariant(typeof command.receipt_reference === 'string' && command.receipt_reference.trim().length >= 3 && command.receipt_reference.length <= 100, 'VALIDATION_ERROR', 'Referencia de recepción entre 3 y100 caracteres.', 400);
      const reference = command.receipt_reference.trim().toUpperCase().replace(/\s+/g, ' '), quantity = units(command.quantity), why = reason(command.reason);
      invariant(!state.stock_movements.some(m => m.stock_item_id === stock.id && m.kind === 'receipt' && m.receipt_reference === reference), 'INVALID_TRANSITION', 'Esta recepción y SKU ya están registrados.');
      const nextOnHand = units(addExact(stock.on_hand, quantity)); stock.on_hand = nextOnHand; stock.available = Math.max(0, nextOnHand - stock.reserved); stock.version++;
      state.stock_movements.push({ id: id(), stock_item_id: stock.id, quantity_delta: quantity, kind: 'receipt', receipt_reference: reference, operation_id: command.operation_id, actor_id: user.id, created_at: now, reason: why }); entityId = stock.id; break;
    }
    case 'staff.create': {
      role(user, 'admin');
      invariant(/^[a-z][a-z0-9_.-]{2,49}$/.test(command.username) && !state.staff.some(s => s.username === command.username), 'VALIDATION_ERROR', 'El usuario debe ser único, de 3 a 50 caracteres en minúsculas.', 400);
      staffProfile(command.name, command.role, command.station); reason(command.reason);
      const staffId = id(); state.staff.push({ id: staffId, username: command.username, name: command.name.trim(), role: command.role, station: command.station, active: false, credential_ready: false, version: 1 }); entityId = staffId; break;
    }
    case 'staff.update': {
      role(user, 'admin'); const target = find(state.staff, command.staff_id);
      version({ version: target.version ?? 1 }, command.expected_version); staffProfile(command.name, command.role, command.station); reason(command.reason);
      invariant(target.id !== user.id || command.active && command.role === 'admin', 'FORBIDDEN', 'No puedes quitarte tu propio acceso administrativo.', 403);
      invariant(!command.active || target.credential_ready !== false, 'INVALID_TRANSITION', 'Establece una contraseña individual antes de activar.');
      if (target.active !== false && target.role === 'admin' && (!command.active || command.role !== 'admin')) invariant(state.staff.some(s => s.id !== target.id && s.role === 'admin' && s.active !== false), 'INVALID_TRANSITION', 'Debe permanecer al menos un administrador activo.');
      if (!command.active || target.role !== command.role || target.station !== command.station) {
        invariant(!state.cash_sessions.some(c => c.owner_id === target.id && c.state !== 'closed') && !state.handovers.some(h => ['prepared', 'declared', 'disputed'].includes(h.state) && [h.outgoing_user_id, h.incoming_user_id].includes(target.id)) && !state.orders.some(o => o.lines.some(l => l.dispatch_claim?.actor_id === target.id)) && !state.visits.some(v => v.status === 'open' && v.responsible_waiter_id === target.id), 'INVALID_TRANSITION', 'Reasigna mesas/retiros o termina caja y custodia antes de cambiar sus permisos.');
      }
      target.name = command.name.trim(); target.role = command.role; target.station = command.station; target.active = command.active; target.version = (target.version ?? 1) + 1; entityId = target.id; break;
    }
    case 'table.open': {
      role(user, 'waiter', 'cashier', 'admin'); openDay(state);
      const table = find(state.tables, command.table_id); version(table, command.expected_version);
      invariant(table.visit_id === null, 'TABLE_OCCUPIED', 'La mesa ya tiene una cuenta abierta.');
      const visitId = id(), checkId = id();
      state.visits.push({ id: visitId, table_id: table.id, check_id: checkId, version: 1, status: 'open', opened_by: user.id, opened_at: now, closed_at: null, ...(user.role === 'waiter' ? { responsible_waiter_id: user.id, responsible_waiter_name: user.name } : {}) });
      state.checks.push({ id: checkId, visit_id: visitId, version: 1, status: 'open', total_minor: 0, paid_minor: 0, held_minor: 0, remaining_collectible_minor: 0, fiscal_status: 'pending', currency: 'PEN', discount_minor: 0, discount_reason: null, discount_kind: null, discount_percent: null });
      table.visit_id = visitId; table.version++; entityId = visitId; break;
    }
    case 'table.close': {
      role(user, 'waiter', 'cashier', 'admin');
      const visit = find(state.visits, command.visit_id); version(visit, command.expected_version);
      invariant(visit.status === 'open', 'VISIT_NOT_OPEN', 'La visita ya está cerrada.');
      const check = find(state.checks, visit.check_id);
      invariant(check.paid_minor === check.total_minor && check.held_minor === 0, 'CHECK_BALANCE_EXCEEDED', 'La cuenta tiene saldo pendiente o retenido.');
      invariant(state.orders.filter(o => o.visit_id === visit.id).every(o => o.lines.every(l => l.fulfilled_quantity === (l.quantity - (l.voided_quantity ?? 0)))), 'INVALID_TRANSITION', 'Quedan productos por entregar.');
      check.status = 'closed'; check.version++; visit.status = 'closed'; visit.closed_at = now; visit.version++;
      const table = find(state.tables, visit.table_id); table.visit_id = null; table.version++;
      state.orders.filter(o => o.visit_id === visit.id).forEach(o => { o.status = 'closed'; }); entityId = visit.id; break;
    }
    case 'table.assign': {
      role(user, 'waiter', 'admin');
      const visit = find(state.visits, command.visit_id); version(visit, command.expected_version);
      invariant(visit.status === 'open', 'VISIT_NOT_OPEN', 'Esta atención ya terminó.');
      const waiter = find(state.staff, command.waiter_id); role(waiter, 'waiter'); reason(command.reason);
      invariant(user.role === 'admin' || (waiter.id === user.id && (!visit.responsible_waiter_id || visit.responsible_waiter_id === user.id)), 'FORBIDDEN', 'Administración debe reasignar una mesa atendida por otra persona.', 403);
      visit.responsible_waiter_id = waiter.id; visit.responsible_waiter_name = waiter.name; visit.version++; entityId = visit.id; break;
    }
    case 'order.priority': {
      role(user, 'waiter', 'admin');
      const order = find(state.orders, command.order_id); version({ version: order.production_version ?? 1 }, command.expected_version);
      invariant(order.status === 'accepted' && order.lines.some(l => l.station !== 'caja' && l.prepared_quantity < l.quantity - (l.voided_quantity ?? 0)), 'INVALID_TRANSITION', 'No queda preparación pendiente para cambiar la prioridad.');
      const priorityReason = reason(command.reason);
      invariant(['normal', 'urgent'].includes(command.priority), 'VALIDATION_ERROR', 'Prioridad inválida.', 400);
      invariant((order.priority ?? 'normal') !== command.priority, 'INVALID_TRANSITION', 'El pedido ya tiene esa prioridad.');
      order.priority = command.priority; order.priority_reason = priorityReason; order.production_version = (order.production_version ?? 1) + 1;
      const visit = find(state.visits, order.visit_id), table = find(state.tables, visit.table_id);
      for (const station of ['cocina', 'heladeria'] as const) {
        const lines = order.lines.filter(l => l.station === station && l.prepared_quantity < l.quantity - (l.voided_quantity ?? 0)).map(l => ({ product_name: l.product_name, quantity: l.quantity - (l.voided_quantity ?? 0) - l.prepared_quantity, note: `AVISO DE PRIORIDAD, NO REPETIR PEDIDO: ${priorityReason}` }));
        if (!lines.length) continue;
        const payload = { order_id: order.id, station, kind: 'priority' as const, table_label: table.label, batch_number: order.batch_number, service_sequence: serviceSequence(state, order), responsible_name: visit.responsible_waiter_name ?? order.responsible_name ?? 'Responsable por asignar', priority: command.priority, lines };
        state.print_jobs.push({ ...payload, id: id(), state: 'queued', version: 1, copy_of: null, reason: `AVISO DE PRIORIDAD: ${priorityReason}`, created_at: now, payload_hash: createHash('sha256').update(JSON.stringify(payload)).digest('hex') });
      }
      entityId = order.id; break;
    }
    case 'line.claim': {
      role(user, 'waiter', 'cashier', 'admin');
      const line = lineIn(state, command.line_id); version(line, command.expected_version); reason(command.reason);
      invariant(find(state.orders, line.order_id).status === 'accepted', 'INVALID_TRANSITION', 'El pedido ya terminó.');
      if (command.action === 'release') {
        invariant(line.dispatch_claim && (line.dispatch_claim.actor_id === user.id || user.role === 'admin'), 'FORBIDDEN', 'Solo el propietario o Administración puede liberar el retiro.', 403);
        line.dispatch_claim = null;
      } else {
        invariant(command.action === 'claim', 'VALIDATION_ERROR', 'Acción de retiro inválida.', 400);
        invariant(!line.dispatch_claim, 'DISPATCH_CLAIMED', 'Otra persona ya reservó este retiro.');
        const qty = units(command.quantity!);
        const ready = (line.station === 'caja' ? line.quantity - (line.voided_quantity ?? 0) : line.prepared_quantity) - line.fulfilled_quantity;
        invariant(qty <= ready, 'QUANTITY_EXCEEDED', 'No hay esa cantidad lista para retirar.');
        if (line.station === 'caja') invariant(!beverageFrozen(state), 'RESOURCE_COUNTING', 'La custodia de bebidas está en traspaso.');
        line.dispatch_claim = { actor_id: user.id, actor_name: user.name, quantity: qty, claimed_at: now };
      }
      line.version++; entityId = line.id; break;
    }
    case 'order.create': {
      role(user, 'waiter', 'cashier', 'admin'); openDay(state);
      const visit = find(state.visits, command.visit_id); version(visit, command.expected_version);
      invariant(visit.status === 'open', 'VISIT_NOT_OPEN', 'La visita ya está cerrada.');
      const check = find(state.checks, visit.check_id); invariant(check.status === 'open', 'VISIT_NOT_OPEN', 'La cuenta está cerrada.');
      invariant(!(check.total_minor > 0 && check.paid_minor === check.total_minor && check.held_minor === 0), context.guest ? 'GUEST_ACCESS_ENDED' : 'INVALID_TRANSITION', 'La cuenta ya está pagada; concluye esta atención antes de abrir otra.', context.guest ? 403 : 409);
      invariant(Boolean(command.quote_id), 'VALIDATION_ERROR', 'Se requiere una cotización válida antes de aceptar el pedido.', 400);
      const quote = context.quote;
      if (!quote || quote.id !== command.quote_id) throw new DomainError('NOT_FOUND', 'La cotización no existe o ya no es válida.', 404);
      invariant(quote.visit_id === visit.id, 'VALIDATION_ERROR', 'La cotización pertenece a otra atención.', 400);
      invariant(quote.tenant_id === undefined || quote.tenant_id === actor.tenant_id, 'FORBIDDEN', 'Cotización de otra empresa.', 403);
      invariant(quote.branch_id === undefined || quote.branch_id === actor.branch_id, 'FORBIDDEN', 'Cotización de otro local.', 403);
      invariant(quote.actor_id === user.id && quote.principal_kind === (context.guest ? 'guest' : 'staff'), 'FORBIDDEN', 'La cotización pertenece a otro participante.', 403);
      invariant(quote.consumed_at === null, 'INVALID_TRANSITION', 'Esta cotización ya se utilizó. Recupera la operación original.', 409);
      invariant(Date.parse(context.now) < Date.parse(quote.expires_at), 'QUOTE_EXPIRED', 'La cotización ha expirado. Revisa los precios antes de confirmar.', 409);
      if (context.guest) {
        invariant(quote.principal_kind === 'guest' && quote.guest_session_id === context.guest.session_id, 'FORBIDDEN', 'La cotización pertenece a otro comensal.', 403);
      }
      invariant(quote.lines.length > 0 && quote.lines.length <= 100, 'VALIDATION_ERROR', 'El pedido necesita entre una y cien líneas.', 400);
      invariant(!state.orders.some(o => o.visit_id === visit.id && o.business_day_id !== state.business_day.id), 'INVALID_TRANSITION', 'Cierra la cuenta del día anterior antes de añadir una nueva tanda.');

      for (const line of quote.lines) {
        const product = find(state.products, line.product_id);
        invariant(product.active, 'PRODUCT_UNAVAILABLE', `El producto "${line.product_name}" ya no está disponible.`, 409);
        invariant(productAvailableInService(state, product), 'SERVICE_MODE_RESTRICTED', 'El turno nocturno solo vende cerveza, gaseosa y agua de Caja.');
        if (product.price_minor !== line.unit_price_minor || product.version !== line.product_version) {
          throw new DomainError('PRICE_CHANGED', `El precio de "${product.name}" cambió de S/ ${(line.unit_price_minor / 100).toFixed(2)} a S/ ${(product.price_minor / 100).toFixed(2)}. Revisa tu pedido antes de confirmar.`, 409, {
            changed_products: [{
              product_id: product.id,
              product_name: product.name,
              old_price_minor: line.unit_price_minor,
              new_price_minor: product.price_minor
            }]
          });
        }
      }

      for (const line of quote.lines) {
        const product = find(state.products, line.product_id);
        const qty = units(line.quantity);
        if (product.stock_policy === 'unit') {
          const stock = find(state.stock, product.stock_item_id!);
          invariant(!pendingStockCount(state, stock.id), 'RESOURCE_COUNTING', `El inventario de ${product.name} tiene un conteo pendiente de revisión.`);
          invariant(stock.on_hand - stock.reserved >= qty, 'INSUFFICIENT_STOCK', `No hay suficiente stock de ${product.name}.`);
          stock.reserved = addExact(stock.reserved, qty);
          stock.available = Math.max(0, stock.on_hand - stock.reserved);
          stock.version++;
        }
      }

      const orderId = id();
      const lines: OrderLine[] = quote.lines.map(line => {
        const product = find(state.products, line.product_id);
        const qty = units(line.quantity);
        const note = line.note?.trim() ?? '';
        invariant(note.length <= 300, 'VALIDATION_ERROR', 'La observación es demasiado larga.', 400);
        return {
          id: id(),
          order_id: orderId,
          product_id: product.id,
          product_name: product.name,
          station: product.station,
          unit_price_minor: line.unit_price_minor,
          quantity: qty,
          prepared_quantity: 0,
          fulfilled_quantity: 0,
          voided_quantity: 0,
          stock_policy: product.stock_policy,
          stock_item_id: product.stock_item_id,
          note,
          version: 1
        };
      });

      const batch = state.orders.filter(o => o.visit_id === visit.id).length + 1;
      const sequence = state.orders.length + 1;
      const responsible = visit.responsible_waiter_name ?? state.staff.find(s => s.id === visit.opened_by)?.name ?? user.name;
      state.orders.push({
        id: orderId,
        visit_id: visit.id,
        check_id: check.id,
        batch_number: batch,
        created_by: user.id,
        source: context.guest ? 'guest' : 'staff',
        ...(context.guest ? { guest_session_id: context.guest.session_id } : {}),
        created_at: now,
        business_day_id: state.business_day.id,
        status: 'accepted',
        service_sequence: sequence, priority: 'normal', production_version: 1, responsible_name: responsible,
        lines
      });

      for (const station of ['cocina', 'heladeria'] as const) {
        const routed = lines.filter(l => l.station === station).map(l => ({ product_name: l.product_name, quantity: l.quantity, note: l.note }));
        if (!routed.length) continue;
        const metadata = { kind: 'order' as const, table_label: find(state.tables, visit.table_id).label, batch_number: batch, service_sequence: sequence, responsible_name: responsible, priority: 'normal' as const };
        state.print_jobs.push({
          ...metadata,
          id: id(),
          order_id: orderId,
          station,
          state: 'queued',
          version: 1,
          copy_of: null,
          reason: null,
          created_at: now,
          payload_hash: createHash('sha256').update(JSON.stringify({ order_id: orderId, station, ...metadata, lines: routed })).digest('hex'),
          lines: routed
        });
      }
      const total = lines.reduce((sum, l) => addExact(sum, roundRatio(l.unit_price_minor, l.quantity, 1)), 0);
      minor(total); check.total_minor = addExact(check.total_minor, total); check.remaining_collectible_minor = check.total_minor - check.paid_minor - check.held_minor; check.version++; visit.version++;
      entityId = orderId; break;
    }
    case 'line.prepare': case 'line.ready.confirm': case 'line.fulfill': {
      const line = lineIn(state, command.line_id); lineAccess(user, line); version(line, command.expected_version);
      const qty = units(command.quantity);
      invariant(find(state.orders, line.order_id).status === 'accepted', 'INVALID_TRANSITION', 'El pedido está cerrado.');
      if (command.type === 'line.prepare' || command.type === 'line.ready.confirm') {
        if (command.type === 'line.ready.confirm') { role(user, 'waiter', 'cashier', 'admin'); reason(command.reason); }
        else role(user, 'kitchen', 'admin');
        invariant(line.station !== 'caja', 'INVALID_TRANSITION', 'Bebidas de Caja se entregan directamente.');
        invariant(line.prepared_quantity + qty <= (line.quantity - (line.voided_quantity ?? 0)), 'QUANTITY_EXCEEDED', 'La cantidad supera lo pendiente de preparar.');
        line.prepared_quantity += qty;
        line.prepared_at = now;
      } else {
        if (line.dispatch_claim) {
          invariant(line.dispatch_claim.actor_id === user.id, 'DISPATCH_CLAIMED', 'Otra persona está retirando esta línea. Libera el retiro antes de registrar otra entrega.');
          invariant(qty <= line.dispatch_claim.quantity, 'QUANTITY_EXCEEDED', 'La entrega supera la cantidad reclamada.');
        }
        invariant(line.fulfilled_quantity + qty <= (line.quantity - (line.voided_quantity ?? 0)), 'QUANTITY_EXCEEDED', 'La cantidad supera lo pendiente de entregar.');
        if (line.station === 'caja') {
          invariant(!beverageFrozen(state), 'RESOURCE_COUNTING', 'Las bebidas están congeladas durante el traspaso.');
          openDay(state);
          invariant(state.cash_sessions.some(c => c.state === 'open' && c.business_day_id === state.business_day.id), 'CASH_NOT_OPEN', 'Abre caja para asumir la custodia de las bebidas antes de entregarlas.');
        }
        else invariant(line.fulfilled_quantity + qty <= line.prepared_quantity, 'QUANTITY_EXCEEDED', 'Primero registra la cantidad preparada.');
        if (line.stock_policy === 'unit') {
          const stock = find(state.stock, line.stock_item_id!);
          invariant(!pendingStockCount(state, stock.id), 'RESOURCE_COUNTING', 'Este inventario tiene un conteo pendiente de revisión; no se puede entregar todavía.');
          invariant(stock.on_hand >= qty && stock.reserved >= qty, 'INSUFFICIENT_STOCK', 'El stock físico no alcanza para entregar.');
          stock.on_hand -= qty; stock.reserved -= qty; stock.available = Math.max(0, stock.on_hand - stock.reserved); stock.version++;
          state.stock_movements.push({ id: id(), stock_item_id: stock.id, quantity_delta: -qty, kind: 'fulfillment', operation_id: command.operation_id, actor_id: user.id, created_at: now, reason: `Entrega de línea ${line.id}` });
        }
        line.fulfilled_quantity += qty;
        line.delivered_at = now;
        if (line.dispatch_claim) { line.dispatch_claim.quantity -= qty; if (!line.dispatch_claim.quantity) line.dispatch_claim = null; }
      }
      line.version++; entityId = line.id; break;
    }
    case 'order.line.void': {
      role(user, 'cashier', 'admin');
      openDay(state);
      const line = lineIn(state, command.line_id);
      const order = state.orders.find(o => o.lines.some(l => l.id === line.id));
      invariant(order && order.status === 'accepted', 'INVALID_TRANSITION', 'El pedido está cerrado.');
      const visit = find(state.visits, order.visit_id);
      invariant(visit.status === 'open', 'VISIT_NOT_OPEN', 'La atención ya está cerrada.');
      version(visit, command.expected_version);

      const qty = units(command.quantity);
      const activeQty = line.quantity - (line.voided_quantity ?? 0);
      invariant(qty <= activeQty, 'QUANTITY_EXCEEDED', 'La cantidad a anular supera la cantidad activa en la comanda.');

      const check = find(state.checks, visit.check_id);
      invariant(check.status === 'open', 'INVALID_TRANSITION', 'La cuenta ya está cerrada.');
      editableConsumptionDay(state, check);
      invariant(!state.fiscal_documents?.some(d => d.check_id === check.id), 'ALREADY_ISSUED', 'El consumo tiene un documento simulado histórico; requiere un flujo de ajuste separado.');
      const voidAmount = roundRatio(line.unit_price_minor, qty, 1);
      invariant(voidAmount <= check.remaining_collectible_minor, 'CHECK_BALANCE_EXCEEDED', 'No se puede anular un monto mayor al saldo libre por cobrar.');

      const voidReason = reason(command.reason);

      const unfulfilledRemaining = Math.max(0, line.quantity - line.fulfilled_quantity - (line.voided_quantity ?? 0));
      const unfulfilledVoid = Math.min(qty, unfulfilledRemaining);
      const fulfilledVoid = qty - unfulfilledVoid;

      if (line.stock_policy === 'unit' && line.stock_item_id) {
        const stock = find(state.stock, line.stock_item_id);
        if (fulfilledVoid > 0 && command.restore_stock) {
          invariant(!pendingStockCount(state, stock.id), 'RESOURCE_COUNTING', 'Este inventario tiene un conteo pendiente de revisión; no se puede reintegrar una unidad física.');
        }
        if (stock.station === 'caja' && (unfulfilledVoid > 0 || (fulfilledVoid > 0 && command.restore_stock))) {
          invariant(!beverageFrozen(state), 'RESOURCE_COUNTING', 'Las bebidas están congeladas durante el traspaso; termina la entrega de custodia antes de liberar reservas o reintegrar unidades.');
        }
        if (unfulfilledVoid > 0) {
          stock.reserved -= unfulfilledVoid;
          stock.available = Math.max(0, stock.on_hand - stock.reserved);
          stock.version++;
        }
        if (fulfilledVoid > 0 && command.restore_stock) {
          stock.on_hand += fulfilledVoid;
          stock.available = Math.max(0, stock.on_hand - stock.reserved);
          stock.version++;
          state.stock_movements.push({
            id: id(),
            stock_item_id: stock.id,
            quantity_delta: fulfilledVoid,
            kind: 'adjustment',
            operation_id: command.operation_id,
            actor_id: user.id,
            created_at: now,
            reason: `Reintegro por anulación de comanda: ${voidReason}`
          });
        }
      }

      if (fulfilledVoid > 0) {
        line.fulfilled_quantity -= fulfilledVoid;
      }
      if (line.prepared_quantity > (line.quantity - ((line.voided_quantity ?? 0) + qty))) {
        line.prepared_quantity = Math.max(0, line.quantity - ((line.voided_quantity ?? 0) + qty));
      }
      if (line.dispatch_claim) {
        const ready = (line.station === 'caja' ? line.quantity - (line.voided_quantity ?? 0) - qty : line.prepared_quantity) - line.fulfilled_quantity;
        line.dispatch_claim.quantity = Math.min(line.dispatch_claim.quantity, Math.max(0, ready));
        if (!line.dispatch_claim.quantity) line.dispatch_claim = null;
      }

      line.voided_quantity = (line.voided_quantity ?? 0) + qty;
      line.void_reason = voidReason;
      line.version++;

      check.total_minor -= voidAmount;
      check.remaining_collectible_minor -= voidAmount;
      check.version++;
      visit.version++;

      if (line.station === 'cocina' || line.station === 'heladeria') {
        const routed = [{ product_name: `[ANULADO] ${line.product_name}`, quantity: qty, note: `MOTIVO: ${voidReason}` }];
        const metadata = { kind: 'void' as const, table_label: find(state.tables, visit.table_id).label, batch_number: order.batch_number, service_sequence: serviceSequence(state, order), responsible_name: order.responsible_name ?? visit.responsible_waiter_name ?? user.name, priority: order.priority ?? 'normal' };
        state.print_jobs.push({
          ...metadata,
          id: id(),
          order_id: order.id,
          station: line.station,
          state: 'queued',
          version: 1,
          copy_of: null,
          reason: `ANULACIÓN: ${voidReason}`,
          created_at: now,
          payload_hash: createHash('sha256').update(JSON.stringify({ order_id: order.id, station: line.station, ...metadata, line_id: line.id, quantity: qty, reason: voidReason })).digest('hex'),
          lines: routed
        });
      }

      const auditEntry: OrderVoidAuditEntry = {
        id: id(),
        actor_id: user.id,
        operation_id: command.operation_id,
        line_id: line.id,
        order_id: order.id,
        visit_id: visit.id,
        quantity: qty,
        amount_minor: voidAmount,
        restored_stock: command.restore_stock,
        reason: voidReason,
        created_at: now
      };
      state.void_audit.push(auditEntry);
      entityId = auditEntry.id;
      break;
    }
    case 'print.ack': case 'print.copy': {
      role(user, 'cashier', 'admin', 'kitchen');
      const job = find(state.print_jobs, command.print_job_id); version(job, command.expected_version);
      if (user.role === 'kitchen') invariant(user.station === job.station, 'FORBIDDEN', 'Ticket de otra estación.', 403);
      if (command.type === 'print.copy') {
        invariant(job.state !== 'queued' && job.state !== 'failed_before_send', 'INVALID_TRANSITION', 'El original aún no se ha enviado; no necesita una copia.');
        const copy = { ...structuredClone(job), id: id(), state: 'queued' as const, version: 1, copy_of: job.id, reason: reason(command.reason), created_at: now };
        state.print_jobs.push(copy); entityId = copy.id;
      } else {
        reason(command.evidence);
        const transitions: Record<PrintJob['state'], PrintJob['state'][]> = { queued: ['bridge_received', 'failed_before_send', 'ambiguous'], bridge_received: ['confirmed', 'ambiguous'], failed_before_send: ['bridge_received', 'ambiguous'], confirmed: [], ambiguous: [] };
        invariant(transitions[job.state].includes(command.state), 'INVALID_TRANSITION', 'Un resultado incierto necesita recuperación mediante copia.');
        job.state = command.state; job.reason = command.evidence; job.version++; entityId = job.id;
      }
      break;
    }
    case 'collection.authorize': {
      const cash = ownedCash(state, user, command.cash_session_id); const check = find(state.checks, command.check_id); version(check, command.expected_version);
      invariant(check.status === 'open', 'INVALID_TRANSITION', 'La cuenta ya está cerrada.');
      minor(command.amount_minor, true);
      invariant(check.remaining_collectible_minor >= command.amount_minor, 'CHECK_BALANCE_EXCEEDED', 'El importe supera el saldo libre de la cuenta.');
      const authId = id();
      state.authorizations.push({ id: authId, check_id: check.id, check_version: check.version, amount_minor: command.amount_minor, method: command.method, status: 'reserved', registry_ack: state.environment === 'operational' ? 'local_authority' : 'laboratory_local', cash_session_id: cash.id, created_by: user.id, created_at: now });
      check.held_minor = addExact(check.held_minor, command.amount_minor); check.remaining_collectible_minor -= command.amount_minor; check.version++;
      entityId = authId; break;
    }
    case 'collection.release': {
      role(user, 'cashier', 'admin');
      const authorization = find(state.authorizations, command.authorization_id);
      invariant(authorization.status === 'reserved', 'INVALID_TRANSITION', 'Solo se pueden liberar autorizaciones en estado reservado.');
      if (user.role !== 'admin') {
        invariant(authorization.created_by === user.id, 'FORBIDDEN', 'Solo el cajero que inició la autorización o un administrador pueden liberarla.', 403);
      }
      const check = find(state.checks, authorization.check_id);
      version(check, command.expected_version);
      invariant(check.status === 'open', 'INVALID_TRANSITION', 'La cuenta ya está cerrada.');
      reason(command.reason);
      authorization.status = 'released';
      check.held_minor -= authorization.amount_minor;
      check.remaining_collectible_minor += authorization.amount_minor;
      check.version++;
      entityId = authorization.id;
      break;
    }
    case 'payment.confirm': case 'payment.unknown': {
      const authorization = find(state.authorizations, command.authorization_id);
      const cash = ownedCash(state, user, authorization.cash_session_id);
      invariant(authorization.created_by === user.id, 'FORBIDDEN', 'Otro cajero inició la autorización.', 403);
      invariant(authorization.status === 'reserved' && authorization.registry_ack === (state.environment === 'operational' ? 'local_authority' : 'laboratory_local'), 'AUTHORIZATION_USED', 'La autorización ya fue consumida.');
      const check = find(state.checks, authorization.check_id);
      const paymentId = id();
      if (command.type === 'payment.unknown') {
        invariant(authorization.method !== 'cash', 'INVALID_TRANSITION', 'El efectivo no admite un resultado digital desconocido.'); reason(command.reason);
        authorization.status = 'consumed';
        state.payments.push({ id: paymentId, authorization_id: authorization.id, check_id: check.id, cash_session_id: cash.id, initiated_cash_session_id: cash.id, business_day_id: cash.business_day_id, method: authorization.method, amount_minor: authorization.amount_minor, received_minor: null, change_minor: null, status: 'unknown', evidence: null, actor_id: user.id, created_at: now, confirmed_at: null, version: 1 });
      } else {
        let verified: MerchantEvidence | null = null, received: number | null = null, change: number | null = null;
        if (authorization.method === 'cash') {
          invariant(command.evidence === undefined, 'VALIDATION_ERROR', 'Efectivo no utiliza evidencia de proveedor.', 400);
          received = minor(command.received_minor ?? authorization.amount_minor, true); invariant(received >= authorization.amount_minor, 'CHECK_BALANCE_EXCEEDED', 'El recibido es menor que el pago.');
          change = received - authorization.amount_minor; cashDelta(state, cash, authorization.amount_minor);
        } else {
          invariant(command.received_minor === undefined, 'VALIDATION_ERROR', 'Recibido/cambio es exclusivo de efectivo.', 400);
          verified = evidence(state, command.evidence, authorization.method, now);
        }
        authorization.status = 'settled'; check.held_minor -= authorization.amount_minor; check.paid_minor = addExact(check.paid_minor, authorization.amount_minor); check.version++;
        state.payments.push({ id: paymentId, authorization_id: authorization.id, check_id: check.id, cash_session_id: cash.id, initiated_cash_session_id: cash.id, business_day_id: cash.business_day_id, method: authorization.method, amount_minor: authorization.amount_minor, received_minor: received, change_minor: change, status: 'succeeded', evidence: verified, actor_id: user.id, created_at: now, confirmed_at: now, version: 1 });
      }
      entityId = paymentId; break;
    }
    case 'payment.resolve': {
      const payment = find(state.payments, command.payment_id); version(payment, command.expected_version);
      const cash = ownedCash(state, user, command.cash_session_id);
      invariant(payment.status === 'unknown' && payment.method !== 'cash', 'INVALID_TRANSITION', 'El pago no tiene un resultado digital pendiente.');
      payment.evidence = evidence(state, command.evidence, payment.method, now, payment.id);
      const check = find(state.checks, payment.check_id);
      check.held_minor -= payment.amount_minor; check.paid_minor = addExact(check.paid_minor, payment.amount_minor); check.version++;
      payment.status = 'succeeded'; payment.confirmed_at = now; payment.cash_session_id = cash.id; payment.business_day_id = cash.business_day_id; payment.actor_id = user.id; payment.version++;
      find(state.authorizations, payment.authorization_id).status = 'settled'; entityId = payment.id; break;
    }
    case 'cash.open': {
      role(user, 'cashier', 'admin'); openDay(state); version(state.business_day, command.expected_day_version);
      invariant(!state.cash_sessions.some(s => s.business_day_id === state.business_day.id) && !state.cash_sessions.some(s => s.state !== 'closed') && !beverageFrozen(state), 'CASH_NOT_OPEN', 'El sucesor debe abrirse mediante el traspaso; no abras otro cajón.');
      const cashId = id(); minor(command.opening_minor);
      state.cash_sessions.push({ id: cashId, drawer_id: state.branch.drawer_id, business_day_id: state.business_day.id, owner_id: user.id, shift_label: command.shift_label, opening_minor: command.opening_minor, expected_minor: command.opening_minor, counted_minor: null, difference_minor: null, state: 'open', version: 1, opened_at: now, closed_at: null, predecessor_handover_id: null });
      state.business_day.version++; entityId = cashId; break;
    }
    case 'cash.move': {
      const cash = ownedCash(state, user, command.cash_session_id); version(cash, command.expected_version); minor(command.amount_minor, true);
      const movementId = id(); cashDelta(state, cash, command.kind === 'paid_in' ? command.amount_minor : -command.amount_minor);
      state.cash_movements.push({ id: movementId, cash_session_id: cash.id, kind: command.kind, amount_minor: command.amount_minor, reason: reason(command.reason), actor_id: user.id, created_at: now }); entityId = movementId; break;
    }
    case 'handover.begin': {
      const cash = ownedCash(state, user, command.cash_session_id); version(cash, command.expected_version);
      const incoming = find(state.staff, command.incoming_user_id); role(incoming, 'cashier', 'admin');
      invariant(incoming.id !== user.id, 'FORBIDDEN', 'El ingresante debe ser una persona diferente.', 403);
      invariant(!beverageFrozen(state), 'RESOURCE_COUNTING', 'Ya existe un traspaso en curso.');
      invariant(!state.stock.some(stock => stock.station === 'caja' && pendingStockCount(state, stock.id)), 'RESOURCE_COUNTING', 'Resuelve el conteo pendiente de bebidas antes de iniciar el traspaso.');
      invariant(!state.authorizations.some(a => a.cash_session_id === cash.id && a.status === 'reserved'), 'INVALID_TRANSITION', 'Resuelve las autorizaciones todavía no utilizadas antes del corte.');
      cash.state = 'counting'; cash.version++;
      const handoverId = id();
      state.handovers.push({ id: handoverId, cash_session_id: cash.id, version: 1, state: 'prepared', outgoing_user_id: user.id, incoming_user_id: incoming.id, expected_cash_minor: cash.expected_minor, counted_cash_minor: null, difference_cash_minor: null, stock_lines: state.stock.filter(s => s.station === 'caja').map(s => ({ stock_item_id: s.id, expected_quantity: s.on_hand, counted_quantity: 0, difference_quantity: 0 })), pending_payment_ids: state.payments.filter(p => p.status === 'unknown').map(p => p.id), successor_cash_session_id: null, discrepancy_approved_by: null, discrepancy_approval_reason: null, reason: null, created_at: now });
      entityId = handoverId; break;
    }
    case 'handover.count': {
      role(user, 'cashier', 'admin'); const handover = find(state.handovers, command.handover_id); version(handover, command.expected_version);
      invariant(handover.outgoing_user_id === user.id, 'FORBIDDEN', 'La declaración corresponde al saliente.', 403);
      invariant(handover.state === 'prepared', 'INVALID_TRANSITION', 'La declaración ya quedó sellada.');
      const counted = minor(command.counted_cash_minor); handover.counted_cash_minor = counted; handover.difference_cash_minor = counted - handover.expected_cash_minor;
      handover.stock_lines = countedStock(state, command.stock_counts, true); handover.state = 'declared'; handover.version++; entityId = handover.id; break;
    }
    case 'handover.approve': {
      role(user, 'admin'); const handover = find(state.handovers, command.handover_id); version(handover, command.expected_version);
      invariant(handover.state === 'declared' || handover.state === 'disputed', 'INVALID_TRANSITION', 'Primero sella la declaración.');
      invariant(user.id !== handover.outgoing_user_id && user.id !== handover.incoming_user_id, 'FORBIDDEN', 'La diferencia requiere un aprobador distinto de los custodios.', 403);
      invariant(handover.state === 'disputed' || !handover.discrepancy_approved_by, 'INVALID_TRANSITION', 'La diferencia ya tiene aprobación.');
      handover.discrepancy_approved_by = user.id; handover.discrepancy_approval_reason = reason(command.reason);
      handover.state = 'declared'; handover.version++; entityId = handover.id; break;
    }
    case 'handover.accept': {
      role(user, 'cashier', 'admin'); const handover = find(state.handovers, command.handover_id); version(handover, command.expected_version);
      invariant(handover.incoming_user_id === user.id && user.id !== handover.outgoing_user_id, 'FORBIDDEN', 'Solo el ingresante puede recibir esta custodia.', 403);
      invariant(handover.state === 'declared', 'INVALID_TRANSITION', 'El traspaso aún no tiene declaración o ya se aceptó.');
      const differences = handover.difference_cash_minor !== 0 || handover.stock_lines.some(l => l.difference_quantity !== 0);
      invariant(!differences || handover.discrepancy_approved_by, 'DISCREPANCY_APPROVAL_REQUIRED', 'Administración debe aprobar las diferencias antes de recibir.');
      const old = find(state.cash_sessions, handover.cash_session_id); invariant(old.state === 'counting', 'INVALID_TRANSITION', 'El cajón no está en corte.');
      for (const l of handover.stock_lines) invariant(l.counted_quantity >= find(state.stock, l.stock_item_id).reserved, 'STOCK_RESERVATIONS_EXCEED_COUNT', 'El conteo recibido no alcanza para las unidades reservadas. Concilia los pedidos pendientes antes de aceptar la custodia.');
      for (const l of handover.stock_lines) if (l.difference_quantity !== 0) {
        const stock = find(state.stock, l.stock_item_id); stock.on_hand = l.counted_quantity; stock.available = Math.max(0, stock.on_hand - stock.reserved); stock.version++;
        state.stock_movements.push({ id: id(), stock_item_id: stock.id, quantity_delta: l.difference_quantity, kind: 'adjustment', operation_id: command.operation_id, actor_id: handover.discrepancy_approved_by!, created_at: now, reason: handover.discrepancy_approval_reason! });
      }
      old.state = 'closed'; old.closed_at = now; old.counted_minor = handover.counted_cash_minor; old.difference_minor = handover.difference_cash_minor; old.version++;
      const nextId = id();
      state.cash_sessions.push({ id: nextId, drawer_id: old.drawer_id, business_day_id: old.business_day_id, owner_id: user.id, shift_label: 'nocturno', opening_minor: handover.counted_cash_minor!, expected_minor: handover.counted_cash_minor!, counted_minor: null, difference_minor: null, state: 'open', version: 1, opened_at: now, closed_at: null, predecessor_handover_id: handover.id });
      handover.successor_cash_session_id = nextId; handover.state = 'accepted'; handover.version++; entityId = nextId; break;
    }
    case 'handover.cancel': {
      role(user, 'admin'); const h = find(state.handovers, command.handover_id); version(h, command.expected_version);
      invariant(user.id !== h.outgoing_user_id && user.id !== h.incoming_user_id, 'FORBIDDEN', 'Cancelar requiere administración distinta de ambos custodios.', 403);
      invariant(['prepared', 'declared', 'disputed'].includes(h.state) && !h.successor_cash_session_id, 'INVALID_TRANSITION', 'Solo se cancela un traspaso todavía no recibido.');
      const cash = find(state.cash_sessions, h.cash_session_id);
      invariant(cash.state === 'counting' && cash.business_day_id === state.business_day.id && state.business_day.state === 'open', 'INVALID_TRANSITION', 'La caja original ya no está en corte del día abierto.');
      h.cancellation_reason = reason(command.reason); h.cancelled_by = user.id; h.cancelled_at = now; h.state = 'cancelled'; h.version++;
      cash.state = 'open'; cash.version++; entityId = h.id; break;
    }
    case 'handover.reject': {
      role(user, 'cashier', 'admin'); const h = find(state.handovers, command.handover_id); version(h, command.expected_version);
      invariant(h.incoming_user_id === user.id, 'FORBIDDEN', 'Solo el ingresante puede rechazar.', 403);
      invariant(h.state === 'declared', 'INVALID_TRANSITION', 'Solo se rechaza una declaración sellada.');
      h.state = 'disputed'; h.reason = reason(command.reason); h.version++; entityId = h.id; break;
    }
    case 'inventory.count': {
      role(user, 'cashier', 'admin');
      openDay(state);
      if (user.role === 'cashier') invariant(state.cash_sessions.some(c => c.state === 'open' && c.business_day_id === state.business_day.id && c.owner_id === user.id), 'CASH_NOT_OPEN', 'El conteo corresponde al responsable de la caja abierta.');
      invariant(command.lines.length > 0 && new Set(command.lines.map(l => l.stock_item_id)).size === command.lines.length, 'VALIDATION_ERROR', 'El conteo debe incluir productos distintos.', 400);
      const lines = command.lines.map(input => {
        const stock = find(state.stock, input.stock_item_id); version(stock, input.expected_version);
        invariant(user.role === 'admin' || stock.station === 'caja', 'FORBIDDEN', 'Caja solo puede declarar el inventario de su estación.', 403);
        invariant(stock.station !== 'caja' || !beverageFrozen(state), 'RESOURCE_COUNTING', 'La custodia de bebidas está en traspaso.');
        const counted = units(input.counted_quantity, true);
        return { stock_item_id: stock.id, expected_quantity: stock.on_hand, counted_quantity: counted, difference_quantity: counted - stock.on_hand, expected_stock_version: stock.version };
      });
      const countReason = reason(command.reason);
      const countedIds = new Set(lines.map(l => l.stock_item_id));
      const previous = state.inventory_counts.filter(c => c.status === 'declared' && c.lines.some(l => countedIds.has(l.stock_item_id)));
      invariant(previous.every(c => c.lines.every(l => countedIds.has(l.stock_item_id))), 'VALIDATION_ERROR', 'El reconteo debe incluir todos los productos de las declaraciones que sustituye.', 400);
      const countId = id(); state.count_versions[countId] = Object.fromEntries(command.lines.map(l => [l.stock_item_id, l.expected_version]));
      for (const c of previous) { c.status = 'superseded'; c.superseded_by = countId; }
      state.inventory_counts.push({ id: countId, actor_id: user.id, created_at: now, reason: countReason, lines, status: 'declared', business_day_id: state.business_day.id }); entityId = countId; break;
    }
    case 'inventory.adjust': {
      role(user, 'admin'); openDay(state);
      const count = find(state.inventory_counts, command.inventory_count_id); invariant(count.status === 'declared', 'INVALID_TRANSITION', 'El conteo ya fue ajustado o sustituido.');
      invariant(count.business_day_id === state.business_day.id, 'BUSINESS_DAY_LOCKED', 'Este conteo no corresponde al día operativo actual o no tiene día registrado. Declara un reconteo; no se modifica el original.');
      invariant(count.actor_id !== user.id, 'FORBIDDEN', 'El ajuste requiere otra persona como aprobador.', 403);
      const approvalReason = reason(command.approval_reason);
      for (const l of count.lines) {
        const stock = find(state.stock, l.stock_item_id); invariant(stock.version === state.count_versions[count.id]?.[stock.id] && stock.on_hand === l.expected_quantity, 'VERSION_CONFLICT', 'El stock cambió después del conteo. Realiza un nuevo conteo.');
        invariant(stock.station !== 'caja' || !beverageFrozen(state), 'RESOURCE_COUNTING', 'La custodia de bebidas está en traspaso.');
        invariant(l.counted_quantity >= stock.reserved, 'STOCK_RESERVATIONS_EXCEED_COUNT', 'El conteo no alcanza para las unidades reservadas. Concilia los pedidos pendientes y declara un reconteo; las reservas y la declaración se conservan.');
      }
      for (const l of count.lines) {
        const stock = find(state.stock, l.stock_item_id);
        stock.on_hand = l.counted_quantity; stock.available = Math.max(0, stock.on_hand - stock.reserved); stock.version++;
        if (l.difference_quantity !== 0) state.stock_movements.push({ id: id(), stock_item_id: stock.id, quantity_delta: l.difference_quantity, kind: 'adjustment', operation_id: command.operation_id, actor_id: user.id, created_at: now, reason: approvalReason });
      }
      count.status = 'adjusted'; entityId = count.id; break;
    }
    case 'sale.note': {
      role(user, 'cashier', 'admin'); const check = find(state.checks, command.check_id); version(check, command.expected_version);
      invariant(check.total_minor > 0 && check.paid_minor === check.total_minor && check.held_minor === 0, 'CHECK_BALANCE_EXCEEDED', 'La nota requiere una cuenta totalmente cobrada.');
      invariant(!state.sales_notes.some(n => n.check_id === check.id), 'INVALID_TRANSITION', 'La cuenta ya tiene una nota interna.');
      const noteId = id(); state.sales_notes.push({ id: noteId, reference: `NV-${String(state.sales_notes.length + 1).padStart(6, '0')}`, check_id: check.id, total_minor: check.total_minor, legend: 'NOTA DE VENTA INTERNA - NO ES COMPROBANTE DE PAGO', created_at: now }); entityId = noteId; break;
    }
    case 'fiscal.document.issue': {
      role(user, 'cashier', 'admin');
      openDay(state);
      const check = find(state.checks, command.check_id);
      version(check, command.expected_check_version);
      invariant(check.total_minor > 0, 'VALIDATION_ERROR', 'No se puede emitir un comprobante sobre una cuenta sin consumo o en cero.');
      invariant(check.paid_minor === check.total_minor && check.held_minor === 0, 'CHECK_BALANCE_EXCEEDED', 'El comprobante requiere que la cuenta esté totalmente cobrada.');
      invariant(check.fiscal_status !== 'issued', 'ALREADY_ISSUED', 'La cuenta ya tiene un comprobante de pago electrónico emitido.');
      invariant(!state.fiscal_documents?.some(d => d.check_id === check.id), 'ALREADY_ISSUED', 'La cuenta ya tiene un comprobante emitido.');

      if (command.doc_type === 'factura') {
        invariant(command.customer_doc_type === 'ruc', 'VALIDATION_ERROR', 'La factura electrónica requiere RUC como tipo de documento.');
        invariant(Boolean(command.customer_doc_number && /^(10|20)\d{9}$/.test(command.customer_doc_number.trim())), 'VALIDATION_ERROR', 'El RUC debe tener 11 dígitos numéricos e iniciar con 10 o 20.');
        invariant(Boolean(command.customer_name && command.customer_name.trim().length >= 3), 'VALIDATION_ERROR', 'La razón social de la factura es obligatoria (mínimo 3 caracteres).');
      } else if (command.doc_type === 'boleta') {
        if (check.total_minor > 70000) {
          invariant(command.customer_doc_type === 'dni', 'VALIDATION_ERROR', 'Para boletas mayores a S/ 700.00 se exige obligatoriamente identificación con DNI.');
          invariant(Boolean(command.customer_doc_number && /^\d{8}$/.test(command.customer_doc_number.trim())), 'VALIDATION_ERROR', 'El DNI debe contener exactamente 8 dígitos numéricos.');
          invariant(Boolean(command.customer_name && command.customer_name.trim().length >= 3), 'VALIDATION_ERROR', 'El nombre del cliente es obligatorio para boletas mayores a S/ 700.00.');
        } else {
          if (command.customer_doc_type === 'dni') {
            invariant(Boolean(command.customer_doc_number && /^\d{8}$/.test(command.customer_doc_number.trim())), 'VALIDATION_ERROR', 'El DNI debe contener exactamente 8 dígitos numéricos.');
          }
        }
      }

      const visitOrders = state.orders.filter(o => o.visit_id === check.visit_id);
      const items: FiscalItem[] = [];
      for (const order of visitOrders) {
        for (const line of order.lines) {
          const activeQty = line.quantity - (line.voided_quantity ?? 0);
          if (activeQty > 0) {
            items.push({
              product_name: line.product_name,
              quantity: activeQty,
              unit_price_minor: line.unit_price_minor,
              subtotal_minor: roundRatio(line.unit_price_minor, activeQty, 1),
            });
          }
        }
      }

      const op_gravada_minor = roundRatio(check.total_minor, 100, 118);
      const igv_minor = check.total_minor - op_gravada_minor;

      const existingOfDoc = (state.fiscal_documents ?? []).filter(d => d.doc_type === command.doc_type);
      const nextNum = existingOfDoc.length + 1;
      const series = command.doc_type === 'boleta' ? 'B001' : 'F001';
      const full_number = `${series}-${String(nextNum).padStart(8, '0')}`;

      const digest_hash = createHash('sha256').update(JSON.stringify({ series, number: nextNum, total: check.total_minor, items })).digest('base64');
      const rucEmisor = '00000000000'; // Synthetic placeholder, never a configured fiscal issuer.
      const tipoDocSunat = command.doc_type === 'factura' ? '01' : '03';
      const customerDocCode = command.customer_doc_type === 'ruc' ? '6' : command.customer_doc_type === 'dni' ? '1' : '0';
      const customerNum = command.customer_doc_number?.trim() || '00000000';
      const dateStr = now.split('T')[0] ?? '2026-10-02';
      const qr_payload = `${rucEmisor}|${tipoDocSunat}|${series}|${String(nextNum).padStart(8, '0')}|${(igv_minor/100).toFixed(2)}|${(check.total_minor/100).toFixed(2)}|${dateStr}|${customerDocCode}|${customerNum}|${digest_hash.substring(0, 28)}`;

      const docId = id();
      const doc: FiscalDocument = {
        id: docId,
        check_id: check.id,
        visit_id: check.visit_id,
        doc_type: command.doc_type,
        series,
        number: nextNum,
        full_number,
        customer_doc_type: command.customer_doc_type,
        customer_doc_number: command.customer_doc_number?.trim() ?? null,
        customer_name: (command.customer_name?.trim()) || (command.customer_doc_type === 'sin_documento' ? 'CLIENTES VARIOS' : 'CLIENTE GENERAL'),
        customer_address: command.customer_address?.trim() ?? null,
        currency: 'PEN',
        op_gravada_minor,
        igv_minor,
        total_minor: check.total_minor,
        digest_hash,
        qr_payload,
        items,
        status: 'accepted_simulated',
        actor_id: user.id,
        created_at: now,
      };

      state.fiscal_documents = state.fiscal_documents ?? [];
      state.fiscal_documents.push(doc);
      check.fiscal_status = 'pending'; // A simulated document is not fiscal acceptance.
      check.version++;
      entityId = docId;
      break;
    }
    case 'check.discount.apply': {
      role(user, 'cashier', 'admin');
      openDay(state);
      const check = find(state.checks, command.check_id);
      version(check, command.expected_version);
      invariant(check.status === 'open', 'INVALID_TRANSITION', 'La cuenta ya está cerrada.');
      editableConsumptionDay(state, check);
      invariant(check.fiscal_status !== 'issued', 'ALREADY_ISSUED', 'No se puede modificar una cuenta con comprobante fiscal ya emitido.');

      invariant(!state.fiscal_documents?.some(d => d.check_id === check.id), 'ALREADY_ISSUED', 'La cuenta ya tiene un documento simulado histórico.');
      invariant(!(check.total_minor > 0 && check.paid_minor === check.total_minor && check.held_minor === 0), 'INVALID_TRANSITION', 'No se reabre una cuenta pagada modificando su descuento.');

      const grossTotal = state.orders
        .filter(o => o.visit_id === check.visit_id)
        .flatMap(o => o.lines)
        .reduce((sum, l) => addExact(sum, roundRatio(l.unit_price_minor, l.quantity - (l.voided_quantity ?? 0), 1)), 0);

      invariant(grossTotal > 0, 'VALIDATION_ERROR', 'No se puede aplicar descuento a una cuenta sin consumos.');

      let discountMinor = 0;
      if (command.kind === 'percentage') {
        invariant(Number.isSafeInteger(command.percent) && command.percent! >= 1 && command.percent! <= 100, 'VALIDATION_ERROR', 'El porcentaje debe ser un entero entre 1 y 100.');
        discountMinor = roundRatio(grossTotal, command.percent!, 100);
      } else if (command.kind === 'fixed') {
        invariant(typeof command.amount_minor === 'number' && command.amount_minor > 0, 'VALIDATION_ERROR', 'El monto de descuento debe ser mayor a cero.');
        discountMinor = minor(command.amount_minor);
      } else {
        invariant(false, 'VALIDATION_ERROR', 'Tipo de descuento no válido.');
      }

      invariant(discountMinor > 0, 'VALIDATION_ERROR', 'El descuento calculado debe ser mayor a cero.');
      invariant(discountMinor <= grossTotal, 'CHECK_BALANCE_EXCEEDED', 'El descuento no puede superar el total de consumo.');

      const newTotal = grossTotal - discountMinor;
      invariant(newTotal >= (check.paid_minor + check.held_minor), 'CHECK_BALANCE_EXCEEDED', 'El descuento dejaría el total de la cuenta por debajo de lo ya cobrado o retenido.');

      const discountReason = reason(command.reason);
      check.discount_minor = discountMinor;
      check.discount_kind = command.kind;
      check.discount_percent = command.kind === 'percentage' ? command.percent : null;
      check.discount_reason = discountReason;
      check.total_minor = newTotal;
      check.remaining_collectible_minor = check.total_minor - check.paid_minor - check.held_minor;
      check.version++;

      const auditId = id();
      state.discount_audit = state.discount_audit ?? [];
      state.discount_audit.push({
        id: auditId,
        actor_id: user.id,
        operation_id: command.operation_id,
        check_id: check.id,
        visit_id: check.visit_id,
        discount_minor: discountMinor,
        discount_kind: command.kind,
        discount_percent: check.discount_percent ?? null,
        reason: discountReason,
        created_at: now
      });

      entityId = check.id;
      break;
    }
    case 'check.discount.remove': {
      role(user, 'cashier', 'admin');
      openDay(state);
      const check = find(state.checks, command.check_id);
      version(check, command.expected_version);
      invariant(check.status === 'open', 'INVALID_TRANSITION', 'La cuenta ya está cerrada.');
      editableConsumptionDay(state, check);
      invariant(check.fiscal_status !== 'issued', 'ALREADY_ISSUED', 'No se puede modificar una cuenta con comprobante fiscal ya emitido.');
      invariant(!state.fiscal_documents?.some(d => d.check_id === check.id), 'ALREADY_ISSUED', 'La cuenta ya tiene un documento simulado histórico.');
      invariant(check.paid_minor === 0 && check.held_minor === 0, 'INVALID_TRANSITION', 'Retira descuentos únicamente antes de reservar o registrar un cobro.');
      invariant((check.discount_minor ?? 0) > 0, 'INVALID_TRANSITION', 'La cuenta no tiene ningún descuento aplicado.');

      const grossTotal = state.orders
        .filter(o => o.visit_id === check.visit_id)
        .flatMap(o => o.lines)
        .reduce((sum, l) => addExact(sum, roundRatio(l.unit_price_minor, l.quantity - (l.voided_quantity ?? 0), 1)), 0);

      const removeReason = reason(command.reason);
      check.discount_minor = 0;
      check.discount_kind = null;
      check.discount_percent = null;
      check.discount_reason = null;
      check.total_minor = grossTotal;
      check.remaining_collectible_minor = check.total_minor - check.paid_minor - check.held_minor;
      check.version++;

      const auditId = id();
      state.discount_audit = state.discount_audit ?? [];
      state.discount_audit.push({
        id: auditId,
        actor_id: user.id,
        operation_id: command.operation_id,
        check_id: check.id,
        visit_id: check.visit_id,
        discount_minor: 0,
        discount_kind: 'fixed',
        discount_percent: null,
        reason: removeReason,
        created_at: now
      });

      entityId = check.id;
      break;
    }
    case 'fiscal.credit_note.issue': {
      role(user, 'cashier', 'admin');
      openDay(state);
      const originalDoc = state.fiscal_documents?.find(d => d.id === command.document_id);
      invariant(Boolean(originalDoc), 'NOT_FOUND', 'El comprobante original no existe.');
      invariant(originalDoc!.doc_type === 'boleta' || originalDoc!.doc_type === 'factura', 'VALIDATION_ERROR', 'Solo se puede emitir una Nota de Crédito sobre una Boleta o Factura.');
      invariant(originalDoc!.status !== 'annulled', 'ALREADY_ANNULLED', 'El comprobante ya fue anulado previamente con una Nota de Crédito.');
      invariant(!originalDoc!.credit_note_id, 'ALREADY_ANNULLED', 'El comprobante ya cuenta con una Nota de Crédito emitida.');

      const validReasons: SunatCreditReasonCode[] = ['01', '02', '03', '06', '07'];
      invariant(validReasons.includes(command.reason_code), 'INVALID_CREDIT_REASON', 'Código de motivo SUNAT inválido.');
      invariant(command.reason_code !== '03' && command.reason_code !== '07', 'UNSUPPORTED_CAPABILITY', 'Corrección de descripción y devolución parcial requieren un contrato específico; no se revierten como anulación total.');
      invariant(command.reason_code !== '02' || originalDoc!.doc_type === 'factura', 'INVALID_CREDIT_REASON', 'El motivo 02 de este simulador solo aplica a factura.');
      invariant(Boolean(command.reason_description && command.reason_description.trim().length >= 3), 'VALIDATION_ERROR', 'El motivo o sustento de la Nota de Crédito es obligatorio (mínimo 3 caracteres).');

      const series = originalDoc!.doc_type === 'boleta' ? 'BC01' : 'FC01';
      const existingNCs = (state.fiscal_documents ?? []).filter(d => d.series === series);
      const nextNum = existingNCs.length + 1;
      const full_number = `${series}-${String(nextNum).padStart(8, '0')}`;

      const op_gravada_minor = originalDoc!.op_gravada_minor;
      const igv_minor = originalDoc!.igv_minor;
      const total_minor = originalDoc!.total_minor;

      const digest_hash = createHash('sha256')
        .update(JSON.stringify({ series, number: nextNum, total: total_minor, modified: originalDoc!.full_number, reason: command.reason_code }))
        .digest('base64');
      const rucEmisor = '00000000000'; // Synthetic placeholder, never a configured fiscal issuer.
      const tipoDocSunat = '07';
      const customerDocCode = originalDoc!.customer_doc_type === 'ruc' ? '6' : originalDoc!.customer_doc_type === 'dni' ? '1' : '0';
      const customerNum = originalDoc!.customer_doc_number?.trim() || '00000000';
      const dateStr = now.split('T')[0] ?? '2026-10-02';
      const qr_payload = `${rucEmisor}|${tipoDocSunat}|${series}|${String(nextNum).padStart(8, '0')}|${(igv_minor/100).toFixed(2)}|${(total_minor/100).toFixed(2)}|${dateStr}|${customerDocCode}|${customerNum}|${digest_hash.substring(0, 28)}`;

      const ncId = id();
      const creditNote: FiscalDocument = {
        id: ncId,
        check_id: originalDoc!.check_id,
        visit_id: originalDoc!.visit_id,
        doc_type: 'nota_credito',
        series,
        number: nextNum,
        full_number,
        customer_doc_type: originalDoc!.customer_doc_type,
        customer_doc_number: originalDoc!.customer_doc_number,
        customer_name: originalDoc!.customer_name,
        customer_address: originalDoc!.customer_address,
        currency: 'PEN',
        op_gravada_minor,
        igv_minor,
        total_minor,
        digest_hash,
        qr_payload,
        items: originalDoc!.items,
        status: 'accepted_simulated',
        actor_id: user.id,
        created_at: now,
        modified_document_id: originalDoc!.id,
        modified_document_full_number: originalDoc!.full_number,
        sunat_reason_code: command.reason_code,
        sunat_reason_description: command.reason_description.trim(),
      };

      originalDoc!.status = 'annulled';
      originalDoc!.credit_note_id = ncId;
      originalDoc!.credit_note_full_number = full_number;

      const check = state.checks.find(c => c.id === originalDoc!.check_id);
      if (check) {
        check.fiscal_status = 'pending';
        check.version++;
      }

      state.fiscal_documents = state.fiscal_documents ?? [];
      state.fiscal_documents.push(creditNote);

      entityId = ncId;
      break;
    }
    case 'cash.close.approve': {
      role(user, 'admin');
      const cash = find(state.cash_sessions, command.cash_session_id); version(cash, command.expected_version); version(state.business_day, command.expected_day_version);
      invariant(user.id !== cash.owner_id, 'FORBIDDEN', 'La diferencia necesita una persona distinta del responsable de caja.', 403);
      const counted = minor(command.counted_cash_minor), lines = countedStock(state, command.stock_counts, true);
      validateNightClosing(state, cash, lines);
      const approvalId = id();
      state.cash_close_approvals ??= [];
      state.cash_close_approvals.push({ id: approvalId, cash_session_id: cash.id, business_day_id: state.business_day.id, cash_version: cash.version, day_version: state.business_day.version, seal_state_version: state.version + 1, counted_cash_minor: counted, stock_counts: command.stock_counts.map(l => ({ ...l })), actor_id: user.id, reason: reason(command.reason), created_at: now });
      entityId = approvalId; break;
    }
    case 'day.close': {
      role(user, 'cashier', 'admin'); const cash = find(state.cash_sessions, command.cash_session_id); version(cash, command.expected_version); version(state.business_day, command.expected_day_version);
      invariant(cash.owner_id === user.id, 'FORBIDDEN', 'El cierre corresponde al responsable de caja.', 403);
      invariant(!state.day_closes.some(d => d.business_day_id === state.business_day.id && d.operational_status === 'reconciled'), 'INVALID_TRANSITION', 'El cierre operativo final ya está firmado; no se modifica ni se degrada a provisional.');
      invariant(cash.business_day_id === state.business_day.id && state.cash_sessions.filter(c => c.business_day_id === state.business_day.id).at(-1)?.id === cash.id, 'INVALID_TRANSITION', 'El cierre debe usar la última caja del día operativo actual.');
      invariant(!beverageFrozen(state) && cash.state !== 'counting', 'RESOURCE_COUNTING', 'Termina el traspaso antes del cierre diario.');
      invariant(!state.authorizations.some(a => a.status === 'reserved'), 'INVALID_TRANSITION', 'Resuelve las autorizaciones no consumidas antes de cerrar.');
      const counted = minor(command.counted_cash_minor); const lines = countedStock(state, command.stock_counts, true); reason(command.reason);
      const final = command.mode === 'operational_final';
      invariant(command.mode === undefined || ['provisional', 'operational_final'].includes(command.mode), 'VALIDATION_ERROR', 'Modo de cierre inválido.', 400);
      if (final) {
        validateNightClosing(state, cash, lines);
        invariant(counted === cash.expected_minor || command.approval_id, 'DISCREPANCY_APPROVAL_REQUIRED', 'Administración debe aprobar la diferencia de efectivo antes del cierre completo.');
        if (command.approval_id) {
          const approval = find(state.cash_close_approvals ?? [], command.approval_id);
          invariant(approval.cash_session_id === cash.id && approval.business_day_id === state.business_day.id && approval.actor_id !== cash.owner_id, 'FORBIDDEN', 'La aprobación no pertenece a este cierre independiente.', 403);
          invariant(state.staff.some(s => s.id === approval.actor_id && s.role === 'admin' && s.active !== false), 'FORBIDDEN', 'El aprobador ya no tiene permiso administrativo.', 403);
          invariant(approval.cash_version === cash.version && approval.day_version === state.business_day.version && approval.seal_state_version === state.version, 'VERSION_CONFLICT', 'El estado cambió después de la aprobación. Repite la revisión del cierre.');
          invariant(approval.counted_cash_minor === counted && approval.stock_counts.length === command.stock_counts.length && approval.stock_counts.every(l => command.stock_counts.some(c => c.stock_item_id === l.stock_item_id && c.counted_quantity === l.counted_quantity)), 'DISCREPANCY_APPROVAL_REQUIRED', 'La aprobación corresponde a otro conteo; revisa nuevamente las cantidades.');
        }
      } else invariant(!command.approval_id, 'VALIDATION_ERROR', 'Una firma de cierre final no se usa para un corte provisional.', 400);
      if (cash.state === 'closed') invariant(counted === cash.counted_minor, 'INVALID_TRANSITION', 'No se modifica el conteo original de una caja cerrada.');
      else { cash.state = 'closed'; cash.closed_at = now; cash.counted_minor = counted; cash.difference_minor = counted - cash.expected_minor; cash.version++; }
      const sessions = state.cash_sessions.filter(s => s.business_day_id === state.business_day.id);
      invariant(sessions.every(s => s.state === 'closed'), 'CASH_NOT_OPEN', 'Todavía hay una caja abierta.');
      const payments = state.payments.filter(p => p.business_day_id === state.business_day.id && p.status === 'succeeded');
      const sum = (method?: string) => payments.filter(p => !method || p.method === method).reduce((n, p) => addExact(n, p.amount_minor), 0);
      const ids = new Set(sessions.map(s => s.id)); const movements = state.cash_movements.filter(m => ids.has(m.cash_session_id));
      const paidIn = movements.filter(m => m.kind === 'paid_in').reduce((n, m) => addExact(n, m.amount_minor), 0);
      const paidOut = movements.filter(m => m.kind === 'paid_out').reduce((n, m) => addExact(n, m.amount_minor), 0);
      const initial = sessions.filter(s => !s.predecessor_handover_id).reduce((n, s) => addExact(n, s.opening_minor), 0);
      const cashDifference = sessions.reduce((n, s) => addExact(n, s.difference_minor ?? 0), 0);
      const previousVariance = sessions.filter(s => s.id !== cash.id).reduce((n, s) => addExact(n, s.difference_minor ?? 0), 0);
      const expectedFinal = addExact(initial, sum('cash'), paidIn, -paidOut, previousVariance);
      const unknown = state.payments.filter(p => p.status === 'unknown').map(p => p.id);
      const checks = state.checks.filter(c => state.orders.some(o => o.check_id === c.id && o.business_day_id === state.business_day.id));
      const pendingChecks = checks.filter(c => c.paid_minor < c.total_minor || c.held_minor > 0).map(c => c.id);
      const fiscal = checks.filter(c => c.total_minor > 0 && (c.fiscal_status === 'pending' || state.fiscal_documents?.some(d => d.check_id === c.id && ['accepted_simulated', 'annulled'].includes(d.status)))).map(c => c.id);
      const notes = [state.environment === 'operational' ? 'Integración fiscal aún no conectada; la nota interna no sustituye comprobantes.' : 'Ruta fiscal no habilitada en laboratorio; la nota interna no sustituye comprobantes.'];
      if (unknown.length) notes.push('Cobros inciertos conservan saldo retenido.');
      if (pendingChecks.length) notes.push('Hay cuentas con saldo pendiente.');
      if (cashDifference || lines.some(l => l.difference_quantity)) notes.push('Las diferencias de conteo permanecen visibles.');
      const pendingCounts = state.inventory_counts.filter(c => c.status === 'declared').map(c => c.id);
      if (pendingCounts.length) notes.push('Hay conteos de inventario pendientes de revisión; las retenciones permanecen vigentes.');
      const daySales = checks.reduce((sum, check) => addExact(sum, check.total_minor), 0);
      const closeId = id(); state.day_closes.push({ id: closeId, business_day_id: state.business_day.id, revision: state.day_closes.filter(d => d.business_day_id === state.business_day.id).length + 1, state: 'provisionally_closed', sales_minor: daySales, collections_minor: sum(), cash_collections_minor: sum('cash'), card_collections_minor: sum('card'), yape_collections_minor: sum('yape'), prior_day_collections_minor: payments.filter(p => !state.orders.some(o => o.check_id === p.check_id && o.business_day_id === state.business_day.id)).reduce((n, p) => addExact(n, p.amount_minor), 0), initial_external_float_minor: initial, external_paid_in_minor: paidIn, external_paid_out_minor: paidOut, expected_final_cash_minor: expectedFinal, counted_final_cash_minor: counted, cash_difference_minor: cashDifference, included_cash_session_ids: sessions.map(s => s.id), included_payment_ids: payments.map(p => p.id), unknown_payment_ids: unknown, open_check_ids: pendingChecks, pending_fiscal_check_ids: fiscal, stock_lines: lines, created_by: user.id, created_at: now, reconciliation_notes: notes, pending_inventory_count_ids: pendingCounts });
      Object.assign(state.day_closes.at(-1)!, { operational_status: final ? 'reconciled' : 'pending', close_mode: final ? 'operational_final' : 'provisional', cash_approval_id: final ? command.approval_id ?? null : null });
      if (final) notes.push('Caja y bebidas conciliadas operativamente; fiscalidad y liquidación bancaria siguen separadas.');
      state.business_day.state = 'provisionally_closed'; state.business_day.version++; entityId = closeId; break;
    }
    case 'day.open': {
      role(user, 'admin'); version(state.business_day, command.expected_day_version); reason(command.reason);
      invariant(state.business_day.state !== 'open' && state.cash_sessions.every(s => s.state === 'closed') && !beverageFrozen(state), 'INVALID_TRANSITION', 'Cierra el día y todos los recursos antes de avanzar.');
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(now));
      const part = (type: string) => parts.find(p => p.type === type)!.value;
      const today = `${part('year')}-${part('month')}-${part('day')}`;
      invariant(state.environment !== 'operational' || today > state.business_day.business_date, 'DAY_DATE_NOT_ADVANCED', 'La fecha del local aún no avanzó en Lima. No se puede abrir un día futuro; verifica el reloj y conserva el cierre.');
      const next = new Date(`${state.business_day.business_date}T00:00:00Z`); next.setUTCDate(next.getUTCDate() + 1);
      const nextDate = next.toISOString().slice(0, 10);
      const dayId = id();
      state.business_days = state.business_days.map(d => d.id === state.business_day.id ? structuredClone(state.business_day) : d);
      state.business_day = { id: dayId, business_date: state.environment === 'operational' ? today : today > nextDate ? today : nextDate, timezone: 'America/Lima', state: 'open', version: 1 };
      state.business_days.push(structuredClone(state.business_day)); entityId = dayId; break;
    }
    case 'catalog.product.create': {
      role(user, 'admin');
      invariant(typeof command.name === 'string' && command.name.trim().length >= 2 && command.name.length <= 100, 'VALIDATION_ERROR', 'El nombre debe tener entre 2 y 100 caracteres.', 400);
      invariant(typeof command.category === 'string' && command.category.trim().length >= 2 && command.category.length <= 50, 'VALIDATION_ERROR', 'La categoría debe tener entre 2 y 50 caracteres.', 400);
      invariant(Number.isSafeInteger(command.price_minor) && command.price_minor > 0, 'VALIDATION_ERROR', 'El precio debe ser un número entero positivo en céntimos PEN.', 400);
      const reasonText = reason(command.reason);
      const productId = (command.product_id ?? id()).toLowerCase();
      invariant(!state.products.some(p => p.id.toLowerCase() === productId), 'PRODUCT_ID_CONFLICT', 'Este identificador de producto ya existe en la carta.', 409);
      const newProduct: Product = {
        id: productId,
        name: command.name.trim(),
        category: command.category.trim(),
        price_minor: command.price_minor,
        station: command.station,
        stock_policy: command.stock_policy,
        stock_item_id: command.stock_item_id ?? null,
        active: true,
        version: 1
      };
      validateProductBinding(state, newProduct);
      state.products.push(newProduct);
      const auditEntry: CatalogAuditEntry = {
        id: id(),
        actor_id: user.id,
        operation_id: command.operation_id,
        product_id: productId,
        action: 'create',
        previous_version: null,
        new_version: 1,
        changes: {
          name: { old: null, new: newProduct.name },
          category: { old: null, new: newProduct.category },
          price_minor: { old: null, new: newProduct.price_minor },
          station: { old: null, new: newProduct.station },
          stock_policy: { old: null, new: newProduct.stock_policy },
          stock_item_id: { old: null, new: newProduct.stock_item_id },
          active: { old: null, new: true }
        },
        reason: reasonText,
        created_at: now
      };
      state.catalog_audit.push(auditEntry);
      entityId = productId;
      break;
    }
    case 'catalog.product.update': {
      role(user, 'admin');
      const product = find(state.products, command.product_id);
      version(product, command.expected_version);
      invariant(typeof command.name === 'string' && command.name.trim().length >= 2 && command.name.length <= 100, 'VALIDATION_ERROR', 'El nombre debe tener entre 2 y 100 caracteres.', 400);
      invariant(typeof command.category === 'string' && command.category.trim().length >= 2 && command.category.length <= 50, 'VALIDATION_ERROR', 'La categoría debe tener entre 2 y 50 caracteres.', 400);
      invariant(Number.isSafeInteger(command.price_minor) && command.price_minor > 0, 'VALIDATION_ERROR', 'El precio debe ser un número entero positivo en céntimos PEN.', 400);
      invariant(typeof command.active === 'boolean', 'VALIDATION_ERROR', 'Estado activo inválido.', 400);
      const reasonText = reason(command.reason);
      const next: Product = {
        ...product,
        name: command.name.trim(), category: command.category.trim(), price_minor: command.price_minor, active: command.active,
        station: command.station ?? product.station,
        stock_policy: command.stock_policy ?? product.stock_policy,
        stock_item_id: command.stock_item_id !== undefined ? command.stock_item_id : command.stock_policy === 'none' ? null : product.stock_item_id,
        version: product.version + 1,
      };
      const hasHistory = state.orders.some(o => o.lines.some(l => l.product_id === product.id));
      if (hasHistory) {
        if (next.station !== product.station) {
          throw new DomainError('COMMERCIAL_HISTORY_LOCKED', 'No se puede cambiar la estación de un producto con historial comercial.', 409);
        }
        if (next.stock_policy !== product.stock_policy) {
          throw new DomainError('COMMERCIAL_HISTORY_LOCKED', 'No se puede cambiar la política de inventario de un producto con historial comercial.', 409);
        }
        if (next.stock_item_id !== product.stock_item_id) {
          throw new DomainError('COMMERCIAL_HISTORY_LOCKED', 'No se puede cambiar el ítem de stock vinculado de un producto con historial comercial.', 409);
        }
      }
      validateProductBinding(state, next);
      const changes: Record<string, { old: unknown; new: unknown }> = {};
      for (const field of ['name', 'category', 'price_minor', 'active', 'station', 'stock_policy', 'stock_item_id'] as const) {
        if (product[field] !== next[field]) changes[field] = { old: product[field], new: next[field] };
      }
      const prevVersion = product.version;
      Object.assign(product, next);

      const auditEntry: CatalogAuditEntry = {
        id: id(),
        actor_id: user.id,
        operation_id: command.operation_id,
        product_id: product.id,
        action: 'update',
        previous_version: prevVersion,
        new_version: product.version,
        changes,
        reason: reasonText,
        created_at: now
      };
      state.catalog_audit.push(auditEntry);
      entityId = product.id;
      break;
    }
    default: throw new DomainError('UNSUPPORTED_CAPABILITY', 'Esta operación no está habilitada en el laboratorio.', 400);
  }
  const auditReason = 'reason' in command ? command.reason : 'approval_reason' in command ? command.approval_reason : undefined;
  state.audit.push({ id: id(), actor_id: user.id, operation_id: command.operation_id, action: command.type, entity_id: entityId, created_at: now, source:context.guest?'guest':'staff', ...(context.guest?{guest_session_id:context.guest.session_id}:{}), ...(auditReason ? {reason:auditReason.trim()} : {}) });
  for(const access of state.guest_accesses.filter(a=>a.state==='active')) {
    const visit=find(state.visits,access.visit_id), check=find(state.checks,visit.check_id);
    if(visit.status==='closed' || (check.total_minor>0 && check.paid_minor===check.total_minor && check.held_minor===0)) {
      access.state=check.total_minor>0 && check.paid_minor===check.total_minor?'settled':'revoked';access.ended_at=now;
    }
  }
  state.version++; state.last_event_at = now;
  state.business_days = state.business_days.map(d => d.id === state.business_day.id ? structuredClone(state.business_day) : d);
  return { state, entity_id: entityId, snapshot: projectSnapshot(state, actor, now) };
}

export function createDomainQuote(
  state: BranchState,
  visit_id: string,
  linesInput: QuoteLineInput[],
  now: string,
  quoteId: string,
  actor: Actor,
  guest?: GuestPrincipal
): OrderQuote {
  const user = member(state, actor);
  role(user, 'waiter', 'cashier', 'admin');
  const visit = find(state.visits, visit_id);
  invariant(visit.status === 'open', 'VISIT_NOT_OPEN', 'La visita ya está cerrada.', 404);
  const check = find(state.checks, visit.check_id);
  invariant(check.status === 'open', 'VISIT_NOT_OPEN', 'La cuenta está cerrada.', 400);
  invariant(!(check.total_minor > 0 && check.paid_minor === check.total_minor && check.held_minor === 0), guest ? 'GUEST_ACCESS_ENDED' : 'INVALID_TRANSITION', 'La cuenta ya está pagada; concluye esta atención antes de abrir otra.', guest ? 403 : 409);
  invariant(linesInput.length > 0 && linesInput.length <= 100, 'VALIDATION_ERROR', 'La cotización requiere entre una y cien líneas.', 400);

  const lines: QuoteLineView[] = linesInput.map(item => {
    const product = find(state.products, item.product_id);
    invariant(product.active, 'PRODUCT_UNAVAILABLE', `El producto "${product.name}" no está disponible para cotización.`, 404);
    invariant(productAvailableInService(state, product), 'SERVICE_MODE_RESTRICTED', 'El turno nocturno solo vende cerveza, gaseosa y agua de Caja.');
    const quantity = units(item.quantity);
    const note = item.note?.trim() ?? '';
    invariant(note.length <= 300, 'VALIDATION_ERROR', 'La observación es demasiado larga.', 400);
    return {
      product_id: product.id,
      product_name: product.name,
      station: product.station,
      unit_price_minor: product.price_minor,
      quantity,
      product_version: product.version,
      note
    };
  });

  const total = lines.reduce((sum, l) => addExact(sum, roundRatio(l.unit_price_minor, l.quantity, 1)), 0);
  minor(total, true);

  const expires_at = new Date(Date.parse(now) + 120 * 1000).toISOString();
  return {
    id: quoteId,
    tenant_id: actor.tenant_id,
    branch_id: actor.branch_id,
    visit_id: visit.id,
    actor_id: actor.user.id,
    principal_kind: guest ? 'guest' : 'staff',
    guest_session_id: guest ? guest.session_id : null,
    total_minor: total,
    lines,
    expires_at,
    consumed_at: null,
    created_at: now
  };
}
