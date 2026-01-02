import { Request, Response, NextFunction } from "express";
import { redis } from "../../redis/client";
import fs from "fs";
import path from "path";

const TOKEN_BUCKET_SCRIPT = fs.readFileSync(
  path.join(process.cwd(), "src/redis/lua/tokenBucket.lua"),
  "utf8"
);
export const burstLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.context?.tenantId;
    const plan = req.context?.plan;
    console.log("[BurstLimiter] ENTERED");

    if (!tenantId || !plan) {
      res.status(500).json({ error: "Burst limiter context missing" });
      return;
    }

    const capacity = plan.burst;
    const refillAmount = plan.burst;
    const refillTime = 1;
    const ttl = 60;

    const redisKey = `burst_bucket:${tenantId}`;
    const now = Date.now();

    const result = (await redis.eval(
      TOKEN_BUCKET_SCRIPT,
      1,
      redisKey,
      capacity.toString(),
      refillAmount.toString(),
      refillTime.toString(),
      now.toString(),
      ttl.toString()
    )) as [number, number];

    const [allowed, remainingTokens] = result;

    if (allowed === 0) {
      res.status(429).json({
        error: "Burst limit exceeded",
        remaining: remainingTokens,
      });
      return;
    }

    next();
  } catch (err) {
    console.error("[BurstLimiter] Error", err);
    res.status(500).json({ error: "Burst limiter failure" });
  }
};

