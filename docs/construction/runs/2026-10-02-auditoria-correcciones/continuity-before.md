# Estado y continuidad · El Encanto Huamanguino

Actualizado el 02/10/2026, America/Lima. Este reporte resume el estado operativo y de continuidad del piloto presencial tras completar el incremento de **Pre-cuenta, Comprobantes Electrónicos SUNAT y Tickets Térmicos 80mm**.

---

## 1. Punto de partida comprobado

- **Ubicación y límites**: Todo el código, dependencias, migraciones y datos sintéticos residen exclusivamente en `F:/PROYECTOS/QatuPOS/el-encanto-huamanguino`. No escribir en el proyecto padre ni en Qatu.pe/Delivery.
- **Base local ejecutable**: Mesas, visitas, tandas de pedidos con asignación a Cocina/Heladería/Caja, cobro de caja con reserva y confirmación en efectivo/Yape con resolución de pagos inciertos, conteos de corte ciego, traspaso de turno entre responsables, cierre provisional diario y apertura del siguiente día de prueba. Acceso seguro de comensales mediante clave efímera vinculada a la mesa/visita y seguimiento de tandas en POS.
- **Aislamiento de bases de datos**: Las pruebas PostgreSQL se ejecutan en bases efímeras `qatupos_lab_test_*`. La base interactiva `qatupos_lab` (puerto 55432) permanece intacta y no se limpia para pasar pruebas.
- **Capacidades simuladas**: Hardware de impresión, pasarelas de pago y facturación SUNAT se mantienen estrictamente simulados y rotulados en la interfaz y reportes (`[Entorno de Laboratorio QatuPOS · Homologado]`, `accepted_simulated`).

---

## 2. Incrementos Anteriores Verificados

- **Incremento 006: Carta Configurable con Revisión de Precios**:
  - Administración de carta (platos, bebidas, postres) con edición de precios, control de concurrencia comercial y rechazo `PRICE_CHANGED` ante desactualización antes de confirmar comanda.
- **Incremento 007: Anulaciones, Reposición de Stock y Liberación de Cobros**:
  - Anulación granular (`order.line.void`) autorizada solo para Caja/Admin con motivo obligatorio y tickets `[ANULADO]` a cocina.
  - Reposición de inventario para no entregados y decisión de merma/retorno para platos entregados.
  - Liberación de cobros retenidos (`collection.release`) y auditoría inmutable en `order_void_audit`.

- **Incremento 008: Pre-cuenta, Comprobantes SUNAT y Tickets Térmicos 80mm**:
  - Emisión de Boletas B001 y Facturas F001 con cálculo tributario exacto en céntimos (IGV 18% y Op. Gravadas).
  - Trama oficial SUNAT, resumen digital SHA-256 en Base64, código QR dinámico e inmutabilidad con `ALREADY_ISSUED`.
  - Pre-cuenta de consumo accesible para Mozos y Cajeros con rótulo de advertencia normativa e impresión térmica 80mm.

- **Incremento 009: Descuentos Comerciales, Cortesías de Salón y Arqueo / Reporte X de Caja en Vivo**:
  - Descuentos comerciales por porcentaje o monto fijo con control de roles (`cashier`/`admin`), motivo obligatorio y recálculo financiero en céntimos PEN.
  - Auditoría inmutable en `check_discount_audit` y visualizador de trazabilidad en Caja.
  - Arqueo de Caja (Corte X) con conciliación de efectivo en gaveta y ticket térmico de 80mm.

---

## 3. Último incremento terminado: Notas de Crédito Electrónicas SUNAT (BC01 / FC01), Anulación Formal y Ticket Térmico 80mm (010)

Se implementó y verificó de forma completa de extremo a extremo:

1. **Emisión de Notas de Crédito Electrónicas (`fiscal.credit_note.issue`)**:
   - Comando formal de dominio restringido a roles de autoridad (`cashier` y `admin`). Mozos y cocina reciben HTTP 403 `FORBIDDEN`.
   - Asignación automática de serie oficial SUNAT: Boletas `B001` originan serie `BC01`; Facturas `F001` originan serie `FC01`.
   - Control atómico de correlativos con bloqueo de concurrencia `FOR UPDATE` en PostgreSQL (`fiscal_series`).
   - Reversión exacta en céntimos PEN (`MoneyMinor`) de base gravada (`op_gravada_minor`), débito fiscal (`igv_minor` 18%) e importe total (`total_minor`).

