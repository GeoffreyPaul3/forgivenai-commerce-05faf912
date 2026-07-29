import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PricingInputs, FullPricingResult } from './engines/types';
import { computeCosts } from './engines/costEngine';
import { computeProfit } from './engines/profitEngine';
import { computeMargins } from './engines/marginEngine';
import { computeHealth } from './engines/healthEngine';
import { evaluateRules } from './engines/recommendationEngine';
import { computeSensitivity } from './engines/sensitivityEngine';
import { runScenario, DEFAULT_SCENARIOS } from './engines/scenarioEngine';
import { computeForecast } from './engines/forecastEngine';

const DEFAULT_POLICY = {
  commission_rate: 8.00,
  gateway_rate: 2.50,
  marketing_rate: 3.00,
  platform_rate: 1.00,
  reserve_rate: 1.00,
  tax_rate: 0.00,
  packaging_cost: 500.00,
  delivery_cost: 2000.00,
  target_margin: 30.00
};

export function usePricingEngine(
  vendorCost: number,
  operationsCost: number,
  policyOverrides?: Partial<PricingInputs>
): FullPricingResult {
  // Fetch active policy
  const { data: activePolicy } = useQuery({
    queryKey: ['activePricingPolicy'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_active_pricing_policy');
      if (error || !data || data.length === 0) {
        // Fallback to fetching directly if rpc fails (e.g. migration not fully run)
        const { data: directData } = await supabase.from('pricing_policies').select('*').eq('is_active', true).maybeSingle();
        return directData || DEFAULT_POLICY;
      }
      return data[0];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes cache
  });

  return useMemo(() => {
    const policy = activePolicy || DEFAULT_POLICY;
    const isValid = vendorCost > 0;
    
    // Core inputs 
    const inputs: PricingInputs = {
      vendorCost,
      operationsCost,
      sellingPrice: isValid ? Math.ceil((vendorCost + operationsCost) / 0.80) : 0,
      gatewayRate: policyOverrides?.gatewayRate ?? policy.gateway_rate,
      marketingRate: policyOverrides?.marketingRate ?? policy.marketing_rate,
      commissionRate: policyOverrides?.commissionRate ?? policy.commission_rate,
      platformRate: policyOverrides?.platformRate ?? policy.platform_rate,
      reserveRate: policyOverrides?.reserveRate ?? policy.reserve_rate,
      taxRate: policyOverrides?.taxRate ?? policy.tax_rate,
      packagingCost: policyOverrides?.packagingCost ?? policy.packaging_cost,
      deliveryCost: policyOverrides?.deliveryCost ?? policy.delivery_cost,
      targetMarginPct: policyOverrides?.targetMarginPct ?? policy.target_margin
    };

    const costs = computeCosts(inputs);
    const profit = computeProfit(inputs, costs);
    const margins = computeMargins(inputs, costs, profit);
    const health = computeHealth(margins, inputs.targetMarginPct);
    const recommendations = evaluateRules(inputs, margins, profit);
    const sensitivity = computeSensitivity(inputs, costs, profit);
    const forecast = computeForecast(inputs, profit);
    const scenarios = DEFAULT_SCENARIOS.map(s => runScenario(inputs, profit.netProfit, s));

    // Legacy fields for backward compatibility
    const sellingPrice = inputs.sellingPrice;
    const grossProfit = profit.grossProfit;
    const grossMarginPct = margins.grossMarginPct;
    const breakEvenPrice = margins.breakEvenPrice;
    const maxDiscountPct = margins.maxSafeDiscountPct;
    const markupPct = margins.markupPct;
    const minProfitablePrice = breakEvenPrice + 1;
    
    const confidenceScore = health.score;
    const confidenceLabel = health.tier;
    const executiveInsight = recommendations.length > 0 ? recommendations[0].message(inputs, margins, profit) : '';

    const vendorCostPct = margins.vendorShare;
    const operationsPct = sellingPrice > 0 ? (operationsCost / sellingPrice) * 100 : 0;
    const fscProfitPct = margins.netMarginPct; // Using net margin for FSC profit in UI 

    const priceForMargin = (targetPct: number) => costs.totalCost > 0 ? Math.ceil(costs.totalCost / (1 - targetPct / 100)) : 0;
    const discountedPrice = (pct: number) => sellingPrice * (1 - pct / 100);
    const discountedProfit = (pct: number) => discountedPrice(pct) - costs.totalCost;
    const discountedMargin = (pct: number) => discountedPrice(pct) > 0 ? (discountedProfit(pct) / discountedPrice(pct)) * 100 : 0;

    return {
      inputs,
      isValid,
      costs,
      profit,
      margins,
      health,
      recommendations,
      sensitivity,
      scenarios,
      forecast,
      
      sellingPrice,
      grossProfit,
      grossMarginPct,
      markupPct,
      breakEvenPrice,
      maxDiscountPct,
      minProfitablePrice,
      confidenceScore,
      confidenceLabel,
      executiveInsight,
      vendorCostPct,
      operationsPct,
      fscProfitPct,
      priceForMargin,
      discountedPrice,
      discountedProfit,
      discountedMargin
    };
  }, [vendorCost, operationsCost, activePolicy, policyOverrides]);
}
