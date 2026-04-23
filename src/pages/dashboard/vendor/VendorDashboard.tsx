import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";
import {
  DollarSign, ShoppingBag, Package, TrendingUp, Star, Clock,
  CheckCircle2, ArrowRight, AlertCircle, ArrowUpRight, Truck, Zap,
  MessageSquare, MessageCircle, BarChart3, Video, Plus, Phone
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Shared vendor-profile hook
export function useVendorProfile(sessionUserId?: string) {
  return useQuery({
    queryKey: ["vendor-profile", sessionUserId],
    queryFn: async () => {
      if (sessionUserId) {
        const { data } = await (supabase as any).from("vendors").select("*").eq("user_id", sessionUserId).maybeSingle();
        if (data) return data;
      }
      const { data } = await (supabase as any).from("vendors").select("*").limit(1).maybeSingle();
      return data;
    },
  });
}

export default function VendorDashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);

  useQuery({
    queryKey: ["session-vendor-dash"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      return data.session;
    },
  });

  const { data: vendor, isLoading: vendorLoading } = useVendorProfile(session?.user?.id);

  const { data: vendorProductIds } = useQuery({
    queryKey: ["vendor-product-ids-dash", vendor?.id],
    enabled: !!vendor?.id,
    queryFn: async () => {
      const { data } = await (supabase as any).from("products").select("id").eq("vendor_id", vendor.id);
      return (data || []).map((p: any) => p.id) as string[];
    },
  });

  const { data: allOrders } = useQuery({
    queryKey: ["vendor-all-orders-dash", vendorProductIds],
    enabled: !!vendorProductIds && vendorProductIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("orders")
        .select("id, customer_name, customer_phone, total, status, channel, vendor_confirmation_status, created_at, items")
        .order("created_at", { ascending: false });
      return (data || []).filter((o: any) =>
        (o.items as any[]).some((item: any) => vendorProductIds?.includes(item.product_id))
      );
    },
  });

  const { data: vendorProducts } = useQuery({
    queryKey: ["vendor-products-preview", vendor?.id],
    enabled: !!vendor?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("products")
        .select("*")
        .eq("vendor_id", vendor.id)
        .limit(4);
      return data || [];
    },
  });

  const stats = useMemo(() => {
    const orders = allOrders || [];
    const revenue = orders.reduce((s: number, o: any) => s + (o.total || 0), 0);
    const pending = orders.filter((o: any) => o.vendor_confirmation_status === "pending" || !o.vendor_confirmation_status).length;
    const delivered = orders.filter((o: any) => o.status === "delivered").length;
    return { revenue, orderCount: orders.length, pending, delivered };
  }, [allOrders]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (vendorLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 p-6">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-amber-500" />
        </div>
        <h2 className="font-heading text-2xl font-bold">No Vendor Profile Linked</h2>
        <p className="text-muted-foreground font-body max-w-sm">
          Your account is not linked to a vendor profile. Contact support to get set up.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-muted-foreground font-body text-sm">VP</span>
            <span className="font-heading font-bold text-lg">{vendor.business_name}</span>
          </div>
          <h2 className="font-heading text-3xl font-bold tracking-tight">{greeting} 👋</h2>
          <p className="text-muted-foreground font-body">Welcome back to Forgiven Vendor Portal</p>
          <p className="text-muted-foreground font-body text-sm mt-1">Here's what's happening with your products today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-gold/20 text-gold bg-gold/5 px-2.5 py-1">
            <Star className="w-2.5 h-2.5 mr-1 fill-gold" /> Vendor Score: {vendor.score ?? "N/A"}
          </Badge>
          <Button 
            className="gap-2 bg-primary hover:bg-primary/90"
            onClick={() => navigate("/dashboard/vendor/products")}
          >
            <Plus className="w-4 h-4" /> Add New Product
          </Button>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Total Sales</p>
            <h3 className="text-2xl font-heading font-black">MWK {stats.revenue.toLocaleString()}</h3>
            <p className="text-[10px] text-muted-foreground mt-2 font-body">Gross revenue from products</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Orders Count</p>
            <h3 className="text-2xl font-heading font-black">{stats.orderCount}</h3>
            <p className="text-[10px] text-muted-foreground mt-2 font-body">{stats.pending} pending confirmation</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Revenue</p>
            <h3 className="text-2xl font-heading font-black">MWK {Math.round(stats.revenue * 0.8).toLocaleString()}</h3>
            <p className="text-[10px] text-muted-foreground mt-2 font-body">Net earnings (80%)</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Fulfillment</p>
            <h3 className="text-2xl font-heading font-black">{stats.delivered}</h3>
            <p className="text-[10px] text-muted-foreground mt-2 font-body">Delivered items</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Orders & Top Products */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Orders */}
          <Card className="rounded-3xl border-border bg-card shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
              <div>
                <CardTitle className="font-heading text-xl">Recent Orders</CardTitle>
                <CardDescription>{(allOrders || []).length > 0 ? "Latest activity" : "No orders yet"}</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => navigate("/dashboard/vendor/orders")}>
                View all <ArrowRight className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 border-0">
                    <TableHead className="pl-6">Customer</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="pr-6">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!allOrders || allOrders.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-muted-foreground font-body">No orders found.</TableCell>
                    </TableRow>
                  ) : (allOrders.slice(0, 5).map(order => (
                    <TableRow key={order.id} className="hover:bg-muted/20 transition-colors border-b border-border/50">
                      <TableCell className="pl-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">{order.customer_name}</span>
                          <span className="text-[10px] text-muted-foreground">#{order.id.slice(0, 8)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-emerald-500/5 text-emerald-500 border-emerald-500/20 text-[9px] font-bold">
                          {order.channel || "whatsapp"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold text-sm">MWK {order.total.toLocaleString()}</TableCell>
                      <TableCell className="pr-6">
                        <Badge className={`text-[10px] font-bold uppercase ${
                          order.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-500' : 
                          order.status === 'shipped' ? 'bg-blue-500/10 text-blue-500' :
                          'bg-amber-500/10 text-amber-500'
                        }`}>
                          {order.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card className="rounded-3xl border-border bg-card shadow-sm overflow-hidden">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="font-heading text-xl">Top Products</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(vendorProducts || []).map((product: any) => (
                  <div key={product.id} className="flex items-center gap-4 p-3 rounded-2xl bg-muted/20 hover:bg-muted/40 transition-colors group cursor-pointer" onClick={() => navigate("/dashboard/vendor/products")}>
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted shrink-0">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-full h-full p-3 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{product.name}</p>
                      <p className="text-xs font-bold text-primary">MWK {product.price.toLocaleString()}</p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Conversations & Quick Actions */}
        <div className="space-y-6">
          {/* Performance Chart Mini */}
          <Card className="rounded-3xl border-border bg-card shadow-sm overflow-hidden p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-sm">Performance</h3>
              <Badge variant="outline" className="p-0 h-auto border-0 text-[10px] text-emerald-500 font-bold bg-transparent shadow-none">+12%</Badge>
            </div>
            <div className="h-[120px]">
               <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={(allOrders || []).slice(0, 7).reverse().map(o => ({ v: o.total }))}>
                  <Area type="monotone" dataKey="v" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.1)" strokeWidth={2} />
                </AreaChart>
               </ResponsiveContainer>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="rounded-3xl border-border bg-card shadow-sm overflow-hidden">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="font-heading text-xl">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 rounded-2xl hover:bg-primary/5 hover:text-primary transition-all h-12"
                onClick={() => navigate("/dashboard/vendor/products")}
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <span className="font-semibold text-sm">Add New Product</span>
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 rounded-2xl hover:bg-blue-500/5 hover:text-blue-500 transition-all h-12"
                onClick={() => navigate("/dashboard/vendor/orders")}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <span className="font-semibold text-sm">View All Orders</span>
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 rounded-2xl hover:bg-emerald-500/5 hover:text-emerald-500 transition-all h-12"
                onClick={() => navigate("/dashboard/assistant")}
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <span className="font-semibold text-sm">Open WhatsApp Chat</span>
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 rounded-2xl hover:bg-gold/5 hover:text-gold transition-all h-12"
                onClick={() => navigate("/dashboard/vendor/payouts")}
              >
                <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <span className="font-semibold text-sm">Payout History</span>
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 rounded-2xl hover:bg-purple-500/5 hover:text-purple-500 transition-all h-12"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <span className="font-semibold text-sm">View Analytics</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
