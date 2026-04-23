import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, CreditCard, User, LogOut,
  ChevronDown, Users, TrendingUp, PackageSearch
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

const agentMenuItems = [
  { title: "Dashboard",      url: "/dashboard",                     icon: LayoutDashboard },
  { title: "My Referrals",   url: "/dashboard/agent/referrals",     icon: Users },
  { title: "Earnings",       url: "/dashboard/agent/earnings",      icon: TrendingUp },
  { title: "Orders Tracking",url: "/dashboard/agent/orders",        icon: PackageSearch },
];

function AgentSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="px-4 py-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
            <span className="font-heading font-bold text-white text-sm">A</span>
          </div>
          {!collapsed && (
            <span className="font-heading text-lg font-bold text-sidebar-foreground">Agent Portal</span>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40">Sales Partner</SidebarGroupLabel>
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
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AgentSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border px-4 shrink-0">
            <SidebarTrigger className="mr-4" />
            <h1 className="font-heading text-xl font-semibold text-foreground flex-1">{title}</h1>

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
          <main className="flex-1 p-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
