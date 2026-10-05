-- Private schema is selected by the cloud installer; local legacy uses public.
CREATE TABLE security_attempts (
  scope text NOT NULL CHECK(scope IN ('staff-login','guest-login','staff-reauth')),
  key_hash text NOT NULL CHECK(key_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  attempts integer NOT NULL CHECK(attempts >= 0),
  PRIMARY KEY(scope,key_hash)
);
CREATE INDEX security_attempts_expiry ON security_attempts(window_started_at);
CREATE TABLE cloud_installation (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  project_ref text NOT NULL CHECK(project_ref ~ '^[a-z0-9]{20}$'),
  deployment_stage text NOT NULL CHECK(deployment_stage IN ('production','staging')),
  public_origin text NOT NULL,
  guest_key_hash text NOT NULL CHECK(guest_key_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
