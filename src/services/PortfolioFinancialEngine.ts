import { computeCosts } from "@/components/dashboard/pricing/engines/costEngine";
import { computeProfit } from "@/components/dashboard/pricing/engines/profitEngine";
import { computeMargins } from "@/components/dashboard/pricing/engines/marginEngine";
import { PricingInputs, CostBreakdown } from "@/components/dashboard/pricing/engines/types";

export interface OrderItem {
  product_id?: string;
  name?: string;
  price: number;
  quantity: number;
  vendor_id?: string;
  vendor_cost?: number; // legacy payload might have this
}

export interface Order {
  id: string;
  total: number;
  status: string;
  created_at: string;
  items: OrderItem[];
  agent_commission_total?: number; // legacy but maybe actual
}

export interface Product {
  id: string;
  name: string;
  vendor_cost: number;
  price: number;
  vendor_id?: string;
}

export interface Vendor {
  id: string;
  name: string;
}

export interface PricingPolicy {
  commission_rate: number;
  gateway_rate: number;
  marketing_rate: number;
  platform_rate: number;
  reserve_rate: number;
  tax_rate: number;
  packaging_cost: number;
  delivery_cost: number;
  operations_cost: number;
}

export interface ProductIntelligence {
  id: string;
  name: string;
  revenue: number;
  unitsSold: number;
  vendorCost: number;
  totalCost: number;
  netProfit: number;
  margin: number;
  roi: number;
  contribution: number; // % of total portfolio profit
  classification: string;
}

export interface VendorIntelligence {
  id: string;
  name: string;
  revenue: number;
  costs: number;
  profit: number;
  commission: number;
  roi: number;
  contribution: number; // % of total portfolio profit
  healthScore: number;
}

export class PortfolioFinancialEngine {
  private orders: Order[];
  private products: Record<string, Product>;
  private vendors: Record<string, Vendor>;
  private policy: PricingPolicy;

  private aggregatedRevenue = 0;
  private aggregatedCosts: CostBreakdown = {
    vendorCost: 0, operationsCost: 0, gatewayFee: 0, marketingCost: 0,
    commissionAmount: 0, platformFee: 0, reserveAmount: 0, taxAmount: 0,
    packagingCost: 0, deliveryCost: 0, totalDirectCosts: 0,
    totalSalesCosts: 0, totalBusinessCosts: 0, totalCost: 0
  };
  private aggregatedNetProfit = 0;
  private aggregatedGrossProfit = 0;

  private productMetrics: Record<string, ProductIntelligence> = {};
  private vendorMetrics: Record<string, VendorIntelligence> = {};

  constructor(
    orders: Order[],
    products: Product[],
    vendors: Vendor[],
    policy: PricingPolicy
  ) {
    this.orders = orders.filter(o => ['paid', 'confirmed', 'processing', 'shipped', 'delivered'].includes(o.status));
    this.policy = policy || {
      commission_rate: 8, gateway_rate: 2.5, marketing_rate: 3, platform_rate: 1,
      reserve_rate: 1, tax_rate: 0, packaging_cost: 500, delivery_cost: 2000, operations_cost: 5000
    };

    this.products = products.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
    this.vendors = vendors.reduce((acc, v) => ({ ...acc, [v.id]: v }), {});

    this.processPortfolio();
  }

