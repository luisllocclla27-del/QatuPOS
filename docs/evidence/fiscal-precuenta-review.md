# Revisión independiente — Pre-cuenta y Comprobantes Electrónicos SUNAT

02/10/2026 · Ejecución `f5127d20-b461-419b-a0d4-1a3b98c991ee` · Asignación `e83719b4-3a21-41b9-8e41-073b318ac2fa` · Revisor `independent-reviewer` · Feature `specs/008-facturacion-precuenta` · Tareas `FIS:T011`, `FIS:T012`.

**Resultado:** No se encontraron observaciones bloqueantes ni discrepancias tributarias o financieras en el incremento inspeccionado. Esta revisión técnica e independiente certifica que la emisión de comprobantes de pago electrónicos y la consulta de pre-cuenta respetan las normas SUNAT, la aritmética exacta en céntimos PEN (`MoneyMinor`), la inmutabilidad de la auditoría y la separación de roles.

---

## 1. Controles y Reglas Comerciales Contrastados

1. **Aritmética Tributaria Exacta (`MoneyMinor`)**:
   - Para un importe total $T$, la base imponible se calcula como $O = \text{round}(T / 1.18)$ y el IGV como $I = T - O$.
   - Se verificó que $O + I \equiv T$ en todos los casos sin desfase de redondeo ni uso de punto flotante descontrolado.
   - Las operaciones operan íntegramente sobre enteros en céntimos PEN.

2. **Validaciones de Receptor según Normativa SUNAT**:
   - **Factura Electrónica (`01`)**: Exige RUC de 11 dígitos iniciando estrictamente en `10` (persona natural con negocio) o `20` (persona jurídica) y Razón Social de mínimo 3 caracteres.
   - **Boleta de Venta Electrónica (`03`)**: Admite "CLIENTES VARIOS" para montos $\le$ S/ 700.00 PEN. Para importes mayores a S/ 700.00 PEN, exige obligatoriamente documento DNI de 8 dígitos numéricos y nombre completo del adquirente.

3. **Inmutabilidad y Bloqueo de Duplicidad (`ALREADY_ISSUED`)**:
   - Una cuenta (`Check`) solo puede tener un comprobante emitido. Todo intento de emitir nuevamente sobre la misma cuenta transicionada es rechazado con error `ALREADY_ISSUED`.
   - Se asegura la asignación secuencial y atómica de correlativos sobre `fiscal_series` mediante `SELECT ... FOR UPDATE` en PostgreSQL.

4. **Resumen Digital UBL 2.1 y Código QR**:
   - Generación de resumen hash SHA-256 en Base64 representativo del documento UBL 2.1.
   - Cadena estructurada para código QR según el estándar SUNAT:
     `RUC|TIPO_DOC|SERIE|NUMERO|M_IGV|M_TOTAL|FECHA|DOC_CLIENTE|NUM_DOC_CLIENTE|HASH`

5. **Pre-cuenta de Consumo**:
   - Refleja fielmente los consumos activos deduciendo las líneas anuladas.
   - No altera el estado fiscal ni la versión concurrente de la cuenta.
   - Incluye advertencia destacada: "PRE-CUENTA / CUENTA DE CONSUMO - NO ES COMPROBANTE DE PAGO".

6. **Diseño e Impresión Térmica de 80mm**:
   - Ancho canónico de 302px (80mm) con tipografía monoespaciada legible para impresoras de punto de venta.
   - Reglas de impresión `@media print` que suprimen cabeceras parásitas del navegador y centran el ticket.

---

## 2. Aislamiento de Laboratorio y Pruebas

- Pruebas PostgreSQL ejecutadas en bases efímeras aisladas `qatupos_lab_test_*`, sin tocar `qatupos_lab`.
- Ningún proveedor de pagos ni facturación SUNAT real conectado (rotulado `accepted_simulated`).
- Cobertura de verificación automatizada:
  - **Vitest**: 132 pruebas aprobadas (100%).
  - **Playwright E2E**: 9 escenarios aprobados (100%), incluyendo el flujo completo de pre-cuenta y facturación en navegador.
  - **TypeScript**: 0 errores (`pnpm typecheck`).
  - **Compilación**: optimizada en Next.js (`pnpm build`).
  - **Validación SDD**: 25/25 comprobaciones aprobadas (`pnpm validate:sdd`).
