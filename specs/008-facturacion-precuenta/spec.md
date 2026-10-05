# Feature Specification: Pre-cuenta de Mesa, Comprobantes de Pago Electrónicos SUNAT y Tickets Térmicos

**Feature ID**: `008-facturacion-precuenta` · Sin rama nueva. **Created**: 2026-10-02. **Status**: especificación formalizada; lista para implementación.

**Input**: El personal de salón (mozos) y de caja consulta e imprime la Pre-cuenta de mesa con desglose tributario y leyenda de control; asimismo, Caja o Administración emite comprobantes de pago electrónicos homologados SUNAT (Boletas B001 y Facturas F001) con cálculo exacto de IGV 18%, código QR estándar, digest hash SHA-256 UBL 2.1 y visualizador de tickets térmicos de 80mm en entorno de laboratorio.

---

## User Scenarios & Testing

### US1 — Mozo o Caja visualiza e imprime la Pre-cuenta de Mesa (P1)
Un comensal pide "la cuenta" en la mesa antes de pagar. El mozo (o el cajero) hace clic en "Pre-cuenta" de la mesa activa:
- Se muestra un modal con el formato de ticket térmico de 80mm rotulado:
  `PRE-CUENTA / CUENTA DE CONSUMO - NO ES COMPROBANTE DE PAGO`.
- Muestra el listado de todas las tandas y platos pedidos (excluyendo o deduciendo cantidades anuladas).
- Muestra el subtotal de consumo, desglose referencial de Op. Gravada (S/ XX.XX) e IGV 18% (S/ XX.XX), y el Total general a pagar (S/ XX.XX).
- Dispone de botón "Imprimir Ticket" que formatea la salida para ticketeras térmicas estándar.

**Independent Test**: La pre-cuenta refleja exactamente el total pendiente de la cuenta, desglosa el IGV al 18% sin alterar la versión de la cuenta ni generar un registro fiscal.

### US2 — Emisión de Boleta de Venta Electrónica Serie B001 (P1)
Al momento de cobrar o con la cuenta cobrada, el cajero selecciona "Emitir Boleta":
- Para montos hasta S/ 700.00: permite emitir a "CLIENTES VARIOS" (`sin_documento`) o ingresar DNI del cliente (8 dígitos).
- Para montos superiores a S/ 700.00: el sistema exige obligatoriamente DNI (8 dígitos) y nombre completo conforme a la normativa SUNAT.
- El servidor asigna correlativo atómico `B001-XXXXXXXX`, calcula base imponible e IGV en enteros céntimos PEN (`MoneyMinor`), genera el Hash SHA-256 UBL 2.1 y la trama oficial del código QR SUNAT.
- La cuenta pasa su estado fiscal a `fiscal_status: 'issued'`.
- La boleta queda registrada inmutablemente en `fiscal_documents`.

**Independent Test**: Emisión de boleta para cuenta de S/ 70.00 genera `B001-00000001`, `op_gravada_minor: 5932` (S/ 59.32), `igv_minor: 1068` (S/ 10.68), total `7000` (S/ 70.00), hash SHA-256 y trama QR conforme a la norma SUNAT.

### US3 — Emisión de Factura Electrónica Serie F001 con RUC (P1)
Un cliente de empresa solicita Factura para su consumo:
- El cajero selecciona "Emitir Factura".
- El sistema exige de manera estricta:
  - Tipo de documento: RUC.
  - Número de RUC: exactamente 11 dígitos numéricos comenzando con '10' o '20'.
  - Razón Social: obligatoria (mínimo 3 caracteres).
  - Dirección fiscal (opcional).
- Si el cajero ingresa un RUC inválido (ej. 10 dígitos o empezando con 15) o no ingresa Razón Social, el comando se rechaza con `VALIDATION_ERROR`.
- El servidor emite correlativo secuencial `F001-XXXXXXXX` con desglose tributario exacto y trama QR.

**Independent Test**: Emisión de factura con RUC `20601234567` y razón social "CORPORACION GASTRONOMICA SAC" genera `F001-00000001`, vinculada a la cuenta y visita.

### US4 — Prevención de Doble Emisión Fiscal (P1)
Si un cajero o proceso intenta emitir una segunda Boleta o Factura para una cuenta que ya tiene comprobante fiscal emitido:
- El servidor bloquea la solicitud y retorna código de error `ALREADY_ISSUED`.
- No se incrementa el correlativo ni se altera la base fiscal.

**Independent Test**: Intentar emitir una factura sobre una cuenta con boleta emitida es rechazado con error `ALREADY_ISSUED`.

### US5 — Visor de Tickets Térmicos 80mm y Reimpresión (P1)
El personal de caja y mozo cuenta con un visor de ticket térmico que emula fielmente una ticketera de 80mm:
- Cabecera con datos fiscales del restaurante: "CEVICHERÍA EL ENCANTO HUAMANGUINO E.I.R.L.", RUC, dirección en Ayacucho.
- Tipografía monoespaciada/térmica limpia, líneas divisorias punteadas.
- Código QR interactivo renderizado.
- Leyenda legal oficial SUNAT y rótulo explícito de simulación de laboratorio.
- Historial en Caja donde se pueden consultar todos los comprobantes emitidos en el turno y reimprimirlos en cualquier momento.

---

## Edge Cases

1. **RUC inválido**: Menos o más de 11 dígitos, o que no comience con 10 o 20 -> Rechazo `VALIDATION_ERROR`.
2. **Boleta > S/ 700 sin DNI**: Rechazo `VALIDATION_ERROR` con mensaje exigiendo identificación del cliente.
3. **Cálculo de IGV sin pérdidas de céntimos**: En cualquier monto, la suma de `op_gravada_minor` + `igv_minor` debe ser idénticamente igual a `total_minor`.
4. **Reintento Idempotente**: Un reintento con el mismo `operation_id` devuelve el comprobante ya emitido sin consumir un nuevo correlativo de serie.
5. **Comprobante para cuenta sin ítems o en cero**: Si la cuenta no tiene consumos (`total_minor <= 0`), la emisión es rechazada con `VALIDATION_ERROR`.

---

## Requirements

- **FIS-FR-001**: Pre-cuenta disponible para consulta e impresión en mesas abiertas sin alterar estados fiscales.
- **FIS-FR-002**: Emisión de comprobantes permitida exclusivamente para roles `cashier` y `admin`.
- **FIS-FR-003**: Serie `B001` para Boletas y `F001` para Facturas con correlativo autoincremental atómico bajo bloqueo de base de datos.
- **FIS-FR-004**: Validación de reglas peruanas: RUC 11 dígitos para Facturas, DNI 8 dígitos obligatorio para Boletas > S/ 700.00.
- **FIS-FR-005**: Desglose tributario exacto en enteros `MoneyMinor`: `total_minor = op_gravada_minor + igv_minor` (tasa 18%).
- **FIS-FR-006**: Generación de digest hash SHA-256 UBL 2.1 y trama oficial QR conforme a estándares SUNAT.
- **FIS-FR-007**: Bloqueo de duplicidad fiscal (`ALREADY_ISSUED`) si la cuenta ya tiene comprobante emitido.
- **FIS-FR-008**: Almacenamiento inmutable en tabla `fiscal_documents` con snapshot congelado de los ítems vendidos.
- **FIS-FR-009**: Visor de ticket térmico de 80mm con estilos de impresión `@media print` y renderizado de QR.
- **FIS-FR-010**: Rotulación visible en UI y tickets identificando la capacidad como entorno de laboratorio simulado.
