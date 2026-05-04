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
  Users, Copy, Share2, Link2, TrendingUp, ShoppingBag,
  CheckCircle2, Clock, UserPlus, ExternalLink, Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function AgentReferralsPage() {
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);

  useQuery({
    queryKey: ["session-referrals"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      return data.session;
    },
  });

  const { data: agent, isLoading } = useQuery({
    queryKey: ["agent-profile-referrals", session?.user?.id],
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

  const { data: myCustomers } = useQuery({
    queryKey: ["agent-customers-referrals", agent?.id],
    enabled: !!agent?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("customers")
        .select("*")
        .eq("first_agent_id", agent.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: myCommissions } = useQuery({
    queryKey: ["agent-commissions-referrals", agent?.id],
    enabled: !!agent?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("commissions")
        .select("*, orders(total, status)")
        .eq("agent_id", agent.id);
      return data || [];
    },
  });

  const stats = useMemo(() => {
    const total = myCustomers?.length || 0;
    const converted = myCommissions?.length || 0;
    const rate = total > 0 ? ((converted / total) * 100).toFixed(1) : "0.0";
    const active = myCustomers?.filter(c => c.customer_status === "active")?.length || 0;
    return { total, converted, rate, active };
  }, [myCustomers, myCommissions]);

  const referralUrl = agent ? `${window.location.origin.replace("agents.", "")}/shop?ref=${agent.referral_code}` : "";

  const copyReferral = () => {
    navigator.clipboard.writeText(referralUrl);
    toast({ title: "Referral link copied! 🎉", description: "Share it everywhere to earn commissions." });
  };

  const shareWhatsApp = () => {
    const text = `🛍️ Shop premium fashion at Forgiven Shopping Centre!\nUse my referral link and discover amazing deals:\n${referralUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm font-body">Loading your referrals...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center">
          <Users className="w-8 h-8 text-primary" />
        </div>
        <h2 className="font-heading text-2xl font-bold">No Agent Profile Found</h2>
        <p className="text-muted-foreground font-body max-w-sm">
          Your account is not linked to an agent profile. Contact support to get set up.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-gold">
            My Referrals
          </h2>
          <p className="text-muted-foreground font-body mt-1">
            Track every customer you bring to the platform.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5" onClick={copyReferral}>
            <Copy className="w-4 h-4" /> Copy Link
          </Button>
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={shareWhatsApp}>
            <Share2 className="w-4 h-4" /> Share on WhatsApp
          </Button>
        </div>
      </div>

      {/* Referral Link Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-gold/5 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="w-4 h-4 text-primary" />
            <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Your Unique Referral Link</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <code className="flex-1 min-w-0 text-sm font-mono bg-muted/40 border border-border px-4 py-3 rounded-2xl text-foreground break-all">
              {referralUrl}
            </code>
            <Button
              size="sm"
              className="gap-2 bg-primary hover:bg-primary/90 shrink-0 h-11 px-5 rounded-2xl"
              onClick={copyReferral}
            >
              <Copy className="w-4 h-4" /> Copy
            </Button>
          </div>
          <div className="flex items-center gap-4 mt-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gold" />
              <span className="text-xs text-muted-foreground font-body">Code: <strong className="text-foreground font-mono">{agent.referral_code}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs text-muted-foreground font-body">
                Earn <strong className="text-emerald-600">{agent.commission_rate ?? 5}%</strong> commission on first orders
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Referred", value: stats.total, icon: Users, color: "text-blue-500", bg: "bg-blue-500/5", border: "border-blue-500/20" },
          { label: "Converted", value: stats.converted, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/5", border: "border-emerald-500/20" },
          { label: "Conversion Rate", value: `${stats.rate}%`, icon: TrendingUp, color: "text-gold", bg: "bg-gold/5", border: "border-gold/20" },
          { label: "Active Customers", value: stats.active, icon: ShoppingBag, color: "text-primary", bg: "bg-primary/5", border: "border-primary/20" },
        ].map((s, i) => (
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
            <p className="text-3xl font-heading font-black">{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Referred Customers Table */}
      <Card className="rounded-3xl border-border bg-card shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
          <div>
            <CardTitle className="font-heading flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" /> Referred Customers
            </CardTitle>
            <CardDescription>Everyone who joined through your referral link</CardDescription>
          </div>
          <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 font-bold">
            {stats.total} total
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 border-0">
                <TableHead className="pl-6">Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Converted?</TableHead>
                <TableHead className="text-right pr-6">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!myCustomers || myCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center">
                        <Users className="w-7 h-7 text-primary/50" />
                      </div>
                      <p className="text-muted-foreground font-body font-medium">No referrals yet</p>
                      <p className="text-muted-foreground/60 text-sm">Share your link to start earning!</p>
                      <Button size="sm" variant="outline" className="mt-2 gap-2" onClick={copyReferral}>
                        <Copy className="w-3.5 h-3.5" /> Copy Referral Link
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : myCustomers.map((c: any, i: number) => {
                const hasConverted = myCommissions?.some((cm: any) => cm.orders?.customer_name === c.name);
                return (
                  <TableRow key={c.id} className="hover:bg-muted/20 transition-colors border-b border-border/50">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-heading font-bold text-xs text-primary shrink-0">
                          {(c.name || c.phone || "?")[0].toUpperCase()}
                        </div>
                        <p className="font-semibold text-sm">{c.name || "Unknown"}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono">{c.phone}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-bold capitalize ${
                          c.customer_status === "active"
                            ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
                            : "text-muted-foreground border-border"
                        }`}
                      >
                        {c.customer_status || "new"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {hasConverted ? (
                        <div className="flex items-center gap-1.5 text-emerald-500">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="text-xs font-bold">Yes</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-amber-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-xs font-bold">Pending</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6 text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { emoji: "📱", title: "WhatsApp Status", tip: "Post your link at 7–9 PM when your audience is most active for maximum clicks." },
          { emoji: "🎯", title: "Target Smart", tip: "Share with friends who love fashion. Quality referrals convert better than mass blasts." },
          { emoji: "💬", title: "Personal Touch", tip: "Send a personal message with your link instead of just dropping a URL — it converts 3x better." },
        ].map((tip) => (
          <div key={tip.title} className="p-5 rounded-2xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
            <p className="text-2xl mb-2">{tip.emoji}</p>
            <p className="font-bold text-sm mb-1">{tip.title}</p>
            <p className="text-xs text-muted-foreground font-body leading-relaxed">{tip.tip}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
