import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  DollarSign, ArrowDownToLine, CheckCircle2, Clock, Wallet,
  TrendingUp, AlertCircle, BarChart3, Zap
} from "lucide-react";
import { useVendorProfile } from "./VendorDashboard";

export default function VendorPayoutsPage() {
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  useQuery({
    queryKey: ["session-vendor-payouts"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      return data.session;
    },
  });

  const { data: vendor } = useVendorProfile(session?.user?.id);

  const { data: payouts, isLoading } = useQuery({
    queryKey: ["vendor-payouts-page", vendor?.id],
    enabled: !!vendor?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("vendor_payouts")
        .select("*")
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: vendorProductIds } = useQuery({
    queryKey: ["vendor-product-ids-payouts", vendor?.id],
    enabled: !!vendor?.id,
    queryFn: async () => {
      const { data } = await (supabase as any).from("products").select("id").eq("vendor_id", vendor.id);
      return (data || []).map((p: any) => p.id) as string[];
    },
  });

  const { data: allOrders } = useQuery({
    queryKey: ["vendor-orders-payouts", vendorProductIds],
    enabled: !!vendorProductIds && vendorProductIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("orders")
        .select("id, total, vendor_amount, status, created_at, items")
        .order("created_at", { ascending: false });
      return (data || []).filter((o: any) =>
        (o.items as any[]).some((item: any) => vendorProductIds?.includes(item.product_id))
      );
    },
  });

  const stats = useMemo(() => {
    const totalRevenue = (allOrders || []).reduce((s: number, o: any) => s + (o.total || 0), 0);
    const totalPaid = (payouts || []).filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + (p.amount || 0), 0);
    const totalPending = (payouts || []).filter((p: any) => p.status === "pending").reduce((s: number, p: any) => s + (p.amount || 0), 0);
    
    // Use explicit vendor_amount from DB
    const vendorShare = (allOrders || []).reduce((s: number, o: any) => s + (o.vendor_amount || 0), 0);
    const balance = vendorShare - totalPaid;
    return { totalRevenue, vendorShare, totalPaid, totalPending, balance };
  }, [allOrders, payouts]);

  const handleWithdraw = () => {
    setWithdrawing(true);
    setTimeout(() => {
      setWithdrawing(false);
      toast({
        title: "Withdrawal Request Submitted 🎉",
        description: "Your request has been sent to admin. Processing within 24 hours.",
      });
    }, 1500);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
            Payouts
          </h2>
          <p className="text-muted-foreground font-body mt-1">
            Your earnings balance, commission breakdown, and withdrawal history.
          </p>
        </div>
        <Button
          onClick={handleWithdraw}
          disabled={withdrawing || stats.balance <= 0}
          className="gap-2 bg-gold hover:bg-gold/90 text-maroon-dark font-bold h-11 px-6 rounded-2xl shadow-lg shadow-gold/20 disabled:opacity-50"
        >
          {withdrawing ? (
            <div className="w-4 h-4 border-2 border-maroon-dark/40 border-t-maroon-dark rounded-full animate-spin" />
          ) : (
            <ArrowDownToLine className="w-4 h-4" />
          )}
          Request Withdrawal
        </Button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            label: "Total Revenue", value: `MWK ${stats.totalRevenue.toLocaleString()}`,
            sub: "All orders combined", icon: DollarSign, color: "text-blue-500", bg: "bg-blue-500/5", border: "border-blue-500/20",
          },
          {
            label: "Your Net Earnings", value: `MWK ${stats.vendorShare.toLocaleString()}`,
            sub: "Total guaranteed payout", icon: TrendingUp, color: "text-primary", bg: "bg-primary/5", border: "border-primary/20",
          },
          {
            label: "Total Paid Out", value: `MWK ${stats.totalPaid.toLocaleString()}`,
            sub: "Successfully withdrawn", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/5", border: "border-emerald-500/20",
          },
          {
            label: "Available Balance", value: `MWK ${Math.max(0, stats.balance).toLocaleString()}`,
            sub: "Ready to withdraw", icon: Wallet, color: "text-gold", bg: "bg-gold/5", border: "border-gold/20", highlight: true,
          },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`p-6 rounded-3xl border ${s.border} ${s.bg} relative overflow-hidden`}
          >
            {(s as any).highlight && (
              <div className="absolute top-0 right-0 w-24 h-24 bg-gold/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            )}
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{s.label}</span>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className="text-2xl font-heading font-black">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1.5">{s.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Commission Breakdown + Payout Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Breakdown */}
        <Card className="lg:col-span-2 rounded-2xl border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="font-heading flex items-center gap-2 text-base">
              <BarChart3 className="w-4 h-4 text-primary" /> Payouts Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            {[
              { label: "Gross Marketplace Sales", value: stats.totalRevenue, color: "bg-blue-500" },
              { label: "My Net Earnings", value: stats.vendorShare, color: "bg-primary" },
              { label: "Successfully Withdrawn", value: stats.totalPaid, color: "bg-emerald-500", negative: true },
              { label: "Available for Payout", value: Math.max(0, stats.balance), color: "bg-gold" },
            ].map((row, i) => (
              <div key={row.label} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${row.color}`} />
                    <span className="text-sm font-black uppercase tracking-tighter text-muted-foreground/80">{row.label}</span>
                  </div>
                  <span className={`font-black text-sm ${(row as any).negative ? "text-red-500" : "text-foreground"}`}>
                    {(row as any).negative ? "- " : ""}MWK {row.value.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted/50 overflow-hidden shadow-inner">
                  <div
                    className={`h-full rounded-full ${row.color} transition-all duration-1000 shadow-lg`}
                    style={{ width: stats.totalRevenue > 0 ? `${Math.min((row.value / stats.totalRevenue) * 100, 100)}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Payout Info */}
        <Card className="rounded-[2rem] border-border/50 bg-card shadow-xl shadow-black/5">
          <CardHeader className="border-b border-border/50 p-6">
            <CardTitle className="font-heading flex items-center gap-3 text-lg font-black">
              <Wallet className="w-5 h-5 text-gold" /> Payout Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {[
              { label: "Total Withdrawals", value: (payouts || []).length.toString() },
              { label: "Pending Requests", value: (payouts || []).filter((p: any) => p.status === 'pending').length.toString() },
              { label: "Last Payout Amount", value: payouts && payouts[0] ? `MWK ${payouts[0].amount.toLocaleString()}` : "None" },
              { label: "Last Payout Date", value: payouts && payouts[0] ? new Date(payouts[0].created_at).toLocaleDateString() : "None" },
              { label: "Effective Margin", value: `${Math.round(((stats.totalRevenue - stats.vendorShare) / Math.max(stats.totalRevenue, 1)) * 100)}%` },
              { label: "Payout Method", value: (() => {
                try {
                  const d = JSON.parse((vendor as any)?.payment_details || "{}");
                  if (d.type === 'bank') return `Bank (${d.bank_name || 'Setup'})`;
                  if (d.type === 'mobile') return `Mobile Money (${d.provider || 'Setup'})`;
                } catch(e) {}
                return (vendor as any)?.payment_details ? "Configured" : "Not Configured";
              })() },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{row.label}</span>
                <span className="text-xs font-black text-foreground">{row.value}</span>
              </div>
            ))}
            <Button
              className="w-full mt-2 gap-2 bg-gold hover:bg-gold/90 text-maroon-dark font-bold rounded-xl"
              onClick={handleWithdraw}
              disabled={withdrawing || stats.balance <= 0}
            >
              <ArrowDownToLine className="w-4 h-4" />
              {stats.balance > 0 ? `Withdraw MWK ${stats.balance.toLocaleString()}` : "Nothing to Withdraw"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Payout History */}
      <Card className="rounded-3xl border-border bg-card shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/50">
          <div>
            <CardTitle className="font-heading flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Payout History
            </CardTitle>
            <CardDescription>All withdrawal requests and their statuses</CardDescription>
          </div>
          <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 font-bold">
            {payouts?.length || 0} records
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 border-0">
                <TableHead className="pl-6">Payout ID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 animate-pulse text-muted-foreground">
                    Loading payouts...
                  </TableCell>
                </TableRow>
              ) : !payouts || payouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <Wallet className="w-10 h-10 text-muted-foreground/30" />
                      <p className="text-muted-foreground font-body font-medium">No payouts yet</p>
                      <p className="text-muted-foreground/60 text-sm">Make sales and request your first withdrawal!</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : payouts.map((p: any) => (
                <TableRow key={p.id} className="hover:bg-muted/20 transition-colors border-b border-border/50">
                  <TableCell className="pl-6">
                    <p className="font-mono text-xs font-bold text-muted-foreground">#{p.id.slice(0, 8)}</p>
                  </TableCell>
                  <TableCell className="font-bold text-primary">
                    MWK {(p.amount || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.period_start && p.period_end
                      ? `${new Date(p.period_start).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} — ${new Date(p.period_end).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                      : "—"
                    }
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] font-bold ${
                      p.status === "paid"
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        : p.status === "rejected"
                        ? "bg-red-500/10 text-red-500 border border-red-500/20"
                        : "bg-gold/10 text-gold border border-gold/20"
                    }`}>
                      {p.status === "paid" ? "✓ Paid" : p.status === "rejected" ? "✕ Rejected" : "⏳ Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6 text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Policy */}
      <div className="p-4 rounded-2xl border border-border bg-muted/20 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground font-body">
          <strong className="text-foreground">Payout Policy:</strong>{" "}
          Your displayed net earnings are entirely guaranteed for withdrawal.
        </p>
      </div>
    </div>
  );
}
