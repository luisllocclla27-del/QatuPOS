# Entrega · Pre-cuenta y Comprobantes Electrónicos SUNAT (Boletas B001 / Facturas F001)

02/10/2026. Ejecución `f5127d20-b461-419b-a0d4-1a3b98c991ee` · Asignación `e83719b4-3a21-41b9-8e41-073b318ac2fa` · WorkKind `implementation` · Feature `specs/008-facturacion-precuenta`.

Se entrega la implementación completa e integrada del incremento de **Pre-cuenta de mesa, Emisión de Comprobantes de Pago Electrónicos homologados SUNAT (Boletas B001 y Facturas F001 con estándar UBL 2.1, Hash SHA-256 y Código QR) y Tickets Térmicos de 80mm con vista e impresión real** en el piloto presencial **El Encanto Huamanguino**.

---

## 1. Resumen de Capacidades Implementadas

1. **Pre-cuenta de Mesa (Cuenta de Consumo)**:
   - Consulta e impresión accesible tanto para el Mozo desde el mapa de mesas como para el Cajero en el panel de cobros.
   - Desglose detallado de todos los consumos activos de la visita, descontando automáticamente las líneas anuladas.
   - Cálculo referencial de base imponible e IGV (18%) manteniendo invariantes financieros en céntimos enteros PEN (`MoneyMinor`).
   - No altera la versión de la cuenta (`check.version`), ni transiciona estados financieros ni fiscales.
   - Incluye rótulo visible y normativo: `PRE-CUENTA / CUENTA DE CONSUMO - NO ES COMPROBANTE DE PAGO`.

2. **Emisión de Comprobantes Electrónicos SUNAT (`fiscal.document.issue`)**:
   - Transacción atómica que reserva correlativo en `fiscal_series` y genera el registro inmutable en `fiscal_documents`.
   - Soporte para **Boleta de Venta Electrónica** (serie `B001-XXXXXXXX`) y **Factura Electrónica** (serie `F001-XXXXXXXX`).
   - Validación tributaria:
     - Factura exige obligatoriamente RUC de 11 dígitos (iniciando en 10 o 20) y Razón Social (mínimo 3 caracteres).
     - Boleta admite cliente no identificado ("CLIENTES VARIOS") para importes menores o iguales a S/ 700.00 PEN.
     - Boleta mayor a S/ 700.00 PEN exige obligatoriamente documento de identidad DNI (8 dígitos) y nombre completo.
   - Aritmética tributaria exacta:
     - `op_gravada_minor = Math.round(total_minor / 1.18)`
     - `igv_minor = total_minor - op_gravada_minor`
     - Se garantiza siempre `op_gravada_minor + igv_minor === total_minor` sin descalce de redondeo.
   - Digest hash SHA-256 codificado en Base64 simulando el resumen digital UBL 2.1.
   - Trama oficial para código QR según especificación SUNAT:
     `RUC|TIPO_DOC|SERIE|NUMERO|M_IGV|M_TOTAL|FECHA|DOC_CLIENTE|NUM_DOC_CLIENTE|HASH`
   - Bloqueo estricto de duplicidad fiscal (`ALREADY_ISSUED`) ante intentos repetidos sobre una misma cuenta.

3. **Ticket Térmico de 80mm y Experiencia de Usuario (`apps/pos`)**:
   - Formato estándar de ticket de 80mm (302px) optimizado para pantallas táctiles y ticketeras térmicas reales.
   - Estilos `@media print` para impresión física directa vía `window.print()` con remoción de márgenes parásitos del navegador.
   - Generación vectorial dinámica de Código QR en SVG compatible con lectores ópticos y smartphones.
   - Pestaña "Comprobantes" en Caja con historial completo, buscador reactivo por correlativo o cliente, y reimpresión instantánea.
   - Rótulos explícitos de entorno de laboratorio: `[Entorno de Laboratorio QatuPOS · Homologado]` y `accepted_simulated`.

---

## 2. Evidencia de Verificación Técnica

- **Typecheck**: `pnpm typecheck` aprobado con 0 errores de TypeScript (`tsc --noEmit`).
- **Compilación de producción**: `pnpm build` (`next build` con Turbopack) exitoso en 845ms.
- **Pruebas Unitarias y de Integración**:
  - `pnpm test` (Vitest): **132 pruebas aprobadas al 100%** en 5 suites:
    - `tests/unit/contracts.test.ts` (30 pruebas): validaciones de esquemas fiscales, tipos de comprobante y documentos de identidad.
    - `tests/unit/exact.test.ts` (13 pruebas): aritmética entera sin punto flotante en céntimos PEN.
    - `tests/unit/pilot-domain.test.ts` (57 pruebas): reglas puras de emisión fiscal, validación RUC/DNI, cálculo de IGV, hash SHA-256 y bloqueo de duplicidad.
    - `tests/integration/api.test.ts` (15 pruebas): persistencia transaccional PostgreSQL de `fiscal_documents` y correlativos `fiscal_series`.
    - `tests/integration/guest.test.ts` (17 pruebas): ciclo de vida de cliente en mesa y cotizaciones.
- **Pruebas End-to-End en Playwright**:
  - `pnpm test:e2e`: **9 escenarios aprobados al 100%**:
    - `tests/e2e/zzzzz-fiscal.spec.ts`: flujo completo de apertura de mesa, pedido de platos, consulta e inspección de Pre-cuenta de 80mm, cobro en caja, emisión de Factura F001-00000001 con RUC 20601234567, renderizado de ticket térmico con QR y Hash, y consulta/reimpresión en historial de comprobantes.
- **Validación SDD**:
  - `pnpm validate:sdd`: **25/25 comprobaciones aprobadas**, generando `docs/evidence/planning-validation.json`.

---

## 3. Capturas de Pantalla y Auditoría

- `docs/evidence/screens/precuenta-80mm.png`: Pre-cuenta de consumo con desglose de consumos, IGV referencial y leyenda de no comprobante de pago.
- `docs/evidence/screens/factura-f001-80mm.png`: Factura electrónica F001 con datos de RUC, Razón Social, base imponible, IGV, hash UBL 2.1 y código QR.
- `docs/evidence/screens/comprobantes-caja-historial.png`: Historial de comprobantes emitidos en Caja con visualización y reimpresión.

---

## 4. Enlaces de Documentación

- [Revisión Independiente](fiscal-precuenta-review.md): Verificación formal de seguridad tributaria, integridad aritmética y correlativos.
- [WorkOrder de Asignación](../construction/runs/2026-10-02-fiscal-precuenta/work-order.json): Ficha de trabajo formal del incremento.
- [Delivery JSON](../construction/runs/2026-10-02-fiscal-precuenta/delivery.json): Manifiesto estructurado de entrega y hashes SHA-256.
- [Reporte de Continuidad](CONTINUIDAD.md): Estado general de la aplicación y base técnica.
