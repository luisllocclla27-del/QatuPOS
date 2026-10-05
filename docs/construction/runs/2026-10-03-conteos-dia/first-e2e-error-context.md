# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: zzzzzzzzz-inventory.spec.ts >> cashier declares, shortage remains held, recount preserves observation and another admin approves
- Location: tests\e2e\zzzzzzzzz-inventory.spec.ts:14:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('status').first()
Expected substring: "Conteo declarado"
Timeout: 12000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" getByRole('status').first() with timeout 12000ms
  - waiting for getByRole('status').first()

```

```yaml
- alert
- complementary:
  - text: q
  - strong: qatupos
  - text: EL ENCANTO HUAMANGUINO
  - navigation "Secciones de operación":
    - button "▦ Mesas"
    - button "▧ Pedidos del cliente 0"
    - button "◒ Bebidas 1"
    - button "▤ Estaciones"
    - button "□ Caja"
    - button "⇄ Mi turno"
    - button "≋ Inventario"
    - button "◷ Cierre del día"
  - text: Una sola operación Mesas · Estaciones · Caja ENTORNO DE PRUEBA
- banner:
  - text: El Encanto Huamanguino Día operativo · 2026-10-01
  - button "Conectado"
  - text: L
  - strong: Luis · caja diurna
  - text: Caja
  - button "Cambiar usuario": ⇥
- text: Laboratorio · Proveedores e impresoras simulados · Comprobantes SUNAT pendientes de integración
- main:
  - text: Existencias y conteos
  - heading "Inventario" [level=1]
  - text: Caja · Día abierto
  - alert:
    - text: Otra terminal cambió esta información. Actualizamos la cuenta; tu borrador sigue aquí. Revisa antes de confirmar.
    - button "Cerrar aviso": ×
  - paragraph: Existencia registrada, unidades reservadas y disponibilidad se controlan por separado. Declarar un conteo conserva el libro; hasta aprobarlo, sus productos no pueden reservarse, entregarse ni reintegrarse.
  - table:
    - rowgroup:
      - row "Producto / SKU Estación Registrado Reservado Disponible Estado":
        - columnheader "Producto / SKU"
        - columnheader "Estación"
        - columnheader "Registrado"
        - columnheader "Reservado"
        - columnheader "Disponible"
        - columnheader "Estado"
    - rowgroup:
      - row "Cerveza personal BEB-CERV-330 · unidad Bebidas de Caja 48 1 47 Sin conteo pendiente":
        - cell "Cerveza personal BEB-CERV-330 · unidad":
          - strong: Cerveza personal
          - text: BEB-CERV-330 · unidad
        - cell "Bebidas de Caja"
        - cell "48"
        - cell "1"
        - cell "47"
        - cell "Sin conteo pendiente"
      - row "Gaseosa personal BEB-GAS-500 · unidad Bebidas de Caja 36 0 36 Sin conteo pendiente":
        - cell "Gaseosa personal BEB-GAS-500 · unidad":
          - strong: Gaseosa personal
          - text: BEB-GAS-500 · unidad
        - cell "Bebidas de Caja"
        - cell "36"
        - cell "0"
        - cell "36"
        - cell "Sin conteo pendiente"
      - row "Agua BEB-AGUA-625 · unidad Bebidas de Caja 24 0 24 Sin conteo pendiente":
        - cell "Agua BEB-AGUA-625 · unidad":
          - strong: Agua
          - text: BEB-AGUA-625 · unidad
        - cell "Bebidas de Caja"
        - cell "24"
        - cell "0"
        - cell "24"
        - cell "Sin conteo pendiente"
      - row "Helado individual HEL-IND · unidad Heladería 20 0 20 Sin conteo pendiente":
        - cell "Helado individual HEL-IND · unidad":
          - strong: Helado individual
          - text: HEL-IND · unidad
        - cell "Heladería"
        - cell "20"
        - cell "0"
        - cell "20"
        - cell "Sin conteo pendiente"
  - heading "Declarar conteo de inventario" [level=2]
  - paragraph: Tu declaración incluye cerveza, gaseosa y agua bajo custodia de Caja. Otra persona administradora revisará el ajuste. Para corregir una declaración pendiente, registra un reconteo; el original se conserva.
  - text: Contado · Cerveza personal
  - textbox "Contado · Cerveza personal": "0"
  - text: Contado · Gaseosa personal
  - textbox "Contado · Gaseosa personal": "36"
  - text: Contado · Agua
  - textbox "Contado · Agua": "24"
  - text: Motivo del conteo
  - textbox "Motivo del conteo": Faltante físico E2E013
  - button "Guardar conteo declarado"
