// Aegis API Client - handles communication with backend

import type {
  Plan,
  Tenant,
  APIKey,
  RequestLog,
  BurstBucketState,
  RateWindowState,
  QuotaState,
  RedisStateSnapshot,
} from '@/types/aegis';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5555';

class AegisAPIClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[Aegis API] Error calling ${endpoint}:`, error);
      throw error;
    }
  }

  // Plans API
  async getPlans(): Promise<Plan[]> {
    return this.request<Plan[]>('/api/plans');
  }

  async getPlan(id: string): Promise<Plan> {
    return this.request<Plan>(`/api/plans/${id}`);
  }

  // Tenants API
  async getTenants(): Promise<Tenant[]> {
    return this.request<Tenant[]>('/api/tenants');
  }

  async getTenant(id: string): Promise<Tenant> {
    return this.request<Tenant>(`/api/tenants/${id}`);
  }

  async updateTenantStatus(
    id: string,
    status: 'active' | 'suspended'
  ): Promise<Tenant> {
    return this.request<Tenant>(`/api/tenants/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // API Keys API
  async getAPIKeys(tenantId?: string): Promise<APIKey[]> {
    const query = tenantId ? `?tenant_id=${tenantId}` : '';
    return this.request<APIKey[]>(`/api/api-keys${query}`);
  }

  async generateAPIKey(tenantId: string): Promise<APIKey> {
    return this.request<APIKey>('/api/api-keys', {
      method: 'POST',
      body: JSON.stringify({ tenant_id: tenantId }),
    });
  }

  async revokeAPIKey(keyId: string): Promise<APIKey> {
    return this.request<APIKey>(`/api/api-keys/${keyId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'revoked' }),
    });
  }

  // Request Logs API
  async getRequestLogs(filters?: {
    tenant_id?: string;
    decision?: 'allowed' | 'blocked';
    limit?: number;
    offset?: number;
  }): Promise<RequestLog[]> {
    const params = new URLSearchParams();
    if (filters?.tenant_id) params.append('tenant_id', filters.tenant_id);
    if (filters?.decision) params.append('decision', filters.decision);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<RequestLog[]>(`/api/request-logs${query}`);
  }

  // Real-time metrics
  async getBurstBucketState(tenantId: string): Promise<BurstBucketState> {
    return this.request<BurstBucketState>(
      `/api/metrics/burst-bucket/${tenantId}`
    );
  }

  async getRateWindowState(tenantId: string): Promise<RateWindowState> {
    return this.request<RateWindowState>(
      `/api/metrics/rate-window/${tenantId}`
    );
  }

  async getQuotaState(tenantId: string): Promise<QuotaState> {
    return this.request<QuotaState>(`/api/metrics/quota/${tenantId}`);
  }

  // Redis state introspection (debug panel)
  async getRedisState(): Promise<RedisStateSnapshot> {
    return this.request<RedisStateSnapshot>('/api/debug/redis-state');
  }

  async queryRedisKey(key: string): Promise<unknown> {
    return this.request<unknown>(`/api/debug/redis-key?key=${encodeURIComponent(key)}`);
  }

  // API Simulator / Tester
  async testRequest(apiKey: string): Promise<{
    status: number;
    body: unknown;
    rejectionStage?: string;
  }> {
    return this.request<{
      status: number;
      body: unknown;
      rejectionStage?: string;
    }>('/api/test/request', {
      method: 'POST',
      body: JSON.stringify({ api_key: apiKey }),
    });
  }

  async sendBurstRequests(apiKey: string, count: number): Promise<{
    results: Array<{
      status: number;
      rejectionStage?: string;
      timestamp: string;
    }>;
  }> {
    return this.request<{
      results: Array<{
        status: number;
        rejectionStage?: string;
        timestamp: string;
      }>;
    }>('/api/test/burst', {
      method: 'POST',
      body: JSON.stringify({ api_key: apiKey, count }),
    });
  }

  // Health check
  async health(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/health');
  }
}

export const aegisAPI = new AegisAPIClient();
export default aegisAPI;
