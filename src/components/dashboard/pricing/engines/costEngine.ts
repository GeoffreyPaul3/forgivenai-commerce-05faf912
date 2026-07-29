import { PricingInputs, CostBreakdown } from './types';

export function computeCosts(inputs: PricingInputs): CostBreakdown {
  const {
    vendorCost,
    operationsCost,
    sellingPrice,
    gatewayRate,
    marketingRate,
    commissionRate,
    platformRate,
    reserveRate,
    taxRate,
    packagingCost,
    deliveryCost
  } = inputs;

  const gatewayFee = (sellingPrice * gatewayRate) / 100;
  const marketingCost = (sellingPrice * marketingRate) / 100;
  const commissionAmount = (vendorCost * commissionRate) / 100;
  const platformFee = (sellingPrice * platformRate) / 100;
  const reserveAmount = (sellingPrice * reserveRate) / 100;
  const taxAmount = (sellingPrice * taxRate) / 100;

  const totalDirectCosts = vendorCost + operationsCost + packagingCost + deliveryCost;
  const totalSalesCosts = commissionAmount + marketingCost;
  const totalBusinessCosts = reserveAmount + platformFee + taxAmount + gatewayFee;

  const totalCost = totalDirectCosts + totalSalesCosts + totalBusinessCosts;

  return {
    vendorCost,
    operationsCost,
    gatewayFee,
    marketingCost,
    commissionAmount,
    platformFee,
    reserveAmount,
    taxAmount,
    packagingCost,
    deliveryCost,
    totalDirectCosts,
    totalSalesCosts,
    totalBusinessCosts,
    totalCost
  };
}
