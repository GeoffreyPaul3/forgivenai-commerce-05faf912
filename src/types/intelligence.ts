export type HealthStatus = "Optimal" | "Healthy" | "Attention Required" | "Critical" | "Low Risk";

export type ImpactPriority = "critical" | "high" | "medium" | "low";

export interface KPIMetricRecommendation {
  id: string;
  metricName: string;
  value: string | number;
  unit?: string;
  trend: string; // e.g. "↑ 18%" or "↓ 4%"
  trendDirection: "up" | "down" | "neutral";
  health: HealthStatus;
  recommendation: string;
  suggestedAction: string;
  actionHandlerCode?: string;
  businessImpact: string; // e.g. "Expected additional revenue MWK 3.2M"
  confidenceScore: number; // 0 - 100%
  priority: ImpactPriority;
  recommendedOwner: string;
  estimatedCompletionTime?: string;
  contextData?: Record<string, any>;
}

export interface ExecutiveBriefingInsight {
  id: string;
  category: "Revenue" | "Operations" | "Treasury" | "Vendors" | "Risk";
  headline: string;
  summary: string;
  impactScore: number;
  actionRequired: boolean;
}
