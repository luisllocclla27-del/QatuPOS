-- Additive migration 010: Credit Notes (Notas de Crédito Electrónicas BC01 / FC01)
-- Preserves existing operational data, adds series and reference columns for credit notes.

ALTER TABLE fiscal_documents DROP CONSTRAINT IF EXISTS fiscal_documents_doc_type_check;
ALTER TABLE fiscal_documents ADD CONSTRAINT fiscal_documents_doc_type_check
  CHECK (doc_type IN ('boleta', 'factura', 'nota_credito'));

ALTER TABLE fiscal_documents ADD COLUMN IF NOT EXISTS modified_document_id uuid;
ALTER TABLE fiscal_documents ADD COLUMN IF NOT EXISTS modified_document_full_number varchar(30);
ALTER TABLE fiscal_documents ADD COLUMN IF NOT EXISTS sunat_reason_code varchar(10);
ALTER TABLE fiscal_documents ADD COLUMN IF NOT EXISTS sunat_reason_description text;
ALTER TABLE fiscal_documents ADD COLUMN IF NOT EXISTS credit_note_id uuid;
ALTER TABLE fiscal_documents ADD COLUMN IF NOT EXISTS credit_note_full_number varchar(30);

INSERT INTO fiscal_series (tenant_id, branch_id, doc_type, series, current_number)
SELECT tenant_id, id, 'nota_credito_boleta', 'BC01', 0 FROM branches
ON CONFLICT (tenant_id, branch_id, doc_type) DO NOTHING;

INSERT INTO fiscal_series (tenant_id, branch_id, doc_type, series, current_number)
SELECT tenant_id, id, 'nota_credito_factura', 'FC01', 0 FROM branches
ON CONFLICT (tenant_id, branch_id, doc_type) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_fiscal_docs_modified ON fiscal_documents(tenant_id, branch_id, modified_document_id);
