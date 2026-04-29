import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Package, DollarSign, Star, Clock, CheckCircle2, 
  XCircle, Truck, Info, BarChart3,
  Calendar, AlertCircle, TrendingUp, Wallet, ShieldCheck, Timer
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

/** Returns vendor class A/B/C/D based on score */
function getVendorClass(score: number | null) {
  if (!score) return { label: "—", color: "text-muted-foreground", bg: "bg-muted/40" };
  if (score >= 85) return { label: "A", color: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/20" };
  if (score >= 70) return { label: "B", color: "text-blue-600", bg: "bg-blue-500/10 border-blue-500/20" };
  if (score >= 50) return { label: "C", color: "text-amber-600", bg: "bg-amber-500/10 border-amber-500/20" };
  return { label: "D", color: "text-red-600", bg: "bg-red-500/10 border-red-500/20" };
}

/** Minutes elapsed since ISO timestamp */
function minutesSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

const VendorPortal = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<any>(null);

  // 1. Get Session
  useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      return data.session;
    },
  });

  // 2. Get Vendor Profile
  const { data: vendor, isLoading: vendorLoading } = useQuery({
    queryKey: ["vendor-profile", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) {
        // Fallback for development if no session
        const { data } = await (supabase as any).from("vendors").select("*").limit(1).maybeSingle();
        return data;
      }
      const { data } = await (supabase as any).from("vendors").select("*").eq("user_id", session.user.id).maybeSingle();
      return data;
    },
  });

  // 3. Get Orders related to this vendor's products
  // Optimization: In a real system, we'd have a join table or vendor_id on order_items. 
  // Here we'll fetch all products for the vendor and then filter orders.
  const { data: myProducts } = useQuery({
    queryKey: ["vendor-products", vendor?.id],
    enabled: !!vendor?.id,
    queryFn: async () => {
      const { data } = await (supabase as any).from("products").select("id").eq("vendor_id", vendor.id);
      return (data || []).map(p => p.id);
    },
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["vendor-orders", myProducts],
    enabled: !!myProducts && myProducts.length > 0,
    queryFn: async () => {
      const { data } = await (supabase as any).from("orders").select("*").order("created_at", { ascending: false });
      // Filtering in JS for demonstration; in production use Postgres JSON containment or join table
      return (data || []).filter(order => 
        (order.items as any[]).some(item => myProducts?.includes(item.product_id))
      );
    },
  });

  const acceptOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await (supabase as any).from("orders").update({ 
        vendor_confirmation_status: 'accepted',
        status: 'confirmed',
        vendor_confirmed_at: new Date().toISOString()
      }).eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-orders"] });
      toast({ title: "Order accepted!", description: "Prepare the items for fulfillment." });
    },
  });

  const rejectOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await (supabase as any).from("orders").update({ 
        vendor_confirmation_status: 'rejected',
        status: 'cancelled',
        vendor_confirmed_at: new Date().toISOString()
      }).eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-orders"] });
      toast({ title: "Order rejected", description: "Order has been cancelled.", variant: "destructive" });
    },
  });

  const stats = useMemo(() => {
    if (!orders) return { pending: 0, completed: 0, revenue: 0, avgConfirmMins: 0, confirmRate: 0, vendorAmount: 0 };
    let totalConfirmMins = 0, confirmCount = 0, accepted = 0, total = 0;
    return orders.reduce((acc, o: any) => {
      total++;
      if (o.vendor_confirmation_status === 'pending') acc.pending++;
      if (o.status === 'delivered') acc.completed++;
      acc.revenue += Number(o.total || 0);
      acc.vendorAmount += Number(o.vendor_amount || 0);
      if (o.vendor_confirmed_at && o.created_at) {
        const mins = Math.floor((new Date(o.vendor_confirmed_at).getTime() - new Date(o.created_at).getTime()) / 60000);
        if (mins >= 0) { totalConfirmMins += mins; confirmCount++; }
      }
      if (o.vendor_confirmation_status === 'accepted') accepted++;
      return acc;
    }, { pending: 0, completed: 0, revenue: 0, vendorAmount: 0,
         avgConfirmMins: confirmCount > 0 ? Math.round(totalConfirmMins / confirmCount) : 0,
         confirmRate: total > 0 ? Math.round((accepted / total) * 100) : 0 });
  }, [orders]);

  if (vendorLoading) return <div className="p-10 text-center font-body text-muted-foreground animate-pulse">Loading vendor portal...</div>;
  if (!vendor) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 p-6 text-center">
      <div className="w-16 h-16 rounded-3xl bg-amber-500/10 flex items-center justify-center text-amber-500">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-heading font-bold">No Vendor Linked</h2>
      <p className="text-muted-foreground font-body max-w-sm">Your account is not currently linked to a vendor. Please contact support to enable the Vendor Portal.</p>
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60 tracking-tight">Vendor Dashboard</h2>
          <p className="text-muted-foreground font-body">Manage {vendor.business_name}'s inventory and orders.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1 bg-gold/5 text-gold border-gold/20 flex items-center gap-2">
             <Star className="w-3 h-3 fill-gold" />
             <span className="font-bold">Score: {vendor.score ?? "—"}</span>
          </Badge>
          {(() => { const cls = getVendorClass(vendor.score); return (
            <Badge variant="outline" className={`px-3 py-1 font-black text-sm border ${cls.bg} ${cls.color}`}>
              Class {cls.label}
            </Badge>
          ); })()}
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "New Requests", value: stats.pending, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/5", border: "border-amber-500/20" },
          { label: "Fulfilled Orders", value: stats.completed, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/5", border: "border-emerald-500/20" },
          { label: "Confirm Rate", value: `${stats.confirmRate}%`, icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-500/5", border: "border-blue-500/20" },
          { label: "Avg Response", value: stats.avgConfirmMins > 0 ? `${stats.avgConfirmMins}m` : "—", icon: Timer, color: stats.avgConfirmMins > 60 ? "text-red-500" : stats.avgConfirmMins > 30 ? "text-amber-500" : "text-emerald-500", bg: "bg-primary/5", border: "border-primary/20" },
        ].map((s, idx) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className={`p-5 rounded-2xl border ${s.border} ${s.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</span>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-heading font-black">{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Orders Table */}
        <div className="lg:col-span-2 space-y-4">
           <div className="flex items-center justify-between px-2">
              <h3 className="font-heading font-bold text-xl flex items-center gap-2">
                 <Package className="w-5 h-5 text-primary" /> Active Orders
              </h3>
           </div>
           
           <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
             <Table>
               <TableHeader>
                 <TableRow className="bg-muted/30 border-0">
                   <TableHead className="pl-6">Order ID</TableHead>
                   <TableHead>Customer</TableHead>
                   <TableHead>Amount</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead className="text-right pr-6">Action</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {ordersLoading ? (
                   <TableRow><TableCell colSpan={5} className="text-center py-10 animate-pulse text-muted-foreground">Fetching orders...</TableCell></TableRow>
                 ) : (!orders || orders.length === 0) ? (
                   <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground font-body">No orders found for your products yet.</TableCell></TableRow>
                 ) : orders.map(order => (
                   <TableRow key={order.id} className="hover:bg-muted/20 transition-colors border-b border-border/50 group">
                     <TableCell className="pl-6">
                        <p className="font-mono text-xs font-bold text-muted-foreground">#{order.id.slice(0, 8)}</p>
                     </TableCell>
                     <TableCell>
                        <p className="font-semibold text-sm">{order.customer_name || "Unknown"}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                     </TableCell>
                     <TableCell className="font-bold text-primary">MWK {order.total.toLocaleString()}</TableCell>
                     <TableCell>
                        <Badge variant="outline" className={`text-[9px] uppercase font-bold tracking-tighter ${
                          order.vendor_confirmation_status === 'accepted' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' : 
                          order.vendor_confirmation_status === 'rejected' ? 'text-red-500 border-red-500/20 bg-red-500/5' : 
                          'text-amber-500 border-amber-500/20 bg-amber-500/5'
                        }`}>
                          {order.vendor_confirmation_status || 'pending'}
                        </Badge>
                     </TableCell>
                     <TableCell className="text-right pr-6">
                        {order.vendor_confirmation_status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                             <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-500/10" title="Reject" onClick={() => rejectOrder.mutate(order.id)} disabled={rejectOrder.isPending}>
                               <XCircle className="w-4 h-4" />
                             </Button>
                             <Button size="icon" className="h-8 w-8 bg-emerald-500 hover:bg-emerald-600" onClick={() => acceptOrder.mutate(order.id)} title="Accept">
                               <CheckCircle2 className="w-4 h-4" />
                             </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-8 text-xs font-bold gap-2 text-muted-foreground">
                             <Truck className="w-3.5 h-3.5" /> Details
                          </Button>
                        )}
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           </div>
        </div>

        {/* Side Info */}
        <div className="space-y-6">
           {/* Vendor Scoring Breakdown */}
           <Card className="rounded-3xl border-border bg-card shadow-sm overflow-hidden">
             <CardHeader className="bg-gradient-to-br from-primary/5 to-transparent border-b border-border/50">
               <CardTitle className="font-heading text-lg flex items-center gap-2 font-bold uppercase tracking-tight">
                 <BarChart3 className="w-4 h-4 text-primary" /> Vendor Insights
               </CardTitle>
             </CardHeader>
             <CardContent className="pt-5 space-y-3">
                {[
                  { label: "Avg Confirmation", value: stats.avgConfirmMins > 0 ? `${stats.avgConfirmMins}m` : "—", icon: Clock, color: stats.avgConfirmMins > 60 ? "text-red-500" : stats.avgConfirmMins > 30 ? "text-amber-500" : "text-emerald-500" },
                  { label: "Confirm Rate (30%)", value: `${stats.confirmRate}%`, icon: TrendingUp, color: "text-blue-500" },
                  { label: "Fulfilled Orders", value: stats.completed, icon: CheckCircle2, color: "text-emerald-500" },
                  { label: "Vendor Score", value: vendor.score ?? "—", icon: Star, color: "text-gold" },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between p-3 rounded-2xl bg-muted/40">
                     <div className="flex items-center gap-3">
                        <row.icon className={`w-4 h-4 ${row.color}`} />
                        <span className="text-xs font-bold uppercase tracking-tight text-muted-foreground">{row.label}</span>
                     </div>
                     <span className={`font-heading font-black ${row.color}`}>{row.value}</span>
                  </div>
                ))}
                {/* Confirmation timing rules */}
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 space-y-1">
                  <p className="text-[10px] font-bold uppercase text-primary tracking-widest mb-2">Timing Rules</p>
                  {[
                    { range: "5 – 15 min", label: "Ideal", color: "text-emerald-600" },
                    { range: "up to 30 min", label: "Acceptable", color: "text-amber-600" },
                    { range: "30 – 60 min", label: "Flagged", color: "text-orange-600" },
                    { range: "60+ min", label: "Escalated", color: "text-red-600" },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground">{r.range}</span>
                      <span className={`font-bold ${r.color}`}>{r.label}</span>
                    </div>
                  ))}
                </div>
             </CardContent>
           </Card>

           {/* Payout Tracking */}
           <Card className="rounded-3xl border-border bg-card shadow-sm overflow-hidden">
             <CardHeader className="bg-gradient-to-br from-emerald-500/5 to-transparent border-b border-border/50">
               <CardTitle className="font-heading text-lg flex items-center gap-2 font-bold uppercase tracking-tight">
                 <Wallet className="w-4 h-4 text-emerald-500" /> Payout Summary
               </CardTitle>
               <CardDescription className="text-[10px] font-body">FSC collects first · pays vendors after fulfillment</CardDescription>
             </CardHeader>
             <CardContent className="pt-5 space-y-3">
               <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40">
                 <span className="text-xs font-bold uppercase tracking-tight text-muted-foreground">Completed Orders</span>
                 <span className="font-heading font-black text-emerald-600">{stats.completed}</span>
               </div>
               <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40">
                 <span className="text-xs font-bold uppercase tracking-tight text-muted-foreground">Vendor Amount</span>
                 <span className="font-heading font-black">MWK {stats.vendorAmount > 0 ? stats.vendorAmount.toLocaleString() : "Pending"}</span>
               </div>
               <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                 <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
                 <p className="text-[10px] text-muted-foreground leading-relaxed font-body">Payouts processed by FSC admin after order fulfillment.</p>
               </div>
             </CardContent>
           </Card>

           <div className="p-5 rounded-3xl border border-gold/30 bg-gold/5 flex items-start gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-2xl bg-gold flex items-center justify-center text-white shrink-0 shadow-lg shadow-gold/20">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground mb-1 uppercase tracking-tight">Important Notice</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed font-body">
                  Items must be ready for rider pickup within 2 hours of acceptance. Delays reduce your Vendor Score and Class ranking.
                </p>
              </div>
           </div>
         </div>
      </div>
    </div>
  );
};

export default VendorPortal;
