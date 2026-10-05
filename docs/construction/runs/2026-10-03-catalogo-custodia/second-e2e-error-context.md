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
Error: locator.selectOption: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByRole('dialog').getByLabel('Estación', { exact: true })

```

# Page snapshot

```yaml
- generic [ref=e1]:
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
        - button "▧ Pedidos del cliente 0" [ref=e21] [cursor=pointer]:
          - generic [ref=e22]: ▧
          - text: Pedidos del cliente
          - generic [ref=e23]: "0"
        - button "◒ Bebidas 0" [ref=e24] [cursor=pointer]:
          - generic [ref=e25]: ◒
          - text: Bebidas
          - generic [ref=e26]: "0"
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
          - generic [ref=e47]: Día operativo · 2026-10-01
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
            - generic [ref=e62]: Configurar productos y precios
            - heading "Carta" [level=1] [ref=e63]
          - generic [ref=e64]: Administración · Día abierto
        - status [ref=e66]:
          - text: ✓ Producto creado correctamente en la carta.
          - button "Cerrar aviso" [ref=e67] [cursor=pointer]: ×
        - generic [ref=e68]:
          - generic [ref=e69]:
            - generic [ref=e70]:
              - heading "Carta configurable" [level=2] [ref=e71]
              - paragraph [ref=e72]: Administra productos, precios y disponibilidad en tiempo real.
            - button "+ Nuevo producto" [ref=e73] [cursor=pointer]
          - generic [ref=e74]:
            - textbox "Buscar producto o categoría…" [ref=e75]
            - combobox "Filtrar por categoría" [ref=e76]:
              - option "Todas las categorías" [selected]
              - option "Platos"
              - option "Bebidas"
              - option "Heladería"
              - option "Laboratorio"
            - combobox "Filtrar por estación" [ref=e77]:
              - option "Todas las estaciones" [selected]
              - option "Cocina"
              - option "Heladería"
              - option "Caja"
            - combobox "Filtrar por estado" [ref=e78]:
              - option "Todos los estados" [selected]
              - option "Solo activos"
              - option "Solo inactivos"
          - table [ref=e80]:
            - rowgroup [ref=e81]:
              - row [ref=e82]:
                - columnheader "Producto" [ref=e83]
                - columnheader "Categoría" [ref=e84]
                - columnheader "Precio" [ref=e85]
                - columnheader "Estación" [ref=e86]
                - columnheader "Stock" [ref=e87]
                - columnheader "Estado" [ref=e88]
                - columnheader "Versión" [ref=e89]
                - columnheader "Acción" [ref=e90]
            - rowgroup [ref=e91]:
              - row [ref=e92]:
                - cell [ref=e93]:
                  - strong [ref=e94]: Ceviche clásico
                - cell "Platos" [ref=e95]
                - cell [ref=e96]:
                  - strong [ref=e97]: S/ 35.00
                - cell "Cocina" [ref=e98]
                - cell "Sin control" [ref=e99]
                - cell "Activo" [ref=e100]
                - cell "v1" [ref=e102]
                - cell [ref=e103]:
                  - button "Editar" [ref=e104] [cursor=pointer]
              - row [ref=e105]:
                - cell [ref=e106]:
                  - strong [ref=e107]: Arroz con mariscos
                - cell "Platos" [ref=e108]
                - cell [ref=e109]:
                  - strong [ref=e110]: S/ 32.00
                - cell "Cocina" [ref=e111]
                - cell "Sin control" [ref=e112]
                - cell "Activo" [ref=e113]
                - cell "v1" [ref=e115]
                - cell [ref=e116]:
                  - button "Editar" [ref=e117] [cursor=pointer]
              - row [ref=e118]:
                - cell [ref=e119]:
                  - strong [ref=e120]: Jalea mixta
                - cell "Platos" [ref=e121]
                - cell [ref=e122]:
                  - strong [ref=e123]: S/ 42.00
                - cell "Cocina" [ref=e124]
                - cell "Sin control" [ref=e125]
                - cell "Activo" [ref=e126]
                - cell "v1" [ref=e128]
                - cell [ref=e129]:
                  - button "Editar" [ref=e130] [cursor=pointer]
              - row [ref=e131]:
                - cell [ref=e132]:
                  - strong [ref=e133]: Cerveza personal
                - cell "Bebidas" [ref=e134]
                - cell [ref=e135]:
                  - strong [ref=e136]: S/ 10.00
                - cell "Bebidas de Caja" [ref=e137]
                - cell "Por unidad Cerveza personal" [ref=e138]:
                  - text: Por unidad
                  - generic [ref=e139]: Cerveza personal
                - cell "Activo" [ref=e140]
                - cell "v1" [ref=e142]
                - cell [ref=e143]:
                  - button "Editar" [ref=e144] [cursor=pointer]
              - row [ref=e145]:
                - cell [ref=e146]:
                  - strong [ref=e147]: Gaseosa personal
                - cell "Bebidas" [ref=e148]
                - cell [ref=e149]:
                  - strong [ref=e150]: S/ 6.00
                - cell "Bebidas de Caja" [ref=e151]
                - cell "Por unidad Gaseosa personal" [ref=e152]:
                  - text: Por unidad
                  - generic [ref=e153]: Gaseosa personal
                - cell "Activo" [ref=e154]
                - cell "v1" [ref=e156]
                - cell [ref=e157]:
                  - button "Editar" [ref=e158] [cursor=pointer]
              - row [ref=e159]:
                - cell [ref=e160]:
                  - strong [ref=e161]: Agua
                - cell "Bebidas" [ref=e162]
                - cell [ref=e163]:
                  - strong [ref=e164]: S/ 4.00
                - cell "Bebidas de Caja" [ref=e165]
                - cell "Por unidad Agua" [ref=e166]:
                  - text: Por unidad
                  - generic [ref=e167]: Agua
                - cell "Activo" [ref=e168]
                - cell "v1" [ref=e170]
                - cell [ref=e171]:
                  - button "Editar" [ref=e172] [cursor=pointer]
              - row [ref=e173]:
                - cell [ref=e174]:
                  - strong [ref=e175]: Refresco de maracuyá
                - cell "Heladería" [ref=e176]
                - cell [ref=e177]:
                  - strong [ref=e178]: S/ 8.00
                - cell "Heladería" [ref=e179]
                - cell "Sin control" [ref=e180]
                - cell "Activo" [ref=e181]
                - cell "v1" [ref=e183]
                - cell [ref=e184]:
                  - button "Editar" [ref=e185] [cursor=pointer]
              - row [ref=e186]:
                - cell [ref=e187]:
                  - strong [ref=e188]: Helado individual
                - cell "Heladería" [ref=e189]
                - cell [ref=e190]:
                  - strong [ref=e191]: S/ 7.00
                - cell "Heladería" [ref=e192]
                - cell "Por unidad Helado individual" [ref=e193]:
                  - text: Por unidad
                  - generic [ref=e194]: Helado individual
                - cell "Activo" [ref=e195]
                - cell "v1" [ref=e197]
                - cell [ref=e198]:
                  - button "Editar" [ref=e199] [cursor=pointer]
              - row [ref=e200]:
                - cell [ref=e201]:
                  - strong [ref=e202]: Porción de torta
                - cell "Heladería" [ref=e203]
                - cell [ref=e204]:
                  - strong [ref=e205]: S/ 9.00
                - cell "Heladería" [ref=e206]
                - cell "Sin control" [ref=e207]
                - cell "Activo" [ref=e208]
                - cell "v1" [ref=e210]
                - cell [ref=e211]:
                  - button "Editar" [ref=e212] [cursor=pointer]
              - row [ref=e213]:
                - cell [ref=e214]:
                  - strong [ref=e215]: Oferta E2E custodia
                - cell "Laboratorio" [ref=e216]
                - cell [ref=e217]:
                  - strong [ref=e218]: S/ 12.00
                - cell "Bebidas de Caja" [ref=e219]
                - cell "Por unidad Cerveza personal" [ref=e220]:
                  - text: Por unidad
                  - generic [ref=e221]: Cerveza personal
                - cell "Activo" [ref=e222]
                - cell "v1" [ref=e224]
                - cell [ref=e225]:
                  - button "Editar" [active] [ref=e226] [cursor=pointer]
          - group [ref=e227]:
            - generic "Historial de auditoría de la carta (1)" [ref=e228] [cursor=pointer]
          - dialog [ref=e230]:
            - generic [ref=e231]: ADMINISTRACIÓN DE CARTA · v1
            - heading "Editar producto" [level=2] [ref=e232]
            - generic [ref=e233]:
              - generic [ref=e234]:
                - generic [ref=e235]: Nombre del producto
                - textbox "Nombre del producto" [ref=e236]: Oferta E2E custodia
              - generic [ref=e237]:
                - generic [ref=e238]: Categoría
                - textbox "Categoría" [ref=e239]: Laboratorio
              - generic [ref=e240]:
                - generic [ref=e241]: Precio (S/)
                - textbox "Precio (S/)" [ref=e242]: "12.00"
              - generic [ref=e243]:
                - checkbox "Producto activo y visible para pedidos" [checked] [ref=e244]
                - generic [ref=e245]: Producto activo y visible para pedidos
              - generic [ref=e246]:
                - generic [ref=e247]: Estación
                - combobox "Estación" [ref=e248]:
                  - option "Cocina"
                  - option "Heladería"
                  - option "Bebidas de Caja" [selected]
              - generic [ref=e249]:
                - generic [ref=e250]: Política de stock
                - combobox "Política de stock" [ref=e251]:
                  - option "Sin control de stock"
                  - option "Control por unidad" [selected]
              - generic [ref=e252]:
                - generic [ref=e253]: Ítem de inventario vinculado
                - combobox "Ítem de inventario vinculado" [ref=e254]:
                  - option "Selecciona inventario de Bebidas de Caja"
                  - option "Cerveza personal (BEB-CERV-330)" [selected]
                  - option "Gaseosa personal (BEB-GAS-500)"
                  - option "Agua (BEB-AGUA-625)"
              - generic [ref=e255]:
                - generic [ref=e256]: Motivo de la modificación
                - textbox "Motivo de la modificación" [ref=e257]:
                  - /placeholder: "Ej.: Actualización de costo de mercado"
              - generic [ref=e258]:
                - button "Cancelar" [ref=e259] [cursor=pointer]
                - button "Guardar cambios" [ref=e260] [cursor=pointer]
      - contentinfo [ref=e261]:
        - generic [ref=e262]:
          - text: QatuPOS
          - strong [ref=e263]: ·
          - text: Cada operación conserva su historia.
        - generic [ref=e264]: "QR/NFC, ecommerce y Delivery: habilitación posterior"
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
  9  |   await expect(page.getByRole('navigation', { name: 'Secciones de operación' })).toBeVisible();
  10 |   await page.getByRole('navigation').getByRole('button', { name: /Carta/ }).click();
  11 |   await page.getByRole('button', { name: '+ Nuevo producto' }).click();
  12 |   const dialog = page.getByRole('dialog');
  13 |   await dialog.getByLabel('Nombre del producto').fill('Oferta E2E custodia');
  14 |   await dialog.getByLabel('Categoría', { exact: true }).fill('Laboratorio');
  15 |   await dialog.getByLabel('Precio (S/)').fill('12.00');
  16 |   await dialog.getByLabel('Motivo del alta').fill('Ensayo de catálogo por estación');
  17 |   await dialog.getByLabel('Política de stock').selectOption('unit');
  18 |   await expect(dialog.getByRole('status')).toContainText('No hay inventario por unidad');
  19 |   await expect(dialog.getByRole('button', { name: 'Crear producto' })).toBeDisabled();
  20 |   await dialog.getByLabel('Estación de atención').selectOption('caja');
  21 |   await expect(dialog).toContainText('entrega directa, sin ticket');
  22 |   const stock = dialog.getByLabel('Ítem de inventario vinculado');
  23 |   await expect(stock.locator('option')).toHaveCount(4);
  24 |   await expect(stock).toHaveValue('');
  25 |   await expect(dialog.getByRole('button', { name: 'Crear producto' })).toBeDisabled();
  26 |   await stock.selectOption({ label: 'Cerveza personal (BEB-CERV-330)' });
  27 |   await dialog.getByRole('button', { name: 'Crear producto' }).click();
  28 |   await expect(page.getByRole('status')).toContainText('Producto creado correctamente');
  29 |   const row = page.locator('tr').filter({ hasText: 'Oferta E2E custodia' });
  30 |   await expect(row).toContainText('Cerveza personal');
  31 |   await row.getByRole('button', { name: 'Editar' }).click();
