# AEGIS - Multi-Tenant API Gateway & Rate Limiting Syste

```
     ▄▄▄      ▓█████   ▄████  ██▓  ██████ 
    ▒████▄    ▓█   ▀  ██▒ ▀█▒▓██▒▒██    ▒ 
    ▒██  ▀█▄  ▒███   ▒██░▄▄▄░▒██▒░ ▓██▄   
    ░██▄▄▄▄██ ▒▓█  ▄ ░▓█  ██▓░██░  ▒   ██▒
     ▓█   ▓██▒░▒████▒░▒▓███▀▒░██░▒██████▒▒
     ▒▒   ▓▒█░░░ ▒░ ░ ░▒   ▒ ░▓  ▒ ▒▓▒ ▒ ░
      ▒   ▒▒ ░ ░ ░  ░  ░   ░  ▒ ░░ ░▒  ░ ░
      ░   ▒      ░   ░ ░   ░  ▒ ░░  ░  ░  
          ░  ░   ░  ░      ░  ░        ░  
```

> *"In ancient Greek mythology, the Aegis was the divine shield of Zeus—impenetrable, absolute, and terrifying to behold. Today, it stands guard over your APIs."*

---

## 📜 The Chronicle

You're standing at the gates of your infrastructure. Thousands of requests pound against the walls every second. Some are legitimate. Some are not. Some are trying to drain your resources dry. Others are testing your limits, probing for weaknesses.

**You need a guardian.**

Aegis is a high-performance API gateway middleware that doesn't just protect—it *enforces*. Rate limiting. Burst control. Quota management. Multi-tenant isolation. It sits between chaos and your upstream services, deciding in **microseconds** who passes and who gets the 429.

This isn't your average middleware. This is the shield.

---

## 🎭 Meet The Guardians

Every request that enters your system faces **five trials**. Each guardian has one job. None of them show mercy.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           THE GAUNTLET                                      │
│                                                                             │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
│   │  AUTH   │───▶│  PLAN   │───▶│  BURST  │───▶│  RATE   │───▶│  QUOTA  │   │
│   │ KEEPER  │    │ ORACLE  │    │ BREAKER │    │ WARDEN  │    │ ARBITER │   │
│   └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘   │
│        │              │              │              │              │        │
│        ▼              ▼              ▼              ▼              ▼        │
│   "Who are      "What are      "Too fast?     "Still going?   "Have you     │
│    you?"        you allowed?"   Slow down."    Nice try."      any left?"   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 🔐 The Auth Keeper
*First line of defense. No key, no entry.*

Every request must present an API key. The Keeper doesn't store raw keys—that would be reckless. Instead, it hashes your key with SHA-256 and checks against the vault (PostgreSQL). Impersonators get nothing but a cold `401`.

### 📋 The Plan Oracle  
*Knows your limits before you do.*

Once authenticated, the Oracle looks up your tenant's plan. Are you on the free tier? Enterprise? The Oracle retrieves your burst limits, rate caps, and monthly quotas. This context follows the request through every subsequent trial.

### ⚡ The Burst Breaker
*Handles the thunderclaps.*

Traffic spikes happen. Maybe you pushed a feature. Maybe someone's running a script. The Burst Breaker uses a **token bucket algorithm** implemented in Redis Lua scripts. It's atomic. It's fast. And when the bucket runs dry? Your request gets dropped before it can cause chaos.

### 🚦 The Rate Warden
*Enforces the sustained pace.*

The Warden watches your rolling window. Not per-second bursts—but your **requests per minute**. Using a sliding window algorithm (also in Redis Lua), it ensures you can't slowly grind the system to dust. Stay within your `sustained_rpm`, and you pass. Exceed it? `429 Too Many Requests`.

### ⚖️ The Quota Arbiter
*The final judgment.*

You've passed the others. But have you exhausted your monthly allowance? The Arbiter checks your usage counter. If you've breached your `monthly_quota` and your plan enforces **hard limits**—the gates close. Soft limits? You'll pass, but we're logging everything. The invoice cometh.

---

## 🏗️ The Architecture

Here's how the pieces fit together. Aegis sits between the chaos of the internet and the sanctity of your upstream services.

