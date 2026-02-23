export interface DashboardStat {
  label: string;
  value: string;
  description: string;
  intent: "positive" | "negative" | "neutral";
  icon: string;
  tag?: string;
  direction?: "up" | "down";
}

export interface ChartDataPoint {
  date: string;
  requests: number;
  blocked: number;
  rateLimited: number;
}

export interface ChartData {
  week: ChartDataPoint[];
  month: ChartDataPoint[];
  year: ChartDataPoint[];
}

export interface GatewayMetric {
  id: number;
  name: string;
  tenantId: string;
  requestCount: number;
  blockedCount: number;
  avatar: string;
  featured?: boolean;
  status?: string;
}

export interface GatewayStatus {
  title: string;
  value: string;
  status: string;
  variant: "success" | "warning" | "destructive";
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: "info" | "warning" | "success" | "error";
  read: boolean;
  priority: "low" | "medium" | "high";
}

export interface WidgetData {
  location: string;
  timezone: string;
  temperature: string;
  weather: string;
  date: string;
}

export interface RebelRanking {
  // Define the structure of RebelRanking here
}

export interface SecurityStatus {
  // Define the structure of SecurityStatus here
}

export interface MockData {
  dashboardStats: DashboardStat[];
  chartData: ChartData;
  gatewayMetrics: GatewayMetric[];
  gatewayStatus: GatewayStatus[];
  notifications: Notification[];
  widgetData: WidgetData;
}

export type TimePeriod = "week" | "month" | "year";
