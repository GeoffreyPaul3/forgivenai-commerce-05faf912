export interface PricingInputs {
  vendorCost: number;
  operationsCost: number;
  sellingPrice: number;
  gatewayRate: number;
  marketingRate: number;
  commissionRate: number;
  platformRate: number;
  reserveRate: number;
  taxRate: number;
  packagingCost: number;
  deliveryCost: number;
  targetMarginPct: number;
}

export interface CostBreakdown {
  vendorCost: number;
  operationsCost: number;
  gatewayFee: number;
  marketingCost: number;
  commissionAmount: number;
  platformFee: number;
  reserveAmount: number;
  taxAmount: number;
  packagingCost: number;
  deliveryCost: number;
  totalDirectCosts: number;
  totalSalesCosts: number;
  totalBusinessCosts: number;
  totalCost: number;
}

export interface ProfitResult {
  grossProfit: number;
  netProfit: number;
}

export interface MarginResult {
  grossMarginPct: number;
  netMarginPct: number;
  markupPct: number;
  roi: number;
  costRatio: number;
  profitMultiple: number;
  vendorShare: number;
  fscShare: number;
  agentShare: number;
  breakEvenPrice: number;
  maxSafeDiscountPct: number;
}

export interface PricingRule {
  id: string;
  condition: (inputs: PricingInputs, margin: MarginResult, profit: ProfitResult) => boolean;
  severity: 'critical' | 'warning' | 'info' | 'success';
  priority: number;
  title: (inputs: PricingInputs, margin: MarginResult) => string;
  message: (inputs: PricingInputs, margin: MarginResult, profit: ProfitResult) => string;
}

export interface HealthResult {
  score: number;
  tier: 'Excellent' | 'Healthy' | 'Needs Review' | 'Unprofitable';
  color: string;
}

export interface SensitivityFactor {
  key: keyof CostBreakdown;
  label: string;
  currentValue: number;
  impactOnProfit: number;
  impactPct: number;
  direction: 'positive' | 'negative';
}

export interface ScenarioResult {
  label: string;
  netProfit: number;
  netMarginPct: number;
  roi: number;
  delta: number;
  healthTier: HealthResult['tier'];
}

export interface ForecastResult {
  day: { revenue: number; profit: number };
  week: { revenue: number; profit: number };
  month: { revenue: number; profit: number };
  quarter: { revenue: number; profit: number };
  year: { revenue: number; profit: number };
  projections: Array<{ label: string; sales: number; revenue: number; profit: number }>;
}

export interface FullPricingResult {
  inputs: PricingInputs;
  isValid: boolean;
  costs: CostBreakdown;
  profit: ProfitResult;
  margins: MarginResult;
  health: HealthResult;
  recommendations: PricingRule[];
  sensitivity: SensitivityFactor[];
  scenarios: ScenarioResult[];
  forecast: ForecastResult;
  
  // Legacy aliases
  sellingPrice: number;
  grossProfit: number;
  grossMarginPct: number;
  markupPct: number;
  breakEvenPrice: number;
  maxDiscountPct: number;
  confidenceScore: number;
  confidenceLabel: string;
  executiveInsight: string;
  vendorCostPct: number;
  operationsPct: number;
  fscProfitPct: number;
  priceForMargin: (targetPct: number) => number;
  discountedPrice: (pct: number) => number;
  discountedProfit: (pct: number) => number;
  discountedMargin: (pct: number) => number;
}

// Helpers
export const fmt = (num: number) => Math.round(num).toLocaleString('en-US');
