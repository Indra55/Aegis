'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Plan, Tenant } from '@/types/aegis';

interface PlansViewProps {
  plans: Plan[];
  tenants: Tenant[];
}

export function PlansView({ plans, tenants }: PlansViewProps) {
  const getTenantCount = (planId: string): number => {
    return tenants.filter((t) => t.plan_id === planId).length;
  };

  const getEnforcementColor = (type: 'hard' | 'soft'): string => {
    if (type === 'hard')
      return 'bg-red-500/10 text-red-500 border-red-500/30';
    return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50 p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-display font-bold mb-2">Plan Management</h3>
          <p className="text-sm text-muted-foreground">
            {plans.length} plans across {tenants.length} tenants
          </p>
        </div>

        <div className="space-y-3">
          {plans.map((plan) => {
            const tenantCount = getTenantCount(plan.id);

            return (
              <div
                key={plan.id}
                className="p-4 rounded border border-border/50 hover:border-border hover:bg-card/80 transition-all space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-mono font-bold text-sm mb-2">
                      Plan {plan.id.slice(-8)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tenantCount} tenant{tenantCount !== 1 ? 's' : ''} using this plan
                    </div>
                  </div>
                  <Badge
                    className={`text-xs border ${getEnforcementColor(plan.enforcement_type)}`}
                    variant="outline"
                  >
                    {plan.enforcement_type} enforcement
                  </Badge>
                </div>

                {/* Plan limits */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded bg-card/50 border border-border/50">
                    <div className="text-xs text-muted-foreground mb-1">
                      Burst RPS
                    </div>
                    <div className="text-lg font-display font-bold text-primary">
                      {plan.burst_rps}
                    </div>
                  </div>
                  <div className="p-3 rounded bg-card/50 border border-border/50">
                    <div className="text-xs text-muted-foreground mb-1">
                      Sustained RPM
                    </div>
                    <div className="text-lg font-display font-bold text-primary">
                      {plan.sustained_rpm}
                    </div>
                  </div>
                  <div className="p-3 rounded bg-card/50 border border-border/50">
                    <div className="text-xs text-muted-foreground mb-1">
                      Monthly Quota
                    </div>
                    <div className="text-lg font-display font-bold text-primary">
                      {(plan.monthly_quota / 1000).toFixed(0)}K
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="text-xs text-muted-foreground space-y-1 border-t border-border/50 pt-3">
                  <p>
                    Allows {plan.burst_rps} requests/second in burst mode, {plan.sustained_rpm} requests/minute sustained, and up to{' '}
                    {plan.monthly_quota.toLocaleString()} requests per month.
                  </p>
                  <p>
                    Uses {plan.enforcement_type === 'hard' ? 'hard blocking' : 'soft logging'} when limits are exceeded.
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {plans.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No plans found
          </div>
        )}
      </div>
    </Card>
  );
}
