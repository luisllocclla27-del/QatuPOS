import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import type { PosSnapshot } from '@qatu/contracts';
async function login(page: Page, user: string) {
  await page.goto('/'); await page.getByLabel('Usuario', { exact: true }).fill(user); await page.getByLabel('Contraseña', { exact: true }).fill('QatuDemo2026!');
  await page.getByRole('button', { name: 'Ingresar a mi espacio' }).click(); await expect(page.getByRole('navigation', { name: 'Secciones de operación' })).toBeVisible();
}
async function declare(page: Page, reason: string, shortage: boolean) {
  const s = await (await page.request.get('/v1/pos/snapshot')).json() as PosSnapshot;
  for (const stock of s.stock.filter(x => x.station === 'caja')) await expect(page.locator('tr').filter({ hasText: stock.name }).first().locator('td').nth(3)).toHaveText(String(stock.reserved));
  for (const stock of s.stock.filter(x => x.station === 'caja')) await page.getByLabel(`Contado · ${stock.name}`).fill(String(shortage && stock.name === 'Cerveza personal' ? 0 : stock.on_hand));
  await page.getByLabel('Motivo del conteo').fill(reason); await page.getByRole('button', { name: 'Guardar conteo declarado' }).click();
  await expect(page.getByRole('status').first()).toContainText('Conteo declarado');
}
test('cashier declares, shortage remains held, recount preserves observation and another admin approves', async ({ browser }) => {
  const contexts = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext()]);
  const [cash, admin, waiter] = await Promise.all(contexts.map(c => c.newPage()));
  try {
    await login(cash!, 'caja'); await cash!.getByRole('navigation').getByRole('button', { name: /Mi turno/ }).click();
    if (await cash!.getByLabel('Fondo físico inicial (S/)').isVisible()) { await cash!.getByLabel('Fondo físico inicial (S/)').fill('0.00'); await cash!.getByRole('button', { name: 'Abrir mi sesión' }).click(); await expect(cash!.getByRole('status')).toContainText('Sesión de caja abierta'); }
    await login(waiter!, 'mozo'); await waiter!.getByRole('button', { name: /Mesa 10/ }).click();
    const previousBatches = await waiter!.locator('.history-batch').count();
    await waiter!.getByRole('button', { name: /Cerveza personal/ }).click();
    await waiter!.getByRole('button', { name: 'Enviar pedido' }).click(); await waiter!.getByRole('dialog').getByRole('button', { name: /Enviar 1 productos/ }).click();
    await expect(waiter!.locator('div.alert[role="status"]')).toContainText('Pedido registrado');
    await cash!.getByRole('navigation').getByRole('button', { name: /Inventario/ }).click(); await expect(cash!.getByRole('heading', { name: 'Declarar conteo de inventario' })).toBeVisible();
    await expect(cash!.locator('tr').filter({ hasText: 'Cerveza personal' }).first().locator('td').nth(3)).not.toHaveText('0');
    await cash!.getByLabel('Contado · Cerveza personal').fill('0');
    await waiter!.getByRole('button', { name: /Cerveza personal/ }).click(); await waiter!.getByRole('button', { name: 'Enviar pedido' }).click();
    await waiter!.getByRole('dialog').getByRole('button', { name: /Enviar 1 productos/ }).click(); await expect(waiter!.locator('.history-batch')).toHaveCount(previousBatches + 2);
    await expect(cash!.getByText('El inventario o sus reservas cambiaron desde que comenzaste a contar.')).toBeVisible();
    await expect(cash!.getByRole('button', { name: 'Guardar conteo declarado' })).toBeDisabled();
    await cash!.getByRole('button', { name: 'Descartar valores y recontar' }).click(); await expect(cash!.getByLabel('Contado · Cerveza personal')).toHaveValue('');
    await declare(cash!, 'Faltante físico E2E013', true);
    await expect(cash!.locator('tr').filter({ hasText: 'Cerveza personal' }).first()).toContainText('Retenido por conteo');
    await login(admin!, 'admin'); await admin!.getByRole('navigation').getByRole('button', { name: /Inventario/ }).click();
    const first = admin!.getByRole('region', { name: 'Conteo Faltante físico E2E013', exact: true });
    await expect(first).toContainText('faltan'); await expect(first.getByRole('button', { name: 'Aprobar ajuste' })).toBeDisabled();
    // A second physical declaration, rather than editing the first, resolves the observation.
    await declare(cash!, 'Reconteo físico verificado E2E013', false);
    await expect(first).toContainText('Sustituido por reconteo'); await expect(first.locator('tr').filter({ hasText: 'Cerveza personal' })).toContainText('0');
    const second = admin!.getByRole('region', { name: 'Conteo Reconteo físico verificado E2E013', exact: true });
    await second.getByLabel('Motivo de aprobación').fill('Revisión independiente del reconteo'); await second.getByRole('button', { name: 'Aprobar ajuste' }).click();
    await expect(admin!.getByRole('status').first()).toContainText('Ajuste revisado'); await expect(second).toContainText('Ajustado con aprobación');
    await expect(admin!.locator('tr').filter({ hasText: 'Cerveza personal' }).first()).toContainText('Sin conteo pendiente');
    const final = await (await admin!.request.get('/v1/pos/snapshot')).json() as PosSnapshot;
    expect(final.inventory_counts.find(c => c.reason === 'Faltante físico E2E013')!.lines[0]!.counted_quantity).toBe(0);
    expect(final.stock.find(s => s.name === 'Cerveza personal')!.reserved).toBeGreaterThanOrEqual(1);
    await mkdir('docs/evidence/screens', { recursive: true }); await admin!.screenshot({ path: 'docs/evidence/screens/conteo-revision-013.png', fullPage: true });
  } finally { for (const c of contexts) await c.close(); }
});
