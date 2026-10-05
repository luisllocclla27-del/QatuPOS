import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

async function staff(page: Page, user: string) {
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill(user);
  await page.getByLabel('Contraseña', { exact: true }).fill('QatuDemo2026!');
  await page.getByRole('button', { name: 'Ingresar a mi espacio' }).click();
  await expect(page.getByRole('navigation', { name: 'Secciones de operación' })).toBeVisible();
}

async function key(page: Page, table: string) {
  await page.getByRole('button', { name: new RegExp(table) }).click();
  await page.getByRole('button', { name: 'Habilitar mesa y mostrar clave' }).click();
  const output = page.locator('output[aria-label="Clave de cliente"]');
  await expect(output).toHaveText(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
  return (await output.innerText()).trim();
}

async function enter(page: Page, code: string) {
  await page.goto('/cliente');
  await page.getByLabel('Clave de tu mesa').fill(code);
  await page.getByRole('button', { name: 'Vincularme a mi mesa' }).click();
  await expect(page.getByRole('heading', { name: '¿Qué te provoca hoy?' })).toBeVisible();
}

test('admin manages catalog and price change from 35 to 38 rejects stale quote with alert and accepts updated price', async ({ browser }) => {
  test.setTimeout(90000);
  await mkdir('docs/evidence/screens', { recursive: true });

  const adminContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const waiterContext = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true });
  const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });

  const admin = await adminContext.newPage();
  const waiter = await waiterContext.newPage();
  const guest = await guestContext.newPage();

  const contexts = [adminContext, waiterContext, guestContext];

  try {
    // 1. Admin logs in and checks Carta navigation
    await staff(admin, 'admin');
    await admin.getByRole('navigation').getByRole('button', { name: /Carta/ }).click();
    await expect(admin.getByRole('heading', { name: 'Carta configurable' })).toBeVisible();

    // Verify responsiveness of catalog administration
    expect(await admin.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    // 2. Admin creates a new product
    await admin.getByRole('button', { name: '+ Nuevo producto' }).click();
    const createDialog = admin.getByRole('dialog');
    await expect(createDialog.getByRole('heading', { name: 'Nuevo producto' })).toBeVisible();
    await createDialog.getByLabel('Nombre del producto').fill('Chicha morada jarra');
    await createDialog.getByLabel('Categoría', { exact: true }).fill('Bebidas');
    await createDialog.getByLabel('Precio (S/)').fill('12.00');
    await createDialog.getByLabel('Estación de atención').selectOption('caja');
    await createDialog.getByLabel('Motivo del alta').fill('Incorporación de jarra familiar');
    await createDialog.getByRole('button', { name: 'Crear producto' }).click();

    await expect(admin.getByRole('status')).toContainText('Producto creado correctamente');
    await expect(admin.locator('tr').filter({ hasText: 'Chicha morada jarra' })).toBeVisible();
    await expect(admin.locator('tr').filter({ hasText: 'Chicha morada jarra' })).toContainText('12.00');
    await admin.screenshot({ path: 'docs/evidence/screens/carta-admin.png', fullPage: true });

    // 3. Waiter enables Mesa 03 for customer ordering
    await staff(waiter, 'mozo');
    const tableCode = await key(waiter, 'Mesa 03');

    // 4. Customer enters Mesa 03 and adds Ceviche clásico (priced at S/ 35.00)
    await enter(guest, tableCode);
    await guest.locator('.guest-product').filter({ hasText: 'Ceviche clásico' }).click();
    await guest.getByRole('button', { name: 'Revisar mi pedido' }).click();

    // Customer sees official quote at S/ 35.00
    const reviewDialog = guest.getByRole('dialog');
    await expect(reviewDialog).toBeVisible();
    await expect(reviewDialog.getByRole('heading', { name: 'Confirma tu pedido' })).toBeVisible();
    await expect(reviewDialog.locator('.guest-total')).toContainText('35.00');

    // 5. Admin updates Ceviche clásico price from S/ 35.00 to S/ 38.00 while guest holds the quote
    const cevicheRow = admin.locator('tr').filter({ hasText: 'Ceviche clásico' });
    await cevicheRow.getByRole('button', { name: 'Editar' }).click();
    const editDialog = admin.getByRole('dialog');
    await expect(editDialog.getByRole('heading', { name: 'Editar producto' })).toBeVisible();
    await editDialog.getByLabel('Precio (S/)').fill('38.00');
    await editDialog.getByLabel('Motivo de la modificación').fill('Ajuste de insumos marinos');
    await editDialog.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(admin.getByRole('status')).toContainText('Producto actualizado en la carta');
    await expect(cevicheRow).toContainText('38.00');

    // 6. Guest attempts to confirm order with stale S/ 35.00 quote
    await reviewDialog.getByRole('button', { name: 'Confirmar y enviar mi pedido' }).click();

    // Server rejects with PRICE_CHANGED; UI catches it and displays warning while keeping selection
    await expect(reviewDialog.locator('.alert.warning')).toContainText('cambió de S/ 35.00 a S/ 38.00');
    await expect(reviewDialog.locator('.guest-total')).toContainText('38.00');
    await guest.screenshot({ path: 'docs/evidence/screens/precio-cambiado.png', fullPage: true });

    // 7. Guest confirms consciously with the updated price
    await reviewDialog.getByRole('button', { name: 'Confirmar y enviar mi pedido' }).click();
    await expect(guest.getByRole('status')).toContainText('Pedido recibido');
    await expect(guest.locator('.guest-order')).toHaveCount(1);

    // 8. Waiter verifies that the table account registered exactly S/ 38.00
    await waiter.getByRole('button', { name: /Volver a mesas/ }).click();
    await waiter.getByRole('button', { name: /Mesa 03/ }).click();
    await expect(waiter.locator('.current-account')).toContainText('38.00');

    // Verify audit trail in Carta
    await admin.getByRole('navigation').getByRole('button', { name: /Carta/ }).click();
    const auditDetails = admin.locator('details').filter({ hasText: 'Historial de auditoría de la carta' });
    if (await auditDetails.count() > 0) {
      await auditDetails.locator('summary').click();
      await expect(auditDetails).toContainText('Ajuste de insumos marinos');
    }
  } finally {
    for (const c of contexts) await c.close();
  }
});

test('admin catalog mobile view stays within viewport', async ({ browser }) => {
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobile = await mobileContext.newPage();
  try {
    await staff(mobile, 'admin');
    await mobile.getByRole('navigation').getByRole('button', { name: /Carta/ }).click();
    await expect(mobile.getByRole('heading', { name: 'Carta configurable' })).toBeVisible();
    expect(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await mobile.screenshot({ path: 'docs/evidence/screens/carta-admin-movil.png', fullPage: true });
  } finally {
    await mobileContext.close();
  }
});
