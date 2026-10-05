-- Preserve existing business data; secrets live outside the aggregate and only hashes are indexed.
UPDATE branch_state SET state=jsonb_set(state,'{guest_accesses}','[]'::jsonb) WHERE NOT state ? 'guest_accesses';
CREATE TABLE guest_access_credentials (
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  id uuid NOT NULL,
  visit_id uuid NOT NULL,
  created_by uuid NOT NULL,
  code_hash text NOT NULL UNIQUE CHECK(length(code_hash)=64),
  state text NOT NULL CHECK(state IN ('active','settled','revoked')),
  PRIMARY KEY(tenant_id,branch_id,id),
  FOREIGN KEY(tenant_id,branch_id) REFERENCES branches(tenant_id,id),
  FOREIGN KEY(tenant_id,branch_id,created_by) REFERENCES staff_memberships(tenant_id,branch_id,id)
);
CREATE UNIQUE INDEX one_guest_key_per_visit ON guest_access_credentials(tenant_id,branch_id,visit_id) WHERE state='active';
CREATE TABLE guest_sessions (
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  id uuid NOT NULL,
  access_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE CHECK(length(token_hash)=64),
  csrf_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  PRIMARY KEY(tenant_id,branch_id,id),
  FOREIGN KEY(tenant_id,branch_id,access_id) REFERENCES guest_access_credentials(tenant_id,branch_id,id)
);
ALTER TABLE command_operations ADD COLUMN principal_kind text NOT NULL DEFAULT 'staff' CHECK(principal_kind IN ('staff','guest'));
ALTER TABLE command_operations ADD COLUMN guest_session_id uuid;
ALTER TABLE command_operations ADD CONSTRAINT operation_guest_principal CHECK((principal_kind='guest')=(guest_session_id IS NOT NULL));
ALTER TABLE command_operations ADD CONSTRAINT operation_guest_scope FOREIGN KEY(tenant_id,branch_id,guest_session_id) REFERENCES guest_sessions(tenant_id,branch_id,id);
CREATE INDEX guest_session_expiry ON guest_sessions(expires_at);
