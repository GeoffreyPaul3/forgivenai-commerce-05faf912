import { PricingInputs, ScenarioResult } from './types';
import { computeCosts } from './costEngine';
import { computeProfit } from './profitEngine';
import { computeMargins } from './marginEngine';
import { computeHealth } from './healthEngine';

export interface ScenarioDefinition {
  id: string;
  label: string;
  delta: (inputs: PricingInputs) => PricingInputs;
}

export const DEFAULT_SCENARIOS: ScenarioDefinition[] = [
  { id: 'commission_10', label: 'Commission → 10%', delta: (i) => ({ ...i, commissionRate: 10 }) },
  { id: 'gateway_up', label: 'Gateway Fees +1%', delta: (i) => ({ ...i, gatewayRate: i.gatewayRate + 1 }) },
  { id: 'vendor_up_15', label: 'Vendor Cost +15%', delta: (i) => ({ ...i, vendorCost: i.vendorCost * 1.15 }) },
  { id: 'discount_20', label: '20% Discount Applied', delta: (i) => ({ ...i, sellingPrice: i.sellingPrice * 0.80 }) },
  { id: 'free_delivery', label: 'Free Delivery', delta: (i) => ({ ...i, deliveryCost: 0 }) },
  { id: 'vendor_down_10', label: 'Vendor Cost −10%', delta: (i) => ({ ...i, vendorCost: i.vendorCost * 0.90 }) },
];

export function runScenario(baseInputs: PricingInputs, baseNetProfit: number, scenario: ScenarioDefinition): ScenarioResult {
  const nextInputs = scenario.delta(baseInputs);
  const nextCosts = computeCosts(nextInputs);
  const nextProfit = computeProfit(nextInputs, nextCosts);
  const nextMargins = computeMargins(nextInputs, nextCosts, nextProfit);
  const nextHealth = computeHealth(nextMargins, nextInputs.targetMarginPct);

  return {
    label: scenario.label,
    netProfit: nextProfit.netProfit,
    netMarginPct: nextMargins.netMarginPct,
    roi: nextMargins.roi,
    delta: nextProfit.netProfit - baseNetProfit,
    healthTier: nextHealth.tier
  };
}
