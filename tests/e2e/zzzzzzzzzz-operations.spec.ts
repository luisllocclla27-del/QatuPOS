import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import type { PosSnapshot } from '@qatu/contracts';
async function login(page: Page, name: string) {
  await page.goto('/'); await page.getByLabel('Usuario', { exact: true }).fill(name); await page.getByLabel('Contraseña', { exact: true }).fill('QatuDemo2026!'); await page.getByRole('button', { name: 'Ingresar a mi espacio' }).click(); await expect(page.getByRole('navigation', { name: 'Secciones de operación' })).toBeVisible();
}
async function snapshot(page: Page): Promise<PosSnapshot> { return (await page.request.get('/v1/pos/snapshot')).json(); }
async function command(page: Page, body: Record<string, unknown>) {
  const session = await (await page.request.get('/v1/pos/session')).json();
  const r = await page.request.post('/v1/pos/commands', { headers: { 'x-csrf-token': session.csrf_token }, data: { operation_id: randomUUID(), ...body } });
  expect(r.status()).toBe(200); return r.json();
}
async function addOrder(page: Page, table: string, product: string) {
  await page.getByRole('navigation').getByRole('button', { name: /Mesas/ }).click();
  if (await page.getByRole('button', { name: /Volver a mesas/ }).isVisible()) await page.getByRole('button', { name: /Volver a mesas/ }).click();
  await page.getByRole('button', { name: new RegExp(table) }).click(); await page.getByRole('button', { name: new RegExp(product) }).click(); await page.getByRole('button', { name: 'Enviar pedido' }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Enviar 1 productos' }).click(); await expect(page.locator('div.alert[role="status"]')).toContainText('Pedido registrado');
}
test('touch queue keeps FIFO, urgency aviso and paper-only preparation separate from pickup', async ({ browser }) => {
  const contexts = await Promise.all([browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true }), browser.newContext(), browser.newContext()]); const [waiter, kitchen, cash] = await Promise.all(contexts.map(c => c.newPage()));
  try {
    await login(cash!, 'otro_caja'); await cash!.getByRole('navigation').getByRole('button', { name: /Mi turno/ }).click(); await cash!.getByLabel('Fondo físico inicial (S/)').fill('0.00'); await cash!.getByRole('button', { name: 'Abrir mi sesión' }).click(); await expect(cash!.locator('div.alert[role="status"]')).toContainText('Sesión de caja abierta');
    await login(waiter!, 'otro_mozo'); await addOrder(waiter!, 'Mesa 01', 'Ceviche clásico'); await addOrder(waiter!, 'Mesa 02', 'Arroz con mariscos');
    await waiter!.getByRole('navigation').getByRole('button', { name: /Estaciones/ }).click(); await waiter!.getByRole('button', { name: 'Cocina', exact: true }).click();
    await expect(waiter!.locator('.fulfillment-card').first()).toContainText('Mesa 01');
    const second = waiter!.getByRole('region', { name: 'Preparación Mesa 02 tanda 1', exact: true }); await second.getByText('Prioridad excepcional', { exact: true }).click(); await second.getByLabel('Motivo de prioridad', { exact: true }).fill('Cliente espera por incidencia comprobada'); await second.getByRole('button', { name: 'Marcar urgente con motivo' }).click();
    await expect(waiter!.locator('.fulfillment-card').first()).toContainText('Mesa 02'); await expect(second).toContainText('AVISO DE PRIORIDAD · NO REPETIR PEDIDO');
    await login(kitchen!, 'otro_cocina'); await expect(kitchen!.locator('.fulfillment-card').first()).toContainText('Mesa 02'); await expect(kitchen!.locator('.fulfillment-card').first()).toContainText('Cliente espera por incidencia comprobada');
    await mkdir('docs/evidence/screens', { recursive: true }); await kitchen!.screenshot({ path: 'docs/evidence/screens/cola-cocina-014.png', fullPage: true });
    await second.getByText('La estación confirmó que está listo', { exact: true }).click(); await second.getByLabel('Confirmación de Cocina', { exact: true }).fill('Cocinero confirmó un arroz listo para salida'); await second.getByRole('button', { name: 'Registrar 1 confirmado listo' }).click(); await expect(second).toContainText('1 listos');
    await second.getByRole('button', { name: 'Reservar retiro de 1' }).click(); await expect(second).toContainText('Retiro reservado por');
    await cash!.getByRole('navigation').getByRole('button', { name: /Estaciones/ }).click(); await cash!.getByRole('button', { name: 'Cocina', exact: true }).click(); const cashSecond = cash!.getByRole('region', { name: 'Preparación Mesa 02 tanda 1', exact: true }); await expect(cashSecond).toContainText('Retiro reservado por'); await expect(cashSecond.getByRole('button', { name: 'Entregar 1' })).toBeDisabled();
    await second.getByRole('button', { name: 'Entregar 1' }).click(); await expect(second).toHaveCount(0);
    const first = waiter!.getByRole('region', { name: 'Preparación Mesa 01 tanda 1', exact: true }); await first.getByText('La estación confirmó que está listo', { exact: true }).click(); await first.getByLabel('Confirmación de Cocina', { exact: true }).fill('Cocinero confirmó un ceviche listo'); await first.getByRole('button', { name: 'Registrar 1 confirmado listo' }).click(); await first.getByRole('button', { name: 'Reservar retiro de 1' }).click(); await first.getByRole('button', { name: 'Entregar 1' }).click(); await expect(waiter!.getByRole('heading', { name: 'Estación al día' })).toBeVisible();
    const s = await snapshot(cash!); expect(s.orders).toHaveLength(2); expect(s.print_jobs.filter(j => j.kind === 'order')).toHaveLength(2); expect(s.print_jobs.filter(j => j.kind === 'priority')).toHaveLength(1); expect(s.orders.every(o => o.lines.every(l => l.fulfilled_quantity === 1))).toBe(true);
  } finally { for (const c of contexts) await c.close(); }
});
test('night menu restricts tablets and QR and final stock/cash closes independently from fiscal', async ({ browser }) => {
  test.setTimeout(120000);
  const contexts = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true }), browser.newContext()]); const [cash, night, waiter, guest] = await Promise.all(contexts.map(c => c.newPage()));
  try {
    await login(cash!, 'otro_caja'); let s = await snapshot(cash!);
    // Standalone run uses a fresh second tenant; full suite retains previous test's two paid-at-night accounts.
    if (!s.cash_sessions.some(c => c.state === 'open')) { await cash!.getByRole('navigation').getByRole('button', { name: /Mi turno/ }).click(); await cash!.getByLabel('Fondo físico inicial (S/)').fill('0.00'); await cash!.getByRole('button', { name: 'Abrir mi sesión' }).click(); s = await snapshot(cash!); }
    for (const check of s.checks.filter(c => c.remaining_collectible_minor > 0)) { const a = await command(cash!, { type: 'collection.authorize', check_id: check.id, expected_version: check.version, cash_session_id: s.cash_sessions.at(-1)!.id, method: 'cash', amount_minor: check.remaining_collectible_minor }); await command(cash!, { type: 'payment.confirm', authorization_id: a.entity_id, received_minor: check.remaining_collectible_minor }); }
    await login(waiter!, 'otro_mozo'); await waiter!.getByRole('button', { name: /Mesa 03/ }).click(); let w = await snapshot(waiter!), visit = w.visits.find(v => v.table_id === w.tables.find(t => t.label === 'Mesa 03')!.id)!; await command(waiter!, { type: 'guest.access', visit_id: visit.id, expected_version: visit.version, action: 'activate', reason: 'Cliente QR de noche autorizado por mozo' }); const key = await (await waiter!.request.get('/v1/pos/guest-access/' + visit.id)).json();
    await guest!.goto('/cliente'); await guest!.getByLabel('Clave de tu mesa').fill(key.code); await guest!.getByRole('button', { name: /Vincularme a mi mesa/ }).click();
    s = await snapshot(cash!); const hand = await command(cash!, { type: 'handover.begin', cash_session_id: s.cash_sessions.at(-1)!.id, expected_version: s.cash_sessions.at(-1)!.version, incoming_user_id: s.staff.find(u => u.username === 'otro_noche')!.id }); await command(cash!, { type: 'handover.count', handover_id: hand.entity_id, expected_version: 1, counted_cash_minor: s.cash_sessions.at(-1)!.expected_minor, stock_counts: s.stock.filter(x => x.station === 'caja').map(x => ({ stock_item_id: x.id, counted_quantity: x.on_hand })) });
    await login(night!, 'otro_noche'); await night!.getByRole('navigation').getByRole('button', { name: /Mi turno/ }).click(); await night!.getByRole('button', { name: 'Confirmar recepción de caja y bebidas' }).click(); await expect(night!.locator('div.alert[role="status"]')).toContainText('Traspaso aceptado');
    await expect(waiter!.getByText('Turno nocturno · solo cerveza, gaseosa y agua', { exact: true })).toBeVisible(); await expect(waiter!.getByRole('button', { name: /Ceviche clásico/ })).toHaveCount(0); await expect(guest!.getByText('Carta nocturna: cerveza, gaseosa y agua.')).toBeVisible(); await expect(guest!.getByRole('button', { name: /Ceviche clásico/ })).toHaveCount(0);
    await addOrder(waiter!, 'Mesa 03', 'Agua'); await waiter!.getByRole('navigation').getByRole('button', { name: /Bebidas/ }).click(); await waiter!.getByRole('button', { name: 'Entregar 1', exact: true }).click();
    s = await snapshot(night!); const check = s.checks.find(c => c.visit_id === visit.id)!; const a = await command(night!, { type: 'collection.authorize', check_id: check.id, expected_version: check.version, cash_session_id: s.cash_sessions.at(-1)!.id, method: 'cash', amount_minor: check.total_minor }); await command(night!, { type: 'payment.confirm', authorization_id: a.entity_id, received_minor: check.total_minor });
    await night!.getByRole('navigation').getByRole('button', { name: /Cierre del día/ }).click(); const panel = night!.getByRole('region', { name: 'Cierre operativo nocturno', exact: true }); s = await snapshot(night!); await expect(panel).toHaveAttribute('data-state-version', String(s.version)); await expect(panel).toContainText('Pedidos, saldos, pagos y conteos pendientes resueltos.');
    await panel.getByLabel('Efectivo nocturno contado (S/)', { exact: true }).fill((s.cash_sessions.at(-1)!.expected_minor! / 100).toFixed(2)); for (const stock of s.stock.filter(x => x.station === 'caja')) await panel.getByLabel('Stock final · ' + stock.name, { exact: true }).fill(String(stock.on_hand)); await panel.getByLabel('Motivo de cierre o aprobación nocturna').fill('Conteo físico nocturno y cuadre total verificado'); await panel.getByRole('button', { name: 'Revisar cierre operativo completo' }).click(); await panel.getByRole('button', { name: 'Confirmar cierre operativo completo' }).click();
    await expect(night!.getByText('Caja y bebidas conciliadas operativamente', { exact: true })).toBeVisible(); await expect(night!.locator('.heading-meta')).toContainText('Operativo conciliado · fiscal pendiente'); const closed = await snapshot(night!); expect(closed.day_closes.at(-1)).toMatchObject({ operational_status: 'reconciled', state: 'provisionally_closed', close_mode: 'operational_final', cash_difference_minor: 0 }); expect(closed.stock.find(x => x.name === 'Agua')!.on_hand).toBe(23);
    await mkdir('docs/evidence/screens', { recursive: true }); await night!.screenshot({ path: 'docs/evidence/screens/cierre-nocturno-014.png', fullPage: true });
  } finally { for (const c of contexts) await c.close(); }
});
test('night cashier retains a cash shortage and another admin signs the exact final count', async ({ browser }) => {
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]); const [night, admin] = await Promise.all(contexts.map(c => c.newPage()));
  try {
    await login(admin!, 'otro_admin'); let s = await snapshot(admin!);
    expect(s.business_day.state).toBe('provisionally_closed'); await command(admin!, { type: 'day.open', expected_day_version: s.business_day.version, reason: 'Ensayar siguiente día con aprobación independiente' });
    await login(night!, 'otro_noche'); await night!.getByRole('navigation').getByRole('button', { name: /Mi turno/ }).click(); await night!.getByRole('combobox', { name: 'Turno', exact: true }).selectOption('nocturno'); await night!.getByLabel('Fondo físico inicial (S/)').fill('100.00'); await night!.getByRole('button', { name: 'Abrir mi sesión' }).click(); await expect(night!.locator('div.alert[role="status"]')).toContainText('Sesión de caja abierta');
    await night!.getByRole('navigation').getByRole('button', { name: /Cierre del día/ }).click(); await admin!.getByRole('navigation').getByRole('button', { name: /Cierre del día/ }).click(); s = await snapshot(night!);
    for (const page of [night!, admin!]) {
      const panel = page.getByRole('region', { name: 'Cierre operativo nocturno', exact: true }); await expect(panel).toHaveAttribute('data-state-version', String(s.version));
      await panel.getByLabel('Efectivo nocturno contado (S/)', { exact: true }).fill('99.00'); for (const stock of s.stock.filter(x => x.station === 'caja')) await panel.getByLabel('Stock final · ' + stock.name, { exact: true }).fill(String(stock.on_hand)); await panel.getByLabel('Motivo de cierre o aprobación nocturna').fill('Diferencia física revisada con responsable distinto');
    }
    const own = night!.getByRole('region', { name: 'Cierre operativo nocturno' }); await expect(own).toContainText('Requiere aprobación independiente'); await expect(own.getByRole('button', { name: 'Revisar cierre operativo completo' })).toBeDisabled();
    const review = admin!.getByRole('region', { name: 'Cierre operativo nocturno' }); await review.getByRole('button', { name: 'Firmar revisión independiente' }).click(); await expect(admin!.locator('div.alert[role="status"]')).toContainText('Revisión independiente firmada');
    await expect(own).toContainText('Revisión independiente vigente'); await own.getByRole('button', { name: 'Revisar cierre operativo completo' }).click(); await own.getByRole('button', { name: 'Confirmar cierre operativo completo' }).click(); await expect(night!.getByText('Caja y bebidas conciliadas operativamente', { exact: true })).toBeVisible(); await expect(night!.locator('.heading-meta')).toContainText('Operativo conciliado · fiscal pendiente');
    const final = await snapshot(night!); expect(final.day_closes.at(-1)).toMatchObject({ operational_status: 'reconciled', cash_difference_minor: -100, counted_final_cash_minor: 9900 }); expect(final.day_closes.at(-1)!.cash_approval_id).toBeTruthy(); expect(final.cash_close_approvals!.at(-1)!.actor_id).not.toBe(final.user.id);
    await mkdir('docs/evidence/screens', { recursive: true }); await expect(night!.getByRole('heading', { name: 'Sesiones incluidas en la operación' }).locator('..').locator('tbody tr')).toHaveCount(1); await night!.screenshot({ path: 'docs/evidence/screens/cierre-diferencia-aprobada-014.png', fullPage: true });
  } finally { for (const c of contexts) await c.close(); }
});


