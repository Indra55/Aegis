import { Request, Response, NextFunction } from "express";
import { redis } from "../../redis/client";
import fs from "fs";
import path from "path";

const SLIDING_WINDOW_SCRIPT = fs.readFileSync(
  path.join(process.cwd(), "src/redis/lua/slidingWindow.lua"),
  "utf8"
);

export const rateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.context?.tenantId;
    const plan = req.context?.plan;

    if (!tenantId || !plan) {
      res.status(500).json({ error: "Rate limiter context missing" });
      return;
    }

    const windowSize = 60000;  
    const limit = plan.rate;
    const now = Date.now();
    const redisKey = `sustained_window:${tenantId}`;

    const result = (await redis.eval(
      SLIDING_WINDOW_SCRIPT,
      1,
      redisKey,
      windowSize.toString(),
      limit.toString(),
      now.toString()
    )) as [number, number];

    const [allowed, effectiveCount] = result;

    if (allowed === 0) {
      res.status(429).json({
        error: "Rate limit exceeded",
        limit: plan.sustained_rpm,
        window: "60s",
        current: effectiveCount,
      });
      return;
    }

    next();
  } catch (err) {
    console.error("[RateLimiter] Error", err);
    res.status(500).json({ error: "Rate limiter failure" });
  }
};
