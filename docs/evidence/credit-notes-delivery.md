# Entrega · Notas de Crédito Electrónicas SUNAT (BC01 / FC01), Anulación Formal y Ticket Térmico 80mm

02/10/2026. Ejecución `c194a11f-508b-4a52-b883-9972834d8ef1` · Asignación `b3e94470-76c1-4b10-a359-57ef51fae929` · WorkKind `implementation` · Feature `specs/010-notas-credito-sunat`.

Se entrega la implementación completa e integrada del incremento de **Notas de Crédito Electrónicas SUNAT (BC01 / FC01), Motivos Normativos Oficiales (Catálogo 09 SUNAT), Anulación Formal de Comprobantes, Ticket Térmico de 80mm y Conciliación en el Arqueo de Caja (Corte X)** en el piloto **El Encanto Huamanguino**.

---

## 1. Resumen de Capacidades Implementadas

1. **Comando de Emisión de Nota de Crédito (`fiscal.credit_note.issue`)**:
   - Comando formal de dominio restringido exclusivamente a roles `cashier` y `admin`. Mozos y personal de cocina reciben HTTP 403 `FORBIDDEN`.
   - Asignación automática de series según normativa SUNAT: Boletas `B001` originan serie `BC01`; Facturas `F001` originan serie `FC01`.
   - Control de correlativos atómico con bloqueo de concurrencia `FOR UPDATE` en PostgreSQL (`fiscal_series`).
   - Reversión exacta en céntimos PEN (`MoneyMinor`) de base imponible (`op_gravada_minor`), tributo (`igv_minor` 18%) e importe total (`total_minor`).

2. **Catálogo Oficial 09 de Motivos SUNAT**:
   - Selector normativo con códigos y descripciones oficiales:
     - `01`: Anulación de la operación (cancela la totalidad del comprobante por anulación o error en venta).
     - `02`: Anulación por error en el RUC (exclusivo para Facturas).
     - `03`: Corrección por error en la descripción.
     - `06`: Devolución total.
     - `07`: Devolución parcial.
   - Campo obligatorio de sustento/justificación descriptiva con botones de sugerencias rápidas ("Error en digitación de comanda", "Cliente solicitó cambio de comprobante", "Error en RUC de la empresa", "Devolución total por inconformidad").

3. **Inmutabilidad y Bloqueo de Duplicidad**:
   - Validación estricta que impide emitir más de una Nota de Crédito sobre el mismo documento original (`ALREADY_ANNULLED`).
   - El documento original queda marcado con `status = 'annulled'` y referencias explícitas a `credit_note_id` y `credit_note_full_number`.
   - La cuenta de mesa asociada revierte su estado fiscal a `fiscal_status = 'pending'`, permitiendo la reemisión formal del comprobante corregido si fuera necesario.

4. **Trama UBL 2.1 y Firma Digital Homologada**:
   - Generación de firma digital hash SHA-256 en formato Base64.
   - Código QR dinámico oficial SUNAT con código de tipo de documento `07` (Nota de Crédito), serie, correlativo, IGV, total y fecha de emisión.

5. **Ticket Térmico de 80mm para Nota de Crédito**:
   - Modal interactivo de impresión térmica adaptado para el formato de 80mm (`ThermalReceiptModal`).
   - Cabecera distintiva: `NOTA DE CRÉDITO ELECTRÓNICA` con número de serie (`BC01-xxxxxxxx` o `FC01-xxxxxxxx`).
   - Metadatos fiscales normativos: Referencia explícita al documento modificado (`DOC. MODIFICA:`), código y descripción del motivo SUNAT (`MOTIVO SUNAT:`), desglose de ítems anulados, base gravada revertida, IGV revertido y total anulado.
   - Representación gráfica de código QR vectorial en SVG y código hash digital UBL 2.1.
   - Botón de reimpresión directa (`🖨️ Ticket NC`) en la tabla de historial fiscal de Caja.

