import Image from "next/image";
import DashboardCard from "@/components/dashboard/card";
import { Bullet } from "@/components/ui/bullet";
import { Badge } from "@/components/ui/badge";
import type { GatewayMetric } from "@/types/dashboard";

interface GatewayMetricsProps {
  metrics: GatewayMetric[];
}

export default function GatewayMetrics({ metrics }: GatewayMetricsProps) {
  return (
    <DashboardCard
      title="TOP TENANTS"
      intent="success"
      addon={
        <Badge variant="outline-success">{metrics.length} ACTIVE</Badge>
      }
    >
      <div className="flex flex-col gap-4">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className="flex items-center gap-3 p-3 rounded border border-border hover:border-primary/50 transition-colors"
          >
            <div className="shrink-0 size-10 rounded overflow-hidden bg-primary/10">
              <Image
                src={metric.avatar || "/placeholder.svg"}
                alt={metric.name}
                width={40}
                height={40}
                className="size-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium truncate">
                  {metric.name}
                </span>
                {metric.featured && (
                  <Badge variant="secondary" className="text-xs">
                    TOP
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {metric.tenantId}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-baseline gap-1">
                <Bullet className="text-success" />
                <span className="text-sm font-medium">{metric.requestCount}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {metric.blockedCount} blocked
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
