import express, { Request, Response, Router } from "express";
import crypto from "crypto";
import { pool } from "../config/dbConfig";
import { redis } from "../redis/client";

const router: Router = express.Router();

// ==================== PLANS ROUTES ====================

// GET all plans
router.get("/plans", async (req: Request, res: Response) => {
    try {
        const result = await pool.query(`
      SELECT id, burst_rps, sustained_rpm, monthly_quota, enforcement_type, created_at
      FROM plans
      ORDER BY created_at DESC
    `);
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching plans:", error);
        res.status(500).json({ error: "Failed to fetch plans" });
    }
});

// GET single plan
router.get("/plans/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT * FROM plans WHERE id = $1`,
            [id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Plan not found" });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error fetching plan:", error);
        res.status(500).json({ error: "Failed to fetch plan" });
    }
});

// POST create plan
router.post("/plans", async (req: Request, res: Response) => {
    try {
        const { burst_rps, sustained_rpm, monthly_quota, enforcement_type } = req.body;
        const result = await pool.query(
            `INSERT INTO plans (burst_rps, sustained_rpm, monthly_quota, enforcement_type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
            [burst_rps, sustained_rpm, monthly_quota, enforcement_type]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error creating plan:", error);
        res.status(500).json({ error: "Failed to create plan" });
    }
});

// ==================== TENANTS ROUTES ====================

// GET all tenants
router.get("/tenants", async (req: Request, res: Response) => {
    try {
        const result = await pool.query(`
      SELECT t.id, t.name, t.plan_id, t.status, t.created_at,
             p.burst_rps, p.sustained_rpm, p.monthly_quota, p.enforcement_type
      FROM tenants t
      LEFT JOIN plans p ON t.plan_id = p.id
      ORDER BY t.created_at DESC
    `);
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching tenants:", error);
        res.status(500).json({ error: "Failed to fetch tenants" });
    }
});

// GET single tenant
router.get("/tenants/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT t.*, p.burst_rps, p.sustained_rpm, p.monthly_quota, p.enforcement_type
       FROM tenants t
       LEFT JOIN plans p ON t.plan_id = p.id
       WHERE t.id = $1`,
            [id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Tenant not found" });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error fetching tenant:", error);
        res.status(500).json({ error: "Failed to fetch tenant" });
    }
});

// POST create tenant
router.post("/tenants", async (req: Request, res: Response) => {
    try {
        const { name, plan_id, status = "active" } = req.body;
        const result = await pool.query(
            `INSERT INTO tenants (name, plan_id, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
            [name, plan_id, status]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error creating tenant:", error);
        res.status(500).json({ error: "Failed to create tenant" });
    }
});

// PATCH update tenant status
router.patch("/tenants/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, plan_id } = req.body;

        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (status) {
            updates.push(`status = $${paramIndex++}`);
            values.push(status);
        }
        if (plan_id) {
            updates.push(`plan_id = $${paramIndex++}`);
            values.push(plan_id);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: "No fields to update" });
        }

        values.push(id);
        const result = await pool.query(
            `UPDATE tenants SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
            values
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Tenant not found" });
        }

        // Invalidate cache
        await redis.del(`tenant:plan:${id}`);

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error updating tenant:", error);
        res.status(500).json({ error: "Failed to update tenant" });
    }
});

// ==================== API KEYS ROUTES ====================

// GET all API keys
router.get("/api-keys", async (req: Request, res: Response) => {
    try {
        const { tenant_id } = req.query;
        let query = `
      SELECT ak.id, ak.tenant_id, ak.key_hash, ak.status, ak.created_at, ak.last_used_at,
             t.name as tenant_name
      FROM api_keys ak
      LEFT JOIN tenants t ON ak.tenant_id = t.id
    `;
        const values: any[] = [];

        if (tenant_id) {
            query += " WHERE ak.tenant_id = $1";
            values.push(tenant_id);
        }

        query += " ORDER BY ak.created_at DESC";

        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching API keys:", error);
        res.status(500).json({ error: "Failed to fetch API keys" });
    }
});

// POST generate new API key
router.post("/api-keys", async (req: Request, res: Response) => {
    try {
        const { tenant_id } = req.body;

        // Generate a random API key
        const rawKey = `aegis_${crypto.randomBytes(32).toString("hex")}`;
        const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

        const result = await pool.query(
            `INSERT INTO api_keys (tenant_id, key_hash, status)
       VALUES ($1, $2, 'active')
       RETURNING *`,
            [tenant_id, keyHash]
        );

        // Return the raw key ONCE - it won't be retrievable later
        res.status(201).json({
            ...result.rows[0],
            raw_key: rawKey, // Only shown on creation
        });
    } catch (error) {
        console.error("Error generating API key:", error);
        res.status(500).json({ error: "Failed to generate API key" });
    }
});

// PATCH revoke API key
router.patch("/api-keys/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const result = await pool.query(
            `UPDATE api_keys SET status = $1 WHERE id = $2 RETURNING *`,
            [status, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "API key not found" });
        }

        // Invalidate cache - we need to find the key_hash first
        const keyHash = result.rows[0].key_hash;
        await redis.del(`apikey:${keyHash}`);

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error updating API key:", error);
        res.status(500).json({ error: "Failed to update API key" });
    }
});

