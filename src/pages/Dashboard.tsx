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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { label: "Total Products", value: "0", change: "Add your first product" },
                { label: "Active Orders", value: "0", change: "No orders yet" },
                { label: "Revenue", value: "$0", change: "Start selling" },
                { label: "Conversations", value: "0", change: "Connect WhatsApp" },
              ].map((stat) => (
                <div key={stat.label} className="p-6 rounded-xl border border-border bg-card">
                  <p className="text-muted-foreground text-sm font-body">{stat.label}</p>
                  <p className="text-3xl font-heading font-bold text-foreground mt-1">{stat.value}</p>
                  <p className="text-muted-foreground text-xs mt-2 font-body">{stat.change}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <Bot className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-heading text-xl font-semibold text-foreground mb-2">Welcome to Forgiven AI Commerce</h3>
              <p className="text-muted-foreground font-body max-w-md mx-auto">
                Your AI-powered commerce operating system is ready. Start by adding products or connecting your WhatsApp channel.
              </p>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardPage;
