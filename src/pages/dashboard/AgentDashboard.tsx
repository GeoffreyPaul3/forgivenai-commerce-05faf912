import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Share2, Users, DollarSign, TrendingUp, ShoppingBag, ArrowUpRight, Megaphone, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const AgentDashboard = () => {
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);

  // Get current user session
  useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      return data.session;
    },
  });

  // Get agent profile (with fallback for no-auth systems)
  const { data: agent, isLoading } = useQuery({
    queryKey: ["agent-profile", session?.user?.id],
    queryFn: async () => {
      // 1. Try to find agent by linked user ID if session exists
      if (session?.user?.id) {
        const { data } = await supabase
          .from("agents")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (data) return data;
      }

      // 2. Fallback: If no session or no linked agent, take the first agent for demo purposes (since system has no auth yet)
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  // Get customers attributed to this agent
  const { data: myCustomers } = useQuery({
    queryKey: ["agent-customers", agent?.id],
    enabled: !!agent?.id,
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("*").eq("first_agent_id", agent.id);
      return data || [];
    },
  });

  // Get commissions for this agent
  const { data: myCommissions } = useQuery({
    queryKey: ["agent-commissions", agent?.id],
    enabled: !!agent?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("commissions")
        .select(`*, orders(total, customer_name, status)`)
        .eq("agent_id", agent.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const stats = useMemo(() => {
    const totalEarned = (myCommissions || []).reduce((s, c) => s + (c.amount || 0), 0);
    const pendingComms = (myCommissions || []).filter(c => c.status === 'pending').reduce((s, c) => s + (c.amount || 0), 0);
    const customersCount = (myCustomers || []).length;
    const conversionRate = customersCount > 0 ? ((myCommissions?.length || 0) / customersCount * 100).toFixed(1) : "0";

    return [
      { label: "Total Earned", value: `MWK ${totalEarned.toLocaleString()}`, icon: DollarSign, color: "text-primary", sub: `MWK ${pendingComms.toLocaleString()} pending` },
      { label: "Referrals", value: customersCount, icon: Users, color: "text-blue-500", sub: "Platform-linked" },
      { label: "Successful Orders", value: myCommissions?.length || 0, icon: ShoppingBag, color: "text-emerald-500", sub: "First-touch attribution" },
      { label: "Conversion Rate", value: `${conversionRate}%`, icon: TrendingUp, color: "text-gold", sub: "Visits to successful orders" },
    ];
  }, [myCustomers, myCommissions]);

  const chartData = useMemo(() => {
    // Group commissions by date for the last 7 items or days
    const lastComms = (myCommissions || []).slice(0, 7).reverse();
    return lastComms.map(c => ({
      date: new Date(c.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      amount: c.amount,
    }));
  }, [myCommissions]);

  const copyReferral = () => {
    if (!agent) return;
    const url = `${window.location.origin}/?ref=${agent.referral_code}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Referral Link Copied!", description: "Share this link to earn commissions on the first order." });
  };

  const shareWhatsApp = () => {
    if (!agent) return;
    const url = `${window.location.origin}/?ref=${agent.referral_code}`;
    const text = `Check out Forgiven Shopping Centre! Use my referral link to discover premium fashion: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (!agent && isLoading) return <div className="p-8 text-center text-muted-foreground">Loading dashboard...</div>;
  if (!agent) return <div className="p-8 text-center text-muted-foreground">No agents found in the system. Register an agent in the Admin panel to get started.</div>;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-gold">Welcome, {agent.name} 👑</h2>
          <p className="text-muted-foreground font-body">Track your influence, customers, and earned commissions.</p>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div 
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
              <s.icon className="w-16 h-16" />
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">{s.label}</span>
              <div className={`p-2 rounded-lg bg-muted/50 ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-heading font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-emerald-500" /> {s.sub}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <Card className="lg:col-span-2 rounded-2xl border-border bg-card shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Commission Growth
            </CardTitle>
            <CardDescription>Recent commission history visualized</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={12} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis axisLine={false} tickLine={false} fontSize={12} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}
                  itemStyle={{ color: 'hsl(var(--primary))' }}
                />
                <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card className="rounded-2xl border-gold/20 bg-gradient-to-br from-card to-gold/5 shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-gold" /> AI Marketing Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-white/5 backdrop-blur-md border border-gold/10 hover:border-gold/30 transition-colors cursor-default">
              <h4 className="font-bold text-sm text-gold-light mb-1 italic">🔥 Top Selling Category</h4>
              <p className="text-xs text-muted-foreground">Customers are loving the new "Malawian Heritage" collection. Share links to these items to increase conversions.</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 backdrop-blur-md border border-gold/10 hover:border-gold/30 transition-colors cursor-default">
              <h4 className="font-bold text-sm text-gold-light mb-1 italic">💡 Strategy Tip</h4>
              <p className="text-xs text-muted-foreground">Post your referral link in WhatsApp Status around 7 PM. That's when your audience is most active.</p>
            </div>
            <Button variant="link" className="text-xs text-gold h-auto p-0 hover:text-gold-light">View all AI suggestions →</Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Customers */}
        <Card className="rounded-2xl border-border bg-card shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-heading">Recent Customers</CardTitle>
              <CardDescription>People who joined via your link</CardDescription>
            </div>
            <Users className="w-10 h-10 text-muted-foreground/10" />
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-0">
                  <TableHead className="pl-6">Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!myCustomers || myCustomers.length === 0) ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground">No customers yet. Share your link! 🚀</TableCell></TableRow>
                ) : myCustomers.slice(0, 5).map(c => (
                  <TableRow key={c.id} className="hover:bg-muted/30 border-b border-border/50">
                    <TableCell className="pl-6">
                      <p className="font-medium">{c.name || "Unknown"}</p>
                      <p className="text-[10px] text-muted-foreground">{c.phone}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize text-[10px]">{c.customer_status}</Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6 text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Commissions */}
        <Card className="rounded-2xl border-border bg-card shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-heading">Commissions</CardTitle>
              <CardDescription>Your latest earnings from first orders</CardDescription>
            </div>
            <DollarSign className="w-10 h-10 text-muted-foreground/10" />
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-0">
                  <TableHead className="pl-6">Order</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="text-right pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!myCommissions || myCommissions.length === 0) ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground">No commissions yet.</TableCell></TableRow>
                ) : myCommissions.slice(0, 5).map(c => (
                  <TableRow key={c.id} className="hover:bg-muted/30 border-b border-border/50">
                    <TableCell className="pl-6">
                      <p className="font-medium">#{c.order_id.slice(0, 8)}</p>
                      <p className="text-[10px] text-muted-foreground">{c.orders?.customer_name}</p>
                    </TableCell>
                    <TableCell className="font-bold text-primary">MWK {c.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right pr-6">
                      <Badge className={`text-[10px] ${c.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-gold/10 text-gold border-gold/20'}`}>
                        {c.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 rounded-xl bg-muted/30 border border-border flex items-start gap-3">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-[11px] text-muted-foreground font-body">
          <p className="font-bold text-foreground mb-1">Commission Policy:</p>
          <p>You earn commissions ONLY on the first successful order placed by a customer you refer. Once a customer is linked to the platform dashboard, subsequent repeat orders do not generate agent commissions as the platform takes over relationship management and retention. Forgiven Shopping Centre owns and retains all customers for the long term.</p>
        </div>
      </div>
    </div>
  );
};

export default AgentDashboard;
