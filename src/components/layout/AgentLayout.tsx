import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, CreditCard, User, LogOut,
  ChevronDown, Users, TrendingUp, PackageSearch, ShoppingBag, GraduationCap,
  Bell
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
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import logo from "@/assets/forgiven.png";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AgentSidebar } from "./AgentSidebar";
import AgentOnboardingGate from "@/pages/dashboard/agent/onboarding/AgentOnboardingGate";
import { AgentNotifications } from "../dashboard/agent/AgentNotifications";

const agentMenuItems = [
  { title: "Dashboard",        url: "/dashboard",                     icon: LayoutDashboard },
  { title: "Products",         url: "/dashboard/agent/products",      icon: ShoppingBag },
  { title: "Promotion Kit",    url: "/dashboard/agent/content",       icon: TrendingUp },
  { title: "My Referrals",     url: "/dashboard/agent/referrals",     icon: Users },
  { title: "Earnings",         url: "/dashboard/agent/earnings",      icon: TrendingUp },
  { title: "Orders Tracking",  url: "/dashboard/agent/orders",        icon: PackageSearch },
  { title: "Training Hub",     url: "/dashboard/agent/training",      icon: GraduationCap },
];

function AgentSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="px-4 py-4 flex items-center gap-2">
          <div className="rounded-lg bg-white/80 flex items-center justify-center shrink-0">
          <img src={logo} alt="Forgiven Shop Logo" width={50} height={50}/>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-heading text-lg font-bold text-sidebar-foreground leading-tight">Agent Portal</span>
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#A21D7F] opacity-80 leading-tight">Sales Partner</span>
            </div>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">Sales Partner</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {agentMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={
                    item.url === "/dashboard"
                      ? location.pathname === "/dashboard"
                      : location.pathname.startsWith(item.url)
                  }>
                    <NavLink to={item.url} end={item.url === "/dashboard"} className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
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

export default function AgentLayout({ children, title }: { children: React.ReactNode, title: string }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    document.title = "Agent Dashboard | Forgiven Shopping Centre";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "Access your product catalog, track referrals, and monitor your commissions in real-time.");
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "A";

  return (
    <AgentOnboardingGate>
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AgentSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border px-4 shrink-0">
            <SidebarTrigger className="mr-4" />
            <h1 className="font-heading text-xl font-semibold text-foreground flex-1">{title}</h1>

            <AgentNotifications />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full pl-2 pr-3 py-1.5 hover:bg-accent transition-colors">
                  {user?.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="avatar" className="w-8 h-8 rounded-full object-cover shrink-0 border border-border" />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-heading font-bold text-sm shrink-0 bg-blue-500 text-white">
                      {initials}
                    </div>
                  )}
                  <span className="hidden sm:block text-sm font-medium text-foreground font-body max-w-[120px] truncate">
                    {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Agent"}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold text-foreground truncate">{user?.user_metadata?.full_name || "Agent"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/dashboard/profile")} className="gap-2 cursor-pointer">
                  <User className="w-4 h-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <ScrollArea className="flex-1 h-[calc(100vh-3.5rem)]">
          <main className="p-6">
            {children}
          </main>
          </ScrollArea>
        </div>
      </div>
    </SidebarProvider>
    </AgentOnboardingGate>
  );
}
