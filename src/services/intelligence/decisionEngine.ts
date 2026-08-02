import { KPIMetricRecommendation } from "@/types/intelligence";

export interface SystemMetricsInput {
  revenueTotal?: number;
  revenueGrowthPercent?: number;
  warehouseCapacityPercent?: number;
  vendorHealthPercent?: number;
  treasuryReserveMWK?: number;
  treasuryThresholdMWK?: number;
  pendingOrdersCount?: number;
  fulfilledOrdersCount?: number;
  topCategoryName?: string;
  topCategoryGrowth?: number;
}

export function computeDecisionIntelligence(metrics: SystemMetricsInput = {}): KPIMetricRecommendation[] {
  const recommendations: KPIMetricRecommendation[] = [];

  // 1. Revenue & Category Growth Intelligence
  const revenue = metrics.revenueTotal ?? 24500000;
  const revGrowth = metrics.revenueGrowthPercent ?? 18;
  const topCat = metrics.topCategoryName ?? "Perfumes & Fragrances";
  
  recommendations.push({
    id: "rec_revenue_perfume",
    metricName: "Monthly Revenue",
    value: `MWK ${(revenue / 1000000).toFixed(1)}M`,
    trend: `↑ ${revGrowth}%`,
    trendDirection: "up",
    health: revGrowth > 10 ? "Optimal" : "Healthy",
    recommendation: `Increase ${topCat} inventory by 15% to capitalize on surging demand.`,
    suggestedAction: "Procure High-Demand Stock",
    actionHandlerCode: "PROCURE_STOCK",
    businessImpact: "Expected additional revenue: MWK 3.2M",
    confidenceScore: 97,
    priority: "high",
    recommendedOwner: "Operations & Systems Manager",
    estimatedCompletionTime: "5 days",
  });

  // 2. Warehouse Capacity Intelligence
  const capacity = metrics.warehouseCapacityPercent ?? 63;
  let capacityHealth: "Optimal" | "Attention Required" | "Critical" = "Optimal";
  let capacityRec = "Current warehouse capacity supports 41 additional operational days.";
  let capacityImpact = "Expansion not required. Capital saved for inventory procurement.";
  let capacityAction = "Maintain Stock Rate";

  if (capacity > 85) {
    capacityHealth = "Critical";
    capacityRec = "Capacity exceeds 85%. Delay vendor onboarding for Category A until clearance.";
    capacityImpact = "Prevents bottleneck delay and excess storage overhead.";
    capacityAction = "Throttle Inventory Inbound";
  } else if (capacity > 75) {
    capacityHealth = "Attention Required";
    capacityRec = "Capacity approaching threshold. Prioritize fast-moving items dispatch.";
    capacityImpact = "Optimizes turnover velocity by 14%.";
    capacityAction = "Accelerate Picking Dispatch";
  }

  recommendations.push({
    id: "rec_warehouse_capacity",
    metricName: "Warehouse Capacity",
    value: `${capacity}%`,
    trend: "Neutral",
    trendDirection: "neutral",
    health: capacityHealth,
    recommendation: capacityRec,
    suggestedAction: capacityAction,
    actionHandlerCode: "MANAGE_CAPACITY",
    businessImpact: capacityImpact,
    confidenceScore: 94,
    priority: capacity > 85 ? "critical" : "medium",
    recommendedOwner: "Operations & Systems Manager",
    estimatedCompletionTime: "7 days",
  });

  // 3. Vendor SLA & Health Intelligence
  const vendorHealth = metrics.vendorHealthPercent ?? 81;
  const vendorHealthStatus: "Healthy" | "Attention Required" = vendorHealth < 85 ? "Attention Required" : "Healthy";

  recommendations.push({
    id: "rec_vendor_sla",
    metricName: "Vendor Response Health",
    value: `${vendorHealth}%`,
    trend: "↓ 4%",
    trendDirection: "down",
    health: vendorHealthStatus,
    recommendation: "Vendor fulfillment response time declining over past 14 days. Schedule formal vendor SLA review.",
    suggestedAction: "Escalate to Operations Manager",
    actionHandlerCode: "ESCALATE_VENDOR_REVIEW",
    businessImpact: "Expected SLA recovery to >90% within 12 days.",
    confidenceScore: 92,
    priority: "high",
    recommendedOwner: "Operations & Systems Manager",
    estimatedCompletionTime: "12 days",
  });

  // 4. Treasury Reserve & Discretionary Capital
  const treasuryReserve = metrics.treasuryReserveMWK ?? 14200000;
  const treasuryThreshold = metrics.treasuryThresholdMWK ?? 15000000;
  const isBelowReserve = treasuryReserve < treasuryThreshold;

  recommendations.push({
    id: "rec_treasury_reserve",
    metricName: "Treasury Reserve Pool",
    value: `MWK ${(treasuryReserve / 1000000).toFixed(1)}M`,
    trend: isBelowReserve ? "↓ 2%" : "↑ 5%",
    trendDirection: isBelowReserve ? "down" : "up",
    health: isBelowReserve ? "Attention Required" : "Optimal",
    recommendation: isBelowReserve
      ? "Treasury reserve pool is currently 5.3% below target operating buffer. Suspend discretionary marketing spend."
      : "Treasury reserve exceeds safety threshold. Allocate 10% towards fast-moving product reserves.",
    suggestedAction: isBelowReserve ? "Suspend Non-Essential Outflows" : "Allocate Capital Growth",
    actionHandlerCode: "TREASURY_BUFFER_CONTROL",
    businessImpact: isBelowReserve ? "Protects liquidity against operational shocks." : "Generates MWK 1.8M incremental yield.",
    confidenceScore: 99,
    priority: isBelowReserve ? "critical" : "medium",
    recommendedOwner: "Finance & Administration Officer",
    estimatedCompletionTime: "Immediate",
  });

  return recommendations;
}
