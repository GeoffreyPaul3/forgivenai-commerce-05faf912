import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";
import {
  DollarSign, ShoppingBag, Package, TrendingUp, Star, Clock,
  CheckCircle2, ArrowRight, AlertCircle, ArrowUpRight, Truck, Zap,
  MessageSquare, MessageCircle, BarChart3, Video, Plus, Phone, Store,
  Timer
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Shared vendor-profile hook
export function useVendorProfile(id?: string, type: 'user' | 'vendor' = 'user') {
  return useQuery({
    queryKey: ["vendor-profile", id, type],
    queryFn: async () => {
      if (!id) {
        const { data } = await (supabase as any).from("vendors").select("*").limit(1).maybeSingle();
        return data;
      }
      
      const { data, error } = await (supabase as any)
        .from("vendors")
        .select("*")
        .eq(type === 'user' ? "user_id" : "id", id)
        .maybeSingle();
        
      if (error) throw error;
      return data;
    },
  });
}

export default function VendorDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
    const revenue = orders.reduce((s: number, o: any) => s + (o.vendor_amount || 0), 0);
    const pending = orders.filter((o: any) => o.vendor_confirmation_status === "pending" || !o.vendor_confirmation_status).length;
    const delivered = orders.filter((o: any) => o.status === "delivered").length;
    return { revenue, orderCount: orders.length, pending, delivered };
  }, [allOrders]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const createVendorMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id) throw new Error("No session");
      const { data, error } = await (supabase as any).from("vendors").insert({
        user_id: session.user.id,
        business_name: session.user.user_metadata?.business_name || "My Business",
        phone: session.user.user_metadata?.phone || session.user.phone || "0000000000",
        status: "active",
        score: 5.0
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-profile"] });
      toast({ title: "Vendor profile created! 🚀", description: "Welcome to your new dashboard." });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  if (vendorLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-6 p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 rounded-[2.5rem] bg-orange-500/10 flex items-center justify-center relative"
        >
          <div className="absolute inset-0 rounded-[2.5rem] border-2 border-orange-500/20 animate-ping" style={{ animationDuration: '3s' }} />
          <Store className="w-10 h-10 text-orange-500" />
        </motion.div>
        
        <div className="space-y-2 max-w-sm">
          <h2 className="font-heading text-3xl font-bold tracking-tight">No Vendor Profile Linked</h2>
          <p className="text-muted-foreground font-body leading-relaxed">
            Your account isn't connected to a business profile yet. Let's get you set up to start selling.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button 
            size="lg" 
            className="w-full bg-orange-500 hover:bg-orange-600 h-12 rounded-2xl font-bold shadow-lg shadow-orange-500/20"
            onClick={() => createVendorMutation.mutate()}
            disabled={createVendorMutation.isPending || !session?.user?.id}
          >
            {createVendorMutation.isPending ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
            ) : <Plus className="w-5 h-5 mr-2" />}
            Initialize Vendor Profile
          </Button>
          <Button variant="ghost" className="text-muted-foreground" onClick={() => window.location.href = "mailto:support@forgivencommerce.com"}>
            Contact Support
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card className="rounded-3xl border-border/50 bg-card shadow-sm hover:shadow-xl transition-all group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                <DollarSign className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total Payouts</p>
            <h3 className="text-2xl font-heading font-black tracking-tight">MWK {stats.revenue.toLocaleString()}</h3>
            <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-tighter">Gross earned</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/50 bg-card shadow-sm hover:shadow-xl transition-all group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Order Volume</p>
            <h3 className="text-2xl font-heading font-black tracking-tight">{stats.orderCount}</h3>
            <p className="text-[10px] text-amber-500 mt-2 font-black uppercase tracking-tighter">{stats.pending} await confirmation</p>
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
                      <p className="text-xs font-bold text-primary">MWK {(product.vendor_cost || 0).toLocaleString()}</p>
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
                className="w-full justify-start gap-3 rounded-2xl hover:bg-gold/5 hover:text-gold transition-all h-12"
                onClick={() => navigate("/dashboard/vendor/payouts")}
              >
                <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <span className="font-semibold text-sm">Payout History</span>
              </Button>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
