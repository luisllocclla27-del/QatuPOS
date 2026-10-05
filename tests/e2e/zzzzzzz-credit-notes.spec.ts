import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

async function signIn(page: Page, user: string) {
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill(user);
  await page.getByLabel('Contraseña', { exact: true }).fill('QatuDemo2026!');
  await page.getByRole('button', { name: 'Ingresar a mi espacio' }).click();
  await expect(page.getByRole('navigation', { name: 'Secciones de operación' })).toBeVisible();
}

test('electronic credit notes (BC01), formal annulment, 80mm thermal receipt, and live cash audit reconciliation (Corte X)', async ({ browser }) => {
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

    // 2. Waiter logs in and creates order on Mesa 06
    await signIn(waiter, 'mozo');
    await waiter.getByRole('button', { name: /Mesa 06/ }).click();
    await waiter.getByRole('button', { name: /Arroz con mariscos/ }).click();
    await waiter.getByRole('button', { name: /Jalea mixta/ }).click();
    await waiter.getByRole('button', { name: 'Enviar pedido' }).click();
    await waiter.getByRole('dialog').getByRole('button', { name: /Enviar 2 productos/ }).click();
    await expect(waiter.locator('.current-account')).toContainText('74.00');

    // Waiter does NOT have Credit Note or fiscal controls
    await expect(waiter.getByRole('button', { name: /Anular con NC/i })).not.toBeVisible();

    // 3. Cashier selects Mesa 06 in Caja
    await cashier.getByRole('button', { name: 'Caja', exact: false }).first().click();
    await cashier.locator('.check-row').filter({ hasText: 'Mesa 06' }).click();
    await expect(cashier.locator('.payment-total')).toContainText('74.00');

    // 4. Cashier collects payment in cash
    await cashier.getByRole('button', { name: 'Efectivo' }).click();
    await cashier.getByLabel('Importe a cobrar (S/)').fill('74.00');
    await cashier.getByRole('button', { name: 'Reservar importe y continuar →' }).click();
    await expect(cashier.getByText('Importe reservado: S/ 74.00')).toBeVisible();

    await cashier.getByLabel('Efectivo recibido (S/)').fill('100.00');
    await expect(cashier.locator('.change-preview')).toContainText('26.00');
    await cashier.getByRole('button', { name: 'Confirmar efectivo y cambio' }).click();
    await expect(cashier.getByRole('status')).toContainText('Cobro registrado');

    // 5. Account is 100% paid, cashier issues Boleta de Venta B001
    const issueFiscalBtn = cashier.getByRole('button', { name: /Emitir Boleta \/ Factura/ }).first();
    await expect(issueFiscalBtn).toBeVisible();
    await issueFiscalBtn.click();

    const fiscalModal = cashier.getByRole('dialog').filter({ hasText: 'Emitir Comprobante Electrónico' });
    await expect(fiscalModal).toBeVisible();
    await expect(fiscalModal).toContainText('S/ 74.00');

    // Emit Boleta directly
    await fiscalModal.getByRole('button', { name: /Emitir Comprobante Fiscal/i }).click();
    await expect(cashier.getByRole('status')).toContainText('Documento simulado registrado');

    // 6. Thermal receipt modal opens with Boleta B001
    const boletaModal = cashier.locator('.modal-backdrop').filter({ hasText: 'BOLETA DE VENTA ELECTRÓNICA' });
    await expect(boletaModal).toBeVisible();
    await expect(boletaModal).toContainText(/B001-\d{8}/);
    await expect(boletaModal).toContainText('74.00');
    const boletaText = await boletaModal.locator('.thermal-ticket-header p').last().innerText();
    const boletaNumber = boletaText.trim();
    await boletaModal.getByRole('button', { name: /Cerrar/ }).first().click({ force: true });
    await expect(boletaModal).not.toBeVisible();

    // 7. Inspect fiscal documents panel in Caja
    const fiscalPanel = cashier.locator('.fiscal-documents-panel');
    await expect(fiscalPanel).toBeVisible();
    await expect(fiscalPanel).toContainText(boletaNumber);

    // Find the Annul with Credit Note button for this boleta
    const boletaRow = fiscalPanel.locator('tr').filter({ hasText: boletaNumber });
    const annulBtn = boletaRow.getByRole('button', { name: /Anular con NC/i });
    await expect(annulBtn).toBeVisible();
    await annulBtn.click();

    // 8. Issue Credit Note Modal opens
    const ncModal = cashier.getByRole('dialog').filter({ hasText: 'Emitir Nota de Crédito Electrónica' });
    await expect(ncModal).toBeVisible();
    await expect(ncModal).toContainText(boletaNumber);
    await expect(ncModal).toContainText('S/ 74.00');
    await expect(ncModal).toContainText('BC01');

    // Select suggestion
    await ncModal.getByRole('button', { name: 'Error en digitación de comanda' }).click();

    // Take screenshot of Credit Note issuance modal
    await cashier.screenshot({ path: 'docs/evidence/screens/credit-note-modal.png', fullPage: true });

    // Check confirmation checkbox
    await ncModal.getByRole('checkbox').check();

    // Submit Credit Note
    const submitNcBtn = ncModal.getByRole('button', { name: /Emitir Nota de Crédito BC01/i });
    await expect(submitNcBtn).toBeEnabled();
    await submitNcBtn.click();

    // 9. Verify success notification and automatic 80mm thermal receipt
    await expect(cashier.getByRole('status')).toContainText('Nota de Crédito simulada registrada');

    const ncReceiptModal = cashier.locator('.modal-backdrop').filter({ hasText: 'NOTA DE CRÉDITO ELECTRÓNICA' });
    await expect(ncReceiptModal).toBeVisible();
    await expect(ncReceiptModal).toContainText('BC01-00000001');
    await expect(ncReceiptModal).toContainText(boletaNumber);
    await expect(ncReceiptModal).toContainText('MOTIVO SUNAT:');
    await expect(ncReceiptModal).toContainText('TOTAL ANULADO / REVERTIDO:');
    await expect(ncReceiptModal).toContainText('S/ 74.00');
    await expect(ncReceiptModal).toContainText('Código Hash:');
    await expect(ncReceiptModal).toContainText('[Laboratorio QatuPOS · SIN VALIDEZ TRIBUTARIA]');

    await expect(ncReceiptModal.locator('svg')).toHaveCount(0);
    await expect(ncReceiptModal).toContainText('QR fiscal pendiente');
    // Take screenshot of 80mm Credit Note thermal receipt
    await cashier.screenshot({ path: 'docs/evidence/screens/credit-note-ticket-80mm.png', fullPage: true });

    // Close thermal receipt modal
    await ncReceiptModal.getByRole('button', { name: /Cerrar/ }).first().click({ force: true });
    await expect(ncReceiptModal).not.toBeVisible();

    // 10. Verify fiscal documents panel updates:
    // - The boleta is marked annulled and has no "Anular con NC" button
    await expect(fiscalPanel).toContainText('⚠️ Anulado por BC01-00000001');
    await expect(boletaRow.getByRole('button', { name: /Anular con NC/i })).not.toBeVisible();

    // - BC01-00000001 is listed with negative total and Ticket button
    const ncRow = fiscalPanel.locator('tr').filter({ hasText: 'Nota de Crédito' });
    await expect(ncRow).toBeVisible();
    await expect(ncRow).toContainText('BC01-00000001');
    await expect(ncRow).toContainText('-S/ 74.00');
    const reprintNcBtn = ncRow.getByRole('button', { name: /Ticket NC/i });
    await expect(reprintNcBtn).toBeVisible();

    // Test reprint NC ticket
    await reprintNcBtn.click();
    await expect(cashier.locator('.modal-backdrop').filter({ hasText: 'NOTA DE CRÉDITO ELECTRÓNICA' })).toBeVisible();
    await cashier.locator('.modal-backdrop').getByRole('button', { name: /Cerrar/ }).first().click({ force: true });

    // 11. Simulated fiscal adjustment does not reopen payments or allow a duplicate document
    await cashier.locator('.check-row').filter({ hasText: 'Mesa 06' }).click();
    await expect(cashier.getByRole('button', { name: /Emitir Boleta \/ Factura/ })).toHaveCount(0);

    // 12. Open Live Cash Audit (Corte X) to inspect Credit Note reconciliation
    await cashier.getByRole('navigation').getByRole('button', { name: /Mi turno/ }).click();
    const auditBtn = cashier.getByRole('button', { name: /Ver Arqueo de Turno \(Corte X\)/i });
    await expect(auditBtn).toBeVisible();
    await auditBtn.click();

    const auditModal = cashier.getByRole('dialog').filter({ hasText: /Arqueo de Caja \(Corte X\)/ });
    await expect(auditModal).toBeVisible();
    await expect(auditModal).toContainText('ARQUEO DE CAJA · CORTE X');
    await expect(auditModal).toContainText(/Boletas B001/);
    await expect(auditModal).toContainText('Notas de Crédito (1)');
    await expect(auditModal).toContainText('- S/ 74.00');
    await expect(auditModal).toContainText('VENTAS FISCALES NETAS');

    // Take screenshot of Corte X audit with Credit Note deduction
    await cashier.screenshot({ path: 'docs/evidence/screens/cash-audit-with-credit-notes.png', fullPage: true });

    // Close audit modal
    await auditModal.getByRole('button', { name: '✕' }).click();
    await expect(auditModal).not.toBeVisible();

  } finally {
    await waiterContext.close();
    await cashierContext.close();
  }
});