6. **Conciliación en el Arqueo de Caja (Corte X)**:
   - El modal de Arqueo en Vivo (`CashAuditModal`) desglosa la fila `Notas de Crédito (N)` con importe deducido en negativo (`- S/ XX.XX`).
   - Cálculo automático de **Ventas Fiscales Netas**: total de Boletas + Facturas menos el importe acumulado de Notas de Crédito emitidas durante el turno.

---

## 2. Evidencia de Verificación Técnica

- **Typecheck**: `pnpm typecheck` aprobado con 0 errores TypeScript (`tsc --noEmit`).
- **Compilación de producción**: `pnpm build` (`next build` con Turbopack) exitoso en 5.2s; TypeScript verificado y páginas estáticas generadas sin advertencias.
- **Pruebas Unitarias y de Integración**:
  - `pnpm test` (Vitest): **149 pruebas aprobadas al 100%** en 5 suites:
    - `tests/unit/contracts.test.ts` (34 pruebas): validaciones de esquemas de Notas de Crédito, discriminadores, códigos de motivo SUNAT y tipos.
    - `tests/unit/exact.test.ts` (13 pruebas): aritmética entera sin descalce de céntimos.
    - `tests/unit/pilot-domain.test.ts` (68 pruebas): emisión de BC01 para Boletas, FC01 para Facturas, cálculo UBL, reversión de cuenta, rechazo a mozo (403), rechazo por doble anulación y validación de motivos.
    - `tests/integration/api.test.ts` (17 pruebas): persistencia transaccional PostgreSQL de `fiscal_documents`, actualización de `fiscal_series` y marcado de comprobante original en base efímera.
    - `tests/integration/guest.test.ts` (17 pruebas): ciclo de vida de cliente en mesa.
- **Pruebas End-to-End en Playwright**:
  - `pnpm test:e2e`: **11 escenarios aprobados al 100%** (1.9m de ejecución global):
    - `tests/e2e/zzzzzzz-credit-notes.spec.ts`: ciclo completo verificado en navegador: apertura de mesa, pedido de platos, cobro en caja, emisión de Boleta, apertura de modal de Nota de Crédito, selección de motivo SUNAT, sustento, confirmación legal, emisión de `BC01`, apertura automática de ticket térmico 80mm con referencias y QR, actualización visual en tabla de Caja, bloqueo de botón de anulación posterior, reimpresión de ticket NC, y conciliación matemática en el Arqueo de Caja (Corte X).
- **Validación SDD**:
  - `pnpm validate:sdd`: **25/25 comprobaciones aprobadas**, generando `docs/evidence/planning-validation.json`.

---

## 3. Capturas de Pantalla Generadas

- `docs/evidence/screens/credit-note-modal.png`: Modal interactivo de Emisión de Nota de Crédito con selector de motivos SUNAT Catálogo 09, sugerencias y advertencia legal de anulación formal.
- `docs/evidence/screens/credit-note-ticket-80mm.png`: Ticket térmico de 80mm de Nota de Crédito Electrónica `BC01-00000001` con documento modificado, motivo SUNAT, hash SHA-256 y código QR oficial.
- `docs/evidence/screens/cash-audit-with-credit-notes.png`: Ticket térmico de 80mm de Arqueo de Caja (Corte X) con deducción de Notas de Crédito y cálculo de Ventas Fiscales Netas.

---

## 4. Conformidad y Restricciones del Piloto

- **Aislamiento**: Todo el código y dependencias se limitan a `el-encanto-huamanguino`. No se modificó el proyecto padre.
- **Base de Datos**: Las pruebas automáticas usaron bases efímeras `qatupos_lab_test_*`; la base de laboratorio `qatupos_lab` permanece intacta con sus migraciones al día (migración 010 aplicada).
- **Simulación Transparente**: Se mantienen los sellos explícitos de entorno de laboratorio (`[Entorno de Laboratorio QatuPOS · Homologado]` y `accepted_simulated`) sin conexión a servidores reales de SUNAT ni impresoras físicas.
