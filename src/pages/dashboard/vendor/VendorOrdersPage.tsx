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
  PackageSearch, Package, DollarSign
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
      const { data } = await (supabase as any)
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      return (data || []).filter((o: any) =>
        (o.items as any[]).some((item: any) => vendorProductIds?.includes(item.product_id))
      );
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

  const allStatuses = ["all", "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

  const filtered = filterStatus === "all"
    ? (orders || [])
    : (orders || []).filter((o: any) => o.status === filterStatus);

  const kpis = [
    { label: "Total Orders", value: orders?.length ?? 0, icon: ShoppingBag, color: "text-primary", bg: "bg-primary/5", border: "border-primary/20" },
    { label: "Pending Confirm", value: (orders || []).filter((o: any) => o.vendor_confirmation_status === "pending" || !o.vendor_confirmation_status).length, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/5", border: "border-amber-500/20" },
    { label: "Delivered", value: (orders || []).filter((o: any) => o.status === "delivered").length, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/5", border: "border-emerald-500/20" },
    { label: "Revenue", value: `MWK ${(orders || []).reduce((s: number, o: any) => s + (o.total || 0), 0).toLocaleString()}`, icon: DollarSign, color: "text-gold", bg: "bg-gold/5", border: "border-gold/20" },
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
      <div>
        <h2 className="font-heading text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
          Orders
        </h2>
        <p className="text-muted-foreground font-body mt-1">
          All orders containing your products — confirm, track, and fulfil.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`p-5 rounded-2xl border ${s.border} ${s.bg}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{s.label}</span>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-heading font-black">{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 flex-wrap">
        {allStatuses.map(s => {
          const cfg = statusConfig[s];
          const isActive = filterStatus === s;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-tight transition-all border ${
                isActive
                  ? s === "all" ? "bg-primary text-white border-primary" : `${cfg.bg} ${cfg.color} ${cfg.border}`
                  : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50"
              }`}
            >
              {s === "all" ? "All Orders" : s}
              {s !== "all" && orders && (
                <span className="ml-1.5 opacity-60">({(orders || []).filter((o: any) => o.status === s).length})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Orders Table */}
      <Card className="rounded-3xl border-border bg-card shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/50">
          <div>
            <CardTitle className="font-heading flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" /> Order Details
            </CardTitle>
            <CardDescription>
              {filtered.length} order{filtered.length !== 1 ? "s" : ""} {filterStatus !== "all" ? `· "${filterStatus}"` : "total"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 border-0">
                <TableHead className="pl-6">Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Order Status</TableHead>
                <TableHead>Confirmation</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordersLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 animate-pulse text-muted-foreground">
                    Fetching orders...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <PackageSearch className="w-10 h-10 text-muted-foreground/30" />
                      <p className="text-muted-foreground font-body font-medium">
                        {filterStatus === "all" ? "No orders yet for your products" : `No ${filterStatus} orders`}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.map((order: any) => {
                const orderCfg = statusConfig[order.status] || statusConfig.pending;
                const StatusIcon = orderCfg.icon;
                const confirmStatus = order.vendor_confirmation_status || "pending";
                const needsAction = confirmStatus === "pending";
                return (
                  <TableRow key={order.id} className="hover:bg-muted/20 transition-colors border-b border-border/50">
                    <TableCell className="pl-6">
                      <p className="font-mono text-xs font-bold text-muted-foreground">#{order.id.slice(0, 8)}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-sm">{order.customer_name || "Unknown"}</p>
                      <p className="text-[10px] text-muted-foreground">{order.customer_phone}</p>
                    </TableCell>
                    <TableCell className="font-bold text-primary">
                      MWK {(order.total || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] uppercase font-bold flex items-center gap-1 w-fit ${orderCfg.color} ${orderCfg.bg} ${orderCfg.border}`}>
                        <StatusIcon className="w-3 h-3" /> {orderCfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] uppercase font-bold capitalize ${
                        confirmStatus === "accepted" ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5" :
                        confirmStatus === "rejected" ? "text-red-500 border-red-500/20 bg-red-500/5" :
                        "text-amber-500 border-amber-500/20 bg-amber-500/5"
                      }`}>
                        {confirmStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      {needsAction ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-500 hover:bg-red-500/10"
                            onClick={() => rejectOrder.mutate(order.id)}
                            disabled={rejectOrder.isPending}
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            className="h-8 w-8 bg-emerald-500 hover:bg-emerald-600"
                            onClick={() => acceptOrder.mutate(order.id)}
                            disabled={acceptOrder.isPending}
                            title="Accept"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {confirmStatus === "accepted" ? "✓ Confirmed" : "✕ Rejected"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
