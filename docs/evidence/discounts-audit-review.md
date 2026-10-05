# Revisión independiente — Descuentos Comerciales, Cortesías de Salón y Arqueo / Reporte X de Caja en Vivo con Tickets Térmicos 80mm

02/10/2026 · Ejecución `b872b22e-e478-43d8-a15d-317208dcf289` · Asignación `independent-reviewer` · Revisor `independent-reviewer` · Feature `specs/009-descuentos-arqueo-caja`.

**Resultado:** No se encontraron observaciones bloqueantes ni discrepancias financieras, tributarias ni de auditoría en el incremento inspeccionado. Esta revisión técnica e independiente certifica que el sistema de descuentos comerciales, cortesías de salón, registro inmutable en PostgreSQL, coherencia con comprobantes electrónicos SUNAT y el arqueo en vivo (Corte X) de caja cumplen con los estándares de integridad contable, aritmética exacta en céntimos PEN (`MoneyMinor`), separación estricta de roles y trazabilidad inmutable.

---

## 1. Controles y Reglas Comerciales Contrastados

1. **Aritmética Exacta en Céntimos PEN (`MoneyMinor`) y Límites de Saldo**:
   - Para descuentos porcentuales ($P \in [1, 100]$): se calcula $D = \text{round}\left(\frac{\text{consumo\_bruto} \times P}{100}\right)$.
   - Se validó que el descuento neto $D$ nunca supere el consumo total de la cuenta, ni reduzca el saldo pendiente por debajo de cobros ya asentados o retenidos (bloqueo con error `CHECK_BALANCE_EXCEEDED`).
   - El saldo neto a cobrar se mantiene como una relación determinista: $\text{saldo} = \text{consumo} - \text{descuento} - \text{pagado}$.
   - Toda la aritmética opera con enteros en céntimos PEN evitando pérdidas o descalces por coma flotante IEEE 754.

2. **Control de Accesos y Matriz de Roles**:
   - Las operaciones `check.discount.apply` y `check.discount.remove` están restringidas a los roles de autoridad de caja (`cashier` y `admin`).
   - Todo intento de aplicación o remoción de descuento por parte de mozos (`waiter`) o personal de cocina (`kitchen`) es rechazado con código HTTP 403 `FORBIDDEN`.
   - Se exige un motivo descriptivo justificado ($\ge 3$ caracteres) en cada descuento o cortesía.

3. **Auditoría Inmutable en Base de Datos (`check_discount_audit`)**:
   - Cada evento de descuento genera una entrada transaccional de tipo append-only en la tabla relacional `check_discount_audit`, guardando actor, operación, cuenta, visita, monto, tipo (porcentaje/monto fijo), porcentaje y razón.
   - La tabla no admite actualizaciones ni eliminaciones; la remoción de un descuento se registra como una nueva entrada de auditoría con valor minor 0 y su motivo correspondiente.

4. **Coherencia Tributaria SUNAT y Pre-cuenta**:
   - **Pre-cuenta de 80mm**: detalla el desglose de subtotal bruto, línea de descuento comercial/cortesía con porcentaje o monto, y total a pagar final.
   - **Comprobantes Electrónicos (Boleta B001 y Factura F001)**: calculan la base imponible gravada ($O = \text{round}(T_{\text{neto}} / 1.18)$) y el débito fiscal IGV ($I = T_{\text{neto}} - O$) exclusivamente sobre el importe neto efectivamente facturado, en cumplimiento estricto del TUO de la Ley del IGV e ISC.
   - **Protección Fiscal Inmutable (`ALREADY_ISSUED`)**: cualquier intento de aplicar o retirar descuentos en una cuenta con comprobante fiscal ya emitido (`fiscal_status === 'issued'`) es rechazado atómicamente.

5. **Arqueo de Caja en Vivo (Reporte X) y Formato Térmico 80mm**:
   - Conciliación matemática exacta de efectivo en gaveta:
     $\text{Efectivo Esperado} = \text{Apertura} + \text{Cobros Efectivo} + \text{Ingresos Caja} - \text{Egresos Caja}$.
   - Cuadre y desglose exhaustivo por medios de pago recibidos (Efectivo, Tarjeta / POS, Yape / Billetera Digital).
   - Agregación fiscal en vivo del turno con número correlativo y montos acumulados de Boletas B001, Facturas F001 y débito fiscal IGV.
   - Generación de ticket térmico de 80mm optimizado con estilos `@media print`, apto para impresión directa en tiqueteras térmicas ESC/POS.

---

## 2. Aislamiento de Laboratorio y Verificación

- Pruebas automatizadas ejecutadas sobre esquemas y bases PostgreSQL efímeras `qatupos_lab_test_*`, garantizando la preservación íntegra de la base de desarrollo interactivo `qatupos_lab`.
- Ausencia de conexiones a pasarelas de pago o servidores SUNAT reales; todas las transacciones operan bajo simuladores homologados (`accepted_simulated`).
- Resultados de verificación técnica:
  - **Vitest Unit & Integration**: 140/140 pruebas aprobadas (100%).
  - **Playwright E2E**: 10/10 pruebas de navegación y lógica de punto de venta aprobadas (100%).
  - **TypeScript Typecheck**: 0 errores de tipado en todo el monorepo.
  - **Next.js Production Build**: Compilación exitosa en Turbopack.
  - **SDD Validation**: 25/25 reglas y contratos de diseño aprobados.