```mermaid
flowchart TB
    subgraph INTERNET["☁️ THE INTERNET"]
        C1[("👤 Client A")]
        C2[("👤 Client B")]
        C3[("🤖 Bot")]
        C4[("👤 Client C")]
    end

    subgraph AEGIS["🛡️ AEGIS GATEWAY"]
        direction TB
        
        subgraph MIDDLEWARE["⚔️ The Gauntlet"]
            direction LR
            AUTH["🔐 Auth\nKeeper"]
            PLAN["📋 Plan\nOracle"]
            BURST["⚡ Burst\nBreaker"]
            RATE["🚦 Rate\nWarden"]
            QUOTA["⚖️ Quota\nArbiter"]
            
            AUTH --> PLAN --> BURST --> RATE --> QUOTA
        end
        
        ROUTER["🎯 Route Handler"]
    end

    subgraph DATAPLANE["📊 DATA PLANE"]
        direction LR
        REDIS[("🔴 Redis\n(ephemeral state)")]
        POSTGRES[("🐘 PostgreSQL\n(persistent truth)")]
    end

    subgraph UPSTREAM["🏰 YOUR SERVICES"]
        API1["API Service 1"]
        API2["API Service 2"]
    end

    C1 & C2 & C3 & C4 -->|"HTTP + API Key"| MIDDLEWARE
    QUOTA -->|"✅ Allowed"| ROUTER
    MIDDLEWARE -.-|"❌ Rejected"| BLOCK(("🚫 429/401/403"))
    
    AUTH & PLAN & QUOTA -.->|"read/write"| POSTGRES
    BURST & RATE & QUOTA -.->|"atomic ops"| REDIS
    
    ROUTER --> API1 & API2

    style AEGIS fill:#1a1a2e,stroke:#e94560,stroke-width:3px
    style MIDDLEWARE fill:#16213e,stroke:#0f3460,stroke-width:2px
    style REDIS fill:#d63031,stroke:#ff7675,stroke-width:2px
    style POSTGRES fill:#0984e3,stroke:#74b9ff,stroke-width:2px
    style BLOCK fill:#2d3436,stroke:#636e72,stroke-width:2px
```

---

## 🌊 The Journey of a Request

Let's follow a single request through the gauntlet. Watch closely—it happens in milliseconds.

```mermaid
sequenceDiagram
    autonumber
    participant C as 👤 Client
    participant A as 🔐 Auth Keeper
    participant P as 📋 Plan Oracle
    participant B as ⚡ Burst Breaker
    participant R as 🚦 Rate Warden
    participant Q as ⚖️ Quota Arbiter
    participant U as 🏰 Upstream
    participant DB as 🐘 PostgreSQL
    participant RD as 🔴 Redis

    rect rgb(25, 25, 50)
        Note over C,RD: 🎬 ACT I: IDENTITY
        C->>+A: GET /api/resource<br/>x-api-key: YOUR_API_KEY
        A->>DB: SELECT * FROM api_keys<br/>WHERE key_hash = SHA256(key)
        DB-->>A: ✅ tenant_id: abc-123
        A->>-P: Identity confirmed. Proceed.
    end

    rect rgb(30, 50, 30)
        Note over C,RD: 🎬 ACT II: CONTEXT
        P->>DB: SELECT * FROM plans<br/>JOIN tenants ON plan_id
        DB-->>P: burst_rps: 50, sustained_rpm: 1000,<br/>monthly_quota: 100000
        P->>B: Context loaded. Begin trials.
    end

    rect rgb(50, 30, 30)
        Note over C,RD: 🎬 ACT III: THE TRIALS
        B->>RD: EVALSHA token_bucket.lua<br/>key: burst:abc-123
        RD-->>B: tokens_remaining: 47 ✅
        B->>R: Burst check passed.
        
        R->>RD: EVALSHA sliding_window.lua<br/>key: rate:abc-123
        RD-->>R: current_count: 892/1000 ✅
        R->>Q: Rate check passed.
        
        Q->>RD: INCR quota:abc-123:2026:01
        RD-->>Q: usage: 45231/100000 ✅
        Q->>U: All trials passed. Forward request.
    end

    rect rgb(40, 40, 60)
        Note over C,RD: 🎬 ACT IV: RESOLUTION
        U-->>C: 200 OK { "data": "..." }
        Q-->>DB: INSERT INTO request_logs<br/>(decision: ALLOWED)
    end
```

---

## 🗃️ The Vault (Data Models)

All knowledge is stored in two realms. **PostgreSQL** holds the truth that persists. **Redis** holds the truth that expires.

### 📊 Entity Relationship

