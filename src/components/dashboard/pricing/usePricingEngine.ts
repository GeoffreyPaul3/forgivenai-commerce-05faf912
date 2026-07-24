import { useMemo } from "react";

export interface ScenarioResult {
  price: number;
  profit: number;
  margin: number;
  delta: number; // delta vs base margin
}

export interface PricingMetrics {
  sellingPrice: number;
  grossProfit: number;
  grossMarginPct: number;
  markupPct: number;
  breakEvenPrice: number;
  maxDiscountPct: number;
  minProfitablePrice: number; // NEW: minimum price for any profit
  confidenceScore: number;
  confidenceLabel: "Excellent" | "Good" | "Caution" | "Risk";
  vendorCostPct: number;
  operationsPct: number;
  fscProfitPct: number;
  isValid: boolean;
  // Advisory helpers
  priceForMargin: (targetMarginPct: number) => number;
  discountedPrice: (discountPct: number) => number;
  discountedProfit: (discountPct: number) => number;
  discountedMargin: (discountPct: number) => number;
  // Sensitivity scenarios
  scenarioSupplierUp10: ScenarioResult;
  scenarioSupplierDown10: ScenarioResult;
  scenarioDiscount15: ScenarioResult;
  // Narrative
  executiveInsight: string;
  // Scalability (existing)
  scalability: {
    revenuePerSale: number;
    profit100: number;
    profit1000: number;
    profit10000: number;
  };
  // NEW: Bulk order projections
  bulkProjections: Array<{ units: number; revenue: number; totalProfit: number; profitPerUnit: number }>;
  // NEW: Time-based forecasts
  forecast: {
    dailyUnitsNeeded: (targetMonthlyProfit: number) => number;
    monthlyRevenue: (dailySales: number) => number;
    yearlyRevenue: (dailySales: number) => number;
    monthlyProfit: (dailySales: number) => number;
    yearlyProfit: (dailySales: number) => number;
  };
}

/**
 * usePricingEngine — pure reactive pricing calculation hook.
 * The pricing formula (ceil((cost + ops) / 0.55)) is unchanged from
 * the existing VendorProductsPage business logic and is NOT modified here.
 */