2. **Catálogo Oficial 09 de Motivos SUNAT y Sustento**:
   - Selector normativo con motivos oficiales:
     - `01`: Anulación de la operación.
     - `02`: Anulación por error en el RUC.
     - `03`: Corrección por error en la descripción.
     - `06`: Devolución total.
     - `07`: Devolución parcial.
   - Sustento descriptivo obligatorio con sugerencias contextuales rápidas.

3. **Inmutabilidad y Bloqueo de Duplicidad (`ALREADY_ANNULLED`)**:
   - Bloqueo atómico contra doble anulación.
   - Documento original marcado con `status = 'annulled'`, `credit_note_id` y `credit_note_full_number`.
   - Cuenta de mesa revierte su estado a `fiscal_status = 'pending'`, permitiendo la reemisión formal del comprobante corregido.

4. **Trama UBL 2.1 y Ticket Térmico de 80mm**:
   - Generación de firma digital hash SHA-256 Base64 y código QR dinámico oficial SUNAT con código de tipo `07` (Nota de Crédito).
   - Modal térmico interactivo (`ThermalReceiptModal`) adaptado para 80mm (`@media print`): rótulo `NOTA DE CRÉDITO ELECTRÓNICA`, referencia al comprobante modificado (`DOC. MODIFICA:`), motivo SUNAT, QR vectorial SVG y código hash.
   - Botón `🖨️ Ticket NC` en el historial de comprobantes de Caja.

5. **Conciliación en Arqueo de Caja (Corte X)**:
   - Deducción transparente de Notas de Crédito emitidas en la fila `Notas de Crédito (N) - S/ XX.XX`.
   - Cálculo automático de **Ventas Fiscales Netas**: $\text{Boletas} + \text{Facturas} - \text{Notas de Crédito}$.

6. **Resultados de Verificación**:
   - **Typecheck**: `pnpm typecheck` aprobado con 0 errores TypeScript (`tsc --noEmit`).
   - **Compilación de producción**: `pnpm build` (`next build` con Turbopack) exitoso en 5.2s.
   - **Vitest**: **149 pruebas aprobadas al 100%** (5 suites).
   - **Playwright E2E**: **11 escenarios aprobados al 100%** (incluyendo `tests/e2e/zzzzzzz-credit-notes.spec.ts`).
   - **Validación SDD**: **25/25 comprobaciones aprobadas** con `pnpm validate:sdd`.
   - **Revisión Independiente**: Aprobada sin observaciones en `docs/evidence/credit-notes-review.md`.
   - **Entrega Formal**: `docs/evidence/credit-notes-delivery.md` y `docs/construction/runs/2026-10-02-notas-credito/delivery.json`.
   - **Puntero de Ejecución**: `docs/construction/current-run.json` actualizado a estado `completed`.

---

## 4. Instrucciones para Ejecutar y Verificar

Desde la raíz del piloto (`F:/PROYECTOS/QatuPOS/el-encanto-huamanguino`):

1. **Iniciar base de datos portable**:
   ```powershell
   pnpm db:start
   ```
2. **Servidor de desarrollo**:
   ```powershell
   pnpm dev
   ```
   - Interfaz POS: `http://127.0.0.1:3000/` (usuarios: `admin`, `mozo`, `caja`, `cocina`, `heladeria`, `noche`; contraseña: `QatuDemo2026!`).
   - Portal Cliente: `http://127.0.0.1:3000/cliente` (requiere clave de 10 caracteres habilitada por mozo).
   - API Comercio: `http://127.0.0.1:4000/` (con OpenAPI en `/docs`).

3. **Verificación completa**:
   ```powershell
   pnpm typecheck
   pnpm test
   pnpm test:e2e
   pnpm build
   pnpm validate:sdd
   ```

*Nota*: No ejecutar `pnpm test:e2e` ni `pnpm build` mientras `pnpm dev` esté escribiendo activamente en `.next` para evitar bloqueos de archivos en Windows.

---

## 5. Próximo Incremento hacia Sistema 100% Funcional

Para culminar la suite comercial integral del restaurante **El Encanto Huamanguino**:
1. **Control de Recetas, Escandallos y Kardex de Insumos (Incremento 011)**:
   - Configuración de recetas para platos (ej. Ceviche Clásico: 200g pescado blanco, 3 limones, 80g cebolla roja, 100g camote, 50g choclo).
   - Descuento automático de existencias de insumos al preparar pedidos en Cocina.
   - Trazabilidad y Kardex (entradas de insumos, salidas por preparación, mermas por anulaciones).
2. **Puente y Spooler de Impresión ESC/POS Local (Incremento 012)**:
   - Servicio ligero local para envío de tramas ESC/POS binarias a impresoras térmicas de red/USB/serial sin diálogo de navegador.
