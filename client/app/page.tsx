import DashboardPageLayout from "@/components/dashboard/layout";
import DashboardStat from "@/components/dashboard/stat";
import DashboardChart from "@/components/dashboard/chart";
import GatewayMetrics from "@/components/dashboard/gateway-metrics";
import GatewayStatusComponent from "@/components/dashboard/security-status";
import BracketsIcon from "@/components/icons/brackets";
import GearIcon from "@/components/icons/gear";
import ProcessorIcon from "@/components/icons/proccesor";
import BoomIcon from "@/components/icons/boom";
import mockDataJson from "@/mock.json";
import type { MockData } from "@/types/dashboard";
import Link from "next/link";
import { Card } from "@/components/ui/card";

const mockData = mockDataJson as MockData;

// Icon mapping
const iconMap = {
  gear: GearIcon,
  proccesor: ProcessorIcon,
  boom: BoomIcon,
};

export default function DashboardOverview() {
  return (
    <DashboardPageLayout
      header={{
        title: "Aegis Gateway Overview",
        description: "API request monitoring and tenant management",
        icon: BracketsIcon,
      }}
    >
      {/* Detailed Aegis Monitor Link */}
      <Link href="/aegis" className="block mb-6">
        <Card className="bg-primary/10 hover:bg-primary/20 border-primary/30 hover:border-primary/50 transition-all p-4 cursor-pointer">
          <h3 className="font-display font-bold text-primary mb-1">
            Aegis Monitor Dashboard
          </h3>
          <p className="text-sm text-muted-foreground">
            Real-time visualization of the 5-stage middleware pipeline, per-tenant metrics, request logs, and debug tools →
          </p>
        </Card>
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {mockData.dashboardStats.map((stat, index) => (
          <DashboardStat
            key={index}
            label={stat.label}
            value={stat.value}
            description={stat.description}
            icon={iconMap[stat.icon as keyof typeof iconMap]}
            tag={stat.tag}
            intent={stat.intent}
            direction={stat.direction}
          />
        ))}
      </div>

      <div className="mb-6">
        <DashboardChart />
      </div>

      {/* Main 2-column grid section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <GatewayMetrics metrics={mockData.gatewayMetrics} />
        <GatewayStatusComponent statuses={mockData.gatewayStatus} />
      </div>
    </DashboardPageLayout>
  );
}
