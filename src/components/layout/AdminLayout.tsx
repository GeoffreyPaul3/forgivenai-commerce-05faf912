import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ShoppingBag, LayoutDashboard, MessageSquare, CreditCard,
  Users, BarChart3, Video, Settings, Bot, ShieldCheck,
  User, LogOut, ChevronDown, Store, Bell, Truck, ShieldAlert
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
import { useQuery } from "@tanstack/react-query";
import { useEnterpriseRBAC } from "@/hooks/useEnterpriseRBAC";

function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { dynamicMenuItems, positions } = useEnterpriseRBAC();
  const primaryPos = positions[0]?.name || "Executive Staff";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="px-4 py-4 flex items-center gap-2">
          <div className="rounded-lg bg-white/80 flex items-center justify-center shrink-0">
           <img src="/forgiven.png" alt="Forgiven Shop Logo" width={40} height={40}/>
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-heading text-lg font-bold text-sidebar-foreground truncate">Forgiven Admin</span>
              <span className="text-[10px] text-gold font-body font-semibold truncate">{primaryPos}</span>
            </div>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40">Enterprise OS</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dynamicMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.title}</span>}
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
  const { positions } = useEnterpriseRBAC();

  useEffect(() => {
    document.title = "Enterprise Commerce OS | Forgiven";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "Enterprise RBAC & Decision Intelligence Platform");
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
    navigate("/");
  };

  const { data: pendingApprovals = [] } = useQuery({
    queryKey: ["admin-pending-approval-requests-bell"],
    queryFn: async () => {
      const { data } = await supabase
        .from("approval_requests")
        .select("id, title, workflow_type, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      return data || [];
    },
    refetchInterval: 15000,
  });

  const totalNotifications = pendingApprovals.length;

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "A";

  const primaryPositionName = positions[0]?.name || "Managing Director";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border px-4 shrink-0 min-w-0 w-full bg-background/95 backdrop-blur">
            <SidebarTrigger className="mr-4 shrink-0" />
            <div className="flex-1 flex items-center gap-3 min-w-0 pr-4">
              <h1 className="font-heading text-xl font-semibold text-foreground truncate">{title}</h1>
              <span className="hidden md:inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
                {primaryPositionName}
              </span>
            </div>

            {/* Notification Bell for High Risk Approvals */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors mr-2">
                  <Bell className="w-5 h-5" />
                  {totalNotifications > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-slate-950 animate-pulse">
                      {totalNotifications}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-2">
                <div className="px-3 py-2 border-b border-border/50 flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Approvals Center</p>
                  {totalNotifications > 0 && (
                    <span className="text-[10px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded font-bold">
                      {totalNotifications} High-Risk
                    </span>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto mt-1 space-y-1">
                  {totalNotifications === 0 ? (
                    <div className="px-3 py-6 text-center text-xs text-muted-foreground">No pending approvals required 🎉</div>
                  ) : (
                    pendingApprovals.map((req: any) => (
                      <DropdownMenuItem
                        key={req.id}
                        onClick={() => navigate("/dashboard/workspace/executive?tab=approvals")}
                        className="flex flex-col items-start gap-1 p-3 cursor-pointer hover:bg-accent rounded-lg"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold text-amber-600">{req.workflow_type}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(req.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-foreground font-medium">{req.title}</p>
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

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
                  <div className="hidden sm:flex flex-col items-start max-w-[120px]">
                    <span className="text-xs font-bold text-foreground font-body truncate w-full">
                      {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Admin"}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate w-full">{primaryPositionName}</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold text-foreground truncate">{user?.user_metadata?.full_name || "Admin"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  <p className="text-[10px] text-gold font-semibold mt-1">Position: {primaryPositionName}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/dashboard/profile")} className="gap-2 cursor-pointer">
                  <User className="w-4 h-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard/settings?tab=rbac")} className="gap-2 cursor-pointer">
                  <ShieldCheck className="w-4 h-4 text-primary" /> Staff Positions & RBAC
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
