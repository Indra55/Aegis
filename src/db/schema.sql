-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";




-- plans
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  burst_rps INTEGER NOT NULL,
  sustained_rpm INTEGER NOT NULL,
  monthly_quota BIGINT NOT NULL,
  enforcement_type TEXT NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT plans_enforcement_type_check
    CHECK (enforcement_type IN ('hard', 'soft'))
);


-- tenants
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  name TEXT NOT NULL,
  plan_id UUID NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT tenants_status_check
    CHECK (status IN ('active', 'suspended')),
  CONSTRAINT tenants_plan_id_fkey
    FOREIGN KEY (plan_id) REFERENCES plans(id)
);

CREATE INDEX idx_tenants_plan_id ON tenants(plan_id);


-- api_keys SHA-256
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  key_hash TEXT NOT NULL UNIQUE,
  tenant_id UUID NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITHOUT TIME ZONE,
  CONSTRAINT api_keys_status_check
    CHECK (status IN ('active', 'revoked')),
  CONSTRAINT api_keys_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_tenant_id ON api_keys(tenant_id);


-- monthly_usage
CREATE TABLE monthly_usage (
  tenant_id UUID NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  requests_used BIGINT NOT NULL DEFAULT 0,
  overage_requests BIGINT NOT NULL DEFAULT 0,
  recorded_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT monthly_usage_pkey
    PRIMARY KEY (tenant_id, year, month),
  CONSTRAINT monthly_usage_month_check
    CHECK (month >= 1 AND month <= 12),
  CONSTRAINT monthly_usage_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_monthly_usage_lookup
  ON monthly_usage(tenant_id, year, month);


-- request_logs
CREATE TABLE request_logs (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  tenant_id UUID NOT NULL,
  api_key_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  decision TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT request_logs_decision_check
    CHECK (decision IN ('allowed', 'blocked')),
  CONSTRAINT request_logs_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT request_logs_api_key_id_fkey
    FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
);

CREATE INDEX idx_request_logs_tenant_time
  ON request_logs(tenant_id, created_at);

