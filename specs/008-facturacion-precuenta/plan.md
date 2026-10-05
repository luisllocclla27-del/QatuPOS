# Plan de Implementación: Pre-cuenta y Comprobantes Electrónicos SUNAT

**Feature ID**: `008-facturacion-precuenta` · **Fecha**: 2026-10-02

## 1. Contratos y Tipos (`packages/contracts/src/pos.ts`, `docs/contracts/pilot.openapi.json`)
- Tipo `FiscalDocType`: `'boleta' | 'factura'`.
- Tipo `CustomerDocType`: `'dni' | 'ruc' | 'sin_documento'`.
- Interfaz `FiscalDocument`:
  - `id: UUID; check_id: UUID; visit_id: UUID; doc_type: FiscalDocType; series: string; number: number; full_number: string; customer_doc_type: CustomerDocType; customer_doc_number: string | null; customer_name: string; customer_address: string | null; currency: 'PEN'; op_gravada_minor: MoneyMinor; igv_minor: MoneyMinor; total_minor: MoneyMinor; digest_hash: string; qr_payload: string; items: { product_name: string; quantity: number; unit_price_minor: MoneyMinor; subtotal_minor: MoneyMinor }[]; status: 'accepted_simulated'; actor_id: UUID; created_at: string`.
- Interfaz `FiscalDocumentIssueCommand`:
  - `type: 'fiscal.document.issue'; check_id: UUID; expected_check_version: number; doc_type: FiscalDocType; customer_doc_type: CustomerDocType; customer_doc_number?: string; customer_name: string; customer_address?: string`.
- Actualización de `Check.fiscal_status`: `'pending' | 'issued'`.
- Actualización de `PosSnapshot`: agregar `fiscal_documents: FiscalDocument[]`.
- Código de error `PosErrorCode`: agregar `'ALREADY_ISSUED'`.

## 2. Base de Datos y Migración (`database/migrations/008_fiscal_documents.sql`)
- Tabla `fiscal_series`:
  - `doc_type VARCHAR(20) PRIMARY KEY`
  - `series VARCHAR(10) NOT NULL`
  - `current_number INT NOT NULL DEFAULT 0`
  - Valores iniciales: `('boleta', 'B001', 0)`, `('factura', 'F001', 0)`.
- Tabla `fiscal_documents`:
  - Inserción con FK a `checks` y `table_visits`.
  - Campo `full_number` único.
  - Almacenamiento JSONB de ítems.
- Actualización de `tests/support/database.ts` para truncar `fiscal_documents` en tests.

## 3. Dominio y Reglas Puras (`packages/domain/src/index.ts`)
- Handler `fiscal.document.issue`:
  - Control de rol: solo `cashier` y `admin`.
  - Validación de Check: debe existir, `fiscal_status` no debe ser `'issued'` (de lo contrario `ALREADY_ISSUED`), `total_minor` debe ser > 0.
  - Validación de campos según tipo:
    - `factura`: `customer_doc_type === 'ruc'`, 11 dígitos, comienza con '10' o '20', nombre >= 3 caracteres.
    - `boleta`: si `total_minor > 70000`, `customer_doc_type === 'dni'`, 8 dígitos numéricos, nombre >= 3 caracteres. Si <= S/ 700, permite `'sin_documento'` ("CLIENTES VARIOS").
  - Aritmética exacta de IGV 18%:
    - `op_gravada_minor = Math.round((check.total_minor * 100) / 118)`
    - `igv_minor = check.total_minor - op_gravada_minor`
  - Trama QR oficial SUNAT y digest hash SHA-256.
  - Generación del documento y transición de `check.fiscal_status = 'issued'`.

## 4. Persistencia Transaccional (`services/commerce/src/authority/repository.ts`)
- Bloqueo transaccional de la serie en `fiscal_series` (`SELECT current_number FROM fiscal_series WHERE doc_type = $1 FOR UPDATE`).
- Incremento de correlativo y asignación formateada a 8 dígitos (ej. `B001-00000001`).
- Inserción atómica en `fiscal_documents` y actualización de `checks.fiscal_status`.
- Inclusión de `fiscal_documents` en el snapshot global de la autoridad.

## 5. Frontend POS (`apps/pos`)
- Modal de Pre-cuenta en pantalla de Mesas y Caja.
- Modal de Emisión Fiscal en Caja:
  - Selector de Boleta o Factura.
  - Formulario reactivo con validaciones en tiempo real para DNI y RUC.
- Componente de Ticket Térmico 80mm (`ThermalReceiptModal`):
  - Formato ticket de 80mm limpio y profesional.
  - Renderizado de QR y Hash SHA-256.
  - Botón de imprimir (`window.print()`) con CSS optimizado para impresión térmica.
- Pestaña / Sección "Comprobantes" en Caja para listar y reimprimir comprobantes emitidos.

## 6. Pruebas y Verificación
- Pruebas unitarias y de dominio (cálculos de IGV, validación RUC/DNI, prevención de duplicidad, roles).
- Pruebas de integración API/PostgreSQL.
- Escenario E2E con Playwright: emisión de boleta, validación de comprobante, ticket térmico y consulta en historial.
- Ejecución completa de suites: `typecheck`, `test`, `test:e2e`, `build`, `validate:sdd`.
