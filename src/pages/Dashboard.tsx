import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import {
  ShoppingBag, LayoutDashboard, MessageSquare, CreditCard,
  Users, BarChart3, Video, Settings, Bot, Package, ShieldCheck,
  User, LogOut, ChevronDown, TrendingUp,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NavLink } from "@/components/NavLink";
import { useState, useEffect } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

import AIAssistantPage from "@/pages/dashboard/AIAssistantPage";
import SettingsPage from "@/pages/dashboard/SettingsPage";
import CustomersPage from "@/pages/dashboard/CustomersPage";
import AgentDashboard from "@/pages/dashboard/AgentDashboard";
import ProfilePage from "@/pages/dashboard/ProfilePage";
import { UserCheck } from "lucide-react";
import ProductsPage from "./dashboard/ProductsPage";
import ContentPage from "./dashboard/ContentPage";
import OrdersPage from "./dashboard/OrdersPage";
import ConversationsPage from "./dashboard/ConversationsPage";
import AnalyticsPage from "./dashboard/AnalyticsPage";
import AgentsPage from "./dashboard/AgentsPage";

const menuItems = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
  { title: "Products", url: "/dashboard/products", icon: ShoppingBag },
  { title: "Orders", url: "/dashboard/orders", icon: CreditCard },
  { title: "Customers", url: "/dashboard/customers", icon: Users },
  { title: "Conversations", url: "/dashboard/conversations", icon: MessageSquare },
  { title: "Content & UGC", url: "/dashboard/content", icon: Video },
  { title: "Agents", url: "/dashboard/agents", icon: ShieldCheck },
  { title: "Agent Portal", url: "/dashboard/agent-portal", icon: UserCheck },
  { title: "AI Assistant", url: "/dashboard/assistant", icon: Bot },
  { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="px-4 py-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <span className="font-heading font-bold text-sidebar-primary-foreground text-sm">F</span>
          </div>
          {!collapsed && (
            <span className="font-heading text-lg font-bold text-sidebar-foreground">Forgiven</span>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40">Commerce OS</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function OverviewPage() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const { data: stats } = useQuery({
    queryKey: ["overview-stats"],
    queryFn: async () => {
      const [products, orders, customers, conversations] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("total, status"),
        supabase.from("customers").select("*", { count: "exact", head: true }),
        supabase.from("conversations").select("*", { count: "exact", head: true }),
      ]);
      const revenue = (orders.data || [])
        .filter((o: any) => ["paid", "delivered"].includes(o.status))
        .reduce((sum: number, o: any) => sum + (o.total || 0), 0);
      const pending = (orders.data || []).filter((o: any) => o.status === "pending").length;
      return {
        products: products.count || 0,
        orders: orders.data?.length || 0,
        customers: customers.count || 0,
        conversations: conversations.count || 0,
        revenue,
        pending,
      };
    },
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["recent-orders-overview"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, customer_name, customer_phone, total, status, channel, created_at")
        .order("created_at", { ascending: false })
        .limit(6);
      return data || [];
    },
  });

  const { data: recentProducts } = useQuery({
    queryKey: ["recent-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, category, price, currency, images, status")
        .order("created_at", { ascending: false })
        .limit(4);
      return data || [];
    },
  });

  const { data: recentConvos } = useQuery({
    queryKey: ["recent-convos-overview"],
    queryFn: async () => {
      const { data } = await supabase
        .from("conversations")
        .select("id, customer_phone, customer_name, status, last_message_at, channel")
        .order("last_message_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    paid: "bg-green-100 text-green-800",
    processing: "bg-purple-100 text-purple-800",
    shipped: "bg-indigo-100 text-indigo-800",
    delivered: "bg-green-200 text-green-900",
    cancelled: "bg-red-100 text-red-800",
  };

  const kpis = [
    {
      label: "Total Revenue",
      value: `MWK ${(stats?.revenue || 0).toLocaleString()}`,
      icon: TrendingUp,
      sub: "From paid & delivered orders",
      accent: true,
    },
    {
      label: "Total Orders",
      value: stats?.orders ?? "—",
      icon: CreditCard,
      sub: `${stats?.pending ?? 0} pending`,
    },
    {
      label: "Customers",
      value: stats?.customers ?? "—",
      icon: Users,
      sub: "Registered profiles",
    },
    {
      label: "Conversations",
      value: stats?.conversations ?? "—",
      icon: MessageSquare,
      sub: "WhatsApp threads",
    },
  ];

  return (
    <div className="space-y-6">

      {/* Greeting banner */}
      <div
        className="rounded-2xl p-6 flex items-center justify-between"
        style={{ background: "hsl(var(--sidebar-background))" }}
      >
        <div>
          <p className="text-sm font-body" style={{ color: "hsl(var(--gold))" }}>{greeting} 👋</p>
          <h2 className="font-heading text-2xl font-bold mt-0.5" style={{ color: "hsl(var(--cream))" }}>
            Welcome back to Forgiven Commerce OS
          </h2>
          <p className="text-sm mt-1 font-body" style={{ color: "hsl(var(--cream) / 0.6)" }}>
            Here's what's happening in your store today.
          </p>
        </div>
        <div
          className="hidden md:flex w-14 h-14 rounded-2xl items-center justify-center font-heading font-bold text-2xl"
          style={{ background: "hsl(var(--gold))", color: "hsl(var(--sidebar-background))" }}
        >
          F
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className={`rounded-xl border p-5 transition-colors ${
              k.accent
                ? "border-primary/30 bg-primary/5"
                : "border-border bg-card hover:border-border/80"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide font-body">{k.label}</span>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: k.accent ? "hsl(var(--primary)/0.12)" : "hsl(var(--muted))" }}
              >
                <k.icon className="w-4 h-4" style={{ color: k.accent ? "hsl(var(--primary))" : undefined }} />
              </div>
            </div>
            <p className="text-2xl font-heading font-bold text-foreground">{k.value}</p>
            <p className="text-xs text-muted-foreground mt-1 font-body">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Two-column layout: Orders table + Product grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Orders Table */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="font-heading text-base font-semibold text-foreground">Recent Orders</h3>
            <span className="text-xs text-muted-foreground font-body">{recentOrders?.length || 0} latest</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide font-body">Customer</th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide font-body hidden sm:table-cell">Channel</th>
                  <th className="text-right px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide font-body">Total</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide font-body">Status</th>
                </tr>
              </thead>
              <tbody>
                {(recentOrders || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted-foreground font-body text-sm">
                      No orders yet
                    </td>
                  </tr>
                ) : (
                  recentOrders?.map((order: any) => (
                    <tr key={order.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-foreground font-body truncate max-w-[140px]">
                          {order.customer_name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell">
                        <span className="capitalize text-muted-foreground font-body text-xs">{order.channel}</span>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold font-body text-foreground">
                        MWK {(order.total || 0).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[order.status] || "bg-gray-100 text-gray-700"}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Products mini grid */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="font-heading text-base font-semibold text-foreground">Top Products</h3>
            <Package className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {(recentProducts || []).length === 0 ? (
              <p className="col-span-2 text-center py-6 text-muted-foreground font-body text-sm">No products yet</p>
            ) : (
              recentProducts?.map((p: any) => (
                <div key={p.id} className="rounded-xl overflow-hidden border border-border hover:border-primary/20 transition-colors group">
                  <div className="h-20 bg-muted overflow-hidden">
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-semibold font-body text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-primary font-semibold mt-0.5">{p.currency} {(p.price || 0).toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom row: Activity Feed + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Conversations */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="font-heading text-base font-semibold text-foreground">Live Conversations</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-muted-foreground font-body">WhatsApp</span>
            </div>
          </div>
          <div className="divide-y divide-border/50">
            {(recentConvos || []).length === 0 ? (
              <p className="text-center py-8 text-muted-foreground font-body text-sm">No conversations yet</p>
            ) : (
              recentConvos?.map((c: any) => (
                <div key={c.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                  <div
                    className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-heading font-bold text-xs"
                    style={{ background: "hsl(var(--primary)/0.12)", color: "hsl(var(--primary))" }}
                  >
                    {(c.customer_name || c.customer_phone || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground font-body truncate">
                      {c.customer_name || c.customer_phone}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{c.channel} · {c.status}</p>
                  </div>
                  <span className="text-xs text-muted-foreground font-body shrink-0">
                    {c.last_message_at ? new Date(c.last_message_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-heading text-base font-semibold text-foreground">Quick Actions</h3>
          </div>
          <div className="p-4 space-y-2">
            {[
              { label: "Add New Product", icon: ShoppingBag, href: "/dashboard/products" },
              { label: "View All Orders", icon: CreditCard, href: "/dashboard/orders" },
              { label: "Open WhatsApp Chat", icon: MessageSquare, href: "/dashboard/conversations" },
              { label: "Manage Agents", icon: Users, href: "/dashboard/agents" },
              { label: "Create UGC Content", icon: Video, href: "/dashboard/content" },
              { label: "View Analytics", icon: BarChart3, href: "/dashboard/analytics" },
            ].map((action) => (
              <a
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors group"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors group-hover:bg-primary/10"
                  style={{ background: "hsl(var(--muted))" }}
                >
                  <action.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <span className="text-sm font-body text-foreground group-hover:text-primary transition-colors">{action.label}</span>
              </a>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

const pageTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/products": "Products",
  "/dashboard/orders": "Orders",
  "/dashboard/customers": "Customers",
  "/dashboard/conversations": "Conversations",
  "/dashboard/content": "Content & UGC",
  "/dashboard/agents": "Agents",
  "/dashboard/agent-portal": "Agent Portal",
  "/dashboard/assistant": "AI Assistant",
  "/dashboard/analytics": "Analytics",
  "/dashboard/settings": "Settings",
  "/dashboard/profile": "My Profile",
};

const DashboardPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const title = pageTitles[location.pathname] || "Dashboard";

  const [user, setUser] = useState<SupabaseUser | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    // Re-sync when user updates their profile/avatar
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "A";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border px-4 shrink-0">
            <SidebarTrigger className="mr-4" />
            <h1 className="font-heading text-xl font-semibold text-foreground flex-1">{title}</h1>

            {/* Avatar Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  id="navbar-avatar-btn"
                  className="flex items-center gap-2 rounded-full pl-2 pr-3 py-1.5 hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {user?.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="avatar"
                      className="w-8 h-8 rounded-full object-cover shrink-0 border border-border"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-heading font-bold text-sm shrink-0"
                      style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
                    >
                      {initials}
                    </div>
                  )}
                  <span className="hidden sm:block text-sm font-medium text-foreground font-body max-w-[120px] truncate">
                    {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Admin"}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {user?.user_metadata?.full_name || "Admin"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  id="navbar-profile-link"
                  className="gap-2 cursor-pointer"
                  onClick={() => navigate("/dashboard/profile")}
                >
                  <User className="w-4 h-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  id="navbar-signout-btn"
                  className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="flex-1 p-6 overflow-y-auto">
            <Routes>
              <Route index element={<OverviewPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="conversations" element={<ConversationsPage />} />
              <Route path="content" element={<ContentPage />} />
              <Route path="agents" element={<AgentsPage />} />
              <Route path="agent-portal" element={<AgentDashboard />} />
              <Route path="assistant" element={<AIAssistantPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardPage;
