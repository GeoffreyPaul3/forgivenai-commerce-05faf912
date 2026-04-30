import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ShoppingBag, LayoutDashboard, MessageSquare, CreditCard,
  Users, BarChart3, Video, Settings, Bot, ShieldCheck,
  User, LogOut, ChevronDown, Store
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
import { UserCheck } from "lucide-react";

const adminMenuItems = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
  { title: "Products", url: "/dashboard/products", icon: ShoppingBag },
  { title: "Orders", url: "/dashboard/orders", icon: CreditCard },
  { title: "Customers", url: "/dashboard/customers", icon: Users },
  { title: "Conversations", url: "/dashboard/conversations", icon: MessageSquare },
  { title: "Content & UGC", url: "/dashboard/content", icon: Video },
  { title: "Agents", url: "/dashboard/agents", icon: ShieldCheck },
  { title: "Vendors", url: "/dashboard/vendors", icon: Store },
  { title: "Profit Intel", url: "/dashboard/profit-intel", icon: BarChart3 },
  { title: "AI Assistant", url: "/dashboard/assistant", icon: Bot },
  { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

function AdminSidebar() {
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
            <span className="font-heading text-lg font-bold text-sidebar-foreground">Forgiven Admin</span>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40">Commerce OS</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => (
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

export default function AdminLayout({ children, title }: { children: React.ReactNode, title: string }) {
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
    navigate("/");
  };

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "A";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border px-4 shrink-0 min-w-0 w-full">
            <SidebarTrigger className="mr-4 shrink-0" />
            <h1 className="font-heading text-xl font-semibold text-foreground flex-1 truncate pr-4">{title}</h1>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full pl-2 pr-3 py-1.5 hover:bg-accent transition-colors">
                  {user?.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="avatar" className="w-8 h-8 rounded-full object-cover shrink-0 border border-border" />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-heading font-bold text-sm shrink-0 bg-primary text-primary-foreground">
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
                  <p className="text-sm font-semibold text-foreground truncate">{user?.user_metadata?.full_name || "Admin"}</p>
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
          <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
