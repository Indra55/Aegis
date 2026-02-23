'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import type {
  BurstBucketState,
  RateWindowState,
  QuotaState,
  Plan,
} from '@/types/aegis';

interface TenantMetricsProps {
  tenantId: string;
  plan: Plan;
  burst: BurstBucketState;
  rate: RateWindowState;
  quota: QuotaState;
}

export function TenantMetrics({
  tenantId,
  plan,
  burst,
  rate,
  quota,
}: TenantMetricsProps) {
  const [displayBurst, setDisplayBurst] = useState(burst);
  const [displayRate, setDisplayRate] = useState(rate);
  const [displayQuota, setDisplayQuota] = useState(quota);

  // Simulate token refill
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayBurst((prev) => ({
        ...prev,
        tokens: Math.min(prev.tokens + prev.refill_rate, prev.capacity),
        lastRefill: new Date().toISOString(),
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Simulate sliding window
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const windowStart = new Date(displayRate.windowStart);
      const elapsedSeconds = (now.getTime() - windowStart.getTime()) / 1000;

      if (elapsedSeconds > 60) {
        setDisplayRate((prev) => ({
          ...prev,
          curr: 0,
          prev: 0,
          windowStart: now.toISOString(),
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [displayRate.windowStart]);

  const burstUtilization = (displayBurst.tokens / displayBurst.capacity) * 100;
  const rateUtilization = (displayRate.curr / displayRate.capacity) * 100;
  const quotaUtilization = (displayQuota.count / displayQuota.quota) * 100;

  const getUtilizationColor = (percentage: number): string => {
    if (percentage > 80) return 'text-red-500 bg-red-500/10';
    if (percentage > 50) return 'text-yellow-500 bg-yellow-500/10';
    return 'text-green-500 bg-green-500/10';
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card/50 backdrop-blur border-border/50 p-6">
        <h3 className="text-sm font-bold mb-4">Tenant Metrics</h3>
        <div className="text-xs text-muted-foreground mb-4">ID: {tenantId}</div>

        {/* Burst Bucket State */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-mono mb-1">Burst Bucket</div>
              <div className="text-xs text-muted-foreground">
                Refill: {displayBurst.refill_rate} tokens/sec
              </div>
            </div>
            <div className={`text-sm font-bold px-3 py-1 rounded ${getUtilizationColor(burstUtilization)}`}>
              {displayBurst.tokens.toFixed(0)} / {displayBurst.capacity}
            </div>
          </div>
          <div className="w-full bg-border/50 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                burstUtilization > 80
                  ? 'bg-red-500'
                  : burstUtilization > 50
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(burstUtilization, 100)}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {burstUtilization.toFixed(1)}% utilized
          </div>
        </div>

        {/* Rate Window State */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-mono mb-1">Rate Window (60s)</div>
              <div className="text-xs text-muted-foreground">
                Current + Previous overlap
              </div>
            </div>
            <div className={`text-sm font-bold px-3 py-1 rounded ${getUtilizationColor(rateUtilization)}`}>
              {displayRate.curr} + {displayRate.prev} = {displayRate.curr + displayRate.prev}
            </div>
          </div>
          <div className="w-full bg-border/50 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                rateUtilization > 80
                  ? 'bg-red-500'
                  : rateUtilization > 50
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(rateUtilization, 100)}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {rateUtilization.toFixed(1)}% of {displayRate.capacity} req/min limit
          </div>
        </div>

        {/* Quota Counter */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-mono mb-1">Monthly Quota</div>
              <div className="text-xs text-muted-foreground">
                Enforcement: {displayQuota.enforcement_type}
              </div>
            </div>
            <div className={`text-sm font-bold px-3 py-1 rounded ${getUtilizationColor(quotaUtilization)}`}>
              {displayQuota.count.toLocaleString()} /{' '}
              {displayQuota.quota.toLocaleString()}
            </div>
          </div>
          <div className="w-full bg-border/50 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                quotaUtilization > 80
                  ? 'bg-red-500'
                  : quotaUtilization > 50
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(quotaUtilization, 100)}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {quotaUtilization.toFixed(1)}% of month used
          </div>
        </div>
      </Card>

      {/* Plan Details */}
      <Card className="bg-card/50 backdrop-blur border-border/50 p-4">
        <h4 className="text-xs font-bold mb-3">Plan Details</h4>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Burst RPS:</span>
            <span className="font-mono font-bold text-foreground">
              {plan.burst_rps}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Sustained RPM:</span>
            <span className="font-mono font-bold text-foreground">
              {plan.sustained_rpm}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Monthly Quota:</span>
            <span className="font-mono font-bold text-foreground">
              {plan.monthly_quota.toLocaleString()}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
