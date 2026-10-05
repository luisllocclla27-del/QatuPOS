# Checklist de Verificación: Notas de Crédito Electrónicas SUNAT (BC01 / FC01)

**Feature**: `010-notas-credito-sunat` · **Piloto**: El Encanto Huamanguino

## 1. Contratos y Tipos
- [x] `FiscalDocType` incluye `'nota_credito'`.
- [x] `SunatCreditReasonCode` define motivos SUNAT: `'01' | '02' | '03' | '06' | '07'`.
- [x] `FiscalCreditNoteIssueCommand` tipado con `document_id`, `reason_code`, `reason_description`.
- [x] `FiscalDocument` incluye campos de referencia: `modified_document_id`, `modified_document_full_number`, `sunat_reason_code`, `sunat_reason_description`.

## 2. Base de Datos y Persistencia
- [x] Migración `010_credit_notes.sql` crea series `BC01` y `FC01` en `fiscal_series`.
- [x] `fiscal_documents` admite `doc_type = 'nota_credito'` y contiene columnas de referencia al documento original.
- [x] Asignación atómica de número secuencial con `FOR UPDATE`.
- [x] Preservación estricta de base `qatupos_lab` (solo pruebas en `qatupos_lab_test_*`).

## 3. Lógica de Dominio
- [x] Solo `cashier` y `admin` pueden emitir Nota de Crédito. Mozos y cocina reciben HTTP 403 `FORBIDDEN`.
- [x] Serie automática: `BC01` si original es Boleta, `FC01` si original es Factura.
- [x] Cálculo exacto de op_gravada e IGV (18%) en céntimos enteros PEN (`MoneyMinor`).
- [x] Generación oficial de hash SHA-256 Base64 y QR legal SUNAT con código de tipo `07`.
- [x] Bloqueo con `ALREADY_ANNULLED` si se intenta volver a anular un documento ya anulado.

## 4. Frontend y Experiencia de Usuario
- [x] Modal interactivo `issue-credit-note-modal.tsx` con selección de motivos y advertencia legal.
- [x] Modal de ticket térmico 80mm adaptado para Nota de Crédito con referencias explícitas.
- [x] Panel de Caja muestra estado de anulación y Notas de Crédito emitidas.
- [x] Arqueo de Caja (Corte X) deduce Notas de Crédito para mostrar Ventas Netas del turno.

## 5. Pruebas y Acreditación
- [x] Pruebas unitarias de contratos y dominio pasando al 100%.
- [x] Pruebas de integración PostgreSQL pasando al 100%.
- [x] Pruebas E2E en Playwright pasando al 100% con capturas de evidencia.
- [x] `pnpm typecheck`, `pnpm build` y `pnpm validate:sdd` sin errores ni alertas.