test('independent admin cancels declared custody cut without erasing original observation', async ({ browser }) => {
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]); const [admin, cash] = await Promise.all(contexts.map(c => c.newPage()));
  try {
    await login(admin!, 'otro_admin'); let s = await snapshot(admin!);
    if (s.business_day.state !== 'open') await command(admin!, { type: 'day.open', expected_day_version: s.business_day.version, reason: 'Nueva jornada de prueba de cancelación' });
    await login(cash!, 'otro_caja'); s = await snapshot(cash!);
    await command(cash!, { type: 'cash.open', shift_label: 'diurno', opening_minor: 10000, expected_day_version: s.business_day.version }); s = await snapshot(cash!);
    const before = structuredClone(s.stock), owner = s.cash_sessions.at(-1)!;
    const b = await command(cash!, { type: 'handover.begin', cash_session_id: owner.id, expected_version: owner.version, incoming_user_id: s.staff.find(u => u.username === 'otro_noche')!.id });
    await command(cash!, { type: 'handover.count', handover_id: b.entity_id, expected_version: 1, counted_cash_minor: 9900, stock_counts: s.stock.filter(x => x.station === 'caja').map(x => ({ stock_item_id: x.id, counted_quantity: x.on_hand })) });
    await admin!.reload(); await admin!.getByRole('navigation').getByRole('button', { name: /Mi turno/ }).click();
    await admin!.getByLabel('Motivo de cancelación del corte').fill('Conteo físico necesita revisión con saliente'); await admin!.getByRole('button', { name: 'Revisar cancelación del corte' }).click();
    await admin!.getByRole('dialog').getByRole('button', { name: 'Cancelar corte conservando conteo' }).click(); await expect(admin!.getByRole('status')).toContainText('Corte cancelado');
    await expect(admin!.getByText('Corte cancelado · conteo conservado')).toBeVisible(); s = await snapshot(admin!);
    expect(s.handovers.at(-1)).toMatchObject({ state: 'cancelled', counted_cash_minor: 9900, difference_cash_minor: -100 }); expect(s.cash_sessions.at(-1)).toMatchObject({ id: owner.id, owner_id: owner.owner_id, state: 'open', expected_minor: 10000 }); expect(s.stock).toEqual(before);
  } finally { for (const c of contexts) await c.close(); }
});
