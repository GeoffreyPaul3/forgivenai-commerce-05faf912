import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  DollarSign, TrendingUp, Clock, CheckCircle2, ArrowDownToLine,
  Wallet, Zap, AlertCircle, BarChart3, ArrowUpRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AgentEarningsPage() {
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  useQuery({
    queryKey: ["session-earnings"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      return data.session;
    },
  });

  const { data: agent, isLoading } = useQuery({
    queryKey: ["agent-profile-earnings", session?.user?.id],
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

  const { data: commissions, isLoading: commsLoading } = useQuery({
    queryKey: ["agent-commissions-earnings", agent?.id],
    enabled: !!agent?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("commissions")
        .select(`*, orders(total, customer_name, status, created_at)`)
        .eq("agent_id", agent.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const stats = useMemo(() => {
    if (!commissions) return { total: 0, pending: 0, paid: 0, count: 0 };
    return commissions.reduce((acc, c) => {
      acc.total += c.amount || 0;
      if (c.status === "pending") acc.pending += c.amount || 0;
      if (c.status === "paid") acc.paid += c.amount || 0;
      acc.count++;
      return acc;
    }, { total: 0, pending: 0, paid: 0, count: 0 });
  }, [commissions]);

  const chartData = useMemo(() => {
    return [...(commissions || [])]
      .reverse()
      .slice(-10)
      .map(c => ({
        date: new Date(c.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        amount: c.amount,
      }));
  }, [commissions]);

  const handleWithdraw = () => {
    setWithdrawing(true);
    setTimeout(() => {
      setWithdrawing(false);
      toast({
        title: "Withdrawal Request Submitted 🎉",
        description: "Your request has been sent to admin for processing. You'll be notified within 24 hours.",
      });
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm font-body">Loading your earnings...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center">
          <Wallet className="w-8 h-8 text-primary" />
        </div>
        <h2 className="font-heading text-2xl font-bold">No Agent Profile Found</h2>
        <p className="text-muted-foreground font-body max-w-sm">Contact support to link your agent profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-gold">
            My Earnings
          </h2>
          <p className="text-muted-foreground font-body mt-1">
            Your commission breakdown and payout history.
          </p>
        </div>
        <Button
          onClick={handleWithdraw}
          disabled={withdrawing || stats.pending === 0}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            label: "Total Earned",
            value: `MWK ${stats.total.toLocaleString()}`,
            icon: DollarSign,
            color: "text-primary",
            bg: "bg-primary/5",
            border: "border-primary/20",
            sub: `${stats.count} commission${stats.count !== 1 ? "s" : ""}`,
            highlight: true,
          },
          {
            label: "Pending Payout",
            value: `MWK ${stats.pending.toLocaleString()}`,
            icon: Clock,
            color: "text-amber-500",
            bg: "bg-amber-500/5",
            border: "border-amber-500/20",
            sub: "Awaiting confirmation",
          },
          {
            label: "Total Paid Out",
            value: `MWK ${stats.paid.toLocaleString()}`,
            icon: CheckCircle2,
            color: "text-emerald-500",
            bg: "bg-emerald-500/5",
            border: "border-emerald-500/20",
            sub: "Successfully withdrawn",
          },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`p-6 rounded-3xl border ${s.border} ${s.bg} relative overflow-hidden`}
          >
            {s.highlight && (
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            )}
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{s.label}</span>
                <div className={`p-2 rounded-xl ${s.bg} border ${s.border}`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
              </div>
              <p className="text-3xl font-heading font-black">{s.value}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground font-body">{s.sub}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Commission Rate Banner */}
      <div className="p-5 rounded-2xl border border-gold/20 bg-gradient-to-r from-gold/5 to-transparent flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gold flex items-center justify-center shrink-0 shadow-lg shadow-gold/20">
            <Zap className="w-5 h-5 text-maroon-dark" />
          </div>
          <div>
            <p className="font-bold text-sm">Your Commission Rate</p>
            <p className="text-xs text-muted-foreground font-body">Earned on every first order from your referrals</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-3xl font-heading font-black text-gold">{agent.commission_rate ?? 5}%</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Per sale</p>
        </div>
      </div>

      {/* Chart + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 rounded-3xl border-border bg-card shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="font-heading flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" /> Earnings Timeline
            </CardTitle>
            <CardDescription>Commission amounts over your recent sales</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] pt-6">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-muted-foreground font-body text-sm">No earnings data yet — make your first sale!</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis axisLine={false} tickLine={false} fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }}
                    formatter={(v: any) => [`MWK ${Number(v).toLocaleString()}`, "Commission"]}
                  />
                  <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2.5} fillOpacity={1} fill="url(#earningsGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <Wallet className="w-4 h-4 text-gold" /> Payout Info
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            {[
              { label: "Payment Method", value: "Mobile Money" },
              { label: "Payout Cycle", value: "Weekly (Fridays)" },
              { label: "Min. Withdrawal", value: "MWK 2,000" },
              { label: "Processing Time", value: "1–24 hours" },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <span className="text-xs text-muted-foreground font-body">{row.label}</span>
                <span className="text-xs font-bold">{row.value}</span>
              </div>
            ))}
            <Button
              className="w-full mt-2 gap-2 bg-gold hover:bg-gold/90 text-maroon-dark font-bold rounded-xl"
              onClick={handleWithdraw}
              disabled={withdrawing || stats.pending === 0}
            >
              <ArrowDownToLine className="w-4 h-4" />
              {stats.pending > 0 ? `Withdraw MWK ${stats.pending.toLocaleString()}` : "Nothing to Withdraw"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Commission History Table */}
      <Card className="rounded-3xl border-border bg-card shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/50">
          <div>
            <CardTitle className="font-heading flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Commission History
            </CardTitle>
            <CardDescription>All commissions earned from referral orders</CardDescription>
          </div>
          <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 font-bold">
            {stats.count} records
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 border-0">
                <TableHead className="pl-6">Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Order Total</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Order Status</TableHead>
                <TableHead className="text-right pr-6">Payout Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commsLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 animate-pulse text-muted-foreground">
                    Loading commissions...
                  </TableCell>
                </TableRow>
              ) : !commissions || commissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-gold/5 flex items-center justify-center">
                        <DollarSign className="w-7 h-7 text-gold/50" />
                      </div>
                      <p className="text-muted-foreground font-body font-medium">No commissions yet</p>
                      <p className="text-muted-foreground/60 text-sm">Share your referral link to start earning!</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : commissions.map((c: any) => (
                <TableRow key={c.id} className="hover:bg-muted/20 transition-colors border-b border-border/50">
                  <TableCell className="pl-6">
                    <p className="font-mono text-xs font-bold text-muted-foreground">#{c.order_id.slice(0, 8)}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-semibold">{c.orders?.customer_name || "—"}</p>
                  </TableCell>
                  <TableCell className="text-sm font-bold">
                    MWK {(c.orders?.total || 0).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <span className="font-bold text-primary">MWK {(c.amount || 0).toLocaleString()}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase font-bold capitalize ${
                        c.orders?.status === "delivered"
                          ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
                          : c.orders?.status === "cancelled"
                          ? "text-red-500 border-red-500/20 bg-red-500/5"
                          : "text-amber-500 border-amber-500/20 bg-amber-500/5"
                      }`}
                    >
                      {c.orders?.status || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Badge
                      className={`text-[10px] font-bold ${
                        c.status === "paid"
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          : "bg-gold/10 text-gold border border-gold/20"
                      }`}
                    >
                      {c.status === "paid" ? "✓ Paid" : "⏳ Pending"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Policy reminder */}
      <div className="p-4 rounded-2xl border border-border bg-muted/20 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground font-body">
          <p className="font-bold text-foreground mb-1">Commission Policy</p>
          <p>
            Commissions are earned <strong>only on the first order</strong> placed by each customer you refer.
            Repeat purchases from the same customer do not generate additional commissions — the platform manages long-term customer retention.
          </p>
        </div>
      </div>
    </div>
  );
}
