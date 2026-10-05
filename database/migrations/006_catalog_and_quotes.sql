-- Additive migration: preserve existing commercial data, introduce quote lifecycle and catalog audit.
UPDATE branch_state
SET state = jsonb_set(state, '{catalog_audit}', '[]'::jsonb)
WHERE NOT state ? 'catalog_audit';

CREATE TABLE IF NOT EXISTS order_quotes (
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  id uuid NOT NULL,
  visit_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  principal_kind text NOT NULL CHECK (principal_kind IN ('staff', 'guest')),
  guest_session_id uuid,
  total_minor integer NOT NULL CHECK (total_minor >= 0),
  lines jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, branch_id, id),
  FOREIGN KEY (tenant_id, branch_id) REFERENCES branches(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_quotes_expiry ON order_quotes(expires_at) WHERE consumed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_order_quotes_visit ON order_quotes(tenant_id, branch_id, visit_id);

CREATE TABLE IF NOT EXISTS catalog_audit (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  operation_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  product_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'update')),
  previous_version integer,
  new_version integer NOT NULL,
  changes jsonb NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, branch_id, id),
  FOREIGN KEY (tenant_id, branch_id) REFERENCES branches(tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, branch_id, actor_id) REFERENCES staff_memberships(tenant_id, branch_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_catalog_audit_product ON catalog_audit(tenant_id, branch_id, product_id);
