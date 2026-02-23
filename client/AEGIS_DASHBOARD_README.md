# Aegis API Gateway - Real-Time Visualization Dashboard

A comprehensive real-time visualization dashboard for the Aegis API Gateway system, featuring live request pipeline visualization, tenant metrics monitoring, and complete API key management.

## Overview

The Aegis Dashboard provides deep visibility into your API gateway's 5-stage middleware pipeline with animated request flow visualization, per-tenant metrics, and debugging tools.

**Access the dashboard:** `/aegis`

## Architecture

### Core Components

#### 1. **Request Pipeline Visualization** (`/components/aegis/request-pipeline.tsx`)
- Displays the 5-stage middleware flow:
  1. **Auth Keeper** - API key validation (401 errors)
  2. **Plan Oracle** - Plan lookup and tenant verification (404 errors)
  3. **Burst Breaker** - Burst rate limiting (429 burst errors)
  4. **Rate Warden** - Sustained rate limiting (429 rate errors)
  5. **Quota Arbiter** - Monthly quota enforcement (429 quota errors)

- **Features:**
  - Animated request particles flowing through stages
  - Real-time rejection visualization
  - Success/failure exit paths
  - Error type categorization

**Files:**
- Component: `/components/aegis/request-pipeline.tsx`
- Type: `AnimatedRequest`

#### 2. **Per-Tenant Metrics Panel** (`/components/aegis/tenant-metrics.tsx`)
- Real-time monitoring for individual tenants

**Metrics Tracked:**

| Metric | Source | Update Rate | Purpose |
|--------|--------|------------|---------|
| Burst Bucket | Redis: `burst_bucket:{tenant_id}` | Real-time | Token bucket state with automatic refill |
| Rate Window | Redis: `sustained_window:{tenant_id}` | Real-time | Sliding 60-second window tracking |
| Quota | Redis: `quota:{tenant_id}:{YYYY-MM}` | Real-time | Monthly usage counter |

**Features:**
- Visual progress bars for each metric
- Color-coded utilization (green < 50%, yellow 50-80%, red > 80%)
- Plan details reference
- Automatic token refill simulation

**Files:**
- Component: `/components/aegis/tenant-metrics.tsx`
- Types: `BurstBucketState`, `RateWindowState`, `QuotaState`

#### 3. **Multi-Tenant Overview** (`/components/aegis/tenant-overview.tsx`)
- Dashboard showing all tenants with their utilization metrics
- Click to drill down into detailed metrics

**Features:**
- Status indicators (active/suspended)
- Plan information display
- Mini utilization bars for burst/rate/quota
- Clickable rows for detailed view

**Files:**
- Component: `/components/aegis/tenant-overview.tsx`
- Related: `/components/aegis/tenant-metrics.tsx`

#### 4. **Request Logs Stream** (`/components/aegis/request-logs.tsx`)
- Real-time feed of all API requests

**Log Fields:**
- Timestamp (created_at)
- Tenant ID
- Endpoint hit
- Decision (allowed/blocked)
- Rejection reason and type

**Features:**
- Filterable by tenant, decision type, endpoint
- Color-coded status badges
- Rejection type indicators (401, 404, 429)
- Scrollable feed

**Files:**
- Component: `/components/aegis/request-logs.tsx`
- Type: `RequestLog`

#### 5. **Plan Management View** (`/components/aegis/plans-view.tsx`)
- Display all available plans with their specifications

**Plan Fields:**
- Burst RPS (requests per second)
- Sustained RPM (requests per minute)
- Monthly Quota
- Enforcement Type (hard blocking vs soft logging)
- Associated tenant count

**Files:**
- Component: `/components/aegis/plans-view.tsx`
- Type: `Plan`

#### 6. **API Key Management** (`/components/aegis/api-keys-view.tsx`)
- Complete API key lifecycle management

**Features:**
- Display key ID, tenant association, and status
- Show/hide raw key (displayed once on creation)
- Copy key to clipboard
- Revoke active keys
- Display creation and last-used timestamps
- Encrypted key hash storage

