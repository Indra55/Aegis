CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- plans
CREATE TABLE plans (
  id UUID PRIMARY KEY,
  burst_rps INTEGER NOT NULL,
  sustained_rpm INTEGER NOT NULL,
  monthly_quota BIGINT NOT NULL,
  enforcement_type TEXT NOT NULL
    CHECK (enforcement_type IN ('hard', 'soft')),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);


-- tenants
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  plan_id UUID NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL
    CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_plan_id ON tenants(plan_id);


-- api_keys
CREATE TABLE api_keys (
  id UUID PRIMARY KEY,
  key_hash TEXT NOT NULL UNIQUE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  status TEXT NOT NULL
    CHECK (status IN ('active', 'revoked')),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP
);

CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_tenant_id ON api_keys(tenant_id);


-- monthly_usage
CREATE TABLE monthly_usage (
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  requests_used BIGINT NOT NULL DEFAULT 0,
  overage_requests BIGINT NOT NULL DEFAULT 0,
  recorded_at TIMESTAMP NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, year, month)
);

CREATE INDEX idx_monthly_usage_lookup
  ON monthly_usage(tenant_id, year, month);


-- request_logs (optional)
CREATE TABLE request_logs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  api_key_id UUID NOT NULL REFERENCES api_keys(id),
  endpoint TEXT NOT NULL,
  decision TEXT NOT NULL
    CHECK (decision IN ('allowed', 'blocked')),
  reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_request_logs_tenant_time
  ON request_logs(tenant_id, created_at);

