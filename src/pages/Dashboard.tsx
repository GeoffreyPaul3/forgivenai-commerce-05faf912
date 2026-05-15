import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import {
  ShoppingBag, LayoutDashboard, MessageSquare, CreditCard,
  Users, BarChart3, Video, Settings, Bot, Package, ShieldCheck,
  User, LogOut, ChevronDown, TrendingUp, Store
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import logo from "@/assets/forgiven.png";
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
import VendorsPage from "./dashboard/VendorsPage";
import ProfitDashboard from "./dashboard/ProfitDashboard";
import VendorPortal from "./dashboard/VendorPortal";
import AgentReferralsPage from "./dashboard/agent/AgentReferralsPage";
import AgentEarningsPage from "./dashboard/agent/AgentEarningsPage";
import AgentOrdersPage from "./dashboard/agent/AgentOrdersPage";
import AgentProductsPage from "./dashboard/agent/AgentProductsPage";
import AgentContentPage from "./dashboard/agent/AgentContentPage";
import AgentTrainingPage from "./dashboard/agent/AgentTrainingPage";
import VendorDashboard from "./dashboard/vendor/VendorDashboard";
import VendorProductsPage from "./dashboard/vendor/VendorProductsPage";
import VendorOrdersPage from "./dashboard/vendor/VendorOrdersPage";
import VendorPerformancePage from "./dashboard/vendor/VendorPerformancePage";
import VendorPayoutsPage from "./dashboard/vendor/VendorPayoutsPage";

const menuItems = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
  { title: "Products", url: "/dashboard/products", icon: ShoppingBag },
  { title: "Orders", url: "/dashboard/orders", icon: CreditCard },
  { title: "Customers", url: "/dashboard/customers", icon: Users },
  { title: "Conversations", url: "/dashboard/conversations", icon: MessageSquare },
  { title: "Content & UGC", url: "/dashboard/content", icon: Video },
  { title: "Agents", url: "/dashboard/agents", icon: ShieldCheck },
  { title: "Vendors", url: "/dashboard/vendors", icon: Store },
  { title: "Vendor Portal", url: "/dashboard/vendor-portal", icon: ShoppingBag },
  { title: "Profit Intel", url: "/dashboard/profit-intel", icon: BarChart3 },
  { title: "Agent Portal", url: "/dashboard/agent-portal", icon: UserCheck },
  { title: "AI Assistant", url: "/dashboard/assistant", icon: Bot },
  { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const { data: profile } = useQuery({
    queryKey: ["user-profile-sidebar"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      return data;
    }
  });

  const filteredMenuItems = menuItems.filter(item => {
    if (!profile) return true;
    const role = profile.role;

    // Admin sees everything
    if (role === "admin") return true;

    // Restrictions for non-admins
    if (item.title === "Agents" || item.title === "Vendors" || item.title === "Analytics") return false;
    
    if (role === "vendor") {
      if (item.title === "Agent Portal" || item.title === "Agents") return false;
    }
    
    if (role === "agent") {
      if (item.title === "Vendor Portal" || item.title === "Vendors" || item.title === "Profit Intel") return false;
    }

    return true;
  });

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
              {filteredMenuItems.map((item) => (
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

  const { data: profile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      return data;
    }
  });

  const { data: vendorId } = useQuery({
    queryKey: ["user-vendor-id", profile?.id],
    enabled: profile?.role === "vendor",
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("id").eq("user_id", profile!.id).maybeSingle();
      return data?.id;
    }
  });

  const { data: agentId } = useQuery({
    queryKey: ["user-agent-id", profile?.id],
    enabled: profile?.role === "agent",
    queryFn: async () => {
      const { data } = await supabase.from("agents").select("id").eq("user_id", profile!.id).maybeSingle();
      return data?.id;
    }
  });

  const { data: myProducts } = useQuery({
    queryKey: ["vendor-products", vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id").eq("vendor_id", vendorId!);
      return (data || []).map(p => p.id);
    }
  });

  const { data: stats } = useQuery({
    queryKey: ["overview-stats", profile?.role, vendorId, agentId, myProducts],
    enabled: !!profile,
    queryFn: async () => {
      let productsQuery = supabase.from("products").select("*", { count: "exact", head: true });
      let ordersQuery = supabase.from("orders").select("total, status, agent_id, items");
      let customersQuery = supabase.from("customers").select("*", { count: "exact", head: true });
      let conversationsQuery = supabase.from("conversations").select("*", { count: "exact", head: true });

      if (profile?.role === "vendor" && vendorId) {
        productsQuery = productsQuery.eq("vendor_id", vendorId);
        // For orders, we'll fetch all and filter in JS due to lack of direct vendor_id on orders
      } else if (profile?.role === "agent" && agentId) {
        ordersQuery = ordersQuery.eq("agent_id", agentId);
        customersQuery = customersQuery.eq("first_agent_id", agentId);
        // Agents see all products for now, or we could filter if needed
      }

      const [products, orders, customers, conversations] = await Promise.all([
        productsQuery,
        ordersQuery,
        customersQuery,
        conversationsQuery,
      ]);

      let filteredOrders = orders.data || [];
      if (profile?.role === "vendor" && myProducts) {
        filteredOrders = filteredOrders.filter((o: any) => 
          (o.items as any[]).some(item => myProducts.includes(item.product_id))
        );
      }

      const revenue = filteredOrders
        .filter((o: any) => o.status !== "cancelled")
        .reduce((sum: number, o: any) => sum + (o.total || 0), 0);
      const pending = filteredOrders.filter((o: any) => o.status === "pending").length;
      
      return {
        products: products.count || 0,
        orders: filteredOrders.length,
        customers: customers.count || 0,
        conversations: profile?.role === "admin" ? (conversations.count || 0) : 0, // Only admin sees all conversations for now
        revenue,
        pending,
      };
    },
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["recent-orders-overview", profile?.role, vendorId, agentId, myProducts],
    enabled: !!profile,
    queryFn: async () => {
      let q = supabase
        .from("orders")
        .select("id, customer_name, customer_phone, total, status, channel, created_at, agent_id, items")
        .order("created_at", { ascending: false });

      if (profile?.role === "agent") {
        if (!agentId) return [];
        q = q.eq("agent_id", agentId);
      }

      const { data } = await q.limit(profile?.role === "vendor" ? 100 : 6);
      let filtered = data || [];

      if (profile?.role === "vendor") {
        if (!myProducts) return [];
        filtered = filtered.filter((o: any) => 
          (o.items as any[]).some(item => myProducts.includes(item.product_id))
        ).slice(0, 6);
      }

      return filtered;
    },
  });

  const { data: recentProducts } = useQuery({
    queryKey: ["recent-products", profile?.role, vendorId],
    enabled: !!profile,
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select("id, name, category, price, currency, images, status")
        .order("created_at", { ascending: false });

      if (profile?.role === "vendor" && vendorId) {
        q = q.eq("vendor_id", vendorId);
      }

      const { data } = await q.limit(4);
      return data || [];
    },
  });

  const { data: recentConvos } = useQuery({
    queryKey: ["recent-convos-overview", profile?.role],
    enabled: profile?.role === "admin",
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
      sub: "From all active orders",
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
          className="hidden md:flex w-14 h-14 rounded-2xl items-center justify-center bg-white/80"
        >
           <img src={logo} alt="Forgiven Shop Logo" width={40} height={40}/>
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
  "/dashboard/vendors": "Vendors",
  "/dashboard/vendor-portal": "Vendor Portal",
  "/dashboard/vendor/products": "My Products",
  "/dashboard/vendor/orders": "Orders",
  "/dashboard/vendor/performance": "Performance",
  "/dashboard/vendor/payouts": "Payouts",
  "/dashboard/profit-intel": "Profit Intelligence",
  "/dashboard/agent-portal": "Agent Portal",
  "/dashboard/agent/referrals": "My Referrals",
  "/dashboard/agent/earnings": "My Earnings",
  "/dashboard/agent/orders": "Orders Tracking",
  "/dashboard/agent/content": "Promotion Kit",
  "/dashboard/agent/training": "Training Hub",
  "/dashboard/assistant": "AI Assistant",
  "/dashboard/analytics": "Analytics",
  "/dashboard/settings": "Settings",
  "/dashboard/profile": "My Profile",
};

import { getAppMode } from "@/lib/app-mode";
import AdminLayout from "@/components/layout/AdminLayout";
import VendorLayout from "@/components/layout/VendorLayout";
import AgentLayout from "@/components/layout/AgentLayout";

const DashboardPage = () => {
  const location = useLocation();
  const appMode = getAppMode();
  const title = pageTitles[location.pathname] || "Dashboard";

  const mainContent = (
    <Routes>
      <Route index element={
        appMode === "agent" ? <AgentDashboard /> : 
        appMode === "vendor" ? <VendorDashboard /> : 
        <OverviewPage />
      } />
      <Route path="products" element={<ProductsPage />} />
      <Route path="orders" element={<OrdersPage />} />
      <Route path="customers" element={<CustomersPage />} />
      <Route path="conversations" element={<ConversationsPage />} />
      <Route path="content" element={<ContentPage />} />
      <Route path="agents" element={<AgentsPage />} />
      <Route path="vendors" element={<VendorsPage />} />
      <Route path="vendors/:id/analytics" element={<VendorPerformancePage />} />
      <Route path="vendor-portal" element={<VendorDashboard />} />
      <Route path="vendor/products" element={<VendorProductsPage />} />
      <Route path="vendor/orders" element={<VendorOrdersPage />} />
      <Route path="vendor/performance" element={<VendorPerformancePage />} />
      <Route path="vendor/payouts" element={<VendorPayoutsPage />} />
      <Route path="profit-intel" element={<ProfitDashboard />} />
      <Route path="agent-portal" element={<AgentDashboard />} />
      <Route path="agent/referrals" element={<AgentReferralsPage />} />
      <Route path="agent/earnings" element={<AgentEarningsPage />} />
      <Route path="agent/orders" element={<AgentOrdersPage />} />
      <Route path="agent/products" element={<AgentProductsPage />} />
      <Route path="agent/content" element={<AgentContentPage />} />
      <Route path="agent/training" element={<AgentTrainingPage />} />
      <Route path="assistant" element={<AIAssistantPage />} />
      <Route path="analytics" element={<AnalyticsPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="profile" element={<ProfilePage />} />
    </Routes>
  );

  if (appMode === "vendor") {
    return <VendorLayout title={title}>{mainContent}</VendorLayout>;
  }

  if (appMode === "agent") {
    return <AgentLayout title={title}>{mainContent}</AgentLayout>;
  }

  return <AdminLayout title={title}>{mainContent}</AdminLayout>;
};


export default DashboardPage;
