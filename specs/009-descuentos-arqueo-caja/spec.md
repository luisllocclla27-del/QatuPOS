# Feature Specification: Descuentos Comerciales, Cortesías de Salón y Arqueo / Reporte X de Caja

**Feature ID**: `009-descuentos-arqueo-caja` · **Fecha**: 2026-10-02 · **Piloto**: El Encanto Huamanguino

## 1. Contexto y Objetivos

En el servicio de salón de **El Encanto Huamanguino**, el personal de caja y administración requiere flexibilidad comercial y estricto control financiero:
1. **Descuentos Comerciales y Cortesías**: Aplicar descuentos porcentuales (ej. 10%, 15% por convenio corporativo, cliente frecuente o cumpleaños) o montos fijos (ej. S/ 15.00 de cortesía o compensación por demora), con recálculo atómico del balance y auditoría inmutable.
2. **Coherencia Tributaria y Pre-cuenta**: El descuento debe reflejarse en la Pre-cuenta de 80mm y en los comprobantes electrónicos SUNAT (Boletas B001 y Facturas F001), recalculando la base imponible y el IGV (18%) sobre el importe neto efectivamente facturado.
3. **Arqueo de Caja en Vivo (Corte X)**: Consulta instantánea en cualquier momento del turno activo sin cerrar la caja, visualizando ingresos por medio de pago (Efectivo, Tarjeta, Yape), efectivo esperado en gaveta, documentos fiscales emitidos y saldo pendiente en mesas, con capacidad de imprimir el Ticket Térmico de 80mm del Corte X.
4. **Ticket Térmico 80mm de Cierre de Turno y Día (Reporte Z)**: Impresión física en 80mm para arqueo y liquidación contable del turno y del día.

---

## 2. Requisitos Funcionales

- **DSC-FR-001: Descuento Comercial / Cortesía (`check.discount.apply`)**:
  - Restringido a roles `cashier` y `admin` (mozos y cocina reciben HTTP 403 `FORBIDDEN`).
  - Admite tipo `percentage` (1 a 100%) o `fixed` (en céntimos PEN `MoneyMinor`).
  - Motivo explicativo obligatorio (mínimo 3 caracteres).
  - Control de saldo: no permite descuentos mayores al consumo bruto ni que superen el saldo pendiente por cobrar (`CHECK_BALANCE_EXCEEDED`).
  - Control de concurrencia optimista mediante `expected_version` de la cuenta `Check`.

- **DSC-FR-002: Remoción de Descuento (`check.discount.remove`)**:
  - Permite a `cashier` o `admin` retirar un descuento antes del cobro o emisión fiscal si hubo error de aplicación, restaurando el saldo bruto original.

- **DSC-FR-003: Auditoría Inmutable de Descuentos (`check_discount_audit`)**:
  - Persistencia atómica en PostgreSQL de cada aplicación o remoción con usuario, fecha, cuenta, visita, importe descontado, tipo, porcentaje y motivo.

- **DSC-FR-004: Pre-cuenta y Emisión Fiscal SUNAT con Descuento**:
  - La Pre-cuenta muestra claramente el subtotal de platos, el descuento aplicado (con motivo) y el total neto por cobrar.
  - La Boleta B001 y Factura F001 calculan la base imponible sobre el total neto: `op_gravada_minor = Math.round(total_minor / 1.18)`, `igv_minor = total_minor - op_gravada_minor`, garantizando que no se tribute sobre el descuento comercial otorgado.

- **DSC-FR-005: Arqueo y Reporte X de Caja en Vivo con Ticket Térmico 80mm**:
  - Agregación en tiempo real de la sesión de caja activa: fondo inicial, cobros por medio de pago (Efectivo, Tarjeta, Yape), movimientos de caja (entradas/salidas), efectivo esperado, total facturado en Boletas y Facturas, e importes retenidos/pendientes.
  - Modal interactivo de Arqueo en Caja con botón de impresión directa a ticket térmico de 80mm (`@media print`).

- **DSC-FR-006: Ticket Térmico 80mm para Cierre de Turno y Día (Reporte Z)**:
  - Formato térmico de 80mm para el reporte consolidado de cierre de turno y cierre final del día de negocio.

---

## 3. Criterios de Aceptación

- **DSC-AC-001**: Aplicar un descuento del 10% a una mesa con consumo de S/ 70.00 reduce el total a cobrar exactamente a S/ 63.00 (`discount_minor = 700`, `total_minor = 6300`), quedando registrado en auditoría.
- **DSC-AC-002**: Un mozo intentando aplicar un descuento recibe HTTP 403 `FORBIDDEN`.
- **DSC-AC-003**: No se permite aplicar un descuento que supere el saldo libre disponible (error `CHECK_BALANCE_EXCEEDED`).
- **DSC-AC-004**: La Pre-cuenta impresa muestra el desglose del descuento y el nuevo total a pagar.
- **DSC-AC-005**: Al emitir Factura F001 sobre la cuenta con descuento, el total del comprobante es exactamente S/ 63.00, con base imponible S/ 53.39 e IGV S/ 9.61.
- **DSC-AC-006**: El panel de Caja dispone del botón "Arqueo de Caja (Corte X)", abre el modal de resumen financiero y renderiza el ticket térmico de 80mm listo para imprimir.