```mermaid
erDiagram
    PLANS ||--o{ TENANTS : "defines limits for"
    TENANTS ||--o{ API_KEYS : "owns"
    TENANTS ||--o{ MONTHLY_USAGE : "accumulates"
    TENANTS ||--o{ REQUEST_LOGS : "generates"

    PLANS {
        uuid id PK "UUIDv7 - time-sortable"
        string name "e.g., 'starter', 'enterprise'"
        int burst_rps "Max requests/second"
        int sustained_rpm "Max requests/minute"
        bigint monthly_quota "Requests allowed/month"
        enum enforcement_type "hard | soft"
        timestamp created_at
    }

    TENANTS {
        uuid id PK "UUIDv7"
        string name "Human-readable identifier"
        uuid plan_id FK "Current active plan"
        enum status "active | suspended"
        timestamp created_at
    }

    API_KEYS {
        uuid id PK "UUIDv7"
        string key_hash "SHA-256 of raw key"
        uuid tenant_id FK
        string label "Optional: 'production', 'staging'"
        timestamp created_at
        timestamp last_used_at
    }

    MONTHLY_USAGE {
        uuid tenant_id FK
        int year "e.g., 2026"
        int month "1-12"
        bigint requests_used "Counter"
        timestamp updated_at
    }

    REQUEST_LOGS {
        uuid id PK
        uuid tenant_id FK
        string endpoint
        enum decision "ALLOWED | BURST_LIMITED | RATE_LIMITED | QUOTA_EXCEEDED"
        timestamp created_at
    }
```

### 🔴 Redis Key Patterns

```
┌──────────────────────────────────────────────────────────────────┐
│ EPHEMERAL STATE (Redis)                                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🪣 BURST TOKENS        burst:{tenant_id}                        │
│     └─ Type: String (counter)                                    │
│     └─ TTL: 1 second (auto-refill)                               │
│     └─ Value: remaining tokens in bucket                         │
│                                                                  │
│  📊 RATE WINDOW         rate:{tenant_id}:{window_start}          │
│     └─ Type: Sorted Set                                          │
│     └─ TTL: 60 seconds                                           │
│     └─ Members: request timestamps                               │
│                                                                  │
│  📈 QUOTA COUNTER       quota:{tenant_id}:{year}:{month}         │
│     └─ Type: String (counter)                                    │
│     └─ TTL: None (synced to PostgreSQL)                          │
│     └─ Value: requests used this period                          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Reference

### The Protected Endpoint

This demonstrates the full gauntlet in action.

```http
GET /auth/protected HTTP/1.1
Host: your-aegis-instance.com
x-api-key: YOUR_API_KEY
```

**Success Response** `200 OK`
```json
{
  "ok": true,
  "message": "You have passed the trials."
}
```

**Burst Limited** `429 Too Many Requests`
```json
{
  "error": "burst_limit_exceeded",
  "message": "Too many requests per second. Slow down.",
  "limit": 50,
  "retry_after_ms": 200
}
```

**Rate Limited** `429 Too Many Requests`
```json
{
  "error": "rate_limit_exceeded",
  "message": "You've exceeded your requests per minute.",
  "limit": 1000,
  "window": "60s",
  "current": 1001,
  "retry_after_ms": 12000
}
```

**Quota Exceeded** `429 Too Many Requests`
```json
{
  "error": "quota_exceeded",
  "message": "Monthly quota exhausted.",
  "quota": 100000,
  "used": 100001,
  "resets_at": "2026-02-01T00:00:00Z"
}
```

**Unauthorized** `401 Unauthorized`
```json
{
  "error": "unauthorized",
  "message": "Invalid or missing API key."
}
```

### Health Check

For your load balancers and orchestrators.

```http
GET /health HTTP/1.1
```

```json
{
  "status": "operational",
  "message": "hoho",
  "uptime_seconds": 86400
}
```

---

## ⚙️ Installation

### Prerequisites

| Requirement | Version | Why |
|-------------|---------|-----|
| Node.js | 18+ | Runtime |
| Docker | Latest | Infrastructure containers |
| PostgreSQL | 14+ | Persistent storage |
| Redis | 7+ | Ephemeral state & Lua scripts |

### Quick Start

```bash
# 1. Clone the fortress
git clone <repository_url>
cd aegis

# 2. Arm the dependencies
npm install

# 3. Configure the environment
cat > .env << EOF
PORT=5555
DATABASE_URL=postgresql://aegis:aegis@localhost:5432/aegis
REDIS_URL=redis://localhost:6379
EOF

# 4. Raise the infrastructure
docker-compose up -d

# 5. Initialize the vault
psql $DATABASE_URL -f src/db/schema.sql

# 6. Awaken Aegis
npm run dev
```

You should see:

```
🛡️  Aegis Gateway Online
   ├─ HTTP:     http://localhost:5555
   ├─ Redis:    connected
   └─ Postgres: connected
