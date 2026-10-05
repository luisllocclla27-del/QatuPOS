import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

async function signIn(page: Page, user: string) {
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill(user);
  await page.getByLabel('Contraseña', { exact: true }).fill('QatuDemo2026!');
  await page.getByRole('button', { name: 'Ingresar a mi espacio' }).click();
  await expect(page.getByRole('navigation', { name: 'Secciones de operación' })).toBeVisible();
}

test('commercial discounts, courtesy audit, 80mm pre-cuenta discount breakdown, and live cash audit (Corte X)', async ({ browser }) => {
  test.setTimeout(90000);
  await mkdir('docs/evidence/screens', { recursive: true });

  const waiterContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const cashierContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });

  const waiter = await waiterContext.newPage();
  const cashier = await cashierContext.newPage();

  try {
    // 1. Cashier logs in and ensures cash session is open
    await signIn(cashier, 'caja');
    await cashier.getByRole('navigation').getByRole('button', { name: /Mi turno/ }).click();
    if (await cashier.getByLabel('Fondo físico inicial (S/)').isVisible()) {
      await cashier.getByLabel('Fondo físico inicial (S/)').fill('200.00');
      await cashier.getByRole('button', { name: 'Abrir mi sesión' }).click();
      await expect(cashier.getByRole('status')).toContainText('Sesión de caja abierta');
    }

    // 2. Waiter logs in and opens Mesa 05
    await signIn(waiter, 'mozo');
    await waiter.getByRole('button', { name: /Mesa 05/ }).click();
    await waiter.getByRole('button', { name: /Arroz con mariscos/ }).click();
    await waiter.getByRole('button', { name: /Refresco de maracuyá/ }).click();
    await waiter.getByRole('button', { name: 'Enviar pedido' }).click();
    await waiter.getByRole('dialog').getByRole('button', { name: /Enviar 2 productos/ }).click();
    await expect(waiter.locator('.current-account')).toContainText('40.00');

    // Waiter does NOT have discount controls in their panel
    await expect(waiter.getByRole('button', { name: /Descuento \/ Cortesía/ })).not.toBeVisible();

    // 3. Cashier selects Mesa 05 in Caja
    await cashier.getByRole('button', { name: 'Caja', exact: false }).first().click();
    await cashier.locator('.check-row').filter({ hasText: 'Mesa 05' }).click();
    await expect(cashier.locator('.payment-total')).toContainText('40.00');

    // 4. Cashier opens the commercial discount modal
    const discountBtn = cashier.getByRole('button', { name: /Descuento \/ Cortesía/ });
    await expect(discountBtn).toBeVisible();
    await discountBtn.click();

    const discountModal = cashier.getByRole('dialog').filter({ hasText: /Descuento \/ Cortesía/ });
    await expect(discountModal).toBeVisible();
    await expect(discountModal).toContainText('Mesa 05');
    await expect(discountModal).toContainText('S/ 40.00');

    // Select 10% discount and select preset reason
    await discountModal.getByRole('button', { name: '10%' }).click();
    await discountModal.getByRole('button', { name: 'Convenio corporativo', exact: true }).click();

    // Check preview calculation
    await expect(discountModal).toContainText('- S/ 4.00');
    await expect(discountModal).toContainText('S/ 36.00');

    // Take screenshot of discount modal
    await cashier.screenshot({ path: 'docs/evidence/screens/discount-modal.png', fullPage: true });

    // Apply discount
    await discountModal.getByRole('button', { name: 'Aplicar Descuento' }).click();
    await expect(cashier.getByRole('status')).toContainText('Descuento / cortesía comercial aplicado exitosamente');

    // 5. Verify the discount reflects on the check in Caja
    const discountAlert = cashier.locator('.alert.info').filter({ hasText: 'Descuento Comercial' });
    await expect(discountAlert).toContainText('S/ 4.00');
    await expect(discountAlert).toContainText('Convenio corporativo');
    await expect(cashier.locator('.payment-panel')).toContainText('Subtotal consumos brutos:');
    await expect(cashier.locator('.payment-panel')).toContainText('S/ 40.00');
    await expect(cashier.locator('.payment-panel')).toContainText('Descuento comercial aplicado:');
    await expect(cashier.locator('.payment-panel')).toContainText('-S/ 4.00');
    await expect(cashier.locator('.payment-total')).toContainText('36.00');

    // 6. Pre-cuenta inspection with discount breakdown
    const precuentaBtn = cashier.getByRole('button', { name: /Imprimir Pre-cuenta/ });
    await precuentaBtn.click();
    const precuentaModal = cashier.locator('.modal-backdrop').filter({ hasText: 'PRE-CUENTA DE MESA' });
    await expect(precuentaModal).toBeVisible();
    await expect(precuentaModal).toContainText('Mesa 05');
    await expect(precuentaModal).toContainText('SUBTOTAL CONSUMOS:');
    await expect(precuentaModal).toContainText('40.00');
    await expect(precuentaModal).toContainText('DESCUENTO (10%):');
    await expect(precuentaModal).toContainText('4.00');
    await expect(precuentaModal).toContainText('TOTAL CONSUMO:');
    await expect(precuentaModal).toContainText('36.00');

    // Take screenshot of 80mm pre-cuenta with discount
    await cashier.screenshot({ path: 'docs/evidence/screens/precuenta-with-discount.png', fullPage: true });
    await precuentaModal.getByRole('button', { name: /Cerrar/ }).first().click();

    // 7. Cashier collects payment of S/ 36.00 in Cash
    console.log('[E2E DEBUG] Step 7: Starting payment of S/ 36.00');
    await cashier.getByRole('button', { name: 'Efectivo' }).click();
    await cashier.getByLabel('Importe a cobrar (S/)').fill('36.00');
    await cashier.getByRole('button', { name: 'Reservar importe y continuar →' }).click();
    console.log('[E2E DEBUG] Step 7: Waiting for reserved alert');
    await expect(cashier.getByText('Importe reservado: S/ 36.00')).toBeVisible();

    await cashier.getByLabel('Efectivo recibido (S/)').fill('50.00');
    await expect(cashier.locator('.change-preview')).toContainText('14.00');
    await cashier.getByRole('button', { name: 'Confirmar efectivo y cambio' }).click();
    console.log('[E2E DEBUG] Step 7: Waiting for Cobro registrado status');
    await expect(cashier.getByRole('status')).toContainText('Cobro registrado');
    console.log('[E2E DEBUG] Step 7: Payment finished');

    // 8. Account is fully paid post-discount, issue Boleta B001
    console.log('[E2E DEBUG] Step 8: Looking for Emitir Boleta / Factura button');
    const issueFiscalBtn = cashier.getByRole('button', { name: /Emitir Boleta \/ Factura/ }).first();
    await expect(issueFiscalBtn).toBeVisible();
    console.log('[E2E DEBUG] Step 8: Clicking Emitir Boleta / Factura');
    await issueFiscalBtn.click();

    console.log('[E2E DEBUG] Step 8: Waiting for fiscal modal');
    const fiscalModal = cashier.getByRole('dialog').filter({ hasText: 'Emitir Comprobante Electrónico' });
    await expect(fiscalModal).toBeVisible();
    await expect(fiscalModal).toContainText('S/ 36.00');

    console.log('[E2E DEBUG] Step 8: Submitting Boleta B001 directly');
    await fiscalModal.getByRole('button', { name: /Emitir Comprobante Fiscal/i }).click();
    await expect(cashier.getByRole('status')).toContainText('Documento simulado registrado');
    console.log('[E2E DEBUG] Step 8: Submitted fiscal doc successfully');

    // 9. Inspect issued fiscal ticket
    console.log('[E2E DEBUG] Step 9: Waiting for BOLETA DE VENTA ELECTRÓNICA modal');
    const fiscalReceiptModal = cashier.locator('.modal-backdrop').filter({ hasText: 'BOLETA DE VENTA ELECTRÓNICA' });
    await expect(fiscalReceiptModal).toBeVisible();
    await expect(fiscalReceiptModal).toContainText('B001-00000001');
    await expect(fiscalReceiptModal).toContainText('SUBTOTAL BRUTO:');
    await expect(fiscalReceiptModal).toContainText('40.00');
    await expect(fiscalReceiptModal).toContainText('DESCUENTO GLOBAL:');
    await expect(fiscalReceiptModal).toContainText('4.00');
    await expect(fiscalReceiptModal).toContainText('OP. GRAVADA:');
    await expect(fiscalReceiptModal).toContainText('30.51');
    await expect(fiscalReceiptModal).toContainText('I.G.V. (18%):');
    await expect(fiscalReceiptModal).toContainText('5.49');
    await expect(fiscalReceiptModal).toContainText('IMPORTE TOTAL:');
    await expect(fiscalReceiptModal).toContainText('36.00');

    // Take screenshot of fiscal ticket post-discount
    await cashier.screenshot({ path: 'docs/evidence/screens/boleta-with-discount.png', fullPage: true });
    await fiscalReceiptModal.getByRole('button', { name: /Cerrar/ }).first().click({ force: true });
    await expect(fiscalReceiptModal).not.toBeVisible();
    console.log('[E2E DEBUG] Step 9: Fiscal ticket verified and closed');

    // 10. Open Live Cash Audit (Corte X)
    console.log('[E2E DEBUG] Step 10: Looking for Arqueo Corte X button');
    const auditBtn = cashier.getByRole('button', { name: /Arqueo de Caja en Vivo \(Corte X\)/i });
    await expect(auditBtn).toBeVisible();
    await auditBtn.click();

    console.log('[E2E DEBUG] Step 10: Waiting for Arqueo modal');
    const auditModal = cashier.getByRole('dialog').filter({ hasText: /Arqueo de Caja \(Corte X\)/ });
    await expect(auditModal).toBeVisible();
    await expect(auditModal).toContainText('ARQUEO DE CAJA · CORTE X');
    await expect(auditModal).toContainText('Fondo Inicial de Caja');
    await expect(auditModal).toContainText('DINERO FÍSICO (CAJÓN)');
    await expect(auditModal).toContainText('EFECTIVO ESPERADO EN CAJA');
    await expect(auditModal).toContainText('VENTAS COBRADAS POR MEDIO');
    await expect(auditModal).toContainText('DOCUMENTOS SIMULADOS · SIN VALIDEZ TRIBUTARIA');

    // Take screenshot of 80mm live cash audit ticket
    await cashier.screenshot({ path: 'docs/evidence/screens/corte-x-arqueo-80mm.png', fullPage: true });

    // Close audit modal
    await auditModal.getByRole('button', { name: '✕' }).click();
    await expect(auditModal).not.toBeVisible();
    console.log('[E2E DEBUG] Step 10: Arqueo modal verified and closed');

    // 11. Check that the discount audit table registers the concession
    console.log('[E2E DEBUG] Step 11: Checking discount audit table');
    const auditTable = cashier.locator('.discount-audit-panel');
    await expect(auditTable).toBeVisible();
    await expect(auditTable).toContainText('Mesa 05');
    await expect(auditTable).toContainText('Aplicado');
    await expect(auditTable).toContainText('10%');
    await expect(auditTable).toContainText('S/ 4.00');
    await expect(auditTable).toContainText('Convenio corporativo');
    console.log('[E2E DEBUG] Step 11: All done!');

  } finally {
    await waiterContext.close();
    await cashierContext.close();
  }
});