> 32 |   await dialog.getByLabel('Estación', { exact: true }).selectOption('heladeria');
     |                                                        ^ Error: locator.selectOption: Test timeout of 60000ms exceeded.
  33 |   await expect(dialog.getByLabel('Ítem de inventario vinculado')).toHaveValue('');
  34 |   await expect(dialog.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  35 |   await expect(dialog.getByLabel('Ítem de inventario vinculado').locator('option')).toHaveCount(2);
  36 |   await dialog.getByLabel('Ítem de inventario vinculado').selectOption({ label: 'Helado individual (HEL-IND)' });
  37 |   await dialog.getByLabel('Motivo de la modificación').fill('Corrección de oferta antes de vender');
  38 |   await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
  39 |   await expect(page.getByRole('status')).toContainText('Producto actualizado');
  40 |   await expect(row).toContainText('Heladería'); await expect(row).toContainText('Helado individual');
  41 |   const audit = page.locator('details').filter({ hasText: 'Historial de auditoría de la carta' });
  42 |   await audit.locator('summary').click();
  43 |   await expect(audit).toContainText('Estación: Bebidas de Caja → Heladería');
  44 |   await expect(audit).toContainText('Inventario vinculado: Cerveza personal → Helado individual');
  45 |   await mkdir('docs/evidence/screens', { recursive: true });
  46 |   await page.screenshot({ path: 'docs/evidence/screens/catalogo-custodia-012.png', fullPage: true });
  47 | });
  48 | 
```