// ==================== REQUEST LOGS ROUTES ====================

// GET request logs
router.get("/request-logs", async (req: Request, res: Response) => {
    try {
        const { tenant_id, decision, limit = 100, offset = 0 } = req.query;

        let query = `
      SELECT rl.id, rl.tenant_id, rl.endpoint, rl.decision, rl.reason, rl.created_at,
             t.name as tenant_name
      FROM request_logs rl
      LEFT JOIN tenants t ON rl.tenant_id = t.id
      WHERE 1=1
    `;
        const values: any[] = [];
        let paramIndex = 1;

        if (tenant_id) {
            query += ` AND rl.tenant_id = $${paramIndex++}`;
            values.push(tenant_id);
        }
        if (decision) {
            query += ` AND rl.decision = $${paramIndex++}`;
            values.push(decision);
        }

        query += ` ORDER BY rl.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        values.push(limit, offset);

        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching request logs:", error);
        res.status(500).json({ error: "Failed to fetch request logs" });
    }
});

// ==================== METRICS ROUTES ====================

// GET burst bucket state for tenant
router.get("/metrics/burst-bucket/:tenantId", async (req: Request, res: Response) => {
    try {
        const { tenantId } = req.params;
        const key = `burst_bucket:${tenantId}`;

        const data = await redis.get(key);
        if (!data) {
            // Return default state if not in Redis
            const planResult = await pool.query(
                `SELECT p.burst_rps FROM tenants t 
         JOIN plans p ON t.plan_id = p.id 
         WHERE t.id = $1`,
                [tenantId]
            );
            const capacity = planResult.rows[0]?.burst_rps || 100;

            return res.json({
                tenant_id: tenantId,
                tokens: capacity,
                lastRefill: new Date().toISOString(),
                capacity,
                refill_rate: 10,
            });
        }

        res.json(JSON.parse(data));
    } catch (error) {
        console.error("Error fetching burst bucket state:", error);
        res.status(500).json({ error: "Failed to fetch burst bucket state" });
    }
});

// GET rate window state for tenant
router.get("/metrics/rate-window/:tenantId", async (req: Request, res: Response) => {
    try {
        const { tenantId } = req.params;
        const key = `sustained_window:${tenantId}`;

        const count = await redis.zcard(key);

        const planResult = await pool.query(
            `SELECT p.sustained_rpm FROM tenants t 
       JOIN plans p ON t.plan_id = p.id 
       WHERE t.id = $1`,
            [tenantId]
        );
        const capacity = planResult.rows[0]?.sustained_rpm || 1000;

        res.json({
            tenant_id: tenantId,
            curr: count || 0,
            prev: 0,
            windowStart: new Date(Date.now() - 60000).toISOString(),
            capacity,
        });
    } catch (error) {
        console.error("Error fetching rate window state:", error);
        res.status(500).json({ error: "Failed to fetch rate window state" });
    }
});

// GET quota state for tenant
router.get("/metrics/quota/:tenantId", async (req: Request, res: Response) => {
    try {
        const { tenantId } = req.params;
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const monthStr = `${year}-${String(month).padStart(2, "0")}`;
        const key = `quota:${tenantId}:${monthStr}`;

        const count = await redis.get(key);

        const planResult = await pool.query(
            `SELECT p.monthly_quota, p.enforcement_type FROM tenants t 
       JOIN plans p ON t.plan_id = p.id 
       WHERE t.id = $1`,
            [tenantId]
        );
        const quota = planResult.rows[0]?.monthly_quota || 100000;
        const enforcement_type = planResult.rows[0]?.enforcement_type || "hard";

        res.json({
            tenant_id: tenantId,
            count: parseInt(count || "0", 10),
            month: monthStr,
            quota,
            enforcement_type,
        });
    } catch (error) {
        console.error("Error fetching quota state:", error);
        res.status(500).json({ error: "Failed to fetch quota state" });
    }
});

// ==================== DEBUG ROUTES ====================

// GET Redis state snapshot
router.get("/debug/redis-state", async (req: Request, res: Response) => {
    try {
        // Scan Redis for all relevant keys
        const apikeyCaches: Record<string, unknown>[] = [];
        const tenantPlanCaches: Record<string, unknown>[] = [];
        const burstBuckets: Record<string, unknown>[] = [];
        const rateWindows: Record<string, unknown>[] = [];
        const quotaCounters: Record<string, unknown>[] = [];

        // Scan for apikey:* keys
        const apikeyKeys = await scanKeys("apikey:*");
        for (const key of apikeyKeys) {
            const value = await redis.get(key);
            if (value) apikeyCaches.push({ key, value: JSON.parse(value) });
        }

        // Scan for tenant:plan:* keys
        const tenantPlanKeys = await scanKeys("tenant:plan:*");
        for (const key of tenantPlanKeys) {
            const value = await redis.get(key);
            if (value) tenantPlanCaches.push({ key, value: JSON.parse(value) });
        }

        // Scan for burst_bucket:* keys
        const burstKeys = await scanKeys("burst_bucket:*");
        for (const key of burstKeys) {
            const value = await redis.get(key);
            if (value) burstBuckets.push({ key, value: JSON.parse(value) });
        }

        // Scan for sustained_window:* keys
        const rateKeys = await scanKeys("sustained_window:*");
        for (const key of rateKeys) {
            const members = await redis.zrange(key, 0, -1, "WITHSCORES");
            rateWindows.push({ key, count: members.length / 2, members });
        }

        // Scan for quota:* keys
        const quotaKeys = await scanKeys("quota:*");
        for (const key of quotaKeys) {
            const value = await redis.get(key);
            quotaCounters.push({ key, value: parseInt(value || "0", 10) });
        }

        res.json({
            apikey_caches: apikeyCaches,
            tenant_plan_caches: tenantPlanCaches,
            burst_buckets: burstBuckets,
            rate_windows: rateWindows,
            quota_counters: quotaCounters,
        });
    } catch (error) {
        console.error("Error fetching Redis state:", error);
        res.status(500).json({ error: "Failed to fetch Redis state" });
    }
});

// Helper function to scan Redis keys
async function scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = "0";

    do {
        const [nextCursor, foundKeys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
        cursor = nextCursor;
        keys.push(...foundKeys);
    } while (cursor !== "0");

    return keys;
}

// GET specific Redis key
router.get("/debug/redis-key", async (req: Request, res: Response) => {
    try {
        const { key } = req.query;

        if (!key || typeof key !== "string") {
            return res.status(400).json({ error: "Key parameter required" });
        }

        // If it's a pattern with wildcard, return matching keys
        if (key.includes("*")) {
            const keys = await scanKeys(key);
            const results: Record<string, unknown>[] = [];

            for (const k of keys) {
                const type = await redis.type(k);
                let value: unknown;

                switch (type) {
                    case "string":
                        value = await redis.get(k);
                        try {
                            value = JSON.parse(value as string);
                        } catch { }
                        break;
                    case "zset":
                        value = await redis.zrange(k, 0, -1, "WITHSCORES");
                        break;
                    case "hash":
                        value = await redis.hgetall(k);
                        break;
                    default:
                        value = `Type: ${type}`;
                }

                results.push({ key: k, type, value });
            }

            return res.json(results);
        }

        // Single key lookup
        const type = await redis.type(key);
        let value: unknown;

        switch (type) {
            case "string":
                value = await redis.get(key);
                try {
                    value = JSON.parse(value as string);
                } catch { }
                break;
            case "zset":
                value = await redis.zrange(key, 0, -1, "WITHSCORES");
                break;
            case "hash":
                value = await redis.hgetall(key);
                break;
            case "none":
                return res.status(404).json({ error: "Key not found" });
            default:
                value = `Type: ${type}`;
        }

        res.json({ key, type, value });
    } catch (error) {
        console.error("Error querying Redis key:", error);
        res.status(500).json({ error: "Failed to query Redis key" });
    }
});

// ==================== TEST ROUTES ====================

// POST test single request through the pipeline
router.post("/test/request", async (req: Request, res: Response) => {
    try {
        const { api_key } = req.body;

        if (!api_key) {
            return res.status(400).json({ error: "api_key required" });
        }

        // Make internal request to the protected endpoint
        const testUrl = `http://localhost:5555/auth/protected`;

        const response = await fetch(testUrl, {
            method: "GET",
            headers: {
                "x-api-key": api_key,
            },
        });

        const body = await response.json().catch(() => ({}));

        res.json({
            status: response.status,
            body,
            rejectionStage: getStageFromStatus(response.status, body),
        });
    } catch (error) {
        console.error("Error testing request:", error);
        res.status(500).json({ error: "Failed to test request" });
    }
});

