import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

async function signIn(page: Page, user: string) {
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill(user);
  await page.getByLabel('Contraseña', { exact: true }).fill('QatuDemo2026!');
  await page.getByRole('button', { name: 'Ingresar a mi espacio' }).click();
  await expect(page.getByRole('navigation', { name: 'Secciones de operación' })).toBeVisible();
}

test('granular order line voiding recalculates check, audits reason, and allows releasing held collections', async ({ browser }) => {
  test.setTimeout(90000);
  await mkdir('docs/evidence/screens', { recursive: true });

  const waiterContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const cashierContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const kitchenContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });

  const waiter = await waiterContext.newPage();
  const cashier = await cashierContext.newPage();
  const kitchen = await kitchenContext.newPage();

  try {
    // 1. Cashier logs in and ensures cash session is open
    await signIn(cashier, 'caja');
    await cashier.getByRole('navigation').getByRole('button', { name: /Mi turno/ }).click();
    if (await cashier.getByLabel('Fondo físico inicial (S/)').isVisible()) {
      await cashier.getByLabel('Fondo físico inicial (S/)').fill('200.00');
      await cashier.getByRole('button', { name: 'Abrir mi sesión' }).click();
      await expect(cashier.getByRole('status')).toContainText('Sesión de caja abierta');
    }

    // 2. Waiter logs in and creates order for Mesa 05
    await signIn(waiter, 'mozo');
    await waiter.getByRole('button', { name: /Mesa 05/ }).click();
    await waiter.getByRole('button', { name: /Arroz con mariscos/ }).click();
    await waiter.getByRole('button', { name: /Gaseosa personal/ }).click();
    await waiter.getByRole('button', { name: 'Enviar pedido' }).click();
    await waiter.getByRole('dialog').getByRole('button', { name: /Enviar 2 productos/ }).click();
    await expect(waiter.locator('.current-account')).toContainText('38.00');

    // 3. Cashier selects Mesa 05 in Caja
    await cashier.getByRole('button', { name: 'Caja', exact: false }).first().click();
    await cashier.locator('.check-row').filter({ hasText: 'Mesa 05' }).click();
    await expect(cashier.locator('.payment-total')).toContainText('38.00');

    // 4. Test US4: Collection reservation and subsequent release
    await cashier.getByRole('button', { name: 'Tarjeta' }).click();
    await cashier.getByRole('button', { name: 'Reservar importe y continuar →' }).click();
    await expect(cashier.locator('.alert.info')).toContainText('Importe reservado: S/ 38.00');

    // Cashier decides to release the reserved card authorization
    await cashier.getByRole('button', { name: 'Liberar cobro retenido' }).click();
    const releaseModal = cashier.getByRole('dialog');
    await expect(releaseModal.getByRole('heading', { name: /Liberar cobro/ })).toBeVisible();
    await releaseModal.getByLabel('Motivo de liberación').fill('Cliente prefiere pagar en efectivo');
    await releaseModal.getByRole('button', { name: 'Liberar saldo' }).click();
    await expect(cashier.getByRole('status')).toContainText('Cobro retenido liberado');
    await expect(cashier.locator('.payment-total')).toContainText('38.00');

    // 5. Test US1 & US2: Order Line Voiding with reason and audit
    const comandasPanel = cashier.locator('.orders-panel');
    await expect(comandasPanel).toBeVisible();
    await expect(comandasPanel).toContainText('Gaseosa personal');

    const gaseosaRow = comandasPanel.locator('tr').filter({ hasText: 'Gaseosa personal' });
    await gaseosaRow.getByRole('button', { name: 'Anular' }).click();

    const voidModal = cashier.getByRole('dialog');
    await expect(voidModal.getByRole('heading', { name: 'Anular Gaseosa personal' })).toBeVisible();
    await voidModal.getByLabel(/Motivo de la anulación/).fill('Cliente canceló bebida antes de servir');
    await voidModal.getByRole('button', { name: /Confirmar anulación/ }).click();

    await expect(cashier.getByRole('status')).toContainText('Línea anulada');

    // Total check recalculated from S/ 38.00 to S/ 32.00
    await expect(cashier.locator('.payment-total')).toContainText('32.00');

    // Audit panel shows void entry
    const auditPanel = cashier.locator('.void-audit-panel');
    await expect(auditPanel).toBeVisible();
    await expect(auditPanel).toContainText('Cliente canceló bebida antes de servir');
    await expect(auditPanel).toContainText('S/ 6.00');

    await cashier.screenshot({ path: 'docs/evidence/screens/anulacion-caja.png', fullPage: true });

    // 6. Kitchen prepares and delivers Arroz con mariscos
    await signIn(kitchen, 'cocina');
    const kitchenCard = kitchen.locator('.fulfillment-card').filter({ hasText: 'Mesa 05' });
    await kitchenCard.getByRole('button', { name: 'Preparar 1', exact: true }).click();
    await expect(kitchen.getByRole('status')).toContainText('preparada');
    await kitchenCard.getByRole('button', { name: 'Entregar 1', exact: true }).click();
    await expect(kitchen.getByRole('status')).toContainText('Entrega registrada');

    // 7. Cashier collects the updated S/ 32.00
    await cashier.locator('.check-row').filter({ hasText: 'Mesa 05' }).click();
    await cashier.getByRole('button', { name: 'Efectivo' }).click();
    await cashier.getByLabel('Importe a cobrar (S/)').fill('32.00');
    await cashier.getByRole('button', { name: 'Reservar importe y continuar →' }).click();
    await cashier.getByLabel('Efectivo recibido (S/)').fill('50.00');
    await cashier.getByRole('button', { name: 'Confirmar efectivo y cambio' }).click();
    await expect(cashier.getByRole('status')).toContainText('Cobro registrado');
    await expect(cashier.locator('.check-row').filter({ hasText: 'Mesa 05' })).toContainText('0.00');

    // 8. Waiter closes Mesa 05 successfully (voided line doesn't block closing)
    await waiter.getByRole('button', { name: /Conectado/ }).click();
    await expect(waiter.locator('.current-account')).toContainText('32.00');
    await expect(waiter.getByRole('button', { name: 'Cerrar visita y liberar mesa' })).toBeVisible();
    await waiter.getByRole('button', { name: 'Cerrar visita y liberar mesa' }).click();
    await waiter.getByRole('dialog').getByRole('button', { name: 'Cerrar visita y liberar mesa' }).click();
    await expect(waiter.getByRole('status')).toContainText('Visita cerrada');

    await waiter.screenshot({ path: 'docs/evidence/screens/mesa-cerrada-anulada.png', fullPage: true });
  } finally {
    await Promise.all([waiterContext.close(), cashierContext.close(), kitchenContext.close()]);
  }
});
