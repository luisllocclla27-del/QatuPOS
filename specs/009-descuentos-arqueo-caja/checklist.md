# Quality Checklist: Descuentos Comerciales, Cortesías de Salón y Arqueo / Reporte X de Caja

**Feature ID**: `009-descuentos-arqueo-caja` · **Fecha**: 2026-10-02

- [x] C01 Descuento comercial admite tipo porcentual (1-100%) y monto fijo PEN en céntimos enteros (`MoneyMinor`).
- [x] C02 Descuento requiere motivo obligatorio de al menos 3 caracteres y registra auditoría inmutable en `check_discount_audit`.
- [x] C03 Roles no autorizados (mozo, cocina) son bloqueados tajantemente en servidor con HTTP 403 `FORBIDDEN`.
- [x] C04 Control estricto de saldo: rechaza con `CHECK_BALANCE_EXCEEDED` si el descuento supera el saldo libre o genera total negativo.
- [x] C05 Pre-cuenta de 80mm desglosa subtotal bruto, descuento comercial aplicado y total neto resultante.
- [x] C06 Boleta B001 y Factura F001 calculan la base imponible y el IGV (18%) sobre el importe neto efectivamente facturado, sin desfase de céntimos.
- [x] C07 Se permite retirar el descuento (`check.discount.remove`) antes de pagar, restaurando el importe original de la cuenta.
- [x] C08 Arqueo de Caja (Corte X) calcula en vivo los fondos por medio de pago (Efectivo, Tarjeta, Yape) y efectivo esperado en gaveta.
- [x] C09 Ticket térmico de 80mm de Arqueo de Caja (Corte X) renderiza resumen financiero y soporta impresión real `@media print`.
- [x] C10 Cierre de Turno y Cierre del Día (Reporte Z) ofrecen impresión de comprobante térmico de 80mm para respaldo contable.
- [x] C11 Aislamiento de base de datos garantizado en pruebas efímeras sin alterar `qatupos_lab`.