// POST send burst requests
router.post("/test/burst", async (req: Request, res: Response) => {
    try {
        const { api_key, count = 10 } = req.body;

        if (!api_key) {
            return res.status(400).json({ error: "api_key required" });
        }

        const requestCount = Math.min(Math.max(1, count), 1000);
        const results: { status: number; rejectionStage?: string; timestamp: string }[] = [];

        const testUrl = `http://localhost:5555/auth/protected`;

        // Send requests in parallel
        const promises = Array(requestCount).fill(null).map(async () => {
            const response = await fetch(testUrl, {
                method: "GET",
                headers: {
                    "x-api-key": api_key,
                },
            });

            const body = await response.json().catch(() => ({}));

            return {
                status: response.status,
                rejectionStage: getStageFromStatus(response.status, body),
                timestamp: new Date().toISOString(),
            };
        });

        const allResults = await Promise.all(promises);

        res.json({ results: allResults });
    } catch (error) {
        console.error("Error sending burst:", error);
        res.status(500).json({ error: "Failed to send burst requests" });
    }
});

function getStageFromStatus(status: number, body: any): string | undefined {
    if (status === 200) return undefined;
    if (status === 401) return "Auth Keeper";
    if (status === 429) {
        const error = body?.error || "";
        if (error.includes("burst")) return "Burst Breaker";
        if (error.includes("rate")) return "Rate Warden";
        if (error.includes("quota")) return "Quota Arbiter";
        return "Rate Limited";
    }
    if (status === 403) return "Plan Oracle";
    return "Unknown";
}

export default router;
