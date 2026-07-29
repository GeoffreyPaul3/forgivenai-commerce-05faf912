import { PricingInputs, CostBreakdown, ProfitResult, SensitivityFactor } from './types';
import { computeCosts } from './costEngine';
import { computeProfit } from './profitEngine';

export function computeSensitivity(inputs: PricingInputs, costs: CostBreakdown, profit: ProfitResult): SensitivityFactor[] {
  // If no profit, sensitivity is not meaningful
  if (profit.netProfit <= 0 || inputs.sellingPrice <= 0) return [];

  const factors: { key: keyof CostBreakdown; label: string; isRate?: boolean; rateKey?: keyof PricingInputs }[] = [
    { key: 'vendorCost', label: 'Vendor Cost' },
    { key: 'operationsCost', label: 'Operations Cost' },
    { key: 'packagingCost', label: 'Packaging Cost' },
    { key: 'deliveryCost', label: 'Delivery Cost' },
    { key: 'gatewayFee', label: 'Gateway Fee', isRate: true, rateKey: 'gatewayRate' },
    { key: 'marketingCost', label: 'Marketing', isRate: true, rateKey: 'marketingRate' },
    { key: 'commissionAmount', label: 'Agent Commission', isRate: true, rateKey: 'commissionRate' },
  ];

  let totalImpact = 0;
  const rawFactors = factors.map(factor => {
    // What happens if we increase this cost by 1%?
    const currentValue = costs[factor.key] as number;
    if (currentValue <= 0) return { ...factor, impactOnProfit: 0, currentValue };

    let nextInputs = { ...inputs };
    if (factor.isRate && factor.rateKey) {
      // Increase rate slightly
      nextInputs[factor.rateKey] = (inputs[factor.rateKey] as number) * 1.01;
    } else {
      nextInputs[factor.key as keyof PricingInputs] = (inputs[factor.key as keyof PricingInputs] as number) * 1.01;
    }

    const nextCosts = computeCosts(nextInputs);
    const nextProfit = computeProfit(nextInputs, nextCosts);
    const impact = Math.abs(profit.netProfit - nextProfit.netProfit);
    totalImpact += impact;

    return {
      ...factor,
      currentValue,
      impactOnProfit: impact
    };
  });

  if (totalImpact === 0) return [];

  return rawFactors
    .filter(f => f.impactOnProfit > 0)
    .map(f => ({
      key: f.key,
      label: f.label,
      currentValue: f.currentValue,
      impactOnProfit: f.impactOnProfit,
      impactPct: (f.impactOnProfit / totalImpact) * 100,
      direction: 'negative' as const
    }))
    .sort((a, b) => b.impactPct - a.impactPct);
}
