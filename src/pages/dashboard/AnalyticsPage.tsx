import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Package, DollarSign, ShoppingBag } from "lucide-react";

const COLORS = ["hsl(350, 72%, 21%)", "hsl(40, 60%, 50%)", "hsl(0, 0%, 15%)", "hsl(35, 30%, 60%)"];

const AnalyticsPage = () => {
  const { data: products } = useQuery({
    queryKey: ["analytics-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("category, price, status");
      return data || [];
    },
  });

  const { data: orders } = useQuery({
    queryKey: ["analytics-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("status, total, channel, created_at");
      return data || [];
    },
  });

  const { data: content } = useQuery({
    queryKey: ["analytics-content"],
    queryFn: async () => {
      const { data } = await supabase.from("content").select("type, status");
      return data || [];
    },
  });

  // Category distribution
  const categoryData = Object.entries(
    (products || []).reduce<Record<string, number>>((acc, p) => {
      const cat = p.category || "Uncategorized";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Price range distribution
  const priceRanges = [
    { range: "0-20K", min: 0, max: 20000 },
    { range: "20K-40K", min: 20000, max: 40000 },
    { range: "40K-60K", min: 40000, max: 60000 },
    { range: "60K+", min: 60000, max: Infinity },
  ];
  const priceData = priceRanges.map(r => ({
    name: r.range,
    count: (products || []).filter(p => (p.price || 0) >= r.min && (p.price || 0) < r.max).length,
  }));

  // Order channel distribution
  const channelData = Object.entries(
    (orders || []).reduce<Record<string, number>>((acc, o) => {
      acc[o.channel || "web"] = (acc[o.channel || "web"] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Content type breakdown
  const contentData = Object.entries(
    (content || []).reduce<Record<string, number>>((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name: name.replace("_", " "), value }));

  const totalProducts = products?.length || 0;
  const totalOrders = orders?.length || 0;
  const totalRevenue = orders?.filter(o => o.status !== "cancelled").reduce((s, o) => s + (o.total || 0), 0) || 0;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">Analytics & Insights</h2>
        <p className="text-muted-foreground text-sm font-body">Business performance at a glance</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Products", value: totalProducts, icon: Package },
          { label: "Orders", value: totalOrders, icon: ShoppingBag },
          { label: "Revenue", value: `MWK ${totalRevenue.toLocaleString()}`, icon: DollarSign },
          { label: "Avg Order", value: `MWK ${avgOrderValue.toLocaleString()}`, icon: TrendingUp },
        ].map(kpi => (
          <div key={kpi.label} className="p-5 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground font-body">{kpi.label}</span>
              <kpi.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-heading font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        {/* Price Distribution */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-heading text-sm font-semibold mb-4">Price Distribution (MWK)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={priceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(350, 72%, 21%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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

        {/* Content Breakdown */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-heading text-sm font-semibold mb-4">Content Breakdown</h3>
          {contentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={contentData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
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
