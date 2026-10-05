# Feature Specification: Notas de Crédito Electrónicas SUNAT (BC01 / FC01), Anulación Formal y Ticket Térmico 80mm

**Feature ID**: `010-notas-credito-sunat` · **Fecha**: 2026-10-02 · **Piloto**: El Encanto Huamanguino

## 1. Contexto y Objetivos

En la operación tributaria y de caja de un restaurante peruano (**El Encanto Huamanguino**), la normativa de comprobantes de pago de la SUNAT establece que una Boleta de Venta o Factura Electrónica ya emitida no puede ser borrada ni modificada arbitrariamente en el sistema:
1. **Emisión de Notas de Crédito Electrónicas (Tipo SUNAT 07)**:
   - Toda corrección, anulación por error en emisión, error en RUC o devolución de consumos requiere la emisión de una **Nota de Crédito Electrónica** oficial.
   - Si el comprobante original es una **Boleta de Venta Electrónica** (serie `B001`), la Nota de Crédito se emite bajo la serie `BC01`.
   - Si el comprobante original es una **Factura Electrónica** (serie `F001`), la Nota de Crédito se emite bajo la serie `FC01`.
2. **Catálogo 09 de Motivos SUNAT**:
   - `01`: Anulación de la operación.
   - `02`: Anulación por error en el RUC.
   - `03`: Corrección por error en la descripción.
   - `06`: Devolución total.
   - `07`: Devolución parcial.
3. **Coherencia Contable, Aritmética y Tributaria**:
   - Reversión exacta en céntimos enteros PEN (`MoneyMinor`), calculando base imponible e IGV (18%).
   - Trama oficial SUNAT, resumen digital SHA-256 en Base64 (estándar UBL 2.1) y código QR dinámico.
   - Trazabilidad y vínculo estricto al comprobante original modificado.
4. **Ticket Térmico 80mm y Visualización**:
   - Ticket térmico de 80mm especializado para Notas de Crédito (`@media print`), detallando documento modificado, motivo SUNAT, sustento y código QR.
   - En el panel de Caja: indicador claro de comprobante anulado (`Anulado con NC: BC01-XXXXXXXX`) y botón de emisión rápida para el cajero y administrador.
   - En el **Arqueo de Caja en Vivo (Corte X)**: deducción de notas de crédito para reflejar la venta fiscal neta en tiempo real.

---

## 2. Requisitos Funcionales

- **NCR-FR-001: Emisión de Nota de Crédito Electrónica (`fiscal.credit_note.issue`)**:
  - Comando autorizado exclusivamente para roles `cashier` y `admin` (mozos y cocina reciben HTTP 403 `FORBIDDEN`).
  - Parámetros requeridos: `document_id` (UUID del comprobante a modificar), `reason_code` (código oficial de motivo SUNAT), `reason_description` (sustento o justificación, mín. 3 caracteres).
  - Determina automáticamente la serie según el tipo de documento modificado (`BC01` para Boletas `B001`, `FC01` para Facturas `F001`).
  - Asigna correlativo secuencial atómico en PostgreSQL mediante `SELECT ... FOR UPDATE` sobre la tabla `fiscal_series`.

- **NCR-FR-002: Control de Anulación y Bloqueo de Duplicidad**:
  - Rechaza con `NOT_FOUND` si el comprobante original no existe.
  - Rechaza con `ALREADY_ANNULLED` si el comprobante ya cuenta con una Nota de Crédito que anuló la operación en su totalidad.
  - Actualiza el estado del comprobante original a anulado o con referencia a su nota de crédito vinculada.

- **NCR-FR-003: Integridad Tributaria UBL 2.1 y Código QR Oficial**:
  - Generación de resumen hash SHA-256 en Base64 representativo del documento UBL 2.1.
  - Trama oficial para código QR:
    `RUC|07|SERIE_NC|NUMERO_NC|M_IGV|M_TOTAL|FECHA|DOC_CLIENTE|NUM_DOC_CLIENTE|HASH`
  - Reversión exacta de base gravada e IGV:
    `op_gravada_minor = Math.round(total_minor / 1.18)`, `igv_minor = total_minor - op_gravada_minor`.

- **NCR-FR-004: Ticket Térmico 80mm de Nota de Crédito**:
  - Modal térmico responsivo con ancho canónico de 302px (80mm) y tipografía monoespaciada para impresión física.
  - Encabezado: "NOTA DE CRÉDITO ELECTRÓNICA".
  - Identificación del documento de referencia: "DOC. MODIFICA: BOLETA B001-XXXXXXXX" o "FACTURA F001-XXXXXXXX".
  - Motivo SUNAT claramente rotulado con su código y denominación legal ("01 - ANULACIÓN DE LA OPERACIÓN", etc.).
  - Sustento del emisor y código QR renderizado en SVG.

- **NCR-FR-005: Conciliación en Arqueo de Caja (Corte X)**:
  - El Arqueo en Vivo desglosa las Notas de Crédito emitidas en el turno (cantidad y monto acumulado).
  - Cálculo de la venta fiscal neta: `Ventas Netas = (Total Boletas + Total Facturas) - Total Notas de Crédito`.

---

## 3. Criterios de Aceptación

- **NCR-AC-001**: Al emitir una Nota de Crédito sobre una Boleta `B001-00000001` de S/ 36.00 por motivo "01 - Anulación de la operación", se genera el correlativo `BC01-00000001` con total S/ 36.00, op. gravada S/ 30.51, IGV S/ 5.49, hash SHA-256 y QR tipo `07`.
- **NCR-AC-002**: Al emitir una Nota de Crédito sobre una Factura `F001-00000001` de S/ 70.00 por motivo "02 - Anulación por error en el RUC", se genera el correlativo `FC01-00000001`.
- **NCR-AC-003**: Un segundo intento de emitir Nota de Crédito por anulación total sobre un documento ya anulado es rechazado con error `ALREADY_ANNULLED`.
- **NCR-AC-004**: Un mozo intentando emitir una Nota de Crédito recibe HTTP 403 `FORBIDDEN`.
- **NCR-AC-005**: El ticket térmico de 80mm de la Nota de Crédito se genera con todos los datos legales y botón de impresión física.
- **NCR-AC-006**: El Arqueo de Caja (Corte X) refleja el monto total de Notas de Crédito deducido de las ventas brutas del turno.
