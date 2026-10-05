-- Additive migration: preserve existing commercial data, introduce fiscal series and fiscal documents.
UPDATE branch_state
SET state = jsonb_set(state, '{fiscal_documents}', '[]'::jsonb)
WHERE NOT state ? 'fiscal_documents';

CREATE TABLE IF NOT EXISTS fiscal_series (
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  doc_type varchar(20) NOT NULL,
  series varchar(10) NOT NULL,
  current_number integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, branch_id, doc_type),
  FOREIGN KEY (tenant_id, branch_id) REFERENCES branches(tenant_id, id) ON DELETE CASCADE
);

INSERT INTO fiscal_series (tenant_id, branch_id, doc_type, series, current_number)
SELECT tenant_id, id, 'boleta', 'B001', 0 FROM branches
ON CONFLICT (tenant_id, branch_id, doc_type) DO NOTHING;

INSERT INTO fiscal_series (tenant_id, branch_id, doc_type, series, current_number)
SELECT tenant_id, id, 'factura', 'F001', 0 FROM branches
ON CONFLICT (tenant_id, branch_id, doc_type) DO NOTHING;

CREATE TABLE IF NOT EXISTS fiscal_documents (
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  id uuid NOT NULL,
  check_id uuid NOT NULL,
  visit_id uuid NOT NULL,
  doc_type varchar(20) NOT NULL CHECK (doc_type IN ('boleta', 'factura')),
  series varchar(10) NOT NULL,
  number integer NOT NULL CHECK (number > 0),
  full_number varchar(30) NOT NULL,
  customer_doc_type varchar(20) NOT NULL CHECK (customer_doc_type IN ('dni', 'ruc', 'sin_documento')),
  customer_doc_number varchar(20),
  customer_name varchar(255) NOT NULL,
  customer_address varchar(255),
  currency varchar(3) NOT NULL DEFAULT 'PEN',
  op_gravada_minor integer NOT NULL CHECK (op_gravada_minor >= 0),
  igv_minor integer NOT NULL CHECK (igv_minor >= 0),
  total_minor integer NOT NULL CHECK (total_minor >= 0),
  digest_hash varchar(64) NOT NULL,
  qr_payload text NOT NULL,
  items jsonb NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'accepted_simulated',
  actor_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, branch_id, id),
  UNIQUE (tenant_id, branch_id, full_number),
  FOREIGN KEY (tenant_id, branch_id) REFERENCES branches(tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, branch_id, actor_id) REFERENCES staff_memberships(tenant_id, branch_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fiscal_docs_check ON fiscal_documents(tenant_id, branch_id, check_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_docs_visit ON fiscal_documents(tenant_id, branch_id, visit_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_docs_created ON fiscal_documents(tenant_id, branch_id, created_at DESC);
