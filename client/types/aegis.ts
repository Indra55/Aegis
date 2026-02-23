// Aegis API Gateway Types

export interface Plan {
  id: string; // UUIDv7
  burst_rps: number;
  sustained_rpm: number;
  monthly_quota: number;
  enforcement_type: 'hard' | 'soft';
  created_at: string;
}

export interface Tenant {
  id: string; // UUIDv7
  plan_id: string;
  status: 'active' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface APIKey {
  id: string; // UUIDv7
  tenant_id: string;
  key_hash: string; // SHA-256 hash
  status: 'active' | 'revoked';
  created_at: string;
  last_used_at: string | null;
  raw_key?: string; // Only shown once on creation
}

export interface RequestLog {
  id: string; // UUIDv7
  tenant_id: string;
  endpoint: string;
  decision: 'allowed' | 'blocked';
  reason?: string; // Which guardian rejected it
  rejection_type?: 401 | 404 | 429 | null;
  created_at: string;
}

export interface BurstBucketState {
  tenant_id: string;
  tokens: number;
  lastRefill: string; // ISO timestamp
  capacity: number;
  refill_rate: number; // tokens per second
}

export interface RateWindowState {
  tenant_id: string;
  curr: number; // Current window count
  prev: number; // Previous window overlap
  windowStart: string; // ISO timestamp
  capacity: number; // plan.sustained_rpm
}

export interface QuotaState {
  tenant_id: string;
  count: number;
  month: string; // YYYY-MM format
  quota: number; // plan.monthlyQuota
  enforcement_type: 'hard' | 'soft';
}

export interface RequestPipeline {
  stage: 'Auth Keeper' | 'Plan Oracle' | 'Burst Breaker' | 'Rate Warden' | 'Quota Arbiter' | 'Success';
  status: 'passed' | 'blocked' | 'pending';
  rejectionType?: 401 | 404 | 429;
  rejectionReason?: string;
}

export interface AnimatedRequest {
  id: string;
  tenant_id: string;
  created_at: number; // timestamp
  currentStage: number; // 0-5
  status: 'in-flight' | 'success' | 'failed';
  rejectionType?: 401 | 404 | 429;
  rejectionReason?: string;
  path: 'burst' | 'rate' | 'quota' | 'success'; // Which stage failed
}

export interface TenantMetrics {
  tenant: Tenant;
  plan: Plan;
  burst: BurstBucketState;
  rate: RateWindowState;
  quota: QuotaState;
  utilizationPercentages: {
    burst: number;
    rate: number;
    quota: number;
  };
}

export interface RedisStateSnapshot {
  apikey_caches: Record<string, unknown>[];
  tenant_plan_caches: Record<string, unknown>[];
  burst_buckets: Record<string, BurstBucketState>[];
  rate_windows: Record<string, RateWindowState>[];
  quota_counters: Record<string, QuotaState>[];
}

export type MockData = {
  plans: Plan[];
  tenants: Tenant[];
  apiKeys: APIKey[];
  requestLogs: RequestLog[];
  animatedRequests: AnimatedRequest[];
};
