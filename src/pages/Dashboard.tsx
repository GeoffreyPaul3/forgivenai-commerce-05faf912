import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Routes, Route, useLocation } from "react-router-dom";
import {
  ShoppingBag, LayoutDashboard, MessageSquare, CreditCard,
  Users, BarChart3, Video, Settings, Bot, Package, TrendingUp, ShieldCheck
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";

import AIAssistantPage from "@/pages/dashboard/AIAssistantPage";
import SettingsPage from "@/pages/dashboard/SettingsPage";
import CustomersPage from "@/pages/dashboard/CustomersPage";
import AgentDashboard from "@/pages/dashboard/AgentDashboard";
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
  { title: "Content & UGC", url: "/dashboard/content", icon: Video },
  { title: "Orders", url: "/dashboard/orders", icon: CreditCard },
  { title: "Conversations", url: "/dashboard/conversations", icon: MessageSquare },
  { title: "Customers", url: "/dashboard/customers", icon: Users },
  { title: "Agents", url: "/dashboard/agents", icon: ShieldCheck },
  { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
  { title: "AI Assistant", url: "/dashboard/assistant", icon: Bot },
  { title: "Agent Portal", url: "/dashboard/agent-portal", icon: UserCheck },
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
  const { data: productCount } = useQuery({
    queryKey: ["products-count"],
    queryFn: async () => {
      const { count } = await supabase.from("products").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });
  const { data: orderCount } = useQuery({
    queryKey: ["orders-count"],
    queryFn: async () => {
      const { count } = await supabase.from("orders").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });
  const { data: agentCount } = useQuery({
    queryKey: ["agents-count"],
    queryFn: async () => {
      const { count } = await supabase.from("agents").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });
  const { data: contentCount } = useQuery({
    queryKey: ["content-count"],
    queryFn: async () => {
      const { count } = await supabase.from("content").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });
  const { data: recentProducts } = useQuery({
    queryKey: ["recent-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false }).limit(6);
      return data || [];
    },
  });

  const stats = [
    { label: "Products", value: productCount?.toString() || "0", icon: Package, sub: "In catalog" },
    { label: "Orders", value: orderCount?.toString() || "0", icon: CreditCard, sub: "Total orders" },
    { label: "Agents", value: agentCount?.toString() || "0", icon: Users, sub: "Registered" },
    { label: "Content", value: contentCount?.toString() || "0", icon: Video, sub: "Pieces created" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="p-5 rounded-xl border border-border bg-card hover:border-gold/20 transition-colors">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground font-body">{s.label}</span>
              <s.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-heading font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1 font-body">{s.sub}</p>
          </div>
        ))}
      </div>

      {recentProducts && recentProducts.length > 0 && (
        <div>
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Recent Products</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentProducts.map(product => (
              <div key={product.id} className="rounded-xl border border-border bg-card overflow-hidden hover:border-gold/20 transition-colors">
                {product.images && product.images.length > 0 && (
                  <img src={product.images[0]} alt={product.name} className="w-full h-40 object-cover" loading="lazy" />
                )}
                <div className="p-3">
                  <h4 className="font-heading font-semibold text-foreground text-sm truncate">{product.name}</h4>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground font-body">{product.category}</span>
                    <span className="text-sm font-semibold text-primary font-body">{product.currency} {product.price?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const pageTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/products": "Products",
  "/dashboard/content": "Content & UGC",
  "/dashboard/orders": "Orders",
  "/dashboard/conversations": "Conversations",
  "/dashboard/customers": "Customers",
  "/dashboard/agents": "Agents",
  "/dashboard/analytics": "Analytics",
  "/dashboard/assistant": "AI Assistant",
  "/dashboard/agent-portal": "Agent Portal",
  "/dashboard/settings": "Settings",
};

const DashboardPage = () => {
  const location = useLocation();
  const title = pageTitles[location.pathname] || "Dashboard";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border px-4 shrink-0">
            <SidebarTrigger className="mr-4" />
            <h1 className="font-heading text-xl font-semibold text-foreground">{title}</h1>
          </header>
          <main className="flex-1 p-6 overflow-y-auto">
            <Routes>
              <Route index element={<OverviewPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="content" element={<ContentPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="conversations" element={<ConversationsPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="agents" element={<AgentsPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="assistant" element={<AIAssistantPage />} />
              <Route path="agent-portal" element={<AgentDashboard />} />
              <Route path="settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardPage;
