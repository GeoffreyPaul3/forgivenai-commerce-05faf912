import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ShoppingBag,
  LayoutDashboard,
  MessageSquare,
  CreditCard,
  Users,
  BarChart3,
  Video,
  Settings,
  Bot,
  Package,
  TrendingUp,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";

const menuItems = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
  { title: "Products", url: "/dashboard/products", icon: ShoppingBag },
  { title: "Content & UGC", url: "/dashboard/content", icon: Video },
  { title: "Orders", url: "/dashboard/orders", icon: CreditCard },
  { title: "Conversations", url: "/dashboard/conversations", icon: MessageSquare },
  { title: "Agents", url: "/dashboard/agents", icon: Users },
  { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
  { title: "AI Assistant", url: "/dashboard/assistant", icon: Bot },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

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
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
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

function DashboardOverview() {
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

  const { data: categories } = useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("category").not("category", "is", null);
      const cats = new Set((data || []).map(d => d.category));
      return Array.from(cats);
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
    { label: "Total Products", value: productCount?.toString() || "0", icon: Package, change: `${categories?.length || 0} categories` },
    { label: "Active Orders", value: orderCount?.toString() || "0", icon: CreditCard, change: "Real-time tracking" },
    { label: "Revenue", value: "MWK 0", icon: TrendingUp, change: "Start selling" },
    { label: "Conversations", value: "0", icon: MessageSquare, change: "Connect WhatsApp" },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="p-6 rounded-xl border border-border bg-card hover:border-gold/20 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <p className="text-muted-foreground text-sm font-body">{stat.label}</p>
              <stat.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-heading font-bold text-foreground">{stat.value}</p>
            <p className="text-muted-foreground text-xs mt-2 font-body">{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Recent Products */}
      {recentProducts && recentProducts.length > 0 && (
        <div>
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Recent Products (Imported)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentProducts.map((product) => (
              <div key={product.id} className="rounded-xl border border-border bg-card overflow-hidden hover:border-gold/20 transition-colors">
                {product.images && product.images.length > 0 && (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                    loading="lazy"
                  />
                )}
                <div className="p-4">
                  <h4 className="font-heading font-semibold text-foreground text-sm truncate">{product.name}</h4>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground font-body">{product.category}</span>
                    <span className="text-sm font-semibold text-primary font-body">
                      {product.currency} {product.price?.toLocaleString()}
                    </span>
                  </div>
                  <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-body">
                    {product.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!recentProducts || recentProducts.length === 0) && (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Bot className="w-12 h-12 text-primary mx-auto mb-4" />
          <h3 className="font-heading text-xl font-semibold text-foreground mb-2">Welcome to Forgiven AI Commerce</h3>
          <p className="text-muted-foreground font-body max-w-md mx-auto">
            Your AI-powered commerce operating system is ready. Start by adding products or connecting your WhatsApp channel.
          </p>
        </div>
      )}
    </div>
  );
}

const DashboardPage = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border px-4">
            <SidebarTrigger className="mr-4" />
            <h1 className="font-heading text-xl font-semibold text-foreground">Dashboard</h1>
          </header>
          <main className="flex-1 p-6">
            <DashboardOverview />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardPage;
