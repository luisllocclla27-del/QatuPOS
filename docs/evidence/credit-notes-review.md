# Revisión independiente — Notas de Crédito Electrónicas SUNAT (BC01 / FC01), Anulación Formal y Ticket Térmico 80mm

02/10/2026 · Ejecución `c194a11f-508b-4a52-b883-9972834d8ef1` · Asignación `b3e94470-76c1-4b10-a359-57ef51fae929` · Revisor `independent-reviewer` · Feature `specs/010-notas-credito-sunat`.

**Resultado:** No se encontraron observaciones bloqueantes ni discrepancias financieras, tributarias ni de auditoría en el incremento inspeccionado. Esta revisión técnica e independiente certifica que el sistema de Notas de Crédito Electrónicas SUNAT (BC01 / FC01), anulación formal de comprobantes fiscales, catálogo oficial de motivos SUNAT (Catálogo 09), ticket térmico de 80mm y conciliación en el Arqueo de Caja (Corte X) cumplen con los estándares de integridad tributaria, aritmética exacta en céntimos PEN (`MoneyMinor`), separación estricta de roles y trazabilidad inmutable.

---

## 1. Controles y Reglas Comerciales Contrastados

1. **Aritmética Exacta en Céntimos PEN (`MoneyMinor`) y Reversión Tributaria**:
   - Reversión exacta de importes: el documento de Nota de Crédito toma los montos originales de la Boleta o Factura:
     - Base Gravada revertida: $O_{\text{nc}} = O_{\text{orig}}$
     - Débito Fiscal IGV revertido: $I_{\text{nc}} = I_{\text{orig}}$
     - Importe Total revertido: $T_{\text{nc}} = T_{\text{orig}}$
   - Toda la aritmética opera con enteros en céntimos PEN evitando pérdidas o descalces por coma flotante IEEE 754.

2. **Control de Accesos y Matriz de Roles**:
   - La operación `fiscal.credit_note.issue` está restringida a los roles de autoridad financiera (`cashier` y `admin`).
   - Todo intento de emisión de Nota de Crédito por parte de mozos (`waiter`) o personal de cocina (`kitchen`) es rechazado con código HTTP 403 `FORBIDDEN`.
   - Se exige un motivo descriptivo justificado ($\ge 3$ caracteres) además del código normativo SUNAT.

3. **Normativa Tributaria SUNAT (Catálogo 09 y Series Oficiales)**:
   - Asignación determinista de serie:
     - Boletas `B001` originan serie `BC01`.
     - Facturas `F001` originan serie `FC01`.
   - Códigos normativos del Catálogo 09 SUNAT validados en el contrato: `'01'`, `'02'`, `'03'`, `'06'`, `'07'`.
   - Formato UBL 2.1 con hash digital SHA-256 Base64 y código QR con tipo de documento `07` (Nota de Crédito).

4. **Inmutabilidad y Bloqueo de Duplicidad (`ALREADY_ANNULLED`)**:
   - Bloqueo atómico contra doble anulación: una vez emitida la Nota de Crédito, cualquier intento subsecuente de emitir otra Nota de Crédito sobre el mismo documento es rechazado con código de error `ALREADY_ANNULLED`.
   - El documento original se actualiza inmutablemente con `status = 'annulled'`, `credit_note_id` y `credit_note_full_number`.
   - La cuenta de mesa vinculada revierte su estado a `fiscal_status = 'pending'`, permitiendo la reemisión formal del comprobante corregido.

5. **Conciliación en Arqueo de Caja (Corte X)**:
   - El reporte parcial de turno (Corte X) deduce de manera transparente el total de Notas de Crédito emitidas:
     $$\text{Ventas Fiscales Netas} = \text{Total Boletas} + \text{Total Facturas} - \text{Total Notas de Crédito}$$
   - El cajón físico de dinero permanece protegido: la emisión de una Nota de Crédito anula el comprobante fiscal ante SUNAT sin alterar subrepticiamente el dinero en efectivo del cajón, manteniendo intacta la auditoría de caja.

6. **Formato Térmico de 80mm**:
   - Modal interactivo con estilos adaptados para 80mm (`@media print`).
   - Referencia clara al documento modificado (`DOC. MODIFICA:`), código y motivo SUNAT, QR gráfico vectorial SVG y código hash digital.
   - Opción de reimpresión directa (`🖨️ Ticket NC`) en el historial fiscal de Caja.

---

## 2. Aislamiento de Laboratorio y Verificación

- Pruebas automatizadas ejecutadas sobre esquemas y bases PostgreSQL efímeras `qatupos_lab_test_*`, garantizando la preservación íntegra de la base de desarrollo interactivo `qatupos_lab`.
- Ausencia de conexiones a servidores SUNAT reales; todas las transacciones operan bajo simuladores homologados (`accepted_simulated`).
- Resultados de verificación técnica:
  - **Vitest Unit & Integration**: 149/149 pruebas aprobadas (100%).
  - **Playwright E2E**: 11/11 pruebas de navegación y lógica de punto de venta aprobadas (100%).
  - **TypeScript Typecheck**: 0 errores de tipado en todo el monorepo.
  - **Next.js Production Build**: Compilación exitosa en Turbopack con generación estática completa.
  - **SDD Validation**: 25/25 reglas y contratos de diseño aprobados.
