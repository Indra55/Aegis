# Aegis

## Project Overview

Aegis is a high-performance API gateway middleware service designed to enforce granular traffic control policies for multi-tenant applications. It provides a robust layer for authentication, rate limiting, burst handling, and quota enforcement, ensuring system stability and fair resource allocation across different service tiers.

## Core Features

- **Multi-Tenant Architecture**: Native support for tenant isolation and plan-based resource allocation.
- **Secure Authentication**: API key validation using SHA-256 hashing for secure access control.
- **Burst Traffic Management**: Controls short-term traffic spikes (RPS) to prevent system overload.
- **Sustained Rate Limiting**: Enforces rolling window limits (RPM) using atomic Redis Lua scripts.
- **Quota Enforcement**: Tracks monthly usage with support for hard and soft limits.
- **Audit Logging**: Comprehensive logging of request decisions (allowed/blocked) for compliance and analytics.
- **Health Monitoring**: Built-in health check endpoints for infrastructure integration.

## System Architecture

Aegis operates as a middleware layer sitting between clients and upstream services. It leverages Redis for high-speed state management and PostgreSQL for persistent configuration and logging.

```mermaid
graph TD
    Client[Client] -->|HTTP Request| Gateway[Aegis Gateway Service]
    
    subgraph "Aegis Gateway Service"
        Auth[Auth Middleware]
        Plan[Plan Resolver]
        Burst[Burst Limiter]
        Rate[Rate Limiter]
        Quota[Quota Enforcer]
    end
    
    Gateway --> Auth
    Auth --> Plan
    Plan --> Burst
    Burst --> Rate
    Rate --> Quota
    
    Auth -.->|Read Key| DB[(PostgreSQL)]
    Plan -.->|Read Plan| DB
    Burst -.->|Check/Update| Redis[(Redis)]
    Rate -.->|Check/Update| Redis
    Quota -.->|Check/Update| DB
    
    Quota -->|Allowed| Upstream[Upstream Service]
    Quota -->|Blocked| Client
```

### Components

- **Gateway Service (Node.js/Express)**: Executes the middleware chain for each request.
- **Redis**: Stores ephemeral counters for burst and rate limiting to ensure low latency.
- **PostgreSQL**: Stores persistent data including tenants, API keys, plans, and usage logs.

## Data Flow

1.  **Incoming Request**: The client sends a request with an API key in the headers.
2.  **Authentication**: The `authMiddleware` hashes the provided key and verifies it against the `api_keys` table in PostgreSQL.
3.  **Context Resolution**: Upon successful auth, the `planResolver` retrieves the tenant's active plan details (limits, quotas).
4.  **Burst Check**: The `burstLimiter` executes a token bucket algorithm via a Redis Lua script. If the bucket is empty, the request is rejected immediately to handle traffic spikes.
5.  **Rate Check**: The `rateLimiter` executes a sliding window Lua script in Redis to verify the request count against the `sustained_rpm`.
6.  **Quota Verification**: The `quotaEnforcer` increments a monthly usage counter in Redis. If the usage exceeds the `monthly_quota` and the plan is `hard` enforced, the request is blocked.
7.  **Completion**: If all checks pass, the request is forwarded to the route handler. The decision is asynchronously logged to `request_logs`.

## Schema / Data Models

The system uses a relational schema to manage tenants and policies.

### Plans
Defines the resource limits for different tiers.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary Key |
| `burst_rps` | INTEGER | Max requests per second allowed |
| `sustained_rpm` | INTEGER | Max requests per minute allowed |
| `monthly_quota` | BIGINT | Total requests allowed per month |
| `enforcement_type` | TEXT | 'hard' (block) or 'soft' (log/overage) |

### Tenants
Represents the consumers of the API.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary Key |
| `name` | TEXT | Tenant name |
| `plan_id` | UUID | Foreign Key to Plans |
| `status` | TEXT | 'active' or 'suspended' |

