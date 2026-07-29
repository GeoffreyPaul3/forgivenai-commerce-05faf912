import { PricingInputs, ProfitResult, ForecastResult } from './types';

export function computeForecast(inputs: PricingInputs, profit: ProfitResult, expectedDailySales: number = 2): ForecastResult {
  const dRevenue = inputs.sellingPrice * expectedDailySales;
  const dProfit = profit.netProfit * expectedDailySales;

  const projections = [1, 10, 50, 100, 500, 1000].map(sales => ({
    label: `${sales} Sales`,
    sales,
    revenue: inputs.sellingPrice * sales,
    profit: profit.netProfit * sales
  }));

  return {
    day: { revenue: dRevenue, profit: dProfit },
    week: { revenue: dRevenue * 7, profit: dProfit * 7 },
    month: { revenue: dRevenue * 30, profit: dProfit * 30 },
    quarter: { revenue: dRevenue * 90, profit: dProfit * 90 },
    year: { revenue: dRevenue * 365, profit: dProfit * 365 },
    projections
  };
}
