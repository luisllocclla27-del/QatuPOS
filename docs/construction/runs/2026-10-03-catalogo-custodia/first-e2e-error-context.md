# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: zzzzzzzz-catalog-custody.spec.ts >> Carta guides compatible stock selection, audits route before first sale
- Location: tests\e2e\zzzzzzzz-catalog-custody.spec.ts:4:1

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Carta', exact: true })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]
  - alert [ref=e11]
  - generic [ref=e12]:
    - complementary [ref=e13]:
      - generic [ref=e14]:
        - generic [ref=e15]: q
        - strong [ref=e16]: qatupos
      - generic [ref=e17]: EL ENCANTOHUAMANGUINO
      - navigation "Secciones de operación" [ref=e18]:
        - button "▦ Mesas" [ref=e19] [cursor=pointer]:
          - generic [ref=e20]: ▦
          - text: Mesas
        - button "▧ Pedidos del cliente 4" [ref=e21] [cursor=pointer]:
          - generic [ref=e22]: ▧
          - text: Pedidos del cliente
          - generic [ref=e23]: "4"
        - button "◒ Bebidas 2" [ref=e24] [cursor=pointer]:
          - generic [ref=e25]: ◒
          - text: Bebidas
          - generic [ref=e26]: "2"
        - button "▤ Estaciones" [ref=e27] [cursor=pointer]:
          - generic [ref=e28]: ▤
          - text: Estaciones
        - button "□ Caja" [ref=e29] [cursor=pointer]:
          - generic [ref=e30]: □
          - text: Caja
        - button "⇄ Mi turno" [ref=e31] [cursor=pointer]:
          - generic [ref=e32]: ⇄
          - text: Mi turno
        - button "≋ Inventario" [ref=e33] [cursor=pointer]:
          - generic [ref=e34]: ≋
          - text: Inventario
        - button "◷ Cierre del día" [ref=e35] [cursor=pointer]:
          - generic [ref=e36]: ◷
          - text: Cierre del día
        - button "☰ Carta" [ref=e37] [cursor=pointer]:
          - generic [ref=e38]: ☰
          - text: Carta
      - generic [ref=e39]:
        - text: Una sola operación
        - generic [ref=e41]: Mesas · Estaciones · Caja
        - generic [ref=e42]: ENTORNO DE PRUEBA
    - generic [ref=e43]:
      - banner [ref=e44]:
        - generic [ref=e45]:
          - generic [ref=e46]: El Encanto Huamanguino
          - generic [ref=e47]: Día operativo · 2026-10-03
        - generic [ref=e48]:
          - button "Conectado" [ref=e49] [cursor=pointer]
          - generic [ref=e51]: E
          - generic [ref=e52]:
            - strong [ref=e53]: Elena · administración
            - generic [ref=e54]: Administración
          - button "Cambiar usuario" [ref=e55] [cursor=pointer]: ⇥
      - generic [ref=e56]:
        - text: Laboratorio
        - generic [ref=e57]: ·
        - text: Proveedores e impresoras simulados
        - generic [ref=e58]: ·
        - text: Comprobantes SUNAT pendientes de integración
      - main [ref=e59]:
        - generic [ref=e60]:
          - generic [ref=e61]:
            - generic [ref=e62]: Atender y tomar pedidos
            - heading "Mesas" [level=1] [ref=e63]
          - generic [ref=e64]: Administración · Día abierto
        - generic [ref=e66]:
          - paragraph [ref=e67]: Selecciona una mesa para atenderla. Cada tanda conserva a su mozo.
          - generic [ref=e68]:
            - generic [ref=e69]: Libre
            - generic [ref=e71]: En atención
        - generic [ref=e73]:
          - button "01 En atención 4 Mesa 01 S/ 53.00" [ref=e74] [cursor=pointer]:
            - generic [ref=e75]:
              - generic [ref=e76]: "01"
              - generic [ref=e77]: En atención
            - generic [ref=e78]: "4"
            - generic [ref=e84]:
              - strong [ref=e85]: Mesa 01
              - generic [ref=e86]: S/ 53.00
          - button "02 En atención 4 Mesa 02 S/ 35.00" [ref=e87] [cursor=pointer]:
            - generic [ref=e88]:
              - generic [ref=e89]: "02"
              - generic [ref=e90]: En atención
            - generic [ref=e91]: "4"
            - generic [ref=e97]:
              - strong [ref=e98]: Mesa 02
              - generic [ref=e99]: S/ 35.00
          - button "03 En atención 4 Mesa 03 S/ 38.00" [ref=e100] [cursor=pointer]:
            - generic [ref=e101]:
              - generic [ref=e102]: "03"
              - generic [ref=e103]: En atención
            - generic [ref=e104]: "4"
            - generic [ref=e110]:
              - strong [ref=e111]: Mesa 03
              - generic [ref=e112]: S/ 38.00
          - button "04 Libre 4 Mesa 04 Abrir mesa →" [ref=e113] [cursor=pointer]:
            - generic [ref=e114]:
              - generic [ref=e115]: "04"
              - generic [ref=e116]: Libre
            - generic [ref=e117]: "4"
            - generic [ref=e123]:
              - strong [ref=e124]: Mesa 04
              - generic [ref=e125]: Abrir mesa →
          - button "05 En atención 4 Mesa 05 S/ 36.00" [ref=e126] [cursor=pointer]:
            - generic [ref=e127]:
              - generic [ref=e128]: "05"
              - generic [ref=e129]: En atención
            - generic [ref=e130]: "4"
            - generic [ref=e136]:
              - strong [ref=e137]: Mesa 05
              - generic [ref=e138]: S/ 36.00
          - button "06 En atención 4 Mesa 06 S/ 74.00" [ref=e139] [cursor=pointer]:
            - generic [ref=e140]:
              - generic [ref=e141]: "06"
              - generic [ref=e142]: En atención
            - generic [ref=e143]: "4"
            - generic [ref=e149]:
              - strong [ref=e150]: Mesa 06
              - generic [ref=e151]: S/ 74.00
          - button "07 En atención 4 Mesa 07 S/ 38.00" [ref=e152] [cursor=pointer]:
            - generic [ref=e153]:
              - generic [ref=e154]: "07"
              - generic [ref=e155]: En atención
            - generic [ref=e156]: "4"
            - generic [ref=e162]:
              - strong [ref=e163]: Mesa 07
              - generic [ref=e164]: S/ 38.00
          - button "08 En atención 4 Mesa 08 S/ 43.00" [ref=e165] [cursor=pointer]:
            - generic [ref=e166]:
              - generic [ref=e167]: "08"
              - generic [ref=e168]: En atención
            - generic [ref=e169]: "4"
            - generic [ref=e175]:
              - strong [ref=e176]: Mesa 08
              - generic [ref=e177]: S/ 43.00
          - button "09 En atención 4 Mesa 09 S/ 0.00" [ref=e178] [cursor=pointer]:
            - generic [ref=e179]:
              - generic [ref=e180]: "09"
              - generic [ref=e181]: En atención
            - generic [ref=e182]: "4"
            - generic [ref=e188]:
              - strong [ref=e189]: Mesa 09
              - generic [ref=e190]: S/ 0.00
          - button "10 En atención 4 Mesa 10 S/ 35.00" [ref=e191] [cursor=pointer]:
            - generic [ref=e192]:
              - generic [ref=e193]: "10"
              - generic [ref=e194]: En atención
            - generic [ref=e195]: "4"
            - generic [ref=e201]:
              - strong [ref=e202]: Mesa 10
              - generic [ref=e203]: S/ 35.00
        - generic [ref=e204]: Dos terminales, la misma información. Los pedidos confirmados se sincronizan sin volver a registrarlos.
      - contentinfo [ref=e205]:
        - generic [ref=e206]:
          - text: QatuPOS
          - strong [ref=e207]: ·
          - text: Cada operación conserva su historia.
        - generic [ref=e208]: "QR/NFC, ecommerce y Delivery: habilitación posterior"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { mkdir } from 'node:fs/promises';
  3  | 
  4  | test('Carta guides compatible stock selection, audits route before first sale', async ({ page }) => {
  5  |   await page.goto('/');
  6  |   await page.getByLabel('Usuario', { exact: true }).fill('admin');
  7  |   await page.getByLabel('Contraseña', { exact: true }).fill('QatuDemo2026!');
  8  |   await page.getByRole('button', { name: 'Ingresar a mi espacio' }).click();
> 9  |   await page.getByRole('button', { name: 'Carta', exact: true }).click();
     |                                                                  ^ Error: locator.click: Test timeout of 60000ms exceeded.
  10 |   await page.getByRole('button', { name: '+ Nuevo producto' }).click();
  11 |   const dialog = page.getByRole('dialog');
  12 |   await dialog.getByLabel('Nombre del producto').fill('Oferta E2E custodia');
  13 |   await dialog.getByLabel('Categoría', { exact: true }).fill('Laboratorio');
  14 |   await dialog.getByLabel('Precio (S/)').fill('12.00');
  15 |   await dialog.getByLabel('Motivo del alta').fill('Ensayo de catálogo por estación');
  16 |   await dialog.getByLabel('Política de stock').selectOption('unit');
  17 |   await expect(dialog.getByRole('status')).toContainText('No hay inventario por unidad');
  18 |   await expect(dialog.getByRole('button', { name: 'Crear producto' })).toBeDisabled();
  19 |   await dialog.getByLabel('Estación de atención').selectOption('caja');
  20 |   await expect(dialog).toContainText('entrega directa, sin ticket');
  21 |   const stock = dialog.getByLabel('Ítem de inventario vinculado');
  22 |   await expect(stock.locator('option')).toHaveCount(4);
  23 |   await expect(stock).toHaveValue('');
  24 |   await expect(dialog.getByRole('button', { name: 'Crear producto' })).toBeDisabled();
  25 |   await stock.selectOption({ label: 'Cerveza personal (BEB-CERV-330)' });
  26 |   await dialog.getByRole('button', { name: 'Crear producto' }).click();
  27 |   await expect(page.getByRole('status')).toContainText('Producto creado correctamente');
  28 |   const row = page.locator('tr').filter({ hasText: 'Oferta E2E custodia' });
  29 |   await expect(row).toContainText('Cerveza personal');
  30 |   await row.getByRole('button', { name: 'Editar' }).click();
  31 |   await dialog.getByLabel('Estación', { exact: true }).selectOption('heladeria');
  32 |   await expect(dialog.getByLabel('Ítem de inventario vinculado')).toHaveValue('');
  33 |   await expect(dialog.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  34 |   await expect(dialog.getByLabel('Ítem de inventario vinculado').locator('option')).toHaveCount(2);
  35 |   await dialog.getByLabel('Ítem de inventario vinculado').selectOption({ label: 'Helado individual (HEL-IND)' });
  36 |   await dialog.getByLabel('Motivo de la modificación').fill('Corrección de oferta antes de vender');
  37 |   await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
  38 |   await expect(page.getByRole('status')).toContainText('Producto actualizado');
  39 |   await expect(row).toContainText('Heladería'); await expect(row).toContainText('Helado individual');
  40 |   const audit = page.locator('details').filter({ hasText: 'Historial de auditoría de la carta' });
  41 |   await audit.locator('summary').click();
  42 |   await expect(audit).toContainText('Estación: Bebidas de Caja → Heladería');
  43 |   await expect(audit).toContainText('Inventario vinculado: Cerveza personal → Helado individual');
  44 |   await mkdir('docs/evidence/screens', { recursive: true });
  45 |   await page.screenshot({ path: 'docs/evidence/screens/catalogo-custodia-012.png', fullPage: true });
  46 | });
  47 | 
```