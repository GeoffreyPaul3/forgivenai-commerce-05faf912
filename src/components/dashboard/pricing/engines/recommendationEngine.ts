import { PricingInputs, MarginResult, ProfitResult, PricingRule, fmt } from './types';

export const PRICING_RULES: PricingRule[] = [
  {
    id: 'below_break_even',
    condition: (i, m) => i.sellingPrice < m.breakEvenPrice && i.sellingPrice > 0,
    severity: 'critical',
    priority: 1,
    title: () => 'Selling Below Break-Even',
    message: (i, m) =>
      `Selling price is MWK ${fmt(m.breakEvenPrice - i.sellingPrice)} below total cost. Increase to at least MWK ${fmt(m.breakEvenPrice + 1)} to avoid a loss on every sale.`
  },
  {
    id: 'margin_below_target',
    condition: (i, m) => m.netMarginPct < i.targetMarginPct && i.sellingPrice >= m.breakEvenPrice && i.sellingPrice > 0,
    severity: 'warning',
    priority: 2,
    title: (i, m) => `Net Margin ${m.netMarginPct.toFixed(1)}% — Below ${i.targetMarginPct}% Target`,
    message: (i) => {
      // Calculate target price using a very simple approximation for text (full engine is better but this works for text)
      const targetPrice = i.vendorCost + i.operationsCost > 0 
        ? Math.ceil((i.vendorCost + i.operationsCost) / (1 - (i.targetMarginPct / 100))) 
        : 0;
      return targetPrice > 0 
        ? `Increase selling price by MWK ${fmt(targetPrice - i.sellingPrice)} to MWK ${fmt(targetPrice)} to reach ${i.targetMarginPct}% gross margin.`
        : `Increase selling price to reach target margin.`;
    }
  },
  {
    id: 'low_roi',
    condition: (_, m) => m.roi < 15 && m.roi > 0,
    severity: 'warning',
    priority: 3,
    title: (_, m) => `Low ROI: ${m.roi.toFixed(1)}%`,
    message: (i, m, p) =>
      `Return on total cost is below 15%. Reducing operational costs by MWK ${fmt(i.operationsCost * 0.1)} would improve ROI to approx ${((p.netProfit + i.operationsCost * 0.1) / (m.breakEvenPrice - i.operationsCost * 0.1) * 100).toFixed(1)}%.`
  },
  {
    id: 'high_vendor_share',
    condition: (_, m) => m.vendorShare > 70,
    severity: 'warning',
    priority: 4,
    title: (_, m) => `Vendor Cost is ${m.vendorShare.toFixed(0)}% of Revenue`,
    message: () => 'Vendor cost dominates revenue. Negotiate bulk pricing or increase selling price to improve the cost structure.'
  },
  {
    id: 'commission_eroding_margin',
    condition: (i) => i.sellingPrice > 0 && (i.vendorCost * i.commissionRate / 100 / i.sellingPrice) > 0.12,
    severity: 'info',
    priority: 5,
    title: (i) => `Agent Commission is ${((i.vendorCost * i.commissionRate / 100 / i.sellingPrice) * 100).toFixed(1)}% of Revenue`,
    message: () => `Commission is above 12% of selling price. Review tier thresholds or adjust vendor cost basis.`
  },
  {
    id: 'healthy_margin',
    condition: (i, m) => m.netMarginPct >= i.targetMarginPct && i.sellingPrice > 0,
    severity: 'success',
    priority: 10,
    title: (_, m) => `Excellent — ${m.netMarginPct.toFixed(1)}% Net Margin`,
    message: (_, m, p) =>
      `FSC earns MWK ${fmt(p.netProfit)} per sale at ${m.netMarginPct.toFixed(1)}% net margin. You can offer up to ${m.maxSafeDiscountPct.toFixed(0)}% discount before break-even.`
  }
];

export function evaluateRules(inputs: PricingInputs, margins: MarginResult, profit: ProfitResult): PricingRule[] {
  return PRICING_RULES.filter(rule => rule.condition(inputs, margins, profit)).sort((a, b) => a.priority - b.priority);
}