- contentinfo:
  - text: QatuPOS
  - strong: ·
  - text: "Cada operación conserva su historia. QR/NFC, ecommerce y Delivery: habilitación posterior"
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
  10 |   for (const stock of s.stock.filter(x => x.station === 'caja')) await page.getByLabel(`Contado · ${stock.name}`).fill(String(shortage && stock.name === 'Cerveza personal' ? 0 : stock.on_hand));
  11 |   await page.getByLabel('Motivo del conteo').fill(reason); await page.getByRole('button', { name: 'Guardar conteo declarado' }).click();
> 12 |   await expect(page.getByRole('status').first()).toContainText('Conteo declarado');
     |                                                  ^ Error: expect(locator).toContainText(expected) failed
  13 | }
  14 | test('cashier declares, shortage remains held, recount preserves observation and another admin approves', async ({ browser }) => {
  15 |   const contexts = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext()]);
  16 |   const [cash, admin, waiter] = await Promise.all(contexts.map(c => c.newPage()));
  17 |   try {
  18 |     await login(cash!, 'caja'); await cash!.getByRole('navigation').getByRole('button', { name: /Mi turno/ }).click();
  19 |     if (await cash!.getByLabel('Fondo físico inicial (S/)').isVisible()) { await cash!.getByLabel('Fondo físico inicial (S/)').fill('0.00'); await cash!.getByRole('button', { name: 'Abrir mi sesión' }).click(); await expect(cash!.getByRole('status')).toContainText('Sesión de caja abierta'); }
  20 |     await login(waiter!, 'mozo'); await waiter!.getByRole('button', { name: /Mesa 10/ }).click(); await waiter!.getByRole('button', { name: /Cerveza personal/ }).click();
  21 |     await waiter!.getByRole('button', { name: 'Enviar pedido' }).click(); await waiter!.getByRole('dialog').getByRole('button', { name: /Enviar 1 productos/ }).click();
  22 |     await expect(waiter!.getByRole('status')).toContainText('Pedido registrado');
  23 |     await cash!.getByRole('navigation').getByRole('button', { name: /Inventario/ }).click(); await expect(cash!.getByRole('heading', { name: 'Declarar conteo de inventario' })).toBeVisible();
  24 |     await declare(cash!, 'Faltante físico E2E013', true);
  25 |     await expect(cash!.locator('tr').filter({ hasText: 'Cerveza personal' }).first()).toContainText('Retenido por conteo');
  26 |     await login(admin!, 'admin'); await admin!.getByRole('navigation').getByRole('button', { name: /Inventario/ }).click();
  27 |     const first = admin!.getByRole('region', { name: 'Conteo Faltante físico E2E013', exact: true });
  28 |     await expect(first).toContainText('faltan'); await expect(first.getByRole('button', { name: 'Aprobar ajuste' })).toBeDisabled();
  29 |     // A second physical declaration, rather than editing the first, resolves the observation.
  30 |     await declare(cash!, 'Reconteo físico verificado E2E013', false);
  31 |     await expect(first).toContainText('Sustituido por reconteo'); await expect(first.locator('tr').filter({ hasText: 'Cerveza personal' })).toContainText('0');
  32 |     const second = admin!.getByRole('region', { name: 'Conteo Reconteo físico verificado E2E013', exact: true });
  33 |     await second.getByLabel('Motivo de aprobación').fill('Revisión independiente del reconteo'); await second.getByRole('button', { name: 'Aprobar ajuste' }).click();
  34 |     await expect(admin!.getByRole('status').first()).toContainText('Ajuste revisado'); await expect(second).toContainText('Ajustado con aprobación');
  35 |     await expect(admin!.locator('tr').filter({ hasText: 'Cerveza personal' }).first()).toContainText('Sin conteo pendiente');
  36 |     const final = await (await admin!.request.get('/v1/pos/snapshot')).json() as PosSnapshot;
  37 |     expect(final.inventory_counts.find(c => c.reason === 'Faltante físico E2E013')!.lines[0]!.counted_quantity).toBe(0);
  38 |     expect(final.stock.find(s => s.name === 'Cerveza personal')!.reserved).toBeGreaterThanOrEqual(1);
  39 |     await mkdir('docs/evidence/screens', { recursive: true }); await admin!.screenshot({ path: 'docs/evidence/screens/conteo-revision-013.png', fullPage: true });
  40 |   } finally { for (const c of contexts) await c.close(); }
  41 | });
  42 | 
```