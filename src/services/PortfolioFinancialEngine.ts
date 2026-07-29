export interface OrderItem {
  product_id?: string;
  name?: string;
  price: number;
  quantity: number;
  vendor_id?: string;
  vendor_cost?: number;
}

export interface Order {
  id: string;
  total: number;
  status: string;
  created_at: string;
  items: OrderItem[];
  agent_commission_total?: number;
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

export interface FSCMarkupDistribution {
  operations: number;
  ownerDrawings: number;
  infrastructure: number;
  reinvestment: number;
  reserve: number;
}

export interface Document3Costs {
  vendorCost: number;
  cacPool: number;
  packaging: number;
  logistics: number;
  gateway: number;
  platform: number;
  tax: number;
  totalDeductions: number;
  fscMarkup: number;
  agentCommissionPaid: number;
  distribution: FSCMarkupDistribution;
}

export interface ProductIntelligence {
  id: string;
  name: string;
  revenue: number;
  unitsSold: number;
  vendorCost: number;
  markupGenerated: number;
  mcp: number;
  ppi: number;
  roi: number;
  classification: string;
}

export interface VendorIntelligence {
  id: string;
  name: string;
  revenue: number;
  vendorCost: number;
  markupGenerated: number;
  commissionPaid: number;
  mcp: number;
  ppi: number;
  roi: number;
  healthScore: number;
}

export class PortfolioFinancialEngine {
  private orders: Order[];
  private products: Record<string, Product>;
  private vendors: Record<string, Vendor>;
  private policy: PricingPolicy;
  
  // Base targets for index calculations
  private monthlyFscMarkupTarget = 8750000; // As per Document 3

  private aggregatedRevenue = 0;
  private aggregatedItemsSold = 0;
  
  private costs: Document3Costs = {
    vendorCost: 0,
    cacPool: 0,
    packaging: 0,
    logistics: 0,
    gateway: 0,
    platform: 0,
    tax: 0,
    totalDeductions: 0,
    fscMarkup: 0,
    agentCommissionPaid: 0,
    distribution: {
      operations: 0,
      ownerDrawings: 0,
      infrastructure: 0,
      reinvestment: 0,
      reserve: 0
    }
  };

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
      commission_rate: 8, gateway_rate: 2.5, marketing_rate: 15, platform_rate: 1,
      reserve_rate: 1, tax_rate: 0, packaging_cost: 1000, delivery_cost: 5000, operations_cost: 5000
    };

    this.products = products.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
    this.vendors = vendors.reduce((acc, v) => ({ ...acc, [v.id]: v }), {});

