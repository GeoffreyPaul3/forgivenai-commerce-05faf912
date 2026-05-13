import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Users, DollarSign, ShoppingBag, 
  Plus, UserPlus, 
  ArrowRight, 
  Copy, Share2,
  Wallet, TrendingUp, Trophy, Star
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Eye, Package, Ruler, Palette, Info } from "lucide-react";

const AgentDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // 1. Get current user session
  useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      return data.session;
    },
  });

  // 2. Get agent profile
  const { data: agent, isLoading: agentLoading } = useQuery({
    queryKey: ["agent-profile", session?.user?.id],
    queryFn: async () => {
      if (session?.user?.id) {
        const { data } = await supabase
          .from("agents")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();
        return data;
      }
      return null;
    },
  });

  // 3. Get Agent Data (Orders, Referrals, etc.)
  const { data: myOrders } = useQuery({
    queryKey: ["agent-orders-overview", agent?.id],
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

  const { data: myCustomers } = useQuery({
    queryKey: ["agent-customers-overview", agent?.id],
    enabled: !!agent?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("customers")
        .select("*")
        .eq("first_agent_id", agent.id);
      return data || [];
    },
  });

  const { data: myCommissions } = useQuery({
    queryKey: ["agent-commissions-overview", agent?.id],
    enabled: !!agent?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("commissions")
        .select("*")
        .eq("agent_id", agent.id);
      return data || [];
    },
  });


  // 5. Get Top Products (Demo selection)
  const { data: products } = useQuery({
    queryKey: ["featured-products-overview"],
    queryFn: async () => {
      // 1. Local products
      const { data: local } = await supabase
        .from("products")
        .select("*")
        .limit(4);
      
      // 2. Live products
      try {
        const res = await fetch("https://www.forgivenshoppingcentre.com/api/products/all");
        const live = await res.json();
        if (live.success && Array.isArray(live.data)) {
          const mappedLive = live.data.slice(0, 4).map((p: any) => ({
            id: `live_${p.id}`,
            name: p.name,
            category: p.category?.name || p.productType || "General",
            price: p.salePrice || p.price,
            currency: "MWK",
            images: p.images || [],
            description: p.description,
            sizes: p.sizes || 
                   (p.variants && p.variants.length > 0 ? [...new Set(p.variants.map((v: any) => v.size || v.value || v.name).filter(Boolean))] : []) ||
                   (p.options?.find((o: any) => o.name?.toLowerCase().includes("size"))?.values || []),
            colors: p.colors || 
                    (p.variants && p.variants.length > 0 ? [...new Set(p.variants.map((v: any) => v.color || v.colour || v.name).filter(Boolean))] : []) ||
                    (p.options?.find((o: any) => o.name?.toLowerCase().includes("color") || o.name?.toLowerCase().includes("colour"))?.values || []),
            isLive: true,
            created_at: p.createdAt
          }));
          return [...(local || []), ...mappedLive].slice(0, 8);
        }
      } catch (e) {
        console.warn("Could not fetch live products for dashboard:", e);
      }
      return local || [];
    },
  });

  const { data: myPayouts } = useQuery({
    queryKey: ["agent-payouts-overview", agent?.id],
    enabled: !!agent?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_payouts")
        .select("*")
        .eq("agent_id", agent.id);
      return data || [];
    },
  });

  // 6. Get All Agents for Ranking
  const { data: allAgents } = useQuery({
    queryKey: ["all-agents-ranking"],
    queryFn: async () => {
      const { data } = await supabase
        .from("agents")
        .select("id, total_sales")
        .order("total_sales", { ascending: false });
      return data || [];
    },
  });

  const stats = useMemo(() => {
    const totalEarnings = (myCommissions || []).reduce((acc, c) => acc + (c.amount || 0), 0);
    const totalPaidPayouts = (myPayouts || [])
      .filter((p: any) => p.status === "paid" || p.status === "pending")
      .reduce((acc: number, p: any) => acc + (p.amount || 0), 0);
    
    const balance = Math.max(0, totalEarnings - totalPaidPayouts);
    const pendingOrders = (myOrders || []).filter(o => o.status !== "delivered" && o.status !== "cancelled").length;

    // Monthly Sales Calculation
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyDeliveredSales = (myOrders || [])
      .filter(o => o.status === "delivered" && new Date(o.created_at) >= startOfMonth)
      .reduce((acc, o) => acc + (o.total || 0), 0);

    // Tier Logic
    let currentTier = "Tier 1";
    let nextTier = "Tier 2";
    let nextThreshold = 200000;
    let nextRate = "10%";
    
    if (monthlyDeliveredSales >= 1000000) {
      currentTier = "Tier 4";
      nextTier = "Max Tier";
      nextThreshold = 1000000;
      nextRate = "15%";
    } else if (monthlyDeliveredSales >= 500000) {
      currentTier = "Tier 3";
      nextTier = "Tier 4";
      nextThreshold = 1000000;
      nextRate = "15%";
    } else if (monthlyDeliveredSales >= 200000) {
      currentTier = "Tier 2";
      nextTier = "Tier 3";
      nextThreshold = 500000;
      nextRate = "12%";
    }

    const progress = Math.min(100, (monthlyDeliveredSales / nextThreshold) * 100);
    const remaining = Math.max(0, nextThreshold - monthlyDeliveredSales);

    // Ranking Logic
    const myRank = (allAgents || []).findIndex(a => a.id === agent?.id) + 1;

    return {
      totalRevenue: totalEarnings,
      balance,
      totalOrders: myOrders?.length || 0,
      pendingOrders,
      customers: myCustomers?.length || 0,
      monthlyDeliveredSales,
      currentTier,
      nextTier,
      nextRate,
      progress,
      remaining,
      rank: myRank > 0 ? myRank : "—"
    };
  }, [myOrders, myCustomers, myCommissions, myPayouts, allAgents, agent?.id]);

  if (agentLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const referralUrl = agent ? `${window.location.origin.replace("agents.", "")}/?ref=${agent.referral_code}` : "";

  return (
    <div className="space-y-6 pb-20">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-heading font-bold text-lg">{agent?.name || "Agent"}</span>
          </div>
          <h2 className="font-heading text-3xl font-bold tracking-tight">{greeting} 👋</h2>
          <p className="text-muted-foreground font-body">Welcome back to Forgiven Shopping Centre Agent's Portal</p>
          <p className="text-muted-foreground font-body text-sm mt-1">Here's what's happening in your store today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="gap-2 border-primary/20 hover:bg-primary/5"
            onClick={() => {
              navigator.clipboard.writeText(referralUrl);
              toast({ title: "Link Copied!", description: "Your referral link is ready to share." });
            }}
          >
            <Copy className="w-4 h-4" /> Copy Referral Link
          </Button>
          <Button 
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            onClick={async () => {
              const text = `🛍️ Shop premium fashion at Forgiven Shopping Centre!\nUse my referral link and discover amazing deals:\n${referralUrl}`;
              
              if (navigator.share) {
                try {
                  await navigator.share({
                    title: "Forgiven Shopping Centre",
                    text: text,
                  });
                  return;
                } catch (e) {
                  console.error("Share failed:", e);
                }
              }
              
              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
            }}
          >
            <Share2 className="w-4 h-4" /> Share to WhatsApp
          </Button>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-xl bg-gold/10 text-gold">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Available Balance</p>
            <h3 className="text-2xl font-heading font-black">MWK {stats.balance.toLocaleString() ?? 0}</h3>
            <p className="text-[10px] text-muted-foreground mt-2 font-body">Ready for withdrawal</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-body">Total Orders</p>
                <p className="text-2xl font-black">{stats.totalOrders}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4">
              <div className="p-3 rounded-2xl bg-[#A21D7F]/10 text-[#A21D7F]">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-body">Customers</p>
                <p className="text-2xl font-black">{stats.customers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-xl bg-gold/10 text-gold">
                <Trophy className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="bg-[#A21D7F]/5 text-[#A21D7F] border-[#A21D7F]/20 font-bold">
                {agent?.commission_rate || 8}% Rate
              </Badge>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{stats.currentTier} Progress</p>
            <h3 className="text-xl font-heading font-black mb-3">MWK {stats.monthlyDeliveredSales.toLocaleString()}</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase">
                <span className="text-muted-foreground">Monthly Goal</span>
                <span className="text-[#A21D7F]">{Math.round(stats.progress)}%</span>
              </div>
              <Progress value={stats.progress} className="h-1.5" />
              {stats.remaining > 0 ? (
                <p className="text-[10px] text-muted-foreground font-body">
                  Need <span className="font-bold text-[#A21D7F]">MWK {stats.remaining.toLocaleString()}</span> more to reach {stats.nextRate} tier.
                </p>
              ) : (
                <p className="text-[10px] text-emerald-600 font-bold font-body">
                  🚀 You've reached the maximum commission tier!
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-xl bg-[#A21D7F]/10 text-[#A21D7F]">
                <TrendingUp className="w-5 h-5" />
              </div>
              {stats.rank === 1 && (
                <Badge className="bg-gold text-white border-none text-[10px]">#1 TOP AGENT</Badge>
              )}
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Leaderboard Rank</p>
            <h3 className="text-2xl font-heading font-black">#{stats.rank}</h3>
            <p className="text-[10px] text-muted-foreground mt-2 font-body">Out of {(allAgents || []).length} active agents</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Recent Orders & Top Products */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Orders */}
          <Card className="rounded-3xl border-border bg-card shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
              <div>
                <CardTitle className="font-heading text-xl">Recent Orders</CardTitle>
                <CardDescription>{(myOrders || []).length > 0 ? "2 latest" : "No orders yet"}</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="gap-1 text-[#A21D7F]" onClick={() => navigate("/dashboard/agent/orders")}>
                View all <ArrowRight className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto custom-scrollbar">
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
                  {(!myOrders || myOrders.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-muted-foreground font-body">No orders found.</TableCell>
                    </TableRow>
                  ) : (myOrders.slice(0, 5).map(order => (
                    <TableRow key={order.id} className="hover:bg-muted/20 transition-colors border-b border-border/50">
                      <TableCell className="pl-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">{order.customer_name}</span>
                          <span className="text-[10px] text-muted-foreground">{order.customer_phone}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-emerald-500/5 text-emerald-500 border-emerald-500/20 text-[9px] font-bold">
                          whatsapp
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold text-sm">MWK {order.total.toLocaleString()}</TableCell>
                      <TableCell className="pr-6">
                      <Badge variant="outline" className={`font-black text-[10px] uppercase ${
                        order.status === 'delivered' ? 'bg-green-500/10 text-green-500' : 
                        order.status === 'shipped' ? 'bg-primary/10 text-primary' : 
                        'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    </TableRow>
                  )))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          </Card>

          {/* Top Products */}
          <Card className="rounded-3xl border-border bg-card shadow-sm overflow-hidden">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="font-heading text-xl">Top Products</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(products || []).map((product) => (
                  <div 
                    key={product.id} 
                    className="flex items-center gap-4 p-3 rounded-2xl bg-muted/20 hover:bg-muted/40 transition-colors group cursor-pointer"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted shrink-0">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-full h-full p-3 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{product.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs font-bold text-[#A21D7F] shrink-0">MWK {product.price.toLocaleString()}</p>
                        <div className="flex gap-1 overflow-hidden">
                          {product.sizes?.slice(0, 3).map((s: string) => (
                            <span key={s} className="text-[8px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-bold uppercase">{s}</span>
                          ))}
                          {(product.sizes?.length || 0) > 3 && <span className="text-[8px] text-muted-foreground font-bold">+{product.sizes.length - 3}</span>}
                        </div>
                      </div>
                      {product.colors && product.colors.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <div className="flex gap-1">
                            {product.colors.slice(0, 4).map((c: string) => (
                              <div key={c} className="w-2.5 h-2.5 rounded-full border border-border/50" style={{ backgroundColor: c.toLowerCase() }} title={c} />
                            ))}
                            {(product.colors?.length || 0) > 4 && <span className="text-[8px] text-muted-foreground">+{product.colors.length - 4}</span>}
                          </div>
                          <span className="text-[10px] text-muted-foreground truncate">{product.colors.join(", ")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Product Details Dialog */}
        <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
          <DialogContent className="max-w-3xl rounded-[2rem] p-0 overflow-hidden border-0 shadow-2xl">
            {selectedProduct && (
              <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
                <div className="w-full md:w-1/2 bg-muted/30 p-6 flex flex-col gap-4 overflow-y-auto">
                  <div className="aspect-square rounded-[1.5rem] overflow-hidden bg-white shadow-inner">
                    {selectedProduct.images?.[0] ? (
                      <img src={selectedProduct.images[0]} alt={selectedProduct.name} className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-20"><Package className="w-20 h-20" /></div>
                    )}
                  </div>
                  {selectedProduct.images && selectedProduct.images.length > 1 && (
                    <div className="grid grid-cols-4 gap-3">
                      {selectedProduct.images.slice(1).map((img: string, idx: number) => (
                        <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-border/50 bg-white">
                          <img src={img} alt={`${selectedProduct.name} ${idx + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="w-full md:w-1/2 p-8 flex flex-col overflow-y-auto bg-card">
                  <div className="mb-6">
                    <Badge className="bg-[#A21D7F]/10 text-[#A21D7F] border-0 font-bold mb-3 uppercase tracking-wider text-[10px]">
                      {selectedProduct.category || 'General'}
                    </Badge>
                    <DialogTitle className="font-heading text-2xl font-black leading-tight mb-2">
                      {selectedProduct.name}
                    </DialogTitle>
                    <div className="text-2xl font-black text-[#A21D7F] font-heading">
                      MWK {(selectedProduct.price || 0).toLocaleString()}
                    </div>
                  </div>

                  <div className="space-y-6 mb-8">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-black uppercase text-muted-foreground tracking-widest">
                        <Info className="w-3.5 h-3.5" /> Description
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed font-body">
                        {selectedProduct.description || selectedProduct.ai_description || "No description available."}
                      </p>
                    </div>

                    {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-black uppercase text-muted-foreground tracking-widest">
                          <Ruler className="w-3.5 h-3.5" /> Available Sizes
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedProduct.sizes.map((s: string) => (
                            <Badge key={s} variant="outline" className="px-3 h-8 rounded-lg bg-muted/30 border-border/50 font-bold">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedProduct.colors && selectedProduct.colors.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-black uppercase text-muted-foreground tracking-widest">
                          <Palette className="w-3.5 h-3.5" /> Available Colours
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {selectedProduct.colors.map((c: string) => (
                            <div key={c} className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full border-2 border-background shadow-md" style={{ backgroundColor: c.toLowerCase() }} />
                              <span className="text-xs font-medium text-muted-foreground">{c}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-6 border-t border-border/50 flex flex-col gap-3">
                    <Button 
                      onClick={() => {
                        if (!agent?.referral_code) {
                          toast({ title: "Error", description: "Referral code not found", variant: "destructive" });
                          return;
                        }
                        const url = `${window.location.origin}/shop?ref=${agent.referral_code}&product=${selectedProduct.id}`;
                        navigator.clipboard.writeText(url);
                        toast({ title: "Link Copied!", description: "Share this link to earn commission." });
                        setSelectedProduct(null);
                      }}
                      className="w-full gap-2 rounded-2xl h-14 font-black text-lg shadow-lg shadow-[#A21D7F]/20 bg-[#A21D7F] hover:bg-[#8a186b]"
                    >
                      <Copy className="w-5 h-5" />
                      Copy Referral Link
                    </Button>
                    <Button variant="ghost" onClick={() => setSelectedProduct(null)} className="w-full rounded-2xl h-12 font-bold text-muted-foreground">Close</Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Right Column: Quick Actions */}
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
                onClick={() => navigate("/dashboard/agent/referrals")}
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <span className="font-semibold text-sm">Copy Referral Link</span>
              </Button>
              <Button variant="ghost" 
                onClick={() => navigate("/dashboard/products")}
                className="w-full justify-start gap-3 rounded-2xl hover:bg-primary/5 hover:text-primary transition-all h-12"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold">Browse Products</span>
              </Button>
              <Button variant="ghost" 
                onClick={() => navigate("/dashboard/customers")}
                className="w-full justify-start gap-3 rounded-2xl hover:bg-[#A21D7F]/5 hover:text-[#A21D7F] transition-all h-12"
              >
                <div className="w-8 h-8 rounded-lg bg-[#A21D7F]/10 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold">My Customers</span>
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 rounded-2xl hover:bg-gold/5 hover:text-gold transition-all h-12"
                onClick={() => navigate("/dashboard/agent/earnings")}
              >
                <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <span className="font-semibold text-sm">My Earnings</span>
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 rounded-2xl hover:bg-purple-500/5 hover:text-purple-500 transition-all h-12"
                onClick={() => navigate("/dashboard/agent/products")}
              >
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <span className="font-semibold text-sm">Product Catalog</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AgentDashboard;
