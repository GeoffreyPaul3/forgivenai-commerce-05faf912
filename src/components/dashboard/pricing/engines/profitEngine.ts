import { PricingInputs, CostBreakdown, ProfitResult } from './types';

export function computeProfit(inputs: PricingInputs, costs: CostBreakdown): ProfitResult {
  const grossProfit = inputs.sellingPrice - costs.vendorCost - costs.operationsCost;
  const netProfit = inputs.sellingPrice - costs.totalCost;

  return {
    grossProfit,
    netProfit
  };
}
