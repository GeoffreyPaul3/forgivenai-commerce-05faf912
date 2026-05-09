import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  ShoppingBag, CheckCircle2, Clock, XCircle, Truck,
  PackageSearch, Package, DollarSign,
  Star
} from "lucide-react";
import { useVendorProfile } from "./VendorDashboard";

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  pending:    { label: "Pending",    color: "text-amber-500",  bg: "bg-amber-500/5",  border: "border-amber-500/20",  icon: Clock },
  confirmed:  { label: "Confirmed",  color: "text-blue-500",   bg: "bg-blue-500/5",   border: "border-blue-500/20",   icon: Package },
  processing: { label: "Processing", color: "text-purple-500", bg: "bg-purple-500/5", border: "border-purple-500/20", icon: Package },
  shipped:    { label: "Shipped",    color: "text-indigo-500", bg: "bg-indigo-500/5", border: "border-indigo-500/20", icon: Truck },
  delivered:  { label: "Delivered",  color: "text-emerald-500",bg: "bg-emerald-500/5",border: "border-emerald-500/20",icon: CheckCircle2 },
  cancelled:  { label: "Cancelled",  color: "text-red-500",    bg: "bg-red-500/5",    border: "border-red-500/20",    icon: XCircle },
};

export default function VendorOrdersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("all");

  useQuery({
    queryKey: ["session-vendor-orders"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      return data.session;
    },
  });

  const { data: vendor, isLoading: vendorLoading } = useVendorProfile(session?.user?.id);

  const { data: vendorProductIds } = useQuery({
    queryKey: ["vendor-product-ids-orders", vendor?.id],
    enabled: !!vendor?.id,
    queryFn: async () => {
      const { data } = await (supabase as any).from("products").select("id").eq("vendor_id", vendor.id);
      return (data || []).map((p: any) => p.id) as string[];
    },
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["vendor-orders-page", vendorProductIds],
    enabled: !!vendorProductIds && vendorProductIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .rpc("get_vendor_orders", { p_vendor_id: vendor.id });
      if (error) console.error(error);
      return data || [];
    },
  });

  const { data: vendorPayouts } = useQuery({
    queryKey: ["vendor-payouts-summary", vendor?.id],
    enabled: !!vendor?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("vendor_payouts")
        .select("*")
        .eq("vendor_id", vendor.id);
      return data || [];
    },
  });

  const acceptOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await (supabase as any)
        .from("orders")
        .update({ vendor_confirmation_status: "accepted", vendor_confirmed_at: new Date().toISOString() })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-orders-page"] });
      toast({ title: "Order accepted! ✅", description: "Prepare items for rider pickup within 2 hours." });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const rejectOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await (supabase as any)
        .from("orders")
        .update({ vendor_confirmation_status: "rejected" })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-orders-page"] });
      toast({ title: "Order rejected", description: "Admin has been notified." });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const kpis = [
    { label: "Confirmed Payouts", value: `MWK ${(vendorPayouts || []).filter((p: any) => p.status === 'paid').reduce((s: number, p: any) => s + (p.amount || 0), 0).toLocaleString()}`, icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-500/5", border: "border-emerald-500/20" },
    { label: "Pending Payouts", value: `MWK ${(orders || []).filter((o: any) => o.status === 'delivered' && o.vendor_confirmation_status === 'accepted').reduce((s: number, o: any) => s + (o.vendor_amount || 0), 0).toLocaleString()}`, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/5", border: "border-amber-500/20" },
    { label: "Total Orders", value: orders?.length ?? 0, icon: ShoppingBag, color: "text-primary", bg: "bg-primary/5", border: "border-primary/20" },
    { label: "Performance Class", value: `Class ${vendor?.class || '—'}`, icon: Star, color: "text-gold", bg: "bg-gold/5", border: "border-gold/20" },
  ];

  if (vendorLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60 tracking-tight">
            Order Fulfillment
          </h2>
          <p className="text-muted-foreground font-body mt-1">
            Manage incoming orders and track your earnings.
          </p>
        </div>
      </div>

      {/* Payout & Performance KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((s, i) => (
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

      {/* Orders Table */}
      <Card className="rounded-[2.5rem] border-border/50 bg-card shadow-xl shadow-black/5 overflow-hidden">
        <CardHeader className="bg-muted/20 p-8 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-heading text-xl font-black flex items-center gap-3">
                <Package className="w-6 h-6 text-primary" /> Active Orders
              </CardTitle>
              <CardDescription className="mt-1">Real-time confirmation tracking</CardDescription>
            </div>
            <div className="flex gap-2">
               <Badge className="bg-primary/10 text-primary border-0 font-black px-4 py-1.5 rounded-full uppercase text-[10px] tracking-widest">
                  Live Sync Active
               </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/10 border-0">
                  <TableHead className="pl-8 py-5">Order Reference</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Confirm Speed</TableHead>
                  <TableHead>Payout Amount</TableHead>
                  <TableHead>Fulfillment</TableHead>
                  <TableHead className="text-right pr-8">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordersLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20 animate-pulse text-muted-foreground">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        <p className="text-sm font-bold uppercase tracking-widest">Synchronizing Encrypted Data...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (orders || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-24">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-3xl bg-muted/30 flex items-center justify-center">
                          <PackageSearch className="w-8 h-8 text-muted-foreground/30" />
                        </div>
                        <p className="text-muted-foreground font-heading font-black text-xl">No active orders</p>
                        <p className="text-sm text-muted-foreground/60 max-w-xs">New orders will appear here automatically when placed on WhatsApp or Web.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (orders || []).map((order: any) => {
                  const orderCfg = statusConfig[order.status] || statusConfig.pending;
                  const StatusIcon = orderCfg.icon;
                  const confirmStatus = order.vendor_confirmation_status || "pending";
                  const needsAction = confirmStatus === "pending";
                  
                  // Calculate elapsed time
                  const minsElapsed = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
                  const delayColor = minsElapsed >= 60 ? "text-red-500 bg-red-50" : minsElapsed >= 30 ? "text-amber-500 bg-amber-50" : "text-emerald-500 bg-emerald-50";

                  return (
                    <TableRow key={order.id} className="hover:bg-muted/10 transition-colors border-b border-border/50 group">
                      <TableCell className="pl-8 py-6">
                        <p className="font-mono text-xs font-black text-muted-foreground tracking-tighter">#{order.id.slice(0, 8)}</p>
                        <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{new Date(order.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-black text-sm text-foreground/90">{order.customer_name || "Guest"}</p>
                        <p className="text-[10px] text-muted-foreground tracking-tight">{order.customer_phone}</p>
                      </TableCell>
                      <TableCell>
                        {needsAction ? (
                          <Badge variant="outline" className={`font-black text-[10px] uppercase border-0 px-3 py-1 rounded-full ${delayColor}`}>
                             {minsElapsed}m Elapsed
                          </Badge>
                        ) : (
                          <p className="text-[10px] font-black uppercase text-muted-foreground/50">
                             {order.vendor_confirmed_at ? `${Math.floor((new Date(order.vendor_confirmed_at).getTime() - new Date(order.created_at).getTime()) / 60000)}m response` : '—'}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-black text-emerald-600">MWK {(order.vendor_amount || 0).toLocaleString()}</p>
                          <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">My Payout</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] uppercase font-black flex items-center gap-1.5 w-fit px-3 py-1 rounded-full border-transparent ${orderCfg.bg} ${orderCfg.color}`}>
                          <StatusIcon className="w-3 h-3" /> {orderCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        {needsAction ? (
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-9 px-4 text-red-500 hover:bg-red-500/10 font-black text-[10px] uppercase rounded-xl"
                              onClick={() => rejectOrder.mutate(order.id)}
                              disabled={rejectOrder.isPending}
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              className="h-9 px-6 bg-primary hover:bg-primary/90 text-white font-black text-[10px] uppercase rounded-xl shadow-lg shadow-primary/20"
                              onClick={() => acceptOrder.mutate(order.id)}
                              disabled={acceptOrder.isPending}
                            >
                              Confirm Order
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                             {confirmStatus === "accepted" ? (
                               <Badge className="bg-emerald-500/10 text-emerald-600 border-0 font-black text-[10px] uppercase px-4 py-1.5 rounded-full">
                                 ✓ Accepted
                               </Badge>
                             ) : (
                               <Badge className="bg-red-500/10 text-red-600 border-0 font-black text-[10px] uppercase px-4 py-1.5 rounded-full">
                                 ✕ Rejected
                               </Badge>
                             )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