**Files:**
- Component: `/components/aegis/api-keys-view.tsx`
- Type: `APIKey`

#### 7. **Debug Tools** (`/components/aegis/debug-tools.tsx`)
- Two tabs for development and troubleshooting

**Redis Inspector Tab:**
- Query Redis key patterns
- Pre-built examples:
  - `apikey:*` - All API key caches (TTL: 600s)
  - `tenant:plan:*` - All plan caches (TTL: 300s)
  - `burst_bucket:tenant-*` - Token bucket states
  - `sustained_window:tenant-*` - Rate window states
  - `quota:*:2024-01` - Monthly quota counters
- View raw JSON responses

**API Simulator Tab:**
- Single request testing with API key
- Burst testing (send N requests rapidly)
- Inspect responses and rejection stages
- Useful for testing rate limits and quota behavior

**Files:**
- Component: `/components/aegis/debug-tools.tsx`
- API Methods: `testRequest()`, `sendBurstRequests()`, `queryRedisKey()`

### Data Flow

```
[API Request] → [Auth Keeper] → [Plan Oracle] → [Burst Breaker] → [Rate Warden] → [Quota Arbiter] → [Success/Rejection]
        ↓              ↓               ↓               ↓               ↓               ↓
      Logs         Request       Request         Redis           Redis            Request
    Recorded       Animated      Animated        Updated         Updated          Logged
```

### Type System

**Core Types** (`/types/aegis.ts`):
- `Plan` - Rate limit plan configuration
- `Tenant` - API tenant with plan assignment
- `APIKey` - API key with tenant relationship
- `RequestLog` - Individual request record
- `BurstBucketState` - Token bucket state
- `RateWindowState` - Sliding window state
- `QuotaState` - Monthly quota tracking
- `AnimatedRequest` - Request particle for pipeline animation
- `TenantMetrics` - Complete tenant metrics snapshot

## API Client

The dashboard uses a typed API client (`/lib/aegis-api.ts`) with methods for:

```typescript
// Plans
getPlans(): Promise<Plan[]>
getPlan(id: string): Promise<Plan>

// Tenants
getTenants(): Promise<Tenant[]>
getTenant(id: string): Promise<Tenant>
updateTenantStatus(id: string, status: 'active' | 'suspended'): Promise<Tenant>

// API Keys
getAPIKeys(tenantId?: string): Promise<APIKey[]>
generateAPIKey(tenantId: string): Promise<APIKey>
revokeAPIKey(keyId: string): Promise<APIKey>

// Request Logs
getRequestLogs(filters?: {...}): Promise<RequestLog[]>

// Metrics
getBurstBucketState(tenantId: string): Promise<BurstBucketState>
getRateWindowState(tenantId: string): Promise<RateWindowState>
getQuotaState(tenantId: string): Promise<QuotaState>

// Debug
getRedisState(): Promise<RedisStateSnapshot>
queryRedisKey(key: string): Promise<unknown>

// Testing
testRequest(apiKey: string): Promise<{...}>
sendBurstRequests(apiKey: string, count: number): Promise<{...}>

// Health
health(): Promise<{ status: string }>
```

## Backend Integration

The dashboard expects the following backend endpoints:

### REST API Endpoints

```
GET  /health                              - Health check
GET  /api/plans                          - List all plans
GET  /api/plans/:id                      - Get plan by ID
GET  /api/tenants                        - List all tenants
GET  /api/tenants/:id                    - Get tenant by ID
PATCH /api/tenants/:id                   - Update tenant status
GET  /api/api-keys                       - List API keys
POST /api/api-keys                       - Generate new API key
PATCH /api/api-keys/:id                  - Revoke API key
GET  /api/request-logs                   - Get request logs with filters
GET  /api/metrics/burst-bucket/:tenantId - Get burst bucket state
GET  /api/metrics/rate-window/:tenantId  - Get rate window state
GET  /api/metrics/quota/:tenantId        - Get quota state
GET  /api/debug/redis-state              - Get all Redis keys snapshot
GET  /api/debug/redis-key                - Query specific Redis key
POST /api/test/request                   - Send test request
POST /api/test/burst                     - Send burst of requests
```

