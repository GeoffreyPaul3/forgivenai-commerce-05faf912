import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, ComposedChart
} from "recharts";
import { 
  TrendingUp, DollarSign, PieChart as PieIcon, ArrowUpRight, 
  ArrowDownRight, Sparkles, Filter, Calendar
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortfolioIntelligence } from "@/hooks/usePortfolioIntelligence";

const COLORS = ["hsl(334, 68%, 32%)", "hsl(334, 50%, 45%)", "hsl(40, 60%, 50%)", "hsl(35, 30%, 60%)", "hsl(200, 50%, 40%)", "hsl(150, 40%, 40%)"];

const ProfitDashboard = () => {
  const [timeRange, setTimeRange] = useState("30");
  const days = parseInt(timeRange);

  const { data: portfolio, isLoading: isPortfolioLoading } = usePortfolioIntelligence(days);

  const trendData = useMemo(() => {
    if (!portfolio?.rawOrders) return [];
    
    const sorted = [...portfolio.rawOrders].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const grouped: Record<string, any> = {};
    
    sorted.forEach(order => {
      const date = new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      if (!grouped[date]) {
        grouped[date] = { date, revenue: 0 };
      }
      grouped[date].revenue += Number(order.total || 0);
      // We don't have per-order historical profit here easily, so we just show revenue trend for now.
    });
    
    const limit = timeRange === "7" ? 7 : timeRange === "30" ? 15 : 30;
    return Object.values(grouped).slice(-limit);
  }, [portfolio?.rawOrders, timeRange]);

  const allocationData = useMemo(() => {
    if (!portfolio) return [];
    const { costs, kpis } = portfolio;
    return [
      { name: "Vendor Cost", value: costs.vendorCost },
      { name: "Operations", value: costs.operationsCost },
      { name: "Marketing", value: costs.marketingCost },
      { name: "Gateway Fees", value: costs.gatewayFee },
      { name: "Commissions", value: costs.commissionAmount },
      { name: "Logistics & Pkg", value: costs.deliveryCost + costs.packagingCost },
      { name: "Net FSC Profit", value: Math.max(0, kpis.netProfit) }
    ].filter(d => d.value > 0);
  }, [portfolio]);

  const { data: realAiInsights, isLoading: insightsLoading } = useQuery({
    queryKey: ["real-profit-insights", portfolio?.kpis, portfolio?.treasury?.operatingSustainability],
    enabled: !!portfolio && portfolio.kpis.revenue > 0,
    queryFn: async () => {
      const context = JSON.stringify({
        currency: "MWK",
        revenue: portfolio!.kpis.revenue,
        netProfit: portfolio!.kpis.netProfit,
        netMargin: portfolio!.kpis.netMargin,
        totalCost: portfolio!.kpis.totalCost,
        treasuryState: portfolio!.treasury.operatingSustainability,
        runway: portfolio!.treasury.runway,
        topProducts: portfolio!.products.slice(0, 3).map(p => p.name).join(", "),
        topVendors: portfolio!.vendors.slice(0, 3).map(v => v.name).join(", "),
        requestedAlerts: "margin compression, high costs, runway risks, profit concentration"
      });

      const { data, error } = await supabase.functions.invoke("ai-generate", {
        body: { type: "profit-insights", context }
      });

      if (error) throw error;
      
      try {
        const parsed = JSON.parse(data.content);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any) => ({
            ...item,
            title: item.title?.replace(/\$/g, "MWK "),
            content: item.content?.replace(/\$/g, "MWK ")
          }));
        }
        return parsed;
      } catch (e) {
        return [{ title: "Financial Analysis", content: (data.content || "").replace(/\$/g, "MWK ").slice(0, 200) + "...", type: "positive" }];
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  const aiInsights = realAiInsights || [
    { title: "Analyzing Data...", content: "The AI is currently processing your profit metrics for strategic insights.", type: "positive" }
  ];

  if (isPortfolioLoading) {
    return <div className="space-y-6 pb-20 p-6"><Skeleton className="w-full h-[300px] rounded-3xl" /><Skeleton className="w-full h-[500px] rounded-3xl" /></div>;
  }

  const { kpis, products, vendors, treasury } = portfolio!;

  const requiredDailyProfit = Math.max(0, (treasury.operatingCosts / 22)); // 22 working days
  const averageNetProfitPerItem = kpis.averageNetProfitPerOrder; // simplified
  const dailyItemTarget = averageNetProfitPerItem > 0 ? Math.ceil(requiredDailyProfit / averageNetProfitPerItem) : 0;
  const achievementRate = requiredDailyProfit > 0 ? (Math.max(0, kpis.netProfit) / (requiredDailyProfit * 22)) * 100 : 0;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 tracking-tight">Profit Intelligence</h2>
          <p className="text-muted-foreground text-sm font-body">Engineered margins & business performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px] bg-card border-border">
              <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 3 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main KPI Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden p-6 rounded-3xl border border-primary/20 bg-primary/5 shadow-sm">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Revenue</p>
          <p className="text-2xl font-heading font-black text-foreground">MWK {kpis.revenue.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative overflow-hidden p-6 rounded-3xl border border-[#A21D7F]/20 bg-[#A21D7F]/5 shadow-sm">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Costs</p>
          <p className="text-2xl font-heading font-black text-[#A21D7F]">MWK {kpis.totalCost.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative overflow-hidden p-6 rounded-3xl border border-gold/20 bg-gold/5 shadow-sm">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Net FSC Profit</p>
          <p className="text-2xl font-heading font-black text-gold">MWK {kpis.netProfit.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[10px] font-bold text-gold uppercase tracking-tighter">
              {kpis.netMargin.toFixed(1)}% Net Margin
            </span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="relative overflow-hidden p-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 shadow-sm">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Portfolio ROI</p>
          <p className="text-2xl font-heading font-black text-emerald-600">{kpis.roi.toFixed(1)}%</p>
          <p className="text-[10px] text-muted-foreground mt-3 font-medium uppercase tracking-tight">Return on Cost</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl border border-border bg-card shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <h3 className="font-heading font-bold text-lg text-foreground">Revenue Trend</h3>
           </div>
           <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={trendData}>
                 <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                 </defs>
                 <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                 <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `MWK ${v/1000}k`} />
                 <RechartsTooltip 
                   contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '16px', border: '1px solid hsl(var(--border))' }}
                   itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                 />
                 <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Allocation Breakdown */}
        <div className="p-6 rounded-3xl border border-border bg-card shadow-sm flex flex-col">
           <h3 className="font-heading font-bold text-lg text-foreground mb-4">Allocation Breakdown</h3>
           <div className="h-[200px]">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie data={allocationData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                    {allocationData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                 </Pie>
                 <RechartsTooltip formatter={(v: number) => `MWK ${v.toLocaleString(undefined, {maximumFractionDigits:0})}`} />
               </PieChart>
             </ResponsiveContainer>
           </div>
           <div className="space-y-2 mt-2 overflow-y-auto flex-1">
              {allocationData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-[11px] font-semibold text-muted-foreground">{d.name}</span>
                  </div>
                  <span className="text-xs font-bold">MWK {d.value.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Product Profitability Intelligence */}
      <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden mb-6">
         <div className="p-6 border-b border-border/50 flex items-center justify-between">
            <h3 className="font-heading font-bold text-lg text-foreground">Product Profitability Intelligence</h3>
         </div>
         <div className="p-0">
           {products.length === 0 ? (
             <div className="p-8 text-center text-muted-foreground text-sm">No product intelligence data yet</div>
           ) : (
             <div className="w-full overflow-x-auto">
               <table className="w-full text-sm text-left">
                 <thead className="bg-muted/30 text-muted-foreground font-body text-[10px] uppercase tracking-wider">
                   <tr>
                     <th className="px-6 py-4 font-semibold">Product Name</th>
                     <th className="px-6 py-4 font-semibold">Revenue</th>
                     <th className="px-6 py-4 font-semibold">Total Cost</th>
                     <th className="px-6 py-4 font-semibold text-gold">Net Profit</th>
                     <th className="px-6 py-4 font-semibold text-center">Net Margin</th>
                     <th className="px-6 py-4 font-semibold text-center">ROI</th>
                     <th className="px-6 py-4 font-semibold text-right">Class</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-border/50">
                   {products.slice(0, 10).map((p, i) => (
                     <tr key={i} className="hover:bg-muted/10 transition-colors">
                       <td className="px-6 py-4 font-medium text-foreground truncate max-w-[200px]">{p.name}</td>
                       <td className="px-6 py-4">MWK {p.revenue.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                       <td className="px-6 py-4">MWK {p.totalCost.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                       <td className="px-6 py-4 font-bold text-gold">MWK {p.netProfit.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                       <td className="px-6 py-4 text-center font-mono">{p.margin.toFixed(1)}%</td>
                       <td className="px-6 py-4 text-center font-mono">{p.roi.toFixed(1)}%</td>
                       <td className="px-6 py-4 text-right">
                         <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-tighter py-1 px-2 ${p.classification === 'Champion' || p.classification === 'High Performer' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' : p.classification === 'Dead Product' || p.classification === 'Loss Leader' ? 'text-destructive border-destructive/20 bg-destructive/10' : 'text-amber-500 border-amber-500/20 bg-amber-500/10'}`}>
                           {p.classification}
                         </Badge>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           )}
         </div>
      </div>

      {/* Vendor Profitability Intelligence */}
      <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden mb-6">
         <div className="p-6 border-b border-border/50 flex items-center justify-between">
            <h3 className="font-heading font-bold text-lg text-foreground">Vendor Profitability Intelligence</h3>
         </div>
         <div className="p-0">
           {vendors.length === 0 ? (
             <div className="p-8 text-center text-muted-foreground text-sm">No vendor intelligence data yet</div>
           ) : (
             <div className="w-full overflow-x-auto">
               <table className="w-full text-sm text-left">
                 <thead className="bg-muted/30 text-muted-foreground font-body text-[10px] uppercase tracking-wider">
                   <tr>
                     <th className="px-6 py-4 font-semibold">Vendor Name</th>
                     <th className="px-6 py-4 font-semibold">Revenue Gen</th>
                     <th className="px-6 py-4 font-semibold">Comm. Paid</th>
                     <th className="px-6 py-4 font-semibold text-gold">Net Profit</th>
                     <th className="px-6 py-4 font-semibold text-center">ROI</th>
                     <th className="px-6 py-4 font-semibold text-right">Health</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-border/50">
                   {vendors.slice(0,10).map((v, i) => (
                     <tr key={i} className="hover:bg-muted/10 transition-colors">
                       <td className="px-6 py-4 font-medium text-foreground truncate max-w-[150px]">{v.name}</td>
                       <td className="px-6 py-4">MWK {v.revenue.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                       <td className="px-6 py-4">MWK {v.commission.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                       <td className="px-6 py-4 font-bold text-gold">MWK {v.profit.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                       <td className="px-6 py-4 text-center font-mono">{v.roi.toFixed(1)}%</td>
                       <td className="px-6 py-4 text-right">
                         <Badge variant="outline" className={`${v.healthScore > 80 ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-500 bg-amber-500/10 border-amber-500/20'} font-bold`}>
                           {v.healthScore.toFixed(0)} / 100
                         </Badge>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           )}
         </div>
      </div>

      {/* Break-Even & Treasury Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl border border-border bg-card shadow-sm flex flex-col gap-4">
           <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-lg text-foreground">Break-Even Intelligence</h3>
              <Badge variant="outline" className="text-amber-500 border-amber-500/20">Daily Target</Badge>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 p-4 rounded-2xl">
                 <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Required Daily Profit</p>
                 <p className="text-2xl font-black font-heading text-foreground">MWK {(requiredDailyProfit / 1000).toFixed(0)}k</p>
              </div>
              <div className="bg-muted/30 p-4 rounded-2xl">
                 <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Items Reqd / Day</p>
                 <p className="text-2xl font-black font-heading text-foreground">{dailyItemTarget.toLocaleString()}</p>
              </div>
           </div>
           <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl flex items-center justify-between mt-auto">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Profit Target Achievement</p>
                <p className="text-lg font-black font-heading text-primary">{achievementRate.toFixed(1)}%</p>
              </div>
              <Sparkles className="w-6 h-6 text-primary opacity-50" />
           </div>
        </div>

        <div className="p-6 rounded-3xl border border-border bg-card shadow-sm flex flex-col gap-4">
           <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-lg text-foreground">Treasury & Sustainability</h3>
              <Badge variant="outline" className={`border-current/20 ${treasury.operatingSustainability === 'Sustainable' ? 'text-emerald-500' : 'text-amber-500'}`}>{treasury.operatingSustainability}</Badge>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 p-4 rounded-2xl">
                 <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Operating Runway</p>
                 <p className="text-2xl font-black font-heading text-foreground">{treasury.runway.toFixed(1)} Mos</p>
              </div>
              <div className="bg-muted/30 p-4 rounded-2xl">
                 <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Reserve Coverage</p>
                 <p className="text-2xl font-black font-heading text-foreground">{treasury.reserveCoverage.toFixed(0)}%</p>
              </div>
           </div>
           <div className="bg-muted p-4 rounded-2xl flex items-center gap-3 mt-auto">
              <p className="text-[11px] font-medium text-muted-foreground font-body">
                Derived from actual retention against monthly ops burn (MWK {(treasury.operatingCosts/1000).toFixed(0)}k).
              </p>
           </div>
        </div>
      </div>

      {/* AI Insights Layer */}
      <div className="p-6 rounded-3xl border border-gold/30 bg-gold/5 relative overflow-hidden group">
         <div className="absolute -top-4 -right-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Sparkles className="w-32 h-32 text-gold" /></div>
         <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-xl bg-gold flex items-center justify-center text-white"><Sparkles className="w-4 h-4" /></div>
            <h3 className="font-heading font-bold text-xl text-foreground">AI Profit Insights</h3>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            {insightsLoading ? (
              <>
                <Skeleton className="h-32 w-full rounded-2xl bg-gold/10" />
                <Skeleton className="h-32 w-full rounded-2xl bg-gold/10" />
              </>
            ) : (
              aiInsights.map((insight: any, idx: number) => (
                <div key={idx} className="space-y-2 p-4 rounded-2xl bg-background/50 border border-gold/10 hover:bg-background transition-colors duration-500">
                  <div className="flex items-center justify-between">
                    <h4 className="font-heading font-bold text-base text-foreground tracking-tight">{insight.title}</h4>
                    <Badge variant="outline" className={`text-[9px] uppercase font-black ${insight.type === 'positive' ? 'text-emerald-500 border-emerald-500/20' : 'text-amber-500 border-amber-500/20'}`}>
                      {insight.type === 'positive' ? 'Strategic Opportunity' : 'Operational Flag'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-body leading-relaxed">{insight.content}</p>
                </div>
              ))
            )}
         </div>
      </div>
    </div>
  );
};

export default ProfitDashboard;
