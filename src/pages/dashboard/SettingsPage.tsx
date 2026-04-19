import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Settings, RefreshCw, Loader2, Store, Globe, Phone, Banknote, Users, Check, X, Shield, UserCog, Ban, MoreHorizontal, Eye, TrendingUp, UserPlus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SettingsPage = () => {
  const { toast } = useToast();
  const [crawlUrl, setCrawlUrl] = useState("https://www.forgivenshoppingcentre.com/");
  const [crawling, setCrawling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [viewingUser, setViewingUser] = useState<any | null>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [addUserForm, setAddUserForm] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'vendor'
  });
  const [brandForm, setBrandForm] = useState({
    name: "Forgiven Shopping Centre",
    currency: "MWK",
    whatsapp: "+265997128899",
    website: "https://www.forgivenshoppingcentre.com",
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (viewingUser) {
      const fetchStats = async () => {
        setLoadingStats(true);
        setUserStats(null);
        if (viewingUser.role === 'agent') {
           const { data } = await supabase.from('agents').select('total_sales, total_commission, commission_rate, referral_code').eq('user_id', viewingUser.id).maybeSingle();
           if (data) setUserStats(data);
        } else if (viewingUser.role === 'vendor') {
           const { data } = await supabase.from('vendors').select('id, score, business_name').eq('user_id', viewingUser.id).maybeSingle();
           if (data) {
             const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('vendor_id', data.id);
             setUserStats({ ...data, product_count: count || 0 });
           }
        }
        setLoadingStats(false);
      };
      fetchStats();
    }
  }, [viewingUser]);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        const isUserAdmin = profile?.role === "admin";
        setIsAdmin(isUserAdmin);
        if (isUserAdmin) fetchTeamUsers(user.id);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamUsers = async (excludeId?: string) => {
    const _excludeId = excludeId ?? "00000000-0000-0000-0000-000000000000";

    const { data: pendingData, error: pendingError } = await supabase
      .from("profiles")
      .select("*")
      .eq("status", "pending")
      .neq("id", _excludeId)
      .order("created_at", { ascending: false });

    const { data: activeData, error: activeError } = await supabase
      .from("profiles")
      .select("*")
      .neq("status", "pending")
      .neq("id", _excludeId)
      .order("created_at", { ascending: false });

    if (pendingError || activeError) {
      toast({ title: "Error", description: "Failed to fetch team data", variant: "destructive" });
    } else {
      setPendingUsers((pendingData || []).filter((u: any) => u.id !== _excludeId && u.role !== "admin"));
      setActiveUsers((activeData || []).filter((u: any) => u.id !== _excludeId && u.role !== "admin"));
    }
  };


  const handleApprove = async (userId: string, role: "vendor" | "agent") => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("profiles").update({ status: "approved", role }).eq("id", userId);
    if (error) {
      toast({ title: "Approval failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "User approved", description: `User has been approved as a ${role}.` });
      fetchTeamUsers(user?.id);
    }
  };

  const handleReject = async (userId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("profiles").update({ status: "rejected" }).eq("id", userId);
    if (error) {
      toast({ title: "Rejection failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "User rejected", description: "The user's request has been declined." });
      fetchTeamUsers(user?.id);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingUser(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${supabase['supabaseUrl']}/functions/v1/admin-create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(addUserForm)
      });
      
      const result = await response.json();
      
      if (!response.ok) throw new Error(result.error || 'Failed to create user');
      
      toast({ title: "Team Member Added", description: `${addUserForm.full_name} has been set up securely.` });
      setShowAddUser(false);
      setAddUserForm({ email: '', full_name: '', password: '', role: 'vendor' });
      
      const { data: { user } } = await supabase.auth.getUser();
      fetchTeamUsers(user?.id);
    } catch (err: any) {
      toast({ title: "Error creating member", description: err.message, variant: "destructive" });
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleToggleSuspend = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "approved" ? "rejected" : "approved";
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("profiles").update({ status: newStatus }).eq("id", userId);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `User ${newStatus === "approved" ? "unsuspended" : "suspended"}` });
      fetchTeamUsers(user?.id);
    }
  };

  const handleChangeRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "vendor" ? "agent" : "vendor";
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
    if (error) {
      toast({ title: "Role update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Role updated", description: `User is now a ${newRole}.` });
      fetchTeamUsers(user?.id);
    }
  };

  const handleCrawl = async () => {
    if (!crawlUrl) return;
    setCrawling(true);
    toast({ title: "Crawl initiated", description: "This may take a minute as we discover and extract product data..." });

    try {
      const { data, error } = await supabase.functions.invoke("firecrawl-products", {
        body: { action: "sync", url: crawlUrl, limit: 10 }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Sync failed");

      toast({ 
        title: "Crawl complete", 
        description: `Successfully imported/updated ${data.imported} products from your website.` 
      });
    } catch (err: any) {
      console.error("Sync error:", err);
      toast({ 
        title: "Sync failed", 
        description: err.message || "An unexpected error occurred during sync.", 
        variant: "destructive" 
      });
    } finally {
      setCrawling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground tracking-tight">Settings</h2>
        <p className="text-muted-foreground text-sm font-body">Manage your store configuration and team.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="w-full mb-8 flex">
          <TabsTrigger value="general" className="flex-1 gap-2">
            <Settings className="w-4 h-4" /> General
          </TabsTrigger>
          <TabsTrigger value="team" className="flex-1 gap-2">
            <Users className="w-4 h-4" /> Team Management
            {isAdmin && pendingUsers.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]">
                {pendingUsers.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          {/* Website Sync */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-gold" /> Website Data Sync
            </h3>
            <p className="text-sm text-muted-foreground font-body">Re-crawl your website to refresh product data in the knowledge base.</p>
            <div className="flex gap-2">
              <Input value={crawlUrl} onChange={e => setCrawlUrl(e.target.value)} className="flex-1" />
              <Button onClick={handleCrawl} disabled={crawling} className="gap-2">
                {crawling ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Sync Now
              </Button>
            </div>
          </div>

          {/* Brand Settings */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
              <Store className="w-5 h-5 text-gold" /> Brand Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-body flex items-center gap-1.5">
                  <Store className="w-3 h-3" /> Brand Name
                </label>
                <Input value={brandForm.name} onChange={e => setBrandForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-body flex items-center gap-1.5">
                  <Banknote className="w-3 h-3" /> Currency
                </label>
                <Input value={brandForm.currency} onChange={e => setBrandForm(f => ({ ...f, currency: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-body flex items-center gap-1.5">
                  <Phone className="w-3 h-3" /> WhatsApp Number
                </label>
                <Input value={brandForm.whatsapp} onChange={e => setBrandForm(f => ({ ...f, whatsapp: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-body flex items-center gap-1.5">
                  <Globe className="w-3 h-3" /> Website
                </label>
                <Input value={brandForm.website} onChange={e => setBrandForm(f => ({ ...f, website: e.target.value }))} />
              </div>
            </div>
            <Button onClick={() => toast({ title: "Settings saved" })}>Save Settings</Button>
          </div>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          {!isAdmin ? (
            <div className="text-center py-16 bg-muted/20 rounded-xl border border-dashed border-border">
              <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-body font-semibold">Admin access required</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Only administrators can manage team members.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-6 space-y-6">
              <div>
                <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
                  <Shield className="w-5 h-5 text-gold" /> Pending Approvals
                </h3>
                <p className="text-sm text-muted-foreground font-body">Review new user requests and assign their platform roles.</p>
              </div>

              <div className="space-y-4">
                {pendingUsers.length === 0 ? (
                  <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-border">
                    <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground font-body">No pending requests at the moment.</p>
                  </div>
                ) : (
                  pendingUsers.map((user) => (
                    <div key={user.id} className="flex flex-col md:flex-row items-center justify-between p-4 rounded-xl border border-border bg-muted/10 gap-4">
                      <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {user.full_name?.[0] || user.id[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold font-heading">{user.full_name || "New User"}</p>
                          <p className="text-xs text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 w-full md:w-auto">
                        <Button 
                          onClick={() => handleApprove(user.id, "vendor")} 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 md:flex-none gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50"
                        >
                          <Check className="w-3 h-3" /> Approve as Vendor
                        </Button>
                        <Button 
                          onClick={() => handleApprove(user.id, "agent")} 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 md:flex-none gap-1.5 border-blue-500/30 text-blue-600 hover:bg-blue-50"
                        >
                          <Check className="w-3 h-3" /> Approve as Agent
                        </Button>
                        <Button 
                          onClick={() => handleReject(user.id)} 
                          variant="ghost" 
                          size="sm" 
                          className="flex-1 md:flex-none text-destructive hover:bg-destructive/10"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Active Users Section */}
              <div className="mt-8 pt-8 border-t border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
                      <Users className="w-5 h-5 text-gold" /> Active Team Members
                    </h3>
                    <p className="text-sm text-muted-foreground font-body">Manage roles and access for existing platform users.</p>
                  </div>
                  <Button 
                    onClick={() => setShowAddUser(true)}
                    className="gap-2 bg-primary text-primary-foreground hover:bg-gold/90 transition-colors shadow-premium sm:w-auto w-full"
                  >
                    <UserPlus className="w-4 h-4" /> Add Team Member
                  </Button>
                </div>
                
                <div className="rounded-md border border-border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="w-[80px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-32 text-center">
                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                              <UserCog className="w-8 h-8 mb-2 opacity-20" />
                              <p className="font-body text-sm">No team members found.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        activeUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                                  {user.full_name?.[0] || user.id[0]}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-heading text-sm text-foreground">{user.full_name || "New User"}</span>
                                  <span className="text-[10px] text-muted-foreground">{user.email || "No email"}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider bg-transparent border-gold/30 text-gold hover:bg-gold/10 transition-colors">
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={user.status === "approved" ? "default" : "destructive"} 
                                className={`text-[10px] uppercase font-bold tracking-wider ${user.status === "approved" ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" : ""}`}
                              >
                                {user.status === "approved" ? "Active" : "Suspended"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs font-body">
                              {new Date(user.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted focus-visible:ring-1 focus-visible:ring-gold">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[200px] border-border bg-card">
                                  <DropdownMenuItem 
                                    onClick={() => setViewingUser(user)}
                                    className="cursor-pointer font-body text-sm flex items-center py-2"
                                  >
                                    <Eye className="w-4 h-4 mr-2 text-primary" />
                                    View Profile
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleChangeRole(user.id, user.role)}
                                    className="cursor-pointer font-body text-sm flex items-center py-2"
                                  >
                                    <UserCog className="w-4 h-4 mr-2 text-gold" />
                                    Change to {user.role === "vendor" ? "Agent" : "Vendor"}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-border" />
                                  <DropdownMenuItem 
                                    onClick={() => handleToggleSuspend(user.id, user.status)}
                                    className={`cursor-pointer font-body text-sm flex items-center py-2 ${
                                      user.status === "approved" 
                                        ? "text-destructive focus:bg-destructive/10 focus:text-destructive" 
                                        : "text-emerald-500 focus:bg-emerald-500/10 focus:text-emerald-500"
                                    }`}
                                  >
                                    <Ban className="w-4 h-4 mr-2" />
                                    {user.status === "approved" ? "Suspend Access" : "Restore Access"}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* User Profile View Dialog */}
      <Dialog open={!!viewingUser} onOpenChange={(open) => !open && setViewingUser(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl flex items-center gap-2">
              <UserCog className="w-5 h-5 text-gold" /> User Profile
            </DialogTitle>
            <DialogDescription className="font-body">
              Detailed view of the team member's account.
            </DialogDescription>
          </DialogHeader>
          
          {viewingUser && (
            <div className="space-y-6 py-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl uppercase border-2 border-gold/20">
                  {viewingUser.full_name?.[0] || viewingUser.id[0]}
                </div>
                <div>
                  <h4 className="font-heading text-lg text-foreground font-semibold">
                    {viewingUser.full_name || "Unknown User"}
                  </h4>
                  <p className="text-sm text-muted-foreground">{viewingUser.email || "No email provided"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 p-3 rounded-lg border border-border bg-muted/20">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">System Role</p>
                  <Badge variant="outline" className="bg-transparent border-gold/30 text-gold capitalize tracking-wide text-xs">
                    {viewingUser.role || "N/A"}
                  </Badge>
                </div>
                <div className="space-y-1 p-3 rounded-lg border border-border bg-muted/20">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Account Status</p>
                  <Badge 
                    variant={viewingUser.status === "approved" ? "default" : viewingUser.status === "rejected" ? "destructive" : "secondary"} 
                    className={`capitalize tracking-wide text-xs ${viewingUser.status === "approved" ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" : ""}`}
                  >
                    {viewingUser.status}
                  </Badge>
                </div>
              </div>

              {/* Stats Block */}
              {(viewingUser.role === 'agent' || viewingUser.role === 'vendor') && (
                <div className="space-y-3 pt-2">
                  <h5 className="text-sm font-semibold font-heading flex items-center gap-2 text-foreground">
                    <TrendingUp className="w-4 h-4 text-gold" /> Performance Stats
                  </h5>
                  {loadingStats ? (
                    <div className="p-4 border border-border bg-muted/10 rounded-lg flex justify-center items-center">
                      <Loader2 className="w-5 h-5 text-gold animate-spin" />
                    </div>
                  ) : userStats ? (
                    <div className="grid grid-cols-2 gap-3">
                      {viewingUser.role === 'vendor' && (
                        <>
                           <div className="p-3 bg-muted/20 rounded-lg border border-border shadow-sm">
                             <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Products Sync'd</p>
                             <p className="text-xl font-heading text-foreground">{userStats.product_count}</p>
                           </div>
                           <div className="p-3 bg-muted/20 rounded-lg border border-border shadow-sm">
                             <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Trust Score</p>
                             <p className="text-xl font-heading text-foreground">{userStats.score}%</p>
                           </div>
                        </>
                      )}
                      {viewingUser.role === 'agent' && (
                        <>
                           <div className="p-3 bg-muted/20 rounded-lg border border-border shadow-sm">
                             <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Total Sales</p>
                             <p className="text-xl font-heading text-foreground">MWK {userStats.total_sales?.toLocaleString() || 0}</p>
                           </div>
                           <div className="p-3 bg-muted/20 rounded-lg border border-border shadow-sm">
                             <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Commissions</p>
                             <p className="text-xl font-heading text-emerald-500">MWK {userStats.total_commission?.toLocaleString() || 0}</p>
                           </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 border border-border bg-muted/10 rounded-lg flex flex-col items-center justify-center text-center">
                      <p className="text-xs text-muted-foreground font-body">Profile setup incomplete. No metrics available yet.</p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="space-y-1 p-3 rounded-lg border border-border bg-muted/20">
                 <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Account Creation</p>
                 <p className="text-sm font-body text-foreground">
                    {new Date(viewingUser.created_at).toLocaleString(undefined, {
                       year: 'numeric', month: 'long', day: 'numeric',
                       hour: '2-digit', minute: '2-digit'
                    })}
                 </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Create Team Member Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-gold" /> Add Team Member
            </DialogTitle>
            <DialogDescription className="font-body">
              Create a new vendor or agent and share credentials with them. System tables will automatically sync.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateUser} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium font-heading">Full Name</label>
              <Input 
                value={addUserForm.full_name}
                onChange={e => setAddUserForm({...addUserForm, full_name: e.target.value})}
                placeholder="e.g. John Doe"
                required
                className="bg-surface border-border"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium font-heading">Email Address</label>
              <Input 
                type="email"
                value={addUserForm.email}
                onChange={e => setAddUserForm({...addUserForm, email: e.target.value})}
                placeholder="agent@example.com"
                required
                className="bg-surface border-border"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium font-heading">Temporary Password</label>
              <Input 
                type="text"
                value={addUserForm.password}
                onChange={e => setAddUserForm({...addUserForm, password: e.target.value})}
                placeholder="Secure password..."
                required
                minLength={6}
                className="bg-surface border-border"
              />
              <p className="text-xs text-muted-foreground">They can change this password later from their profile.</p>
            </div>
            <div className="space-y-2 pb-2">
              <label className="text-sm font-medium font-heading">Assign Role</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={addUserForm.role === 'vendor' ? "default" : "outline"}
                  onClick={() => setAddUserForm({...addUserForm, role: 'vendor'})}
                  className={`flex-1 ${addUserForm.role === 'vendor' ? 'bg-gold/10 text-gold border-gold/50' : 'border-border text-muted-foreground'}`}
                >
                  Vendor
                </Button>
                <Button
                  type="button"
                  variant={addUserForm.role === 'agent' ? "default" : "outline"}
                  onClick={() => setAddUserForm({...addUserForm, role: 'agent'})}
                  className={`flex-1 ${addUserForm.role === 'agent' ? 'bg-primary/10 text-primary border-primary/50' : 'border-border text-muted-foreground'}`}
                >
                  Agent
                </Button>
              </div>
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddUser(false)} className="flex-1 border-border">
                Cancel
              </Button>
              <Button type="submit" disabled={isAddingUser} className="flex-1 bg-gold text-white hover:bg-gold/90">
                {isAddingUser ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                Add Member
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
