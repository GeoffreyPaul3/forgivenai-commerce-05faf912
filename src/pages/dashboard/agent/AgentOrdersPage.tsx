import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  ShoppingBag, PackageSearch, Truck, CheckCircle2, Clock,
  XCircle, Package, DollarSign, AlertCircle, TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  pending:   { label: "Pending",   color: "text-amber-500",  bg: "bg-amber-500/5",  border: "border-amber-500/20",  icon: Clock },
  confirmed: { label: "Confirmed", color: "text-blue-500",   bg: "bg-blue-500/5",   border: "border-blue-500/20",   icon: Package },
  processing:{ label: "Processing",color: "text-purple-500", bg: "bg-purple-500/5", border: "border-purple-500/20", icon: Package },
  shipped:   { label: "Shipped",   color: "text-indigo-500", bg: "bg-indigo-500/5", border: "border-indigo-500/20", icon: Truck },
  delivered: { label: "Delivered", color: "text-emerald-500",bg: "bg-emerald-500/5",border: "border-emerald-500/20",icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "text-red-500",    bg: "bg-red-500/5",    border: "border-red-500/20",    icon: XCircle },
  paid:      { label: "Paid",      color: "text-emerald-500",bg: "bg-emerald-500/5",border: "border-emerald-500/20",icon: CheckCircle2 },
};

export default function AgentOrdersPage() {
  const [session, setSession] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useQuery({
    queryKey: ["session-orders"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      return data.session;
    },
  });

  const { data: agent, isLoading: agentLoading } = useQuery({
    queryKey: ["agent-profile-orders", session?.user?.id],
    queryFn: async () => {
      if (session?.user?.id) {
        const { data } = await supabase
          .from("agents")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (data) return data;
      }
      const { data } = await supabase
        .from("agents")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["agent-orders-tracking", agent?.id],
    enabled: !!agent?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("agent_id", agent.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: commissions } = useQuery({
    queryKey: ["agent-order-commissions", agent?.id],
    enabled: !!agent?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("commissions")
        .select("order_id, amount, status")
        .eq("agent_id", agent.id);
      return data || [];
    },
  });

  const commissionMap = (commissions || []).reduce((acc: Record<string, any>, c: any) => {
    acc[c.order_id] = c;
    return acc;
  }, {});

  const allStatuses = ["all", "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

  const filtered = filterStatus === "all"
    ? (orders || [])
    : (orders || []).filter((o: any) => o.status === filterStatus);

  const kpis = [
    { label: "Total Orders", value: orders?.length ?? 0, icon: ShoppingBag, color: "text-primary", bg: "bg-primary/5", border: "border-primary/20" },
    { label: "Delivered", value: orders?.filter((o: any) => o.status === "delivered").length ?? 0, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/5", border: "border-emerald-500/20" },
    { label: "In Transit", value: orders?.filter((o: any) => ["confirmed", "processing", "shipped"].includes(o.status)).length ?? 0, icon: Truck, color: "text-indigo-500", bg: "bg-indigo-500/5", border: "border-indigo-500/20" },
    { label: "Total Revenue", value: `MWK ${(orders || []).reduce((s: number, o: any) => s + (o.total || 0), 0).toLocaleString()}`, icon: DollarSign, color: "text-gold", bg: "bg-gold/5", border: "border-gold/20" },
  ];

  if (agentLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm font-body">Loading your orders...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center">
          <PackageSearch className="w-8 h-8 text-primary" />
        </div>
        <h2 className="font-heading text-2xl font-bold">No Agent Profile Found</h2>
        <p className="text-muted-foreground font-body max-w-sm">Contact support to link your agent profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h2 className="font-heading text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-gold">
          Orders Tracking
        </h2>
        <p className="text-muted-foreground font-body mt-1">
          All orders generated through your referral link — live status and commission tracking.
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Status Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {allStatuses.map(s => {
          const isActive = filterStatus === s;
          const cfg = statusConfig[s];
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-tight transition-all border ${
                isActive
                  ? s === "all"
                    ? "bg-primary text-white border-primary shadow-sm"
                    : `${cfg.bg} ${cfg.color} ${cfg.border}`
                  : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50"
              }`}
            >
              {s === "all" ? "All Orders" : s}
              {s !== "all" && orders && (
                <span className="ml-1.5 opacity-60">
                  ({orders.filter((o: any) => o.status === s).length})
                </span>
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
              {filtered.length} order{filtered.length !== 1 ? "s" : ""} {filterStatus !== "all" ? `with status "${filterStatus}"` : "total"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 border-0">
                <TableHead className="pl-6">Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Order Status</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead className="text-right pr-6">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordersLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 animate-pulse text-muted-foreground">
                    Fetching your orders...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center">
                        <PackageSearch className="w-7 h-7 text-primary/50" />
                      </div>
                      <p className="text-muted-foreground font-body font-medium">
                        {filterStatus === "all" ? "No orders yet" : `No ${filterStatus} orders`}
                      </p>
                      <p className="text-muted-foreground/60 text-sm">
                        {filterStatus === "all"
                          ? "Share your referral link to start driving sales!"
                          : "Try selecting a different status filter."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.map((order: any) => {
                const cfg = statusConfig[order.status] || statusConfig.pending;
                const StatusIcon = cfg.icon;
                const comm = commissionMap[order.id];
                return (
                  <TableRow key={order.id} className="hover:bg-muted/20 transition-colors border-b border-border/50">
                    <TableCell className="pl-6">
                      <p className="font-mono text-xs font-bold text-muted-foreground">#{order.id.slice(0, 8)}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-sm">{order.customer_name || "Unknown"}</p>
                      <p className="text-[10px] text-muted-foreground">{order.customer_phone}</p>
                    </TableCell>
                    <TableCell className="font-bold text-primary">
                      MWK {(order.total || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-bold flex items-center gap-1.5 w-fit ${cfg.color} ${cfg.bg} ${cfg.border}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {comm ? (
                        <div>
                          <p className="text-sm font-bold text-primary">MWK {(comm.amount || 0).toLocaleString()}</p>
                          <Badge
                            className={`text-[9px] mt-0.5 font-bold ${
                              comm.status === "paid"
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                : "bg-gold/10 text-gold border border-gold/20"
                            }`}
                          >
                            {comm.status === "paid" ? "✓ Paid" : "⏳ Pending"}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6 text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Info */}
      <div className="p-4 rounded-2xl border border-border bg-muted/20 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground font-body">
          <strong className="text-foreground">Only first orders count</strong> — commissions are earned on each referred customer's first purchase only.
          Track your order statuses here to know when commissions are ready for payout.
        </p>
      </div>
    </div>
  );
}
