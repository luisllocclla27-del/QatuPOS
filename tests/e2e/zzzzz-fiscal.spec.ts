import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

async function signIn(page: Page, user: string) {
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill(user);
  await page.getByLabel('Contraseña', { exact: true }).fill('QatuDemo2026!');
  await page.getByRole('button', { name: 'Ingresar a mi espacio' }).click();
  await expect(page.getByRole('navigation', { name: 'Secciones de operación' })).toBeVisible();
}

test('pre-cuenta, electronic invoice issuance (F001/B001), 80mm thermal receipt, and fiscal history in Caja', async ({ browser }) => {
  test.setTimeout(90000);
  await mkdir('docs/evidence/screens', { recursive: true });

  const waiterContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const cashierContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });

  const waiter = await waiterContext.newPage();
  const cashier = await cashierContext.newPage();

  try {
    // 1. Cashier logs in and opens cash drawer
    await signIn(cashier, 'caja');
    await cashier.getByRole('navigation').getByRole('button', { name: /Mi turno/ }).click();
    if (await cashier.getByLabel('Fondo físico inicial (S/)').isVisible()) {
      await cashier.getByLabel('Fondo físico inicial (S/)').fill('200.00');
      await cashier.getByRole('button', { name: 'Abrir mi sesión' }).click();
      await expect(cashier.getByRole('status')).toContainText('Sesión de caja abierta');
    }

    // 2. Waiter logs in and creates order for Mesa 07
    await signIn(waiter, 'mozo');
    await waiter.getByRole('button', { name: /Mesa 07/ }).click();
    await waiter.getByRole('button', { name: /Arroz con mariscos/ }).click();
    await waiter.getByRole('button', { name: /Gaseosa personal/ }).click();
    await waiter.getByRole('button', { name: 'Enviar pedido' }).click();
    await waiter.getByRole('dialog').getByRole('button', { name: /Enviar 2 productos/ }).click();
    await expect(waiter.locator('.current-account')).toContainText('38.00');

    // 3. Waiter previews and prints Pre-cuenta de Mesa
    const precuentaBtn = waiter.getByRole('button', { name: /Imprimir Pre-cuenta/ });
    await expect(precuentaBtn).toBeVisible();
    await precuentaBtn.click();

    const precuentaModal = waiter.locator('.modal-backdrop').filter({ hasText: 'PRE-CUENTA DE MESA' });
    await expect(precuentaModal).toBeVisible();
    await expect(precuentaModal).toContainText('CUENTA DE CONSUMO - NO ES COMPROBANTE FISCAL');
    await expect(precuentaModal).toContainText('Mesa 07');
    await expect(precuentaModal).toContainText('Arroz con mariscos');
    await expect(precuentaModal).toContainText('Gaseosa personal');
    await expect(precuentaModal).toContainText('TOTAL CONSUMO:');
    await expect(precuentaModal).toContainText('S/ 38.00');

    // Screenshot of 80mm Pre-cuenta
    await waiter.screenshot({ path: 'docs/evidence/screens/precuenta-80mm.png', fullPage: true });

    // Close precuenta modal
    await precuentaModal.getByRole('button', { name: /Cerrar/ }).first().click();
    await expect(precuentaModal).not.toBeVisible();

    // 4. Cashier selects Mesa 07 in Caja and inspects account
    await cashier.getByRole('button', { name: 'Caja', exact: false }).first().click();
    await cashier.locator('.check-row').filter({ hasText: 'Mesa 07' }).click();
    await expect(cashier.locator('.payment-total')).toContainText('38.00');

    // Pre-cuenta button is also available in Caja
    await expect(cashier.getByRole('button', { name: /Imprimir Pre-cuenta/ })).toBeVisible();

    // 5. Cashier collects payment in cash
    await cashier.getByRole('button', { name: 'Efectivo' }).click();
    await cashier.getByLabel('Importe a cobrar (S/)').fill('38.00');
    await cashier.getByRole('button', { name: 'Reservar importe y continuar →' }).click();
    await expect(cashier.locator('.alert.info')).toContainText('Importe reservado: S/ 38.00');

    await cashier.getByLabel('Efectivo recibido (S/)').fill('50.00');
    await expect(cashier.locator('.change-preview')).toContainText('12.00');
    await cashier.getByRole('button', { name: 'Confirmar efectivo y cambio' }).click();
    await expect(cashier.getByRole('status')).toContainText('Cobro registrado');

    // 6. Account is now 100% paid, fiscal issue button is presented
    const issueFiscalBtn = cashier.getByRole('button', { name: /Emitir Boleta \/ Factura/ }).first();
    await expect(issueFiscalBtn).toBeVisible();
    await issueFiscalBtn.click();

    // 7. Fiscal Document issuance modal opens
    const issueModal = cashier.getByRole('dialog').filter({ hasText: 'Emitir Comprobante Electrónico' });
    await expect(issueModal).toBeVisible();
    await expect(issueModal).toContainText('Mesa 07');
    await expect(issueModal).toContainText('S/ 38.00');

    // Switch to Factura Electrónica
    await issueModal.getByRole('button', { name: /Factura Electrónica/ }).click();
    await expect(issueModal.getByLabel(/R\.U\.C\./i)).toBeVisible();

    // Fill valid RUC and Company data
    await issueModal.getByLabel(/R\.U\.C\./i).fill('20601234567');
    await issueModal.getByLabel(/Razón Social/).fill('CONSORCIO GASTRONOMICO HUAMANGA SAC');
    await issueModal.getByLabel(/Dirección fiscal/i).fill('Av. Mariscal Cáceres 456, Huamanga');

    // Submit fiscal document
    await issueModal.getByRole('button', { name: /Emitir Comprobante Fiscal/ }).click();
    await expect(cashier.getByRole('status')).toContainText('Documento simulado registrado');

    // 8. Thermal Receipt modal opens automatically with the issued Factura F001
    const fiscalReceiptModal = cashier.locator('.modal-backdrop').filter({ hasText: 'FACTURA ELECTRÓNICA' });
    await expect(fiscalReceiptModal).toBeVisible();
    await expect(fiscalReceiptModal).toContainText('F001-00000001');
    await expect(fiscalReceiptModal).toContainText('CONSORCIO GASTRONOMICO HUAMANGA SAC');
    await expect(fiscalReceiptModal).toContainText('20601234567');
    await expect(fiscalReceiptModal).toContainText('OP. GRAVADA:');
    await expect(fiscalReceiptModal).toContainText('I.G.V. (18%):');
    await expect(fiscalReceiptModal).toContainText('IMPORTE TOTAL:');
    await expect(fiscalReceiptModal).toContainText('S/ 38.00');
    console.log('STEP 8.1: verifying thermal receipt text');
    await expect(fiscalReceiptModal).toContainText('Código Hash:');
    await expect(fiscalReceiptModal).toContainText('[Laboratorio QatuPOS · SIN VALIDEZ TRIBUTARIA]');

    console.log('STEP 8.2: taking factura screenshot');
    await cashier.screenshot({ path: 'docs/evidence/screens/factura-f001-80mm.png', fullPage: true });

    console.log('STEP 8.3: closing thermal receipt modal');
    await fiscalReceiptModal.getByRole('button', { name: /Cerrar/ }).first().click({ force: true });
    await expect(fiscalReceiptModal).not.toBeVisible();

    console.log('STEP 9: verifying check row and alert');
    await expect(cashier.locator('.check-row').filter({ hasText: 'Mesa 07' })).toContainText('🧾 Simulado');
    await expect(cashier.locator('.alert.info').filter({ hasText: 'Documento simulado registrado' })).toContainText('F001-00000001');

    console.log('STEP 10: verifying fiscal documents panel');
    const fiscalTablePanel = cashier.locator('.fiscal-documents-panel');
    await expect(fiscalTablePanel).toBeVisible();
    await expect(fiscalTablePanel).toContainText('F001-00000001');
    await expect(fiscalTablePanel).toContainText('CONSORCIO GASTRONOMICO HUAMANGA SAC');
    await expect(fiscalTablePanel).toContainText('S/ 38.00');

    console.log('STEP 10.1: testing reprint');
    const reprintBtn = fiscalTablePanel.getByRole('button', { name: /Reimprimir Ticket/ }).first();
    await expect(reprintBtn).toBeVisible();
    await reprintBtn.click();
    await expect(cashier.locator('.modal-backdrop').filter({ hasText: 'FACTURA ELECTRÓNICA' })).toBeVisible();
    await cashier.locator('.modal-backdrop').getByRole('button', { name: /Cerrar/ }).first().click({ force: true });

    console.log('STEP 10.2: taking caja fiscal panel screenshot');
    await cashier.screenshot({ path: 'docs/evidence/screens/comprobantes-caja-historial.png', fullPage: true });

  } finally {
    await waiterContext.close();
    await cashierContext.close();
  }
});
