import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Users, DollarSign, ShoppingBag, MessageSquare, 
  Plus, Eye, MessageCircle, UserPlus, Video, 
  BarChart3, ArrowRight, Star, Clock, 
  Phone, Copy, Share2,
  Package
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const AgentDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);

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

  // 4. Get Conversations (Linked to agent's customers)
  const customerPhones = useMemo(() => (myCustomers || []).map(c => c.phone), [myCustomers]);
  const { data: conversations } = useQuery({
    queryKey: ["agent-conversations-overview", customerPhones],
    enabled: customerPhones.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .in("customer_phone", customerPhones)
        .order("last_message_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  // 5. Get Top Products (Demo selection)
  const { data: products } = useQuery({
    queryKey: ["featured-products-overview"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .limit(4);
      return data || [];
    },
  });

  const stats = useMemo(() => {
    const totalEarnings = (myCommissions || []).reduce((acc, c) => acc + (c.amount || 0), 0);
    const pendingOrders = (myOrders || []).filter(o => o.status === "pending").length;
    return {
      totalRevenue: totalEarnings, // In agent context, revenue is their earnings
      totalOrders: myOrders?.length || 0,
      pendingOrders,
      customers: myCustomers?.length || 0,
      conversations: conversations?.length || 0
    };
  }, [myOrders, myCustomers, myCommissions, conversations]);

  if (agentLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const referralUrl = agent ? `${window.location.origin}/?ref=${agent.referral_code}` : "";

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
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Share2 className="w-4 h-4" /> Share to WhatsApp
          </Button>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Total Revenue</p>
            <h3 className="text-2xl font-heading font-black">MWK {stats.totalRevenue.toLocaleString()}</h3>
            <p className="text-[10px] text-muted-foreground mt-2 font-body">From paid & delivered orders</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Total Orders</p>
            <h3 className="text-2xl font-heading font-black">{stats.totalOrders}</h3>
            <p className="text-[10px] text-muted-foreground mt-2 font-body">{stats.pendingOrders} pending</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-xl bg-gold/10 text-gold">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Customers</p>
            <h3 className="text-2xl font-heading font-black">{stats.customers}</h3>
            <p className="text-[10px] text-muted-foreground mt-2 font-body">Registered profiles</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Conversations</p>
            <h3 className="text-2xl font-heading font-black">{stats.conversations}</h3>
            <p className="text-[10px] text-muted-foreground mt-2 font-body">WhatsApp threads</p>
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
                <CardDescription>{(myOrders || []).length > 0 ? "2 latest" : "No orders yet"}</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => navigate("/dashboard/agent/orders")}>
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
                  <div key={product.id} className="flex items-center gap-4 p-3 rounded-2xl bg-muted/20 hover:bg-muted/40 transition-colors group">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted shrink-0">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-full h-full p-3 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{product.name}</p>
                      <p className="text-xs font-bold text-primary">MWK {product.price.toLocaleString()}</p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Conversations & Quick Actions */}
        <div className="space-y-6">
          {/* Live Conversations */}
          <Card className="rounded-3xl border-border bg-card shadow-sm overflow-hidden">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="font-heading text-xl flex items-center gap-2">
                Live Conversations
              </CardTitle>
              <CardDescription>WhatsApp</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {(!conversations || conversations.length === 0) ? (
                <div className="py-10 text-center text-muted-foreground font-body text-sm">No active conversations.</div>
              ) : (conversations.map(conv => (
                <div key={conv.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-muted/20 transition-colors cursor-pointer group">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center font-heading font-bold text-emerald-500 shrink-0">
                    {conv.customer_name?.[0] || <Phone className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm truncate">{conv.customer_name || conv.customer_phone}</span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString("en-GB", { day: 'numeric', month: 'short' }) : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className="p-0 h-auto border-0 text-[10px] text-muted-foreground font-normal bg-transparent shadow-none">
                        whatsapp · {conv.status || "open"}
                      </Badge>
                    </div>
                  </div>
                </div>
              )))}
            </CardContent>
          </Card>

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
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 rounded-2xl hover:bg-blue-500/5 hover:text-blue-500 transition-all h-12"
                onClick={() => navigate("/dashboard/agent/orders")}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <span className="font-semibold text-sm">View All Orders</span>
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
