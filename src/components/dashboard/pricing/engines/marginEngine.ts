import { PricingInputs, CostBreakdown, ProfitResult, MarginResult } from './types';

export function computeMargins(inputs: PricingInputs, costs: CostBreakdown, profit: ProfitResult): MarginResult {
  const { sellingPrice, vendorCost } = inputs;
  const { totalCost, commissionAmount } = costs;
  
  const grossMarginPct = sellingPrice > 0 ? (profit.grossProfit / sellingPrice) * 100 : 0;
  const netMarginPct = sellingPrice > 0 ? (profit.netProfit / sellingPrice) * 100 : 0;
  
  const markupPct = vendorCost > 0 ? (profit.netProfit / vendorCost) * 100 : 0;
  const roi = totalCost > 0 ? (profit.netProfit / totalCost) * 100 : 0;
  
  const costRatio = sellingPrice > 0 ? (totalCost / sellingPrice) * 100 : 0;
  const profitMultiple = vendorCost > 0 ? sellingPrice / vendorCost : 0;
  
  const vendorShare = sellingPrice > 0 ? (vendorCost / sellingPrice) * 100 : 0;
  const fscShare = sellingPrice > 0 ? (profit.netProfit / sellingPrice) * 100 : 0;
  const agentShare = sellingPrice > 0 ? (commissionAmount / sellingPrice) * 100 : 0;

  const breakEvenPrice = totalCost;
  const maxSafeDiscountPct = sellingPrice > 0 ? ((sellingPrice - breakEvenPrice) / sellingPrice) * 100 : 0;

  return {
    grossMarginPct,
    netMarginPct,
    markupPct,
    roi,
    costRatio,
    profitMultiple,
    vendorShare,
    fscShare,
    agentShare,
    breakEvenPrice,
    maxSafeDiscountPct
  };
}
