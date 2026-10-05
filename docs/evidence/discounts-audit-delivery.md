# Entrega · Descuentos Comerciales, Cortesías de Salón y Arqueo / Reporte X de Caja en Vivo con Tickets Térmicos 80mm

02/10/2026. Ejecución `b872b22e-e478-43d8-a15d-317208dcf289` · Asignación `a78f161c-8e42-494b-9721-7e3f886fbd74` · WorkKind `implementation` · Feature `specs/009-descuentos-arqueo-caja`.

Se entrega la implementación completa e integrada del incremento de **Descuentos Comerciales y Cortesías de Salón, Auditoría Inmutable en Base de Datos, Coherencia Tributaria con Pre-cuenta y Comprobantes SUNAT (Boletas B001 y Facturas F001), y Módulo de Arqueo de Caja en Vivo (Reporte X) con Tickets Térmicos de 80mm** en el piloto **El Encanto Huamanguino**.

---

## 1. Resumen de Capacidades Implementadas

1. **Descuentos Comerciales y Cortesías (`check.discount.apply` y `check.discount.remove`)**:
   - Soporte para descuentos por porcentaje (1% - 100%) y por monto fijo en PEN céntimos (`MoneyMinor`).
   - Control de roles estricto: autorizado exclusivamente para `cashier` y `admin`. Mozos y personal de cocina reciben HTTP 403 `FORBIDDEN`.
   - Motivo obligatorio de al menos 3 caracteres con sugerencias rápidas preconfiguradas: "Convenio corporativo", "Cliente frecuente", "Cortesía del dueño", "Compensación demora".
   - Control financiero estricto: bloquea con `CHECK_BALANCE_EXCEEDED` cualquier descuento superior al total de consumo o que reduzca el saldo de la cuenta por debajo de los pagos o cobros retenidos en curso.
   - Posibilidad de retirar o anular un descuento aplicado antes del cobro final mediante `check.discount.remove`.
   - Bloqueo de modificación fiscal: una cuenta con comprobante emitido (`fiscal_status === 'issued'`) no admite alteración de descuentos (`ALREADY_ISSUED`).

2. **Auditoría Inmutable en PostgreSQL (`check_discount_audit`)**:
   - Registro transaccional inmutable que almacena: `id`, `actor_id`, `operation_id`, `check_id`, `visit_id`, `discount_minor`, `discount_kind`, `discount_percent`, `reason` y timestamp `created_at`.
   - Visualizador en tiempo real dentro del módulo de Caja ("Auditoría de Descuentos y Cortesías") situado directamente debajo de la auditoría de anulaciones.

3. **Coherencia en Pre-cuenta y Facturación Electrónica SUNAT**:
   - **Pre-cuenta de 80mm**: desglosa con exactitud el `SUBTOTAL CONSUMOS:`, la línea de `DESCUENTO (X%):` o `DESCUENTO COMERCIAL:`, y el `TOTAL A PAGAR:`, recalculando la base imponible y el IGV (18%) referencial.
   - **Comprobantes Electrónicos (Boleta B001 y Factura F001)**: calculan la base imponible neta (`op_gravada_minor = Math.round(total_minor / 1.18)`) y el IGV (18%) sobre el importe efectivamente facturado post-descuento, garantizando cumplimiento tributario estricto sin tributar sobre descuentos concedidos.

4. **Arqueo de Caja en Vivo (Corte X)**:
   - Reporte parcial de turno accesible en cualquier momento desde Caja y Mi Turno mediante el modal `CashAuditModal`.
   - Conciliación matemática exacta de efectivo en gaveta:
     `expectedCashInDrawer = opening_minor + cashNetMinor + paidInMinor - paidOutMinor`.
   - Desglose de recaudación comercial por medio: Efectivo, Tarjeta / POS y Billetera Digital Yape.
   - Agregación fiscal SUNAT: total de Boletas B001, Facturas F001 e IGV devengado en el turno.
   - Estado de cuentas abiertas y saldos pendientes por cobrar en el salón.
   - Visualización y formato de Ticket Térmico de 80mm con soporte de impresión física `@media print`.

---

## 2. Evidencia de Verificación Técnica

- **Typecheck**: `pnpm typecheck` aprobado con 0 errores TypeScript (`tsc --noEmit`).
- **Compilación de producción**: `pnpm build` (`next build` con Turbopack) exitoso en 1037ms.
- **Pruebas Unitarias y de Integración**:
  - `pnpm test` (Vitest): **140 pruebas aprobadas al 100%** en 5 suites:
    - `tests/unit/contracts.test.ts` (31 pruebas): validaciones de esquemas de descuento y tipos.
    - `tests/unit/exact.test.ts` (13 pruebas): aritmética entera sin descalce de céntimos.
    - `tests/unit/pilot-domain.test.ts` (63 pruebas): reglas puras de descuentos, límites de saldo, cálculo porcentual y retiro de descuento.
    - `tests/integration/api.test.ts` (16 pruebas): persistencia transaccional PostgreSQL de `checks` y `check_discount_audit`.
    - `tests/integration/guest.test.ts` (17 pruebas): ciclo de vida de cliente en mesa.
- **Pruebas End-to-End en Playwright**:
  - `pnpm test:e2e`: **10 escenarios aprobados al 100%** (1.9m de ejecución):
    - `tests/e2e/zzzzzz-discounts-audit.spec.ts`: flujo completo verificado en navegador: apertura de mesa, pedido de platos, bloqueo de mozo, selección en caja, apertura de modal de descuento, cálculo dinámico de 10% (S/ 4.00), inspección de pre-cuenta con desglose, cobro en efectivo, emisión de Boleta B001 post-descuento (Op. Gravada S/ 30.51 + IGV S/ 5.49 = S/ 36.00), apertura de Arqueo de Caja (Corte X) e inspección de ticket térmico de 80mm, y verificación de auditoría inmutable en tabla.
- **Validación SDD**:
  - `pnpm validate:sdd`: **25/25 comprobaciones aprobadas**, generando `docs/evidence/planning-validation.json`.

---

## 3. Capturas de Pantalla Generadas

- `docs/evidence/screens/discount-modal.png`: Modal interactivo de Descuento Comercial / Cortesía de Salón con previsualización reactiva.
- `docs/evidence/screens/precuenta-with-discount.png`: Ticket térmico de 80mm de Pre-cuenta de Mesa con desglose de subtotal bruto, descuento comercial y total neto.
- `docs/evidence/screens/boleta-with-discount.png`: Boleta de Venta Electrónica B001 calculada sobre el total neto post-descuento.
- `docs/evidence/screens/corte-x-arqueo-80mm.png`: Ticket térmico de 80mm de Arqueo de Caja (Corte X) con conciliación de efectivo, cobranzas por medio y resumen tributario.

---

## 4. Conformidad y Restricciones del Piloto

- **Aislamiento**: Todo el código y dependencias se limitan a `el-encanto-huamanguino`. No se modificó el proyecto padre.
- **Base de Datos**: Las pruebas automáticas usaron bases efímeras `qatupos_lab_test_*`; la base de laboratorio `qatupos_lab` no fue limpiada ni alterada destructivamente.
- **Simulación Transparente**: Se mantienen los sellos explícitos de entorno de laboratorio (`[Entorno de Laboratorio QatuPOS · Homologado]` y `accepted_simulated`) sin conexión a APIs externas ni hardware real.
