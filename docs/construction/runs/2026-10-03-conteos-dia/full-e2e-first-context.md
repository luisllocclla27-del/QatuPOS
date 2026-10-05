# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: zzzzzzzzz-inventory.spec.ts >> cashier declares, shortage remains held, recount preserves observation and another admin approves
- Location: tests\e2e\zzzzzzzzz-inventory.spec.ts:15:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('status')
Expected substring: "Pedido registrado"
Error: strict mode violation: getByRole('status') resolved to 2 elements:
    1) <div role="status" class="alert success">…</div> aka getByText('✓ Pedido registrado. Las')
    2) <output class="guest-code" aria-label="Clave de cliente">SYNTHETIC_CODE_REDACTED</output> aka getByRole('status', { name: 'Clave de cliente' })

Call log:
  - Expect "toContainText" getByRole('status') with timeout 12000ms
  - waiting for getByRole('status')
    2 × locator resolved to <output class="guest-code" aria-label="Clave de cliente">SYNTHETIC_CODE_REDACTED</output>
      - unexpected value "SYNTHETIC_CODE_REDACTED"

```

# Test source

```ts
  1  | import { test, expect, type Page } from '@playwright/test';
  2  | import { mkdir } from 'node:fs/promises';
  3  | import type { PosSnapshot } from '@qatu/contracts';
  4  | async function login(page: Page, user: string) {
  5  |   await page.goto('/'); await page.getByLabel('Usuario', { exact: true }).fill(user); await page.getByLabel('Contraseña', { exact: true }).fill('QatuDemo2026!');
  6  |   await page.getByRole('button', { name: 'Ingresar a mi espacio' }).click(); await expect(page.getByRole('navigation', { name: 'Secciones de operación' })).toBeVisible();
  7  | }
  8  | async function declare(page: Page, reason: string, shortage: boolean) {
  9  |   const s = await (await page.request.get('/v1/pos/snapshot')).json() as PosSnapshot;
  10 |   for (const stock of s.stock.filter(x => x.station === 'caja')) await expect(page.locator('tr').filter({ hasText: stock.name }).first().locator('td').nth(3)).toHaveText(String(stock.reserved));
  11 |   for (const stock of s.stock.filter(x => x.station === 'caja')) await page.getByLabel(`Contado · ${stock.name}`).fill(String(shortage && stock.name === 'Cerveza personal' ? 0 : stock.on_hand));
  12 |   await page.getByLabel('Motivo del conteo').fill(reason); await page.getByRole('button', { name: 'Guardar conteo declarado' }).click();
  13 |   await expect(page.getByRole('status').first()).toContainText('Conteo declarado');
  14 | }
  15 | test('cashier declares, shortage remains held, recount preserves observation and another admin approves', async ({ browser }) => {
  16 |   const contexts = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext()]);
  17 |   const [cash, admin, waiter] = await Promise.all(contexts.map(c => c.newPage()));
  18 |   try {
  19 |     await login(cash!, 'caja'); await cash!.getByRole('navigation').getByRole('button', { name: /Mi turno/ }).click();
  20 |     if (await cash!.getByLabel('Fondo físico inicial (S/)').isVisible()) { await cash!.getByLabel('Fondo físico inicial (S/)').fill('0.00'); await cash!.getByRole('button', { name: 'Abrir mi sesión' }).click(); await expect(cash!.getByRole('status')).toContainText('Sesión de caja abierta'); }
  21 |     await login(waiter!, 'mozo'); await waiter!.getByRole('button', { name: /Mesa 10/ }).click(); await waiter!.getByRole('button', { name: /Cerveza personal/ }).click();
  22 |     await waiter!.getByRole('button', { name: 'Enviar pedido' }).click(); await waiter!.getByRole('dialog').getByRole('button', { name: /Enviar 1 productos/ }).click();
> 23 |     await expect(waiter!.getByRole('status')).toContainText('Pedido registrado');
     |                                               ^ Error: expect(locator).toContainText(expected) failed
  24 |     await cash!.getByRole('navigation').getByRole('button', { name: /Inventario/ }).click(); await expect(cash!.getByRole('heading', { name: 'Declarar conteo de inventario' })).toBeVisible();
  25 |     await expect(cash!.locator('tr').filter({ hasText: 'Cerveza personal' }).first().locator('td').nth(3)).not.toHaveText('0');
  26 |     await cash!.getByLabel('Contado · Cerveza personal').fill('0');
  27 |     await waiter!.getByRole('button', { name: /Cerveza personal/ }).click(); await waiter!.getByRole('button', { name: 'Enviar pedido' }).click();
  28 |     await waiter!.getByRole('dialog').getByRole('button', { name: /Enviar 1 productos/ }).click(); await expect(waiter!.locator('.history-batch')).toHaveCount(2);
  29 |     await expect(cash!.getByText('El inventario o sus reservas cambiaron desde que comenzaste a contar.')).toBeVisible();
  30 |     await expect(cash!.getByRole('button', { name: 'Guardar conteo declarado' })).toBeDisabled();
  31 |     await cash!.getByRole('button', { name: 'Descartar valores y recontar' }).click(); await expect(cash!.getByLabel('Contado · Cerveza personal')).toHaveValue('');
  32 |     await declare(cash!, 'Faltante físico E2E013', true);
  33 |     await expect(cash!.locator('tr').filter({ hasText: 'Cerveza personal' }).first()).toContainText('Retenido por conteo');
  34 |     await login(admin!, 'admin'); await admin!.getByRole('navigation').getByRole('button', { name: /Inventario/ }).click();
  35 |     const first = admin!.getByRole('region', { name: 'Conteo Faltante físico E2E013', exact: true });
  36 |     await expect(first).toContainText('faltan'); await expect(first.getByRole('button', { name: 'Aprobar ajuste' })).toBeDisabled();
  37 |     // A second physical declaration, rather than editing the first, resolves the observation.
  38 |     await declare(cash!, 'Reconteo físico verificado E2E013', false);
  39 |     await expect(first).toContainText('Sustituido por reconteo'); await expect(first.locator('tr').filter({ hasText: 'Cerveza personal' })).toContainText('0');
  40 |     const second = admin!.getByRole('region', { name: 'Conteo Reconteo físico verificado E2E013', exact: true });
  41 |     await second.getByLabel('Motivo de aprobación').fill('Revisión independiente del reconteo'); await second.getByRole('button', { name: 'Aprobar ajuste' }).click();
  42 |     await expect(admin!.getByRole('status').first()).toContainText('Ajuste revisado'); await expect(second).toContainText('Ajustado con aprobación');
  43 |     await expect(admin!.locator('tr').filter({ hasText: 'Cerveza personal' }).first()).toContainText('Sin conteo pendiente');
  44 |     const final = await (await admin!.request.get('/v1/pos/snapshot')).json() as PosSnapshot;
  45 |     expect(final.inventory_counts.find(c => c.reason === 'Faltante físico E2E013')!.lines[0]!.counted_quantity).toBe(0);
  46 |     expect(final.stock.find(s => s.name === 'Cerveza personal')!.reserved).toBeGreaterThanOrEqual(1);
  47 |     await mkdir('docs/evidence/screens', { recursive: true }); await admin!.screenshot({ path: 'docs/evidence/screens/conteo-revision-013.png', fullPage: true });
  48 |   } finally { for (const c of contexts) await c.close(); }
  49 | });
  50 | 
```