### API Keys
Credentials for accessing the system.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary Key |
| `key_hash` | TEXT | SHA-256 hash of the raw key |
| `tenant_id` | UUID | Foreign Key to Tenants |

### Monthly Usage
Tracks consumption for billing and quota enforcement.

| Field | Type | Description |
|-------|------|-------------|
| `tenant_id` | UUID | Foreign Key to Tenants |
| `year` | INTEGER | Billing year |
| `month` | INTEGER | Billing month |
| `requests_used` | BIGINT | Count of successful requests |

## API Design

### Protected Resource
Demonstrates the full middleware chain protection.

-   **Endpoint**: `GET /auth/protected`
-   **Headers**: `x-api-key: <your_api_key>`
-   **Response (Success)**:
    ```json
    {
      "ok": true
    }
    ```
-   **Response (Rate Limited)**:
    ```json
    {
      "error": "Rate limit exceeded",
      "limit": 1000,
      "window": "60s",
      "current": 1001
    }
    ```

### Health Check
Infrastructure monitoring endpoint.

-   **Endpoint**: `GET /health`
-   **Response**:
    ```json
    {
      "message": "hoho"
    }
    ```

## Installation & Setup

### Prerequisites
-   Node.js (v18+)
-   Docker & Docker Compose
-   PostgreSQL client (optional, for manual DB inspection)

### Environment Variables
Create a `.env` file in the root directory:

```bash
PORT=5555
DATABASE_URL=postgresql://user:password@localhost:5432/aegis
REDIS_URL=redis://localhost:6379
```

### Setup Instructions

1.  **Clone the repository**:
    ```bash
    git clone <repository_url>
    cd aegis
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Start infrastructure**:
    ```bash
    docker-compose up -d
    ```

4.  **Initialize Database**:
    (Assuming migration scripts or manual schema application)
    ```bash
    psql $DATABASE_URL -f src/db/schema.sql
    ```

## Running the Project

### Development Mode
Starts the server with hot-reloading enabled.

```bash
npm run dev
```

### Common Commands
-   `npm run dev`: Start development server.
-   `npx tsx src/server.ts`: Run production-like build (via tsx).

## Design Decisions

-   **Redis Lua Scripts**: We use Lua scripts for rate limiting to ensure atomicity. This prevents race conditions where multiple parallel requests could incorrectly increment the counter within the same window.
-   **Middleware Pattern**: The Express middleware chain allows for modular policy enforcement. New checks (e.g., IP whitelisting) can be injected without modifying the core business logic.
-   **UUIDv7**: The schema uses UUIDv7 for primary keys to ensure time-ordered sortability while maintaining uniqueness, improving database index performance.
-   **Separation of Concerns**: Rate limiting state (ephemeral) is kept in Redis, while configuration and billing data (persistent) resides in PostgreSQL.

## Limitations & Future Improvements

### Limitations
-   **Single Region**: The current Redis deployment assumes a single region. Multi-region rate limiting would require a synchronized state store (e.g., Redis Enterprise or DynamoDB).
-   **Fixed Windows**: The burst limiter uses a basic counter. A token bucket algorithm would provide smoother traffic shaping.

### Future Improvements
-   **Dashboard UI**: Implement a frontend for tenants to view their usage and manage API keys.
-   **Dynamic Configuration**: Allow plan changes to propagate without server restarts (currently requires DB update, which is supported, but caching strategies need refinement).
-   **Webhooks**: Add webhook notifications for quota alerts (e.g., 80% usage warning).

## Project Structure

```text
src/
├── config/         # Configuration loaders
├── db/             # Database connection and schema
├── gateway/        # Core gateway logic
│   └── middleware/ # Auth, Rate, Burst, and Quota middleware
├── plans/          # Plan definitions and logic
├── redis/          # Redis client and Lua scripts
├── server.ts       # Application entry point
└── types/          # TypeScript type definitions
```