```

---

## 📂 Project Structure

```
aegis/
│
├── src/
│   ├── config/              # ⚙️  Environment & configuration loaders
│   │   └── index.ts
│   │
│   ├── db/                  # 🐘 PostgreSQL connection & schema
│   │   ├── client.ts
│   │   └── schema.sql
│   │
│   ├── redis/               # 🔴 Redis client & Lua scripts
│   │   ├── client.ts
│   │   └── scripts/
│   │       ├── token_bucket.lua
│   │       └── sliding_window.lua
│   │
│   ├── gateway/             # 🛡️  The core of Aegis
│   │   ├── middleware/
│   │   │   ├── auth.ts          # 🔐 Auth Keeper
│   │   │   ├── planResolver.ts  # 📋 Plan Oracle
│   │   │   ├── burstLimiter.ts  # ⚡ Burst Breaker
│   │   │   ├── rateLimiter.ts   # 🚦 Rate Warden
│   │   │   └── quotaEnforcer.ts # ⚖️  Quota Arbiter
│   │   └── router.ts
│   │
│   ├── plans/               # 📊 Plan definitions & CRUD
│   │
│   ├── types/               # 📝 TypeScript definitions
│   │   └── index.d.ts
│   │
│   └── server.ts            # 🚀 Entry point
│
├── docker-compose.yml       # 🐳 Infrastructure definition
├── package.json
├── tsconfig.json
└── README.md                # 📜 You are here
```

---

## 🧠 Design Philosophy

### Why Redis Lua Scripts?

Rate limiting has a dirty secret: **race conditions**. Imagine two requests hitting the same counter at the exact same millisecond. Without atomicity, both might read "999", both increment to "1000", and both pass—even though the limit is 1000.

Lua scripts execute atomically in Redis. The entire check-and-increment happens as one indivisible operation. No races. No cheats.

```lua
-- Simplified sliding window logic
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

-- Remove expired entries
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

-- Count current window
local count = redis.call('ZCARD', key)

if count < limit then
    redis.call('ZADD', key, now, now)
    redis.call('EXPIRE', key, window)
    return {1, count + 1}  -- allowed
else
    return {0, count}      -- rejected
end
```

### Why the Middleware Pattern?

Each guardian is independent. They don't know about each other. They just do their one job and pass the request along (or reject it).

This means you can:
- Add new guardians (IP whitelisting, geo-blocking) without touching existing code
- Reorder the chain for performance optimization
- Disable specific checks per-route
- Test each guardian in isolation

### Why UUIDv7?

UUIDv4 is random. Great for uniqueness, terrible for database indexes. B-tree indexes love sequential data.

UUIDv7 embeds a timestamp in the first 48 bits. New records are *roughly* sequential, which means:
- Better index locality
- Faster inserts
- Natural time-ordering without a separate column

---

## 🔥 Battle Scenarios

### Scenario 1: The Traffic Spike

```
08:00:00 - Normal traffic. 100 RPS.
08:00:15 - Hacker News front page. 5000 RPS.
          └─ Burst Breaker activates. Excess requests get 429.
08:00:30 - Traffic normalizes. All systems green.
```

### Scenario 2: The Slow Drain

```
Day 1-28: Normal usage. 50,000 requests.
Day 29:   Runaway script. 60,000 requests in one day.
          └─ Quota Arbiter: "You've hit 100,000. Hard limit enforced."
          └─ All subsequent requests: 429.
Day 30:   Client contacts support. Upgrades plan.
```

### Scenario 3: The Bad Actor

```
Request 1: x-api-key: INVALID_KEY_EXAMPLE
           └─ Auth Keeper: "Unknown key. 401."
Request 2: x-api-key: (empty)
           └─ Auth Keeper: "No key provided. 401."
Request 3: x-api-key: SUSPENDED_TENANT_KEY
           └─ Plan Oracle: "Tenant suspended. 403."
```

---

## 📈 Metrics & Observability

Every decision is logged. Every block is recorded. Pipe `request_logs` to your analytics platform of choice.

```sql
-- Requests blocked in the last hour, by reason
SELECT 
    decision,
    COUNT(*) as blocked_count
FROM request_logs
WHERE 
    decision != 'ALLOWED'
    AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY decision
ORDER BY blocked_count DESC;
```

```
┌────────────────────┬───────────────┐
│ decision           │ blocked_count │
├────────────────────┼───────────────┤
│ RATE_LIMITED       │ 1,247         │
│ BURST_LIMITED      │ 892           │
│ QUOTA_EXCEEDED     │ 156           │
│ UNAUTHORIZED       │ 43            │
└────────────────────┴───────────────┘
```

---

## 🛠️ Commands Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot-reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run production build |
| `npm test` | Execute test suite |
| `docker-compose up -d` | Start Redis + PostgreSQL |
| `docker-compose down` | Tear down infrastructure |

---

## 🤝 Contributing

The gates are open to worthy contributors. Before you forge ahead:

1. Check existing issues for context
2. Write tests for new guardians
3. Keep Lua scripts atomic and documented
4. TypeScript strict mode is enforced

---

<div align="center">

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   "Behind every great API, there stands a greater shield."    ║
║                                                               ║
║                        — The Aegis Codex                      ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

**Built with paranoia. Deployed with confidence.**

</div>