export function usePricingEngine(
  vendorCost: number,
  operationsCost: number
): PricingMetrics {
  return useMemo(() => {
    const isValid = vendorCost > 0;
    const totalCost = vendorCost + operationsCost;

    // ── Core formula (unchanged) ─────────────────────────────────────────────
    const sellingPrice = isValid ? Math.ceil(totalCost / 0.55) : 0;
    const grossProfit = sellingPrice - totalCost;
    const grossMarginPct =
      sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;
    const markupPct = vendorCost > 0 ? (grossProfit / vendorCost) * 100 : 0;
    const breakEvenPrice = totalCost;
    const maxDiscountPct =
      sellingPrice > 0
        ? ((sellingPrice - breakEvenPrice) / sellingPrice) * 100
        : 0;

    // ── Percentage splits ────────────────────────────────────────────────────
    const vendorCostPct =
      sellingPrice > 0 ? (vendorCost / sellingPrice) * 100 : 0;
    const operationsPct =
      sellingPrice > 0 ? (operationsCost / sellingPrice) * 100 : 0;
    const fscProfitPct = grossMarginPct;

    // ── Confidence Score (0–100, weighted composite) ─────────────────────────
    // margin weight 40% | discount resilience 20% | cost ratio 20% | markup 20%
    const marginScore = Math.min(100, (grossMarginPct / 45) * 100) * 0.4;
    const discountScore =
      Math.min(100, (maxDiscountPct / 25) * 100) * 0.2;
    const costRatioScore =
      Math.min(100, ((100 - vendorCostPct) / 50) * 100) * 0.2;
    const markupScore = Math.min(100, (markupPct / 80) * 100) * 0.2;
    const rawConfidence = isValid
      ? Math.round(marginScore + discountScore + costRatioScore + markupScore)
      : 0;
    const confidenceScore = Math.min(100, Math.max(0, rawConfidence));
    const confidenceLabel: PricingMetrics["confidenceLabel"] =
      confidenceScore >= 80
        ? "Excellent"
        : confidenceScore >= 60
        ? "Good"
        : confidenceScore >= 40
        ? "Caution"
        : "Risk";

    // ── Advisory helpers ─────────────────────────────────────────────────────
    const priceForMargin = (targetPct: number): number =>
      totalCost > 0 ? Math.ceil(totalCost / (1 - targetPct / 100)) : 0;

    const discountedPrice = (pct: number): number =>
      sellingPrice * (1 - pct / 100);
    const discountedProfit = (pct: number): number =>
      discountedPrice(pct) - totalCost;
    const discountedMargin = (pct: number): number => {
      const dp = discountedPrice(pct);
      return dp > 0 ? (discountedProfit(pct) / dp) * 100 : 0;
    };

    // ── Sensitivity scenarios ────────────────────────────────────────────────
    const makeScenario = (
      costMultiplier: number,
      discPct: number
    ): ScenarioResult => {
      const newVendorCost = vendorCost * costMultiplier;
      const newTotalCost = newVendorCost + operationsCost;
      const dp = sellingPrice * (1 - discPct / 100);
      const profit = dp - newTotalCost;
      const margin = dp > 0 ? (profit / dp) * 100 : 0;
      return { price: dp, profit, margin, delta: margin - grossMarginPct };
    };

    // ── Executive AI Insight (template-driven, deterministic) ────────────────
    let executiveInsight = "";
    if (!isValid) {
      executiveInsight =
        "Enter a supplier cost above to unlock live pricing intelligence.";
    } else {
      const currency = "MWK";
      const profitStr = `${currency} ${Math.round(grossProfit).toLocaleString()}`;
      const marginStr = grossMarginPct.toFixed(1);
      const disc15Str = makeScenario(1, 15).margin.toFixed(1);
      const vendorPctStr = vendorCostPct.toFixed(1);
      const maxDiscStr = maxDiscountPct.toFixed(0);

      if (grossMarginPct >= 35) {
        executiveInsight = `Excellent product. FSC retains ${profitStr} (${marginStr}%) per sale. A 15% promotional discount still holds a ${disc15Str}% margin — healthy range. You can discount up to ${maxDiscStr}% before hitting break-even. Supplier cost is ${vendorPctStr}% of revenue — well within range.`;
      } else if (grossMarginPct >= 25) {
        executiveInsight = `Solid pricing profile. FSC earns ${profitStr} (${marginStr}%) per sale. Limit discounts to 10% to protect profitability. Supplier cost is ${vendorPctStr}% of revenue. Consider negotiating bulk pricing to improve margins further.`;
      } else if (grossMarginPct >= 15) {
        executiveInsight = `Thin margin at ${marginStr}%. FSC earns ${profitStr} per sale, but any discount above 5% approaches break-even. Supplier cost (${vendorPctStr}% of revenue) is high — a 10% cost reduction would improve margin to approximately ${(
          ((grossProfit + vendorCost * 0.1) / sellingPrice) *
          100
        ).toFixed(1)}%.`;
      } else {
        executiveInsight = `⚠️ Margin alert: only ${marginStr}% gross margin. FSC retains ${profitStr} per sale at current pricing. Discounting is not recommended. Strongly consider increasing the selling price or renegotiating supplier terms to achieve at least 25% gross margin.`;
      }
    }

    const minProfitablePrice = totalCost + 1; // 1 MWK above cost = any profit

    // ── Bulk order projections ───────────────────────────────────────────────
    const bulkProjections = [5, 10, 20, 50].map((units) => ({
      units,
      revenue: sellingPrice * units,
      totalProfit: grossProfit * units,
      profitPerUnit: grossProfit,
    }));

    // ── Time-based forecasts ─────────────────────────────────────────────────
    const forecast = {
      dailyUnitsNeeded: (targetMonthlyProfit: number) =>
        grossProfit > 0 ? Math.ceil(targetMonthlyProfit / (grossProfit * 30)) : 0,
      monthlyRevenue: (dailySales: number) => sellingPrice * dailySales * 30,
      yearlyRevenue: (dailySales: number) => sellingPrice * dailySales * 365,
      monthlyProfit: (dailySales: number) => grossProfit * dailySales * 30,
      yearlyProfit: (dailySales: number) => grossProfit * dailySales * 365,
    };

    return {
      sellingPrice,
      grossProfit,
      grossMarginPct,
      markupPct,
      breakEvenPrice,
      maxDiscountPct,
      minProfitablePrice,
      confidenceScore,
      confidenceLabel,
      vendorCostPct,
      operationsPct,
      fscProfitPct,
      isValid,
      priceForMargin,
      discountedPrice,
      discountedProfit,
      discountedMargin,
      scenarioSupplierUp10: makeScenario(1.1, 0),
      scenarioSupplierDown10: makeScenario(0.9, 0),
      scenarioDiscount15: makeScenario(1, 15),
      executiveInsight,
      scalability: {
        revenuePerSale: sellingPrice,
        profit100: grossProfit * 100,
        profit1000: grossProfit * 1000,
        profit10000: grossProfit * 10000,
      },
      bulkProjections,
      forecast,
    };
  }, [vendorCost, operationsCost]);
}