### Redis Keys

The dashboard monitors these Redis keys:

| Key Pattern | Type | TTL | Purpose |
|------------|------|-----|---------|
| `apikey:{key_hash}` | Hash | 600s | Cached tenant context |
| `tenant:plan:{tenant_id}` | Hash | 300s | Cached plan details |
| `burst_bucket:{tenant_id}` | Hash | Infinite | Token bucket state (tokens, lastRefill) |
| `sustained_window:{tenant_id}` | Hash | Infinite | Sliding window (curr, prev, windowStart) |
| `quota:{tenant_id}:{YYYY-MM}` | Integer | Month-end | Monthly request count |

## Error Codes Visualization

The pipeline displays rejection types with specific colors:

| Code | Stage | Meaning | Color |
|------|-------|---------|-------|
| 401 | Auth Keeper | Missing/invalid API key | Blue |
| 404 | Plan Oracle | Tenant not found or suspended | Gray |
| 429 burst | Burst Breaker | Burst rate limit exceeded | Pink |
| 429 rate | Rate Warden | Sustained rate limit exceeded | Orange |
| 429 quota | Quota Arbiter | Monthly quota exceeded | Red |
| 200 | Success | Request allowed | Green |

## Usage Examples

### Connect to Real Backend

Update environment variables:
```env
NEXT_PUBLIC_API_BASE=https://your-api.example.com
```

### Monitoring Strategies

1. **Real-time Pipeline View**: Watch request flow and identify bottlenecks
2. **Tenant Drill-Down**: Click tenant to see detailed metrics
3. **Log Filtering**: Find specific request patterns
4. **Burst Testing**: Use debug tools to test rate limiting

### Debugging Tips

1. Use Redis Inspector to check cache state
2. Monitor burst bucket tokens for refill timing
3. Check sliding window behavior during traffic spikes
4. Review rejection patterns in logs

## Performance Considerations

- **Animation Update Rate**: 800ms per stage (configurable)
- **Token Refill**: Simulated at 1-second intervals
- **Window Sliding**: 60-second sliding window checks
- **Log Filtering**: Client-side filtering (optimize if > 10k logs)

## Customization

### Change Animation Speed
Edit `/components/aegis/request-pipeline.tsx`:
```typescript
const interval = setInterval(() => {
  // Change 800 to desired milliseconds
}, 800);
```

### Add Custom Metrics
1. Define type in `/types/aegis.ts`
2. Create component in `/components/aegis/`
3. Add to main dashboard page `/app/aegis/page.tsx`

### Extend Tenant Details
Modify `TenantMetrics` component to add custom fields based on API response.

## Files Structure

```
/
├── app/aegis/page.tsx                  # Main dashboard page
├── components/aegis/
│   ├── request-pipeline.tsx            # 5-stage pipeline visualization
│   ├── tenant-metrics.tsx              # Per-tenant metrics
│   ├── tenant-overview.tsx             # Multi-tenant list
│   ├── request-logs.tsx                # Request log stream
│   ├── plans-view.tsx                  # Plan management
│   ├── api-keys-view.tsx               # API key management
│   └── debug-tools.tsx                 # Redis inspector + API tester
├── lib/
│   └── aegis-api.ts                    # Typed API client
├── types/
│   └── aegis.ts                        # TypeScript types
└── data/
    └── aegis-mock.ts                   # Mock data for development
```

## Development

### Mock Data
The dashboard includes comprehensive mock data in `/data/aegis-mock.ts` for development without a backend.

### Replace with Real Data
Update `/app/aegis/page.tsx` to fetch real data:
```typescript
const { data: tenants } = await aegisAPI.getTenants();
const { data: plans } = await aegisAPI.getPlans();
// ... etc
```

## Future Enhancements

- WebSocket support for true real-time updates
- Custom alerting for quota/rate limit thresholds
- Historical analytics and trends
- Tenant quota adjustments UI
- API key rotation scheduling
- Export logs to CSV/JSON
- Dashboard customization preferences

## Support

For issues or feature requests, refer to the main project documentation or create an issue in the repository.
