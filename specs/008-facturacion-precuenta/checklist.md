# Quality Checklist: Pre-cuenta y Comprobantes Electrónicos SUNAT

**Feature ID**: `008-facturacion-precuenta` · **Fecha**: 2026-10-02

- [x] C01 Pre-cuenta muestra todas las tandas y líneas activas, deduciendo anulaciones y desglosando IGV 18% sin alterar versión de cuenta.
- [x] C02 Pre-cuenta incluye leyenda explícita: "PRE-CUENTA / CUENTA DE CONSUMO - NO ES COMPROBANTE DE PAGO".
- [x] C03 Boleta Electrónica asigna serie B001 y correlativo autoincremental de 8 dígitos (`B001-XXXXXXXX`).
- [x] C04 Factura Electrónica asigna serie F001 y correlativo autoincremental de 8 dígitos (`F001-XXXXXXXX`).
- [x] C05 Factura exige RUC válido de 11 dígitos (empezando con 10 o 20) y Razón Social (mínimo 3 caracteres).
- [x] C06 Boleta mayor a S/ 700.00 exige obligatoriamente DNI (8 dígitos) y nombre completo.
- [x] C07 Cálculo exacto de IGV: `op_gravada_minor + igv_minor === total_minor` en todos los casos sin desfases de céntimos.
- [x] C08 Generación de digest hash SHA-256 UBL 2.1 y trama oficial QR conforme a estándares SUNAT.
- [x] C09 Bloqueo de duplicidad fiscal (`ALREADY_ISSUED`) ante intentos posteriores sobre la misma cuenta.
- [x] C10 Ticket térmico de 80mm incluye estilos de impresión `@media print`, logo/nombre del restaurante, datos de cliente, ítems, desglose fiscal y QR.
- [x] C11 Pestaña de Comprobantes en Caja permite buscar por número de comprobante o cliente y reimprimir el ticket en cualquier momento.
- [x] C12 Aislamiento total: base PostgreSQL efímera en tests, datos sintéticos y rotulado de simulación de laboratorio.
