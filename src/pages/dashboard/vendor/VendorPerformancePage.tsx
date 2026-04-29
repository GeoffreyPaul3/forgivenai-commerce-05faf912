import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  BarChart3, TrendingUp, ShoppingBag, Package, DollarSign,
  ArrowUpRight, Zap, Clock, CheckCircle2, Star, ArrowLeft
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";
import { useVendorProfile } from "./VendorDashboard";

const CHART_COLORS = ["hsl(var(--primary))", "#f59e0b", "#10b981", "#6366f1", "#ec4899", "#14b8a6"];

export default function VendorPerformancePage() {
  const { id: urlVendorId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);

  useQuery({
    queryKey: ["session-vendor-perf"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      return data.session;
    },
  });

  const { data: vendor, isLoading: vendorLoading } = useVendorProfile(
    urlVendorId || session?.user?.id,
    urlVendorId ? 'vendor' : 'user'
  );

  const { data: products } = useQuery({
    queryKey: ["vendor-products-perf", vendor?.id],
    enabled: !!vendor?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("products")
        .select("id, name, category, price")
        .eq("vendor_id", vendor.id);
      return data || [];
    },
  });

  const productIds = (products || []).map((p: any) => p.id);

  const { data: allOrders } = useQuery({
    queryKey: ["vendor-orders-perf", productIds],
    enabled: productIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("orders")
        .select("id, total, status, created_at, items")
        .order("created_at", { ascending: true });
      return (data || []).filter((o: any) =>
        (o.items as any[]).some((item: any) => productIds.includes(item.product_id))
      );
    },
  });

  const kpis = useMemo(() => {
    const orders = allOrders || [];
    const revenue = orders.reduce((s: number, o: any) => s + (o.total || 0), 0);
    const delivered = orders.filter((o: any) => o.status === "delivered").length;
    const cancelled = orders.filter((o: any) => o.status === "cancelled").length;
    const conversionRate = orders.length > 0 ? ((delivered / orders.length) * 100).toFixed(1) : "0.0";
    const avgOrder = orders.length > 0 ? Math.round(revenue / orders.length) : 0;
    return { revenue, totalOrders: orders.length, delivered, cancelled, conversionRate, avgOrder };
  }, [allOrders]);

  // Revenue over time
  const revenueTimeline = useMemo(() => {
    const grouped: Record<string, number> = {};
    (allOrders || []).forEach((o: any) => {
      const month = new Date(o.created_at).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
      grouped[month] = (grouped[month] || 0) + (o.total || 0);
    });
    return Object.entries(grouped).map(([date, revenue]) => ({ date, revenue }));
  }, [allOrders]);

  // Order status breakdown for pie chart
  const statusBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    (allOrders || []).forEach((o: any) => {
      map[o.status] = (map[o.status] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [allOrders]);

  // Top products by revenue contribution
  const productPerformance = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; orders: number }> = {};
    (allOrders || []).forEach((o: any) => {
      (o.items as any[]).forEach((item: any) => {
        const prod = (products || []).find((p: any) => p.id === item.product_id);
        if (prod) {
          if (!map[prod.id]) map[prod.id] = { name: prod.name, revenue: 0, orders: 0 };
          map[prod.id].revenue += (item.price || prod.price || 0) * (item.quantity || 1);
          map[prod.id].orders += 1;
        }
      });
    });
    return Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [allOrders, products]);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          {urlVendorId && (
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)} 
              className="mb-2 -ml-2 gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Vendors
            </Button>
          )}
          <h2 className="font-heading text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
            {urlVendorId ? `${vendor?.business_name || 'Vendor'} Performance` : 'Performance'}
          </h2>
          <p className="text-muted-foreground font-body mt-1">
            {urlVendorId 
              ? `In-depth analytics for ${vendor?.business_name || 'this business partner'}.` 
              : 'Analytics, product performance, and conversion tracking.'
            }
          </p>
        </div>
        
        {urlVendorId && (
          <Badge className="bg-primary/10 text-primary border-primary/20 font-black px-4 py-1.5 rounded-xl">
            ADMIN VIEW
          </Badge>
        )}
      </div>

      {/* Performance Breakdown */}
      <Card className="rounded-[2.5rem] border-0 bg-card shadow-2xl shadow-black/5 overflow-hidden">
        <CardHeader className="bg-muted/20 p-8 border-b border-border/50">
          <CardTitle className="font-heading text-xl font-black flex items-center gap-3">
            <Zap className="w-6 h-6 text-primary" /> Weighted Ranking Intelligence
          </CardTitle>
          <CardDescription>How your platform rank is calculated across weighted vectors</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { label: "Confirmation Speed", weight: "30%", val: 92, icon: Clock, color: "bg-emerald-500" },
              { label: "Acceptance Rate", weight: "30%", val: 98, icon: CheckCircle2, color: "bg-blue-500" },
              { label: "Fulfillment Success", weight: "25%", val: 88, icon: Package, color: "bg-purple-500" },
              { label: "Product Quality", weight: "15%", val: 95, icon: Star, color: "bg-gold" },
            ].map(m => (
              <div key={m.label} className="space-y-4">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <m.icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">{m.label}</span>
                   </div>
                   <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-full">{m.weight}</span>
                </div>
                <div className="flex items-end justify-between gap-4">
                   <span className="text-3xl font-heading font-black tracking-tight">{m.val}%</span>
                   <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden mb-2">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${m.val}%` }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className={`h-full ${m.color} shadow-lg shadow-black/10`}
                      />
                   </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { label: "Market Earnings", value: `MWK ${kpis.revenue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-500/5", border: "border-emerald-500/20" },
          { label: "Supply Volume", value: kpis.totalOrders, icon: ShoppingBag, color: "text-blue-500", bg: "bg-blue-500/5", border: "border-blue-500/20" },
          { label: "Average Item Payout", value: `MWK ${kpis.avgOrder.toLocaleString()}`, icon: TrendingUp, color: "text-gold", bg: "bg-gold/5", border: "border-gold/20" },
          { label: "Confirmed Delivery", value: kpis.delivered, icon: Package, color: "text-primary", bg: "bg-primary/5", border: "border-primary/20" },
          { label: "Platform Percentile", value: `TOP 12%`, icon: BarChart3, color: "text-purple-500", bg: "bg-purple-500/5", border: "border-purple-500/20" },
          { label: "Escalated Delays", value: kpis.cancelled, icon: Zap, color: "text-red-500", bg: "bg-red-500/5", border: "border-red-500/20" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`p-6 rounded-3xl border ${s.border} ${s.bg} shadow-sm group hover:shadow-md transition-all`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">{s.label}</span>
              <s.icon className={`w-4 h-4 ${s.color} group-hover:scale-110 transition-transform`} />
            </div>
            <p className="text-2xl font-heading font-black tracking-tight">{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Revenue Timeline */}
      <Card className="rounded-2xl border-border bg-card shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="font-heading flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> Revenue Over Time
          </CardTitle>
          <CardDescription>Monthly revenue from your products</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px] pt-6">
          {revenueTimeline.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-muted-foreground text-sm">No revenue data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTimeline}>
                <defs>
                  <linearGradient id="vendorRevPerf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis axisLine={false} tickLine={false} fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }}
                  formatter={(v: any) => [`MWK ${Number(v).toLocaleString()}`, "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2.5} fillOpacity={1} fill="url(#vendorRevPerf)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Product Performance + Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card className="rounded-2xl border-border bg-card shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="font-heading flex items-center gap-2 text-base">
              <Package className="w-4 h-4 text-primary" /> Top Products by Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[260px] pt-4">
            {productPerformance.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-muted-foreground text-sm">No data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productPerformance} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" axisLine={false} tickLine={false} fontSize={10} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={10} tick={{ fill: "hsl(var(--muted-foreground))" }} width={90} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }}
                    formatter={(v: any) => [`MWK ${Number(v).toLocaleString()}`, "Revenue"]}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Order Status Pie */}
        <Card className="rounded-2xl border-border bg-card shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="font-heading flex items-center gap-2 text-base">
              <BarChart3 className="w-4 h-4 text-primary" /> Order Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[260px] pt-4 flex items-center justify-center">
            {statusBreakdown.length === 0 ? (
              <p className="text-muted-foreground text-sm">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={3}>
                    {statusBreakdown.map((_entry, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }}
                  />
                  <Legend iconType="circle" iconSize={8} formatter={(v: any) => <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
