-- Additive migration: preserve existing commercial data, introduce discount audit and check discount tracking.
UPDATE branch_state
SET state = jsonb_set(state, '{discount_audit}', '[]'::jsonb)
WHERE NOT state ? 'discount_audit';

-- Ensure all checks in branch_state have discount_minor initialized to 0
UPDATE branch_state
SET state = jsonb_set(
  state,
  '{checks}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN elem ? 'discount_minor' THEN elem
        ELSE elem || '{"discount_minor": 0}'::jsonb
      END
    )
    FROM jsonb_array_elements(state->'checks') AS elem
  )
)
WHERE state ? 'checks' AND jsonb_array_length(state->'checks') > 0;

CREATE TABLE IF NOT EXISTS check_discount_audit (
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  id uuid NOT NULL,
  check_id uuid NOT NULL,
  visit_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  operation_id uuid NOT NULL,
  discount_minor integer NOT NULL CHECK (discount_minor >= 0),
  discount_kind varchar(20) NOT NULL CHECK (discount_kind IN ('percentage', 'fixed')),
  discount_percent integer CHECK (discount_percent IS NULL OR (discount_percent >= 1 AND discount_percent <= 100)),
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, branch_id, id),
  FOREIGN KEY (tenant_id, branch_id) REFERENCES branches(tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, branch_id, actor_id) REFERENCES staff_memberships(tenant_id, branch_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_discount_audit_check ON check_discount_audit(tenant_id, branch_id, check_id);
CREATE INDEX IF NOT EXISTS idx_discount_audit_visit ON check_discount_audit(tenant_id, branch_id, visit_id);
CREATE INDEX IF NOT EXISTS idx_discount_audit_created ON check_discount_audit(tenant_id, branch_id, created_at DESC);
