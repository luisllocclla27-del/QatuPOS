-- Additive migration: preserve existing commercial data, introduce void audit.
UPDATE branch_state
SET state = jsonb_set(state, '{void_audit}', '[]'::jsonb)
WHERE NOT state ? 'void_audit';

CREATE TABLE IF NOT EXISTS order_void_audit (
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  id uuid NOT NULL,
  operation_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  visit_id uuid NOT NULL,
  order_id uuid NOT NULL,
  line_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  amount_minor integer NOT NULL CHECK (amount_minor >= 0),
  restored_stock boolean NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, branch_id, id),
  FOREIGN KEY (tenant_id, branch_id) REFERENCES branches(tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, branch_id, actor_id) REFERENCES staff_memberships(tenant_id, branch_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_void_audit_visit ON order_void_audit(tenant_id, branch_id, visit_id);
CREATE INDEX IF NOT EXISTS idx_order_void_audit_line ON order_void_audit(tenant_id, branch_id, line_id);
