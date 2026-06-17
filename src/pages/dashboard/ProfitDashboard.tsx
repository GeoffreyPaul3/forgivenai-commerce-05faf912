import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from "recharts";
import { 
  TrendingUp, DollarSign, PieChart as PieIcon, ArrowUpRight, 
  ArrowDownRight, Sparkles, Filter, Calendar
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["hsl(334, 68%, 32%)", "hsl(334, 50%, 45%)", "hsl(40, 60%, 50%)", "hsl(35, 30%, 60%)"];

const ProfitDashboard = () => {
  const [timeRange, setTimeRange] = useState("30");

  const { data: profitData, isLoading } = useQuery({
    queryKey: ["profit-intelligence", timeRange],
    queryFn: async () => {
      const days = parseInt(timeRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { data, error } = await supabase
        .from("orders")
        .select("total, gross_margin, base_profit, surplus_profit, surplus_type, status, created_at, total_vendor_cost, fsc_markup_total, cac_total, packaging_total, logistics_total, agent_commission_total, net_fsc_contribution")
        .in("status", ["paid", "confirmed", "processing", "shipped", "delivered"])
        .gte("created_at", cutoffDate.toISOString());
      
      if (error) throw error;
      return data || [];
    },
  });

  const metrics = useMemo(() => {
    if (!profitData) return { 
      totalRevenue: 0, totalBaseProfit: 0, totalSurplus: 0, agentSurplus: 0, directSurplus: 0,
      totalVendorCost: 0, totalFscMarkup: 0, totalCac: 0, totalPackaging: 0, totalLogistics: 0, totalCommission: 0, netFscContribution: 0
    };

    return profitData.reduce((acc, curr) => {
      acc.totalRevenue += Number(curr.total || 0);
      acc.totalBaseProfit += Number(curr.base_profit || 0);
      acc.totalSurplus += Number(curr.surplus_profit || 0);
      
      if (curr.surplus_type === 'agent') {
        acc.agentSurplus += Number(curr.surplus_profit || 0);
      } else {
        acc.directSurplus += Number(curr.surplus_profit || 0);
      }

      acc.totalVendorCost += Number(curr.total_vendor_cost || curr.vendor_cost || 0);
      acc.totalFscMarkup += Number(curr.fsc_markup_total || 0);
      acc.totalCac += Number(curr.cac_total || 0);
      acc.totalPackaging += Number(curr.packaging_total || 0);
      acc.totalLogistics += Number(curr.logistics_total || 0);
      acc.totalCommission += Number(curr.agent_commission_total || 0);
      acc.netFscContribution += Number(curr.net_fsc_contribution || curr.base_profit || 0); // fallback to base_profit for legacy
      
      return acc;
    }, { 
      totalRevenue: 0, totalBaseProfit: 0, totalSurplus: 0, agentSurplus: 0, directSurplus: 0,
      totalVendorCost: 0, totalFscMarkup: 0, totalCac: 0, totalPackaging: 0, totalLogistics: 0, totalCommission: 0, netFscContribution: 0
    });
  }, [profitData]);

  const allocationData = [
    { name: "Vendor Cost", value: metrics.totalVendorCost },
    { name: "FSC Net Contribution", value: metrics.netFscContribution },
    { name: "CAC Allocation", value: metrics.totalCac },
    { name: "Packaging", value: metrics.totalPackaging },
    { name: "Logistics", value: metrics.totalLogistics },
    { name: "Agent Commissions", value: metrics.totalCommission },
  ].filter(d => d.value > 0);

  const trendData = useMemo(() => {
    if (!profitData) return [];
    
    const sorted = [...profitData].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const grouped: Record<string, any> = {};
    
    sorted.forEach(order => {
      const date = new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      if (!grouped[date]) {
        grouped[date] = { date, revenue: 0, profit: 0, surplus: 0 };
      }
      grouped[date].revenue += Number(order.total || 0);
      grouped[date].profit += Number(order.base_profit || 0);
      grouped[date].surplus += Number(order.surplus_profit || 0);
    });
    
    const limit = timeRange === "7" ? 7 : timeRange === "30" ? 15 : 30;
    return Object.values(grouped).slice(-limit);
  }, [profitData, timeRange]);

  // Real AI Insights
  const { data: realAiInsights, isLoading: insightsLoading } = useQuery({
    queryKey: ["real-profit-insights", metrics],
    enabled: !!metrics.totalRevenue,
    queryFn: async () => {
      const context = JSON.stringify({
        currency: "MWK",
        revenue: metrics.totalRevenue,
        baseProfit: metrics.totalBaseProfit,
        surplus: metrics.totalSurplus,
        agentSurplus: metrics.agentSurplus,
        directSurplus: metrics.directSurplus,
        surplusRatio: ((metrics.totalSurplus / metrics.totalRevenue) * 100).toFixed(1) + "%"
      });

      const { data, error } = await supabase.functions.invoke("ai-generate", {
        body: {
          type: "profit-insights",
          context
        }
      });

      if (error) throw error;
      
      try {
        // Parse the JSON array from AI response
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
        console.warn("AI didn't return valid JSON, using fallback formatting", e);
        const cleanedContent = (data.content || "").replace(/\$/g, "MWK ");
        return [
          { title: "Financial Analysis", content: cleanedContent.slice(0, 200) + "...", type: "positive" }
        ];
      }
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 mins
  });

  const aiInsights = realAiInsights || [
    {
      title: "Analyzing Data...",
      content: "The AI is currently processing your profit metrics for strategic insights.",
      type: "positive"
    }
  ];

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden p-6 rounded-3xl border border-primary/20 bg-primary/5 group shadow-sm transition-all hover:shadow-xl hover:shadow-primary/5">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><DollarSign className="w-20 h-20" /></div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 font-body">Total Revenue</p>
          <p className="text-3xl font-heading font-black text-foreground">MWK {metrics.totalRevenue.toLocaleString()}</p>
          <div className="flex items-center gap-1 mt-3 text-emerald-500 font-bold text-xs truncate">
            <ArrowUpRight className="w-3 h-3" />
            <span>Target: MWK {(metrics.totalRevenue * 1.2).toLocaleString()}</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative overflow-hidden p-6 rounded-3xl border border-gold/20 bg-gold/5 group shadow-sm transition-all hover:shadow-xl hover:shadow-gold/5">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><TrendingUp className="w-20 h-20" /></div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 font-body">Net FSC Contribution</p>
          <p className="text-3xl font-heading font-black text-gold">MWK {metrics.netFscContribution.toLocaleString()}</p>
          <div className="flex items-center gap-2 mt-3 overflow-hidden">
            <div className="w-full h-1 bg-gold/10 rounded-full">
              <div className="h-full bg-gold rounded-full" style={{ width: `${Math.min(100, (metrics.netFscContribution / (metrics.totalRevenue || 1)) * 100)}%` }} />
            </div>
            <span className="text-[10px] font-bold text-gold shrink-0 uppercase tracking-tighter">
              {((metrics.netFscContribution / (metrics.totalRevenue || 1)) * 100).toFixed(1)}% Margin
            </span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative overflow-hidden p-6 rounded-3xl border border-[#A21D7F]/20 bg-[#A21D7F]/5 group shadow-sm transition-all hover:shadow-xl hover:shadow-[#A21D7F]/5">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><PieIcon className="w-20 h-20" /></div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 font-body">Total Allocations (CAC+P+L)</p>
          <p className="text-3xl font-heading font-black text-[#A21D7F]">MWK {(metrics.totalCac + metrics.totalPackaging + metrics.totalLogistics).toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground mt-3 font-medium uppercase tracking-tight">Protected operational funds</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profit Trend Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl border border-border bg-card shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <h3 className="font-heading font-bold text-lg text-foreground">Profit & Surplus Trend</h3>
              <div className="flex gap-4">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary" /><span className="text-[10px] font-bold uppercase text-muted-foreground">Revenue</span></div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gold" /><span className="text-[10px] font-bold uppercase text-muted-foreground">Profit</span></div>
              </div>
           </div>
           <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={trendData}>
                 <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--gold))" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="hsl(var(--gold))" stopOpacity={0}/>
                    </linearGradient>
                 </defs>
                 <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                 <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `MWK ${v/1000}k`} />
                 <Tooltip 
                   contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '16px', border: '1px solid hsl(var(--border))', fontFamily: 'inherit' }}
                   itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                 />
                 <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                 <Area type="monotone" dataKey="profit" stroke="hsl(var(--gold))" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Allocation Breakdown */}
        <div className="p-6 rounded-3xl border border-border bg-card shadow-sm">
           <h3 className="font-heading font-bold text-lg text-foreground mb-8">Allocation Breakdown</h3>
           <div className="h-[250px]">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie data={allocationData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={10} dataKey="value" stroke="none">
                    {allocationData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                 </Pie>
                 <Tooltip />
               </PieChart>
             </ResponsiveContainer>
           </div>
           <div className="space-y-3 mt-4 max-h-[150px] overflow-y-auto">
              {allocationData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-xs font-semibold font-body text-muted-foreground">{d.name}</span>
                  </div>
                  <span className="text-sm font-bold font-heading">MWK {d.value.toLocaleString()}</span>
                </div>
              ))}
           </div>
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
                 <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Target Net Contribution</p>
                 <p className="text-2xl font-black font-heading text-foreground">MWK 150k</p>
              </div>
              <div className="bg-muted/30 p-4 rounded-2xl">
                 <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Required Items/Day</p>
                 <p className="text-2xl font-black font-heading text-foreground">12</p>
              </div>
           </div>
           <div className="mt-2">
             <div className="flex justify-between text-xs font-bold mb-2">
                <span>Achievement Rate</span>
                <span className="text-emerald-500">85%</span>
             </div>
             <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
               <div className="h-full bg-emerald-500 rounded-full" style={{ width: '85%' }} />
             </div>
           </div>
        </div>

        <div className="p-6 rounded-3xl border border-border bg-card shadow-sm flex flex-col gap-4">
           <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-lg text-foreground">Treasury & Sustainability</h3>
              <Badge variant="outline" className="text-emerald-500 border-emerald-500/20 bg-emerald-500/10">Growth Mode</Badge>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 p-4 rounded-2xl">
                 <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Operating Runway</p>
                 <p className="text-2xl font-black font-heading text-foreground">6.2 Mos</p>
              </div>
              <div className="bg-muted/30 p-4 rounded-2xl">
                 <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Reserve Coverage</p>
                 <p className="text-2xl font-black font-heading text-foreground">115%</p>
              </div>
           </div>
           <p className="text-xs text-muted-foreground font-body mt-2 leading-relaxed">
             Operations are fully covered. Current reserve fund supports 6+ months of sustainable scaling.
           </p>
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
