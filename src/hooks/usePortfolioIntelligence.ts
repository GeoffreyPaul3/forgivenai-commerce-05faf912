import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PortfolioFinancialEngine, Order, Product, Vendor, PricingPolicy } from "@/services/PortfolioFinancialEngine";

export function usePortfolioIntelligence(timeRangeDays: number) {
  return useQuery({
    queryKey: ["portfolio-intelligence", timeRangeDays],
    queryFn: async () => {
      // 1. Fetch active pricing policy
      const { data: policyData, error: policyError } = await supabase
        .from("pricing_policies")
        .select("*")
        .eq("is_active", true)
        .single();
      
      if (policyError && policyError.code !== "PGRST116") {
        console.error("Policy fetch error:", policyError);
      }
      
      const policy: PricingPolicy = policyData || {
        commission_rate: 8, gateway_rate: 2.5, marketing_rate: 3, platform_rate: 1,
        reserve_rate: 1, tax_rate: 0, packaging_cost: 500, delivery_cost: 2000, operations_cost: 5000
      };

      // 2. Fetch completed orders in time range
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - timeRangeDays);

      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("id, total, status, created_at, items, agent_commission_total")
        .in("status", ["paid", "confirmed", "processing", "shipped", "delivered"])
        .gte("created_at", cutoffDate.toISOString());

      if (ordersError) throw ordersError;

      // 3. Fetch products to resolve vendor costs if not in item payload
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, name, vendor_cost, price, vendor_id");
      
      if (productsError) throw productsError;

      // 4. Fetch vendors to resolve vendor names
      const { data: vendorsData, error: vendorsError } = await supabase
        .from("vendors")
        .select("id, business_name");

      if (vendorsError) throw vendorsError;
      
      const mappedVendors = (vendorsData || []).map(v => ({ id: v.id, name: v.business_name || v.id }));

      // 5. Fetch Settings for actual reserve balance
      const { data: settingsData } = await supabase.from("settings").select("key, value").in("key", ["reserve_fund_balance"]);
      const reserveBalanceStr = settingsData?.find(s => s.key === "reserve_fund_balance")?.value;
      const reserveBalance = reserveBalanceStr ? Number(reserveBalanceStr) : 0;

      // 6. Initialize Engine
      const engine = new PortfolioFinancialEngine(
        (ordersData || []) as Order[],
        (productsData || []) as Product[],
        mappedVendors,
        policy
      );

      // 7. Get aggregations
      return {
        kpis: engine.getExecutiveKPIs(),
        costs: engine.getCosts(),
        products: engine.getProductAnalytics(),
        vendors: engine.getVendorAnalytics(),
        treasury: engine.getTreasuryAnalytics(reserveBalance),
        breakEven: engine.getBreakEvenIntelligence(),
        rawOrders: ordersData || [] // useful for trend charts
      };
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 mins
  });
}