  private processPortfolio() {
    let totalPortfolioNetProfit = 0;

    this.orders.forEach(order => {
      this.aggregatedRevenue += Number(order.total || 0);

      const items = order.items || [];
      const orderItemCount = items.length || 1;

      items.forEach((item: OrderItem) => {
        const productId = item.product_id || item.name || "Unknown";
        const quantity = item.quantity || 1;
        const itemRevenue = (item.price || 0) * quantity;

        // Determine Vendor Cost (prioritize payload, fallback to product table)
        let baseVendorCost = item.vendor_cost || 0;
        if (!baseVendorCost && item.product_id && this.products[item.product_id]) {
          baseVendorCost = this.products[item.product_id].vendorCost || this.products[item.product_id].vendor_cost || 0;
        }
        const totalVendorCost = baseVendorCost * quantity;

        // Proportionate per-item fixed costs from policy based on quantity vs order items
        // Wait, if an order has 2 items, operations_cost applies per item or per order?
        // Typically, pricing engine is per item. We will apply policy rates per item revenue.
        
        const inputs: PricingInputs = {
          vendorCost: totalVendorCost,
          operationsCost: (this.policy.operations_cost || 0) * quantity,
          sellingPrice: itemRevenue,
          gatewayRate: this.policy.gateway_rate || 0,
          marketingRate: this.policy.marketing_rate || 0,
          commissionRate: this.policy.commission_rate || 0,
          platformRate: this.policy.platform_rate || 0,
          reserveRate: this.policy.reserve_rate || 0,
          taxRate: this.policy.tax_rate || 0,
          packagingCost: (this.policy.packaging_cost || 0) * quantity,
          deliveryCost: (this.policy.delivery_cost || 0) * quantity,
          targetMarginPct: 30
        };

        const costs = computeCosts(inputs);
        const profit = computeProfit(inputs, costs);
        const margins = computeMargins(inputs, costs, profit);

        // Aggregate Portfolio Costs
        this.aggregatedCosts.vendorCost += costs.vendorCost;
        this.aggregatedCosts.operationsCost += costs.operationsCost;
        this.aggregatedCosts.gatewayFee += costs.gatewayFee;
        this.aggregatedCosts.marketingCost += costs.marketingCost;
        this.aggregatedCosts.commissionAmount += costs.commissionAmount;
        this.aggregatedCosts.platformFee += costs.platformFee;
        this.aggregatedCosts.reserveAmount += costs.reserveAmount;
        this.aggregatedCosts.taxAmount += costs.taxAmount;
        this.aggregatedCosts.packagingCost += costs.packagingCost;
        this.aggregatedCosts.deliveryCost += costs.deliveryCost;
        this.aggregatedCosts.totalCost += costs.totalCost;

        this.aggregatedNetProfit += profit.netProfit;
        this.aggregatedGrossProfit += profit.grossProfit;
        totalPortfolioNetProfit += profit.netProfit;

        // Product Analytics
        if (!this.productMetrics[productId]) {
          this.productMetrics[productId] = {
            id: productId,
            name: item.name || (this.products[productId]?.name) || "Unknown",
            revenue: 0, unitsSold: 0, vendorCost: 0, totalCost: 0,
            netProfit: 0, margin: 0, roi: 0, contribution: 0, classification: ""
          };
        }
        const pm = this.productMetrics[productId];
        pm.revenue += itemRevenue;
        pm.unitsSold += quantity;
        pm.vendorCost += totalVendorCost;
        pm.totalCost += costs.totalCost;
        pm.netProfit += profit.netProfit;
        
        // Vendor Analytics
        const vendorId = item.vendor_id || (item.product_id ? this.products[item.product_id]?.vendor_id : null) || "In-House";
        if (!this.vendorMetrics[vendorId]) {
          this.vendorMetrics[vendorId] = {
            id: vendorId,
            name: this.vendors[vendorId]?.name || vendorId,
            revenue: 0, costs: 0, profit: 0, commission: 0, roi: 0, contribution: 0, healthScore: 100
          };
        }
        const vm = this.vendorMetrics[vendorId];
        vm.revenue += itemRevenue;
        vm.costs += costs.totalCost;
        vm.profit += profit.netProfit;
        vm.commission += costs.commissionAmount;
      });
    });

    // Finalize Derived Metrics
    Object.values(this.productMetrics).forEach(pm => {
      pm.margin = pm.revenue > 0 ? (pm.netProfit / pm.revenue) * 100 : 0;
      pm.roi = pm.totalCost > 0 ? (pm.netProfit / pm.totalCost) * 100 : 0;
      pm.contribution = totalPortfolioNetProfit > 0 ? (pm.netProfit / totalPortfolioNetProfit) * 100 : 0;
      
      if (pm.margin > 40) pm.classification = "Champion";
      else if (pm.margin > 20) pm.classification = "High Performer";
      else if (pm.margin > 5) pm.classification = "Stable";
      else if (pm.margin > 0) pm.classification = "Needs Attention";
      else pm.classification = "Loss Leader";
    });

    Object.values(this.vendorMetrics).forEach(vm => {
      vm.roi = vm.costs > 0 ? (vm.profit / vm.costs) * 100 : 0;
      vm.contribution = totalPortfolioNetProfit > 0 ? (vm.profit / totalPortfolioNetProfit) * 100 : 0;
      vm.healthScore = Math.min(100, Math.max(0, 50 + (vm.roi / 2)));
    });
  }

  public getRevenue() { return this.aggregatedRevenue; }
  public getCosts() { return this.aggregatedCosts; }
  public getNetProfit() { return this.aggregatedNetProfit; }
  public getGrossProfit() { return this.aggregatedGrossProfit; }
  
  public getProductAnalytics() {
    return Object.values(this.productMetrics).sort((a, b) => b.netProfit - a.netProfit);
  }

  public getVendorAnalytics() {
    return Object.values(this.vendorMetrics).sort((a, b) => b.profit - a.profit);
  }

  public getTreasuryAnalytics(actualReserveBalance: number = 0) {
    const monthlyOps = this.aggregatedCosts.operationsCost || 1500000;
    const runway = monthlyOps > 0 ? actualReserveBalance / monthlyOps : 0;
    
    return {
      reserveBalance: actualReserveBalance,
      operatingCosts: monthlyOps,
      runway: runway,
      reserveCoverage: monthlyOps > 0 ? (actualReserveBalance / monthlyOps) * 100 : 0,
      liquidityRatio: runway > 6 ? 'High' : runway > 3 ? 'Medium' : 'Low',
      operatingSustainability: runway > 6 ? 'Sustainable' : runway > 3 ? 'At Risk' : 'Critical'
    };
  }

  public getExecutiveKPIs() {
    const margin = this.aggregatedRevenue > 0 ? (this.aggregatedNetProfit / this.aggregatedRevenue) * 100 : 0;
    const grossMargin = this.aggregatedRevenue > 0 ? (this.aggregatedGrossProfit / this.aggregatedRevenue) * 100 : 0;
    const roi = this.aggregatedCosts.totalCost > 0 ? (this.aggregatedNetProfit / this.aggregatedCosts.totalCost) * 100 : 0;
    const orderCount = this.orders.length || 1;

    const topProduct = this.getProductAnalytics()[0];
    const topVendor = this.getVendorAnalytics()[0];

    return {
      revenue: this.aggregatedRevenue,
      totalCost: this.aggregatedCosts.totalCost,
      netProfit: this.aggregatedNetProfit,
      grossProfit: this.aggregatedGrossProfit,
      netMargin: margin,
      grossMargin: grossMargin,
      roi: roi,
      averageOrderValue: this.aggregatedRevenue / orderCount,
      averageNetProfitPerOrder: this.aggregatedNetProfit / orderCount,
      topProduct: topProduct?.name || "N/A",
      topVendor: topVendor?.name || "N/A"
    };
  }
}
