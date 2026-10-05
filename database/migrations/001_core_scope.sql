-- Local laboratory: authenticated scope + one serializable branch aggregate.
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY,
  name text NOT NULL
);
CREATE TABLE IF NOT EXISTS branches (
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  id uuid NOT NULL,
  name text NOT NULL,
  authority_mode text NOT NULL DEFAULT 'cloud' CHECK (authority_mode = 'cloud'),
  authority_epoch integer NOT NULL DEFAULT 1 CHECK (authority_epoch > 0),
  PRIMARY KEY(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS staff_memberships (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  username text NOT NULL UNIQUE,
  display_name text NOT NULL,
  role text NOT NULL CHECK(role IN ('waiter','cashier','kitchen','admin')),
  station text CHECK(station IN ('cocina','heladeria','caja')),
  password_salt text NOT NULL,
  password_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  UNIQUE(tenant_id,branch_id,id),
  FOREIGN KEY(tenant_id,branch_id) REFERENCES branches(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS staff_sessions (
  token_hash text PRIMARY KEY,
  csrf_token text NOT NULL,
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  staff_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  FOREIGN KEY(tenant_id,branch_id,staff_id) REFERENCES staff_memberships(tenant_id,branch_id,id)
);
CREATE TABLE IF NOT EXISTS branch_state (
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  version bigint NOT NULL DEFAULT 0 CHECK(version >= 0),
  state jsonb NOT NULL CHECK(jsonb_typeof(state) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(tenant_id,branch_id),
  FOREIGN KEY(tenant_id,branch_id) REFERENCES branches(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS command_operations (
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  operation_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  request_sha256 text NOT NULL CHECK(length(request_sha256)=64),
  command_type text NOT NULL,
  entity_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(tenant_id,branch_id,operation_id),
  FOREIGN KEY(tenant_id,branch_id) REFERENCES branches(tenant_id,id),
  FOREIGN KEY(tenant_id,branch_id,actor_id) REFERENCES staff_memberships(tenant_id,branch_id,id)
);
CREATE TABLE IF NOT EXISTS external_receipts (
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  method text NOT NULL CHECK(method IN ('card','yape')),
  merchant_account text NOT NULL,
  external_reference text NOT NULL,
  payment_id uuid NOT NULL,
  PRIMARY KEY(tenant_id,method,merchant_account,external_reference),
  FOREIGN KEY(tenant_id,branch_id) REFERENCES branches(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS outbox (
  sequence bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  operation_id uuid NOT NULL,
  type text NOT NULL,
  entity_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,branch_id,operation_id),
  FOREIGN KEY(tenant_id,branch_id,operation_id) REFERENCES command_operations(tenant_id,branch_id,operation_id)
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON staff_sessions(expires_at);
