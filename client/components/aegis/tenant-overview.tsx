'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Tenant, Plan } from '@/types/aegis';

interface TenantOverviewProps {
  tenants: Tenant[];
  plans: Map<string, Plan>;
  metrics?: Map<
    string,
    {
      burst: number;
      rate: number;
      quota: number;
    }
  >;
  onSelectTenant?: (tenant: Tenant) => void;
}

export function TenantOverview({
  tenants,
  plans,
  metrics,
  onSelectTenant,
}: TenantOverviewProps) {
  const getStatusColor = (status: string): string => {
    if (status === 'active') return 'bg-green-500/10 text-green-500 border-green-500/30';
    return 'bg-red-500/10 text-red-500 border-red-500/30';
  };

  const getUtilizationColor = (percentage: number): string => {
    if (percentage > 80) return 'text-red-500';
    if (percentage > 50) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50 p-6">
      <div className="space-y-2 mb-6">
        <h3 className="text-lg font-display font-bold">Multi-Tenant Overview</h3>
        <p className="text-sm text-muted-foreground">
          {tenants.length} total tenants ({tenants.filter((t) => t.status === 'active').length} active)
        </p>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {tenants.map((tenant) => {
          const plan = plans.get(tenant.plan_id);
          const tenantMetrics = metrics?.get(tenant.id);

          return (
            <div
              key={tenant.id}
              onClick={() => onSelectTenant?.(tenant)}
              className="p-4 rounded border border-border/50 hover:border-border hover:bg-card/80 transition-all cursor-pointer space-y-3 group"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono font-bold text-sm">{tenant.id}</span>
                    <Badge
                      className={`text-xs ${getStatusColor(tenant.status)} border`}
                      variant="outline"
                    >
                      {tenant.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Plan:{' '}
                    <span className="font-mono">
                      {plan?.burst_rps}rps / {plan?.sustained_rpm}rpm / {plan?.monthly_quota.toLocaleString()}
                    </span>
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-muted-foreground mb-2">Utilization</p>
                  <div className="flex gap-2 text-xs font-mono font-bold">
                    <span className={getUtilizationColor(tenantMetrics?.burst ?? 0)}>
                      {(tenantMetrics?.burst ?? 0).toFixed(0)}%
                    </span>
                    <span className={getUtilizationColor(tenantMetrics?.rate ?? 0)}>
                      {(tenantMetrics?.rate ?? 0).toFixed(0)}%
                    </span>
                    <span className={getUtilizationColor(tenantMetrics?.quota ?? 0)}>
                      {(tenantMetrics?.quota ?? 0).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Mini progress bars */}
              <div className="flex gap-2">
                <div className="flex-1 flex flex-col gap-1">
                  <div className="text-xs text-muted-foreground">Burst</div>
                  <div className="w-full bg-border/50 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        (tenantMetrics?.burst ?? 0) > 80
                          ? 'bg-red-500'
                          : (tenantMetrics?.burst ?? 0) > 50
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                      }`}
                      style={{
                        width: `${Math.min(tenantMetrics?.burst ?? 0, 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <div className="text-xs text-muted-foreground">Rate</div>
                  <div className="w-full bg-border/50 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        (tenantMetrics?.rate ?? 0) > 80
                          ? 'bg-red-500'
                          : (tenantMetrics?.rate ?? 0) > 50
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                      }`}
                      style={{
                        width: `${Math.min(tenantMetrics?.rate ?? 0, 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <div className="text-xs text-muted-foreground">Quota</div>
                  <div className="w-full bg-border/50 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        (tenantMetrics?.quota ?? 0) > 80
                          ? 'bg-red-500'
                          : (tenantMetrics?.quota ?? 0) > 50
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                      }`}
                      style={{
                        width: `${Math.min(tenantMetrics?.quota ?? 0, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {tenants.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No tenants found
        </div>
      )}
    </Card>
  );
}
