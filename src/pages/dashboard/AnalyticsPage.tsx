import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, Package, DollarSign, ShoppingBag, Users, MessageSquare, Video, Percent } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const COLORS = ["hsl(350, 72%, 21%)", "hsl(40, 60%, 50%)", "hsl(0, 0%, 15%)", "hsl(35, 30%, 60%)", "hsl(350, 50%, 40%)"];

const AnalyticsPage = () => {
  const { data: products } = useQuery({
    queryKey: ["analytics-products"],
    queryFn: async () => { const { data } = await supabase.from("products").select("category, price, status"); return data || []; },
  });

  const { data: orders } = useQuery({
    queryKey: ["analytics-orders"],
    queryFn: async () => { const { data } = await supabase.from("orders").select("status, total, channel, created_at, agent_id"); return data || []; },
  });

  const { data: content } = useQuery({
    queryKey: ["analytics-content"],
    queryFn: async () => { const { data } = await supabase.from("content").select("type, status"); return data || []; },
  });

  const { data: agents } = useQuery({
    queryKey: ["analytics-agents"],
    queryFn: async () => { const { data } = await supabase.from("agents").select("id, name, status, commission_rate"); return data || []; },
  });

  const { data: conversations } = useQuery({
    queryKey: ["analytics-conversations"],
    queryFn: async () => { const { data } = await supabase.from("conversations").select("channel, status"); return data || []; },
  });

  // KPIs
  const totalProducts = products?.length || 0;
  const totalOrders = orders?.length || 0;
  const totalRevenue = orders?.filter(o => o.status !== "cancelled").reduce((s, o) => s + (o.total || 0), 0) || 0;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const whatsappOrders = orders?.filter(o => o.channel === "whatsapp").length || 0;
  const conversionRate = conversations?.length ? Math.round((whatsappOrders / Math.max(conversations.length, 1)) * 100) : 0;
  const agentOrders = orders?.filter(o => o.agent_id).length || 0;
  const ugcContent = content?.filter(c => c.type === "ugc").length || 0;

  // Category distribution
  const categoryData = Object.entries(
    (products || []).reduce<Record<string, number>>((acc, p) => { acc[p.category || "Uncategorized"] = (acc[p.category || "Uncategorized"] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  // Order status
  const orderStatusData = Object.entries(
    (orders || []).reduce<Record<string, number>>((acc, o) => { acc[o.status || "pending"] = (acc[o.status || "pending"] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  // Channel distribution
  const channelData = Object.entries(
    (orders || []).reduce<Record<string, number>>((acc, o) => { acc[o.channel || "web"] = (acc[o.channel || "web"] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  // Content breakdown
  const contentData = Object.entries(
    (content || []).reduce<Record<string, number>>((acc, c) => { acc[c.type] = (acc[c.type] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name: name.replace("_", " "), value }));

  // Agent performance
  const agentPerf = (agents || []).map(a => {
    const agentOrderList = orders?.filter(o => o.agent_id === a.id && o.status !== "cancelled") || [];
    const sales = agentOrderList.reduce((s, o) => s + (o.total || 0), 0);
    return { name: a.name.split(" ")[0], sales, orders: agentOrderList.length, commission: Math.round(sales * ((a.commission_rate || 10) / 100)) };
  }).sort((a, b) => b.sales - a.sales).slice(0, 8);

  // Revenue over time (by day)
  const revenueByDay = Object.entries(
    (orders || []).filter(o => o.status !== "cancelled").reduce<Record<string, number>>((acc, o) => {
      const day = new Date(o.created_at).toLocaleDateString("en", { month: "short", day: "numeric" });
      acc[day] = (acc[day] || 0) + (o.total || 0);
      return acc;
    }, {})
  ).map(([date, revenue]) => ({ date, revenue })).slice(-14);

  const kpis = [
    { label: "Products", value: totalProducts, icon: Package, color: "text-primary" },
    { label: "Orders", value: totalOrders, icon: ShoppingBag, color: "text-blue-600" },
    { label: "Revenue", value: `MWK ${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-600" },
    { label: "Avg Order", value: `MWK ${avgOrderValue.toLocaleString()}`, icon: TrendingUp, color: "text-gold" },
    { label: "WhatsApp Orders", value: whatsappOrders, icon: MessageSquare, color: "text-green-600" },
    { label: "Conversion Rate", value: `${conversionRate}%`, icon: Percent, color: "text-purple-600" },
    { label: "Agent Sales", value: agentOrders, icon: Users, color: "text-orange-600" },
    { label: "UGC Videos", value: ugcContent, icon: Video, color: "text-pink-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">Analytics & Insights</h2>
        <p className="text-muted-foreground text-sm font-body">Business performance at a glance</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="p-5 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground font-body">{kpi.label}</span>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </div>
            <p className="text-2xl font-heading font-bold">{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-heading text-sm font-semibold mb-4">Revenue Trend</h3>
          {revenueByDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={revenueByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`MWK ${v.toLocaleString()}`, "Revenue"]} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(350, 72%, 21%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-muted-foreground text-sm py-12">No data</p>}
        </div>

        {/* Category Pie */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-heading text-sm font-semibold mb-4">Products by Category</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-muted-foreground text-sm py-12">No data</p>}
        </div>

        {/* Order Channels */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-heading text-sm font-semibold mb-4">Orders by Channel</h3>
          {channelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={channelData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {channelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-muted-foreground text-sm py-12">No orders yet</p>}
        </div>

        {/* Agent Performance */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-heading text-sm font-semibold mb-4">Top Agent Performance</h3>
          {agentPerf.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={agentPerf}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`MWK ${v.toLocaleString()}`, "Sales"]} />
                <Bar dataKey="sales" fill="hsl(350, 72%, 21%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-muted-foreground text-sm py-12">No agent data</p>}
        </div>

        {/* Order Status */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-heading text-sm font-semibold mb-4">Order Status Breakdown</h3>
          {orderStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={orderStatusData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(40, 60%, 50%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-muted-foreground text-sm py-12">No orders</p>}
        </div>

        {/* Content Breakdown */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-heading text-sm font-semibold mb-4">Content Breakdown</h3>
          {contentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={contentData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(40, 60%, 50%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-muted-foreground text-sm py-12">No content yet</p>}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