    this.processPortfolio();
  }

  private processPortfolio() {
    this.orders.forEach(order => {
      this.aggregatedRevenue += Number(order.total || 0);

      const items = order.items || [];
      
      items.forEach((item: OrderItem) => {
        const productId = item.product_id || item.name || "Unknown";
        const quantity = item.quantity || 1;
        const itemRevenue = (item.price || 0) * quantity;
        
        this.aggregatedItemsSold += quantity;

        // Vendor Cost mapping
        let baseVendorCost = item.vendor_cost || 0;
        if (!baseVendorCost && item.product_id && this.products[item.product_id]) {
          baseVendorCost = this.products[item.product_id].vendorCost || this.products[item.product_id].vendor_cost || 0;
        }
        const totalVendorCost = baseVendorCost * quantity;

        // Cost Deductions
        const cacPool = (totalVendorCost * (this.policy.marketing_rate || 15)) / 100;
        const packaging = (this.policy.packaging_cost || 1000) * quantity;
        const logistics = (this.policy.delivery_cost || 5000) * quantity;
        
        const gateway = (itemRevenue * (this.policy.gateway_rate || 2.5)) / 100;
        const platform = (itemRevenue * (this.policy.platform_rate || 1)) / 100;
        const tax = (itemRevenue * (this.policy.tax_rate || 0)) / 100;

        const totalDeductions = totalVendorCost + cacPool + packaging + logistics + gateway + platform + tax;
        const fscMarkup = itemRevenue - totalDeductions;
        
        // Agent Commission (funded from CAC Pool)
        const commissionPaid = (totalVendorCost * (this.policy.commission_rate || 8)) / 100;

        // Aggregate Portfolio Costs
        this.costs.vendorCost += totalVendorCost;
        this.costs.cacPool += cacPool;
        this.costs.packaging += packaging;
        this.costs.logistics += logistics;
        this.costs.gateway += gateway;
        this.costs.platform += platform;
        this.costs.tax += tax;
        this.costs.totalDeductions += totalDeductions;
        this.costs.fscMarkup += fscMarkup;
        this.costs.agentCommissionPaid += commissionPaid;

        // Product Analytics
        if (!this.productMetrics[productId]) {
          this.productMetrics[productId] = {
            id: productId,
            name: item.name || (this.products[productId]?.name) || "Unknown",
            revenue: 0, unitsSold: 0, vendorCost: 0, markupGenerated: 0,
            mcp: 0, ppi: 0, roi: 0, classification: ""
          };
        }
        const pm = this.productMetrics[productId];
        pm.revenue += itemRevenue;
        pm.unitsSold += quantity;
        pm.vendorCost += totalVendorCost;
        pm.markupGenerated += fscMarkup;
        
        // Vendor Analytics
        const vendorId = item.vendor_id || (item.product_id ? this.products[item.product_id]?.vendor_id : null) || "In-House";
        if (!this.vendorMetrics[vendorId]) {
          this.vendorMetrics[vendorId] = {
            id: vendorId,
            name: this.vendors[vendorId]?.name || vendorId,
            revenue: 0, vendorCost: 0, markupGenerated: 0, commissionPaid: 0, 
            mcp: 0, ppi: 0, roi: 0, healthScore: 100
          };
        }
        const vm = this.vendorMetrics[vendorId];
        vm.revenue += itemRevenue;
        vm.vendorCost += totalVendorCost;
        vm.markupGenerated += fscMarkup;
        vm.commissionPaid += commissionPaid;
      });
    });

    // 1. Calculate FSC Markup Distribution
    const totalFscMarkup = this.costs.fscMarkup;
    this.costs.distribution = {
      operations: totalFscMarkup * 0.33,
      ownerDrawings: totalFscMarkup * 0.20,
      infrastructure: totalFscMarkup * 0.20,
      reinvestment: totalFscMarkup * 0.15,
      reserve: totalFscMarkup * 0.12,
    };

    // 2. Finalize Product Metrics (PPI requires knowing the max markup)
    const allProducts = Object.values(this.productMetrics);
    const maxProductMarkup = Math.max(...allProducts.map(p => p.markupGenerated), 1); // fallback to 1 to avoid /0

    allProducts.forEach(pm => {
      pm.mcp = (pm.markupGenerated / this.monthlyFscMarkupTarget) * 100;
      pm.ppi = (pm.markupGenerated / maxProductMarkup) * 100;
      // ROI is Markup / Total Direct Costs tied to product
      pm.roi = pm.vendorCost > 0 ? (pm.markupGenerated / pm.vendorCost) * 100 : 0;
      
      // Classification Logic from Document 3
      if (pm.ppi > 80) pm.classification = "Star Product";
      else if (pm.ppi > 50 && pm.unitsSold > 10) pm.classification = "Cash Cow";
      else if (pm.ppi > 40) pm.classification = "Growth Product";
      else if (pm.markupGenerated <= 0) pm.classification = "Dead Product";
      else pm.classification = "Underperforming Product";
    });

    // 3. Finalize Vendor Metrics
    const allVendors = Object.values(this.vendorMetrics);
    const maxVendorMarkup = Math.max(...allVendors.map(v => v.markupGenerated), 1);

    allVendors.forEach(vm => {
      vm.mcp = (vm.markupGenerated / this.monthlyFscMarkupTarget) * 100;
      vm.ppi = (vm.markupGenerated / maxVendorMarkup) * 100;
      vm.roi = vm.vendorCost > 0 ? (vm.markupGenerated / vm.vendorCost) * 100 : 0;
      vm.healthScore = Math.min(100, Math.max(0, 50 + (vm.roi / 2)));
    });
  }

  // Getters
  public getRevenue() { return this.aggregatedRevenue; }
  public getItemsSold() { return this.aggregatedItemsSold; }
  public getCosts() { return this.costs; }
  
  public getProductAnalytics() {
    return Object.values(this.productMetrics).sort((a, b) => b.ppi - a.ppi);
  }

  public getVendorAnalytics() {
    return Object.values(this.vendorMetrics).sort((a, b) => b.ppi - a.ppi);
  }

  public getTreasuryAnalytics(actualReserveBalance: number = 0) {
    const monthlyOps = this.monthlyFscMarkupTarget * 0.33; // Target operations allocation
    const runway = monthlyOps > 0 ? actualReserveBalance / monthlyOps : 0;
    
    let operatingSustainability = 'Critical';
    if (runway > 6) operatingSustainability = 'Sustainable';
    else if (runway >= 4) operatingSustainability = 'Healthy';
    else if (runway >= 2) operatingSustainability = 'Acceptable';

    return {
      reserveBalance: actualReserveBalance,
      operatingCosts: monthlyOps,
      runway: runway,
      reserveCoverage: monthlyOps > 0 ? (actualReserveBalance / monthlyOps) * 100 : 0,
      liquidityRatio: runway > 6 ? 'High' : runway > 3 ? 'Medium' : 'Low',
      operatingSustainability: operatingSustainability
    };
  }
  
  public getBreakEvenIntelligence(workingDays: number = 22) {
    const avgFscMarkupPerItem = this.aggregatedItemsSold > 0 ? this.costs.fscMarkup / this.aggregatedItemsSold : 1;
    const requiredMonthlyItems = this.monthlyFscMarkupTarget / avgFscMarkupPerItem;
    const requiredDailyItems = requiredMonthlyItems / workingDays;
    
    return {
      avgFscMarkupPerItem,
      requiredMonthlyItems: Math.max(0, Math.ceil(requiredMonthlyItems)),
      requiredDailyItems: Math.max(0, Math.ceil(requiredDailyItems)),
      achievementRate: (this.costs.fscMarkup / this.monthlyFscMarkupTarget) * 100
    };
  }

  public getExecutiveKPIs() {
    const orderCount = this.orders.length || 1;
    
    return {
      revenue: this.aggregatedRevenue,
      fscMarkup: this.costs.fscMarkup,
      totalDeductions: this.costs.totalDeductions,
      netMargin: this.aggregatedRevenue > 0 ? (this.costs.fscMarkup / this.aggregatedRevenue) * 100 : 0,
      grossMargin: this.aggregatedRevenue > 0 ? ((this.aggregatedRevenue - this.costs.vendorCost) / this.aggregatedRevenue) * 100 : 0,
      roi: this.costs.totalDeductions > 0 ? (this.costs.fscMarkup / this.costs.totalDeductions) * 100 : 0,
      averageOrderValue: this.aggregatedRevenue / orderCount,
      topProduct: this.getProductAnalytics()[0]?.name || "N/A",
      topVendor: this.getVendorAnalytics()[0]?.name || "N/A"
    };
  }
}
