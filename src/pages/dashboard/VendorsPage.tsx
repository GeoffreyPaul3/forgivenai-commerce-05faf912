import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast, useToast } from "@/hooks/use-toast";
import { 
  Store, Plus, Search, MoreHorizontal, Pencil, Trash2, Eye, Star, 
  MapPin, Phone, User, Loader2, Clock, AlertTriangle, Wallet, 
  CheckCircle2, BarChart3, TrendingUp, Filter, ShieldCheck, Timer,
  Package, ShoppingCart
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

/** Vendor class A/B/C/D */
function getVendorClass(score: number | null) {
  if (!score && score !== 0) return { label: "—", color: "text-muted-foreground border-muted", bg: "" };
  if (score >= 85) return { label: "A", color: "text-emerald-700 border-emerald-500/30", bg: "bg-emerald-500/10" };
  if (score >= 70) return { label: "B", color: "text-[#A21D7F] border-[#A21D7F]/30", bg: "bg-[#A21D7F]/10" };
  if (score >= 50) return { label: "C", color: "text-amber-700 border-amber-500/30", bg: "bg-amber-500/10" };
  return { label: "D", color: "text-red-700 border-red-500/30", bg: "bg-red-500/10" };
}

/** Confirmation Delay Helper */
function getDelayStatus(createdAt: string) {
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (mins >= 60) return { state: "escalated", label: "Escalated (>60m)", color: "text-red-600 bg-red-50", icon: AlertTriangle };
  if (mins >= 30) return { state: "flagged", label: "Flagged (>30m)", color: "text-amber-600 bg-amber-50", icon: Clock };
  return { state: "ok", label: "Ideal (<30m)", color: "text-emerald-600 bg-emerald-50", icon: Timer };
}

const VendorsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editVendor, setEditVendor] = useState<any>(null);
  const [viewVendor, setViewVendor] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("vendors");
  const [viewProfileTab, setViewProfileTab] = useState("details");

  // Reset to Details tab whenever a different vendor profile is opened
  useEffect(() => {
    if (viewVendor) setViewProfileTab("details");
  }, [viewVendor?.id]);

  const { data: vendors, isLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendors").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: pendingOrders } = useQuery({
    queryKey: ["pending-vendor-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("vendor_confirmation_status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;
      
      const { data: vendorProducts } = await supabase
        .from("products")
        .select("id")
        .not("vendor_id", "is", null);
        
      const vendorProductIds = new Set((vendorProducts || []).map(p => p.id));
      
      return (data || []).filter(order => {
        const items = Array.isArray(order.items) ? order.items : [];
        return items.some((item: any) => vendorProductIds.has(item.product_id));
      });
    },
  });

  const { data: payouts } = useQuery({
    queryKey: ["admin-all-payouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_payouts")
        .select("*, vendors(business_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch vendor's products + orders whenever a profile dialog is open
  const { data: vendorProfileData, isLoading: isLoadingVendorProfile } = useQuery({
    queryKey: ["vendor-profile-data", viewVendor?.id],
    enabled: !!viewVendor,
    queryFn: async () => {
      const { data: products } = await supabase
        .from("products")
        .select("id, name, price, status, stock_quantity, images, category")
        .eq("vendor_id", viewVendor!.id)
        .order("created_at", { ascending: false });

      const productIds = new Set((products || []).map((p: any) => p.id));

      let orders: any[] = [];
      if (productIds.size > 0) {
        const { data: allOrders } = await supabase
          .from("orders")
          .select("id, customer_name, total, status, currency, created_at, items")
          .order("created_at", { ascending: false })
          .limit(500);

        orders = (allOrders || []).filter((order: any) => {
          const items = Array.isArray(order.items) ? order.items : [];
          return items.some((item: any) => productIds.has(item.product_id));
        });
      }

      return { products: products || [], orders };
    },
  });

  // Per-vendor order counts for the management table
  const { data: vendorStats } = useQuery({
    queryKey: ["vendor-stats-counts"],
    queryFn: async () => {
      const { data: vendorProds } = await supabase
        .from("products")
        .select("id, vendor_id")
        .not("vendor_id", "is", null);

      // vendorId → Set<productId>
      const vpMap = new Map<string, Set<string>>();
      for (const p of vendorProds || []) {
        if (!p.vendor_id) continue;
        if (!vpMap.has(p.vendor_id)) vpMap.set(p.vendor_id, new Set());
        vpMap.get(p.vendor_id)!.add(p.id);
      }

      const { data: allOrders } = await supabase
        .from("orders")
        .select("id, items");

      // vendorId → order count
      const orderCount = new Map<string, number>();
      for (const order of allOrders || []) {
        const items = Array.isArray(order.items) ? (order.items as any[]) : [];
        const seen = new Set<string>();
        for (const item of items) {
          for (const [vid, pids] of vpMap.entries()) {
            if (pids.has(item.product_id) && !seen.has(vid)) {
              seen.add(vid);
              orderCount.set(vid, (orderCount.get(vid) || 0) + 1);
            }
          }
        }
      }

      // vendorId → product count
      const productCount = new Map<string, number>();
      for (const [vid, pids] of vpMap.entries()) productCount.set(vid, pids.size);

      return { orderCount, productCount };
    },
  });

  const createVendor = useMutation({
    mutationFn: async (vendor: any) => {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: vendor.email,
          password: vendor.password,
          full_name: vendor.contact_person || vendor.business_name,
          role: 'vendor',
          business_name: vendor.business_name,
          phone: vendor.phone,
          address: vendor.address,
          category: vendor.category,
          payment_details: JSON.parse(vendor.payment_details || "{}")
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setShowAdd(false);
      toast({ title: "Vendor account created! 🚀", description: "Login credentials have been sent to their email." });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Registration Failed", 
        description: error.message || "Please check your permissions and try again."
      });
    },
  });

  const updateVendor = useMutation({
    mutationFn: async (vendor: any) => {
      const { id, email, password, ...data } = vendor;
      const { error } = await supabase.from("vendors").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setEditVendor(null);
      toast({ title: "Vendor updated!" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Failed to update vendor", 
        description: error.message || "Please check your permissions and try again."
      });
    },
  });

  const updatePayoutStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("vendor_payouts").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-payouts"] });
      toast({ title: "Payout status updated!" });
    },
  });

  const resolveConfirmation = useMutation({
    mutationFn: async ({ orderId, action }: { orderId: string, action: "accept" | "reject" }) => {
      const updates: any = { vendor_confirmation_status: action === "accept" ? "accepted" : "rejected" };
      if (action === "accept") {
        updates.vendor_confirmed_at = new Date().toISOString();
        updates.status = "confirmed";
      } else {
        updates.status = "cancelled";
      }
      
      const { error } = await supabase.from("orders").update(updates).eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pending-vendor-orders"] });
      toast({ 
        title: variables.action === "accept" ? "Order Force-Accepted" : "Order Rejected", 
        description: variables.action === "accept" 
          ? "The order has been confirmed on behalf of the vendor." 
          : "The order has been rejected and cancelled." 
      });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Action Failed", description: err.message });
    }
  });

  const filteredVendors = useMemo(() => {
    const term = search.toLowerCase();
    if (!term) return vendors || [];
    return (vendors || []).filter(v =>
      [v.business_name, v.contact_person, v.phone, v.address, v.category].filter(Boolean).join(" ").toLowerCase().includes(term)
    );
  }, [vendors, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60 tracking-tight">Vendor Management</h2>
          <p className="text-muted-foreground text-sm font-body tracking-tight">Manage your third-party inventory supply chain.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAdd(true)} className="gap-2 bg-primary hover:bg-primary/90 rounded-xl px-6 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" /> Add Vendor
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="bg-muted/50 p-1 rounded-2xl border border-border/50">
            <TabsTrigger value="vendors" className="rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">Vendors</TabsTrigger>
            <TabsTrigger value="confirmation" className="rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm flex gap-2 items-center">
              Monitor
              {pendingOrders && pendingOrders.length > 0 && (
                <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </TabsTrigger>
            <TabsTrigger value="payouts" className="rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">Payouts</TabsTrigger>
            <TabsTrigger value="scoring" className="rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">Scoring</TabsTrigger>
          </TabsList>
          
          <div className="relative max-w-sm hidden md:block">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Quick search..." 
              className="pl-9 bg-card border-border/50 rounded-xl h-10 w-[240px] focus:w-[320px] transition-all" 
            />
          </div>
        </div>

        <TabsContent value="vendors" className="m-0 space-y-6 outline-none">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Vendors", value: vendors?.length || 0, icon: Store, color: "text-primary", bg: "bg-primary/5", border: "border-primary/20" },
              { label: "Active Vendors", value: vendors?.filter(v => v.status === "active").length || 0, icon: Star, color: "text-gold", bg: "bg-gold/5", border: "border-gold/20" },
              { label: "Pending Confirms", value: pendingOrders?.length || 0, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/5", border: "border-amber-500/20" },
              { label: "Unpaid Payouts", value: payouts?.filter(p => p.status === 'pending').length || 0, icon: Wallet, color: "text-emerald-500", bg: "bg-emerald-500/5", border: "border-emerald-500/20" },
            ].map(s => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`p-5 rounded-2xl border ${s.border} ${s.bg} shadow-sm group hover:shadow-md transition-all`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{s.label}</span>
                  <s.icon className={`w-4 h-4 ${s.color} group-hover:scale-110 transition-transform`} />
                </div>
                <p className="text-3xl font-heading font-black tracking-tight">{s.value}</p>
              </motion.div>
            ))}
          </div>

          <div className="rounded-3xl border border-border/50 bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 border-0">
                  <TableHead className="pl-6">Business Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <TableCell key={j} className={j === 0 ? "pl-6" : ""}><div className="h-4 rounded bg-muted animate-pulse" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredVendors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-20 text-muted-foreground font-body">
                      <Store className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-bold">No vendors found</p>
                      <p className="text-sm">Try adjusting your search terms</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVendors.map(vendor => (
                    <TableRow key={vendor.id} className="group hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0">
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-primary font-bold shadow-sm">
                            {vendor.business_name[0]}
                          </div>
                          <div>
                            <p className="font-heading font-bold text-foreground text-sm tracking-tight">{vendor.business_name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">ID: {vendor.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-semibold text-foreground/80">{vendor.contact_person}</p>
                          <p className="text-xs text-muted-foreground font-body">{vendor.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {vendor.address || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-black text-[9px] uppercase tracking-tighter border-border/50 bg-muted/20">
                          {vendor.category || "General"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(() => { const cls = getVendorClass(vendor.score); return (
                          <Badge variant="outline" className={`text-[10px] font-black border-2 px-3 ${cls.color} ${cls.bg}`}>
                            Class {cls.label}
                          </Badge>
                        ); })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const cnt = vendorStats?.orderCount.get(vendor.id) || 0;
                          const pCnt = vendorStats?.productCount.get(vendor.id) || 0;
                          return (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-black text-foreground">{cnt}</span>
                              <span className="text-[10px] text-muted-foreground font-body">{pCnt} product{pCnt !== 1 ? "s" : ""}</span>
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={vendor.status === "active" ? "default" : "secondary"} className="capitalize text-[10px] font-black px-3 rounded-lg">
                          {vendor.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors">
                              <MoreHorizontal className="w-5 h-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 shadow-xl border-border/50">
                            <DropdownMenuItem onClick={() => setViewVendor(vendor)} className="rounded-xl focus:bg-primary/5 cursor-pointer">
                              <Eye className="w-4 h-4 mr-3 text-primary" />View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditVendor(vendor)} className="rounded-xl focus:bg-primary/5 cursor-pointer">
                              <Pencil className="w-4 h-4 mr-3 text-amber-500" />Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="rounded-xl text-destructive focus:bg-destructive/5 focus:text-destructive cursor-pointer">
                              <Trash2 className="w-4 h-4 mr-3" />Archive Vendor
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
        </TabsContent>

        <TabsContent value="confirmation" className="m-0 space-y-6 outline-none">
          <Card className="rounded-3xl border-border/50 bg-card overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-heading text-xl font-bold flex gap-2 items-center">
                    <Timer className="w-5 h-5 text-amber-500" /> Confirmation Monitor
                  </CardTitle>
                  <CardDescription>Real-time tracking of pending vendor confirmations</CardDescription>
                </div>
                <Badge className="bg-amber-500 hover:bg-amber-600 font-black">{pendingOrders?.length || 0} Pending</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10 border-0">
                    <TableHead className="pl-6">Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Time Elapsed</TableHead>
                    <TableHead>Delay State</TableHead>
                    <TableHead className="text-right pr-6">Admin Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!pendingOrders || pendingOrders.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-20 text-muted-foreground font-body">
                        <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-emerald-500/30" />
                        <p className="text-lg font-bold">All caught up!</p>
                        <p className="text-sm">No pending confirmations at the moment.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingOrders.map(order => {
                      const delay = getDelayStatus(order.created_at);
                      const DelayIcon = delay.icon;
                      return (
                        <TableRow key={order.id} className="hover:bg-muted/30 transition-colors border-b border-border/50">
                          <TableCell className="pl-6">
                            <p className="font-mono text-xs font-bold text-muted-foreground">#{order.id.slice(0, 8)}</p>
                          </TableCell>
                          <TableCell>
                            <p className="font-bold text-sm">{order.customer_name}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-sm font-semibold">
                                {Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000)}m
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`font-black text-[10px] uppercase flex gap-1.5 items-center w-fit px-3 py-1 ${delay.color} border-transparent`}>
                              <DelayIcon className="w-3 h-3" />
                              {delay.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-muted">
                                  {resolveConfirmation.isPending && resolveConfirmation.variables?.orderId === order.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                  ) : (
                                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 rounded-xl border-border/50 shadow-lg">
                                <DropdownMenuItem 
                                  className="gap-2 cursor-pointer font-medium"
                                  onClick={() => resolveConfirmation.mutate({ orderId: order.id, action: "accept" })}
                                >
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  Force Accept
                                </DropdownMenuItem>
                                
                                {(() => {
                                  const firstItem = Array.isArray(order.items) ? (order.items as any)[0] : null;
                                  const vendorId = firstItem?.vendor_id;
                                  const vendor = vendors?.find(v => v.id === vendorId);
                                  const vendorPhone = vendor?.phone?.replace(/\D/g, "");
                                  
                                  if (vendorPhone) {
                                    const msg = encodeURIComponent(`Hello, your order #${order.id.slice(0,8)} is pending confirmation in your portal. Please confirm it as soon as possible.`);
                                    return (
                                      <DropdownMenuItem asChild className="gap-2 cursor-pointer font-medium">
                                        <a href={`https://wa.me/${vendorPhone}?text=${msg}`} target="_blank" rel="noopener noreferrer">
                                          <Phone className="w-4 h-4 text-primary" />
                                          Contact Vendor
                                        </a>
                                      </DropdownMenuItem>
                                    );
                                  }
                                  return null;
                                })()}

                                <DropdownMenuItem 
                                  className="gap-2 cursor-pointer text-red-600 focus:text-red-600 font-medium mt-1 border-t border-border/50 pt-2"
                                  onClick={() => resolveConfirmation.mutate({ orderId: order.id, action: "reject" })}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                  Force Reject & Cancel
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="m-0 space-y-6 outline-none">
          <Card className="rounded-3xl border-border/50 bg-card overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-heading text-xl font-bold flex gap-2 items-center">
                    <Wallet className="w-5 h-5 text-emerald-500" /> Payout Management
                  </CardTitle>
                  <CardDescription>Track and settle vendor accounts</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10 border-0">
                    <TableHead className="pl-6">Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!payouts || payouts.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-20 text-muted-foreground font-body">
                        <Wallet className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-bold">No payouts recorded</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    payouts.map(p => (
                      <TableRow key={p.id} className="hover:bg-muted/30 transition-colors border-b border-border/50">
                        <TableCell className="pl-6">
                          <p className="font-bold text-sm">{(p.vendors as any)?.business_name}</p>
                        </TableCell>
                        <TableCell className="font-mono font-black text-emerald-600">
                          MWK {(p.amount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.period_start ? `${new Date(p.period_start).toLocaleDateString()} - ${new Date(p.period_end).toLocaleDateString()}` : "Single Order"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.status === 'paid' ? 'default' : 'outline'} className={`font-black text-[10px] uppercase px-3 ${p.status === 'paid' ? 'bg-emerald-500' : 'text-amber-500 border-amber-200'}`}>
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          {p.status === 'pending' && (
                            <Button 
                              size="sm" 
                              onClick={() => updatePayoutStatus.mutate({ id: p.id, status: 'paid' })}
                              className="bg-emerald-500 hover:bg-emerald-600 h-8 rounded-lg font-bold text-xs"
                            >
                              Mark as Paid
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scoring" className="m-0 space-y-6 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vendors?.map(v => {
              const cls = getVendorClass(v.score);
              return (
                <Card key={v.id} className="rounded-3xl border-border/50 bg-card overflow-hidden shadow-sm hover:shadow-md transition-all group">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-xl font-black text-primary shadow-inner">
                        {v.business_name[0]}
                      </div>
                      <Badge variant="outline" className={`font-black text-lg border-2 px-4 py-1 ${cls.color} ${cls.bg}`}>
                        Class {cls.label}
                      </Badge>
                    </div>
                    <CardTitle className="mt-4 font-heading font-black text-xl tracking-tight">{v.business_name}</CardTitle>
                    <CardDescription className="font-body text-xs flex items-center gap-1">
                      <BarChart3 className="w-3 h-3" /> Performance Score Breakdown
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                        <span>Overall Score</span>
                        <span>{v.score}%</span>
                      </div>
                      <Progress value={v.score} className="h-2 rounded-full bg-muted shadow-inner" />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3 rounded-2xl bg-muted/30 border border-border/50">
                        <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Confirmation</p>
                        <p className={`text-lg font-black ${v.score >= 80 ? 'text-emerald-600' : v.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                          {v.score >= 85 ? 'ELITE' : v.score >= 70 ? 'GOOD' : v.score >= 50 ? 'AVERAGE' : 'POOR'}
                        </p>
                      </div>
                      <div className="p-3 rounded-2xl bg-muted/30 border border-border/50">
                        <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Fulfillment</p>
                        <p className={`text-lg font-black ${v.score >= 75 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {v.score >= 75 ? 'RELIABLE' : 'WATCH'}
                        </p>
                      </div>
                    </div>

                    <Button 
                      onClick={() => navigate(`/dashboard/vendors/${v.id}/analytics`)}
                      variant="outline" 
                      className="w-full rounded-2xl border-2 border-primary/20 hover:bg-primary hover:text-white hover:border-primary transition-all font-black text-sm py-6 shadow-sm"
                    >
                      View Full Analytics
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="w-[95vw] sm:max-w-4xl rounded-3xl p-0 overflow-hidden border-0 shadow-2xl max-h-[85vh] flex flex-col custom-scrollbar">
          <div className="bg-gradient-to-br from-primary/10 via-background to-background p-5 sm:p-6 pb-3 sm:pb-4 border-b border-border/50 shrink-0">
             <DialogTitle className="font-heading font-black text-2xl tracking-tight">Register New Vendor Partner</DialogTitle>
             <p className="text-muted-foreground text-sm font-body mt-1">Onboard a new supply chain partner to the Forgiven Shopping Centre.</p>
          </div>
          <div className="p-4 sm:p-6 overflow-y-auto">
            <VendorForm 
              onSave={data => createVendor.mutate(data)} 
              onCancel={() => setShowAdd(false)} 
              isLoading={createVendor.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editVendor} onOpenChange={v => !v && setEditVendor(null)}>
        <DialogContent className="w-[95vw] sm:max-w-4xl rounded-3xl p-0 overflow-hidden border-0 shadow-2xl max-h-[85vh] flex flex-col custom-scrollbar">
          <div className="bg-gradient-to-br from-primary/10 via-background to-background p-5 sm:p-6 pb-3 sm:pb-4 border-b border-border/50 shrink-0">
             <DialogTitle className="font-heading font-black text-2xl tracking-tight">Edit Vendor Details</DialogTitle>
             <p className="text-muted-foreground text-sm font-body mt-1">Update business identity, logistics, and payout configuration.</p>
          </div>
          <div className="p-4 sm:p-6 overflow-y-auto">
            {editVendor && (
              <VendorForm 
                vendor={editVendor} 
                onSave={data => updateVendor.mutate({ id: editVendor.id, ...data })} 
                onCancel={() => setEditVendor(null)} 
                isLoading={updateVendor.isPending}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* View Vendor Details */}
      <Dialog open={!!viewVendor} onOpenChange={v => !v && setViewVendor(null)}>
        <DialogContent className="w-[95vw] sm:max-w-4xl rounded-3xl p-0 overflow-hidden border-0 shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar">
          <div className="flex flex-col md:flex-row h-full">
            <div className="md:w-1/3 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:p-8 border-b md:border-b-0 md:border-r border-border/50 relative flex flex-col justify-center items-center text-center">
               <div className="absolute top-6 right-6">
                  {(() => { const cls = getVendorClass(viewVendor?.score); return (
                    <Badge variant="outline" className={`text-xs font-black border-2 px-4 py-1 shadow-sm ${cls.color} ${cls.bg}`}>
                      Class {cls.label}
                    </Badge>
                  ); })()}
               </div>
               <div className="w-32 h-32 rounded-[2.5rem] bg-background shadow-xl flex items-center justify-center text-6xl font-black text-primary mb-6 border-4 border-white">
                  {viewVendor?.business_name[0]}
               </div>
               <DialogTitle className="font-heading font-black text-3xl tracking-tighter mb-2">{viewVendor?.business_name}</DialogTitle>
               <p className="text-muted-foreground font-body text-sm flex items-center gap-2 mb-4">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Verified FSC Vendor
               </p>
               <div className="w-full pt-6 border-t border-border/20">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2">Member Since</p>
                  <p className="font-bold">{new Date(viewVendor?.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}</p>
               </div>
            </div>
            
            <div className="md:w-2/3 p-6 sm:p-8 flex flex-col gap-4">
              <Tabs value={viewProfileTab} onValueChange={setViewProfileTab}>
                <TabsList className="bg-muted/50 p-1 rounded-2xl border border-border/50 w-full mb-4">
                  <TabsTrigger value="details" className="flex-1 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-wider">
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="products" className="flex-1 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 justify-center">
                    <Package className="w-3 h-3" />
                    Products{vendorProfileData?.products?.length ? ` (${vendorProfileData.products.length})` : ""}
                  </TabsTrigger>
                  <TabsTrigger value="orders" className="flex-1 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 justify-center">
                    <ShoppingCart className="w-3 h-3" />
                    Orders{vendorProfileData?.orders?.length ? ` (${vendorProfileData.orders.length})` : ""}
                  </TabsTrigger>
                </TabsList>

                {/* ── Details Tab (all original content preserved) ── */}
                <TabsContent value="details" className="m-0 space-y-6 outline-none">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-3xl bg-muted/30 border border-border/50">
                      <div className="flex items-center gap-2 mb-2 text-muted-foreground"><User className="w-3.5 h-3.5" /><span className="text-[10px] uppercase font-black tracking-widest">Primary Contact</span></div>
                      <p className="font-black text-sm tracking-tight">{viewVendor?.contact_person}</p>
                    </div>
                    <div className="p-4 rounded-3xl bg-muted/30 border border-border/50">
                      <div className="flex items-center gap-2 mb-2 text-muted-foreground"><Phone className="w-3.5 h-3.5" /><span className="text-[10px] uppercase font-black tracking-widest">Contact Phone</span></div>
                      <p className="font-black text-sm tracking-tight">{viewVendor?.phone}</p>
                    </div>
                    <div className="p-4 rounded-3xl bg-muted/30 border border-border/50 col-span-2">
                      <div className="flex items-center gap-2 mb-2 text-muted-foreground"><MapPin className="w-3.5 h-3.5" /><span className="text-[10px] uppercase font-black tracking-widest">Warehouse & Logistics Address</span></div>
                      <p className="font-black text-sm tracking-tight leading-snug">{viewVendor?.address || "Not specified"}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-6 rounded-3xl bg-gold/5 border-2 border-gold/10 shadow-sm">
                      <div>
                         <p className="text-[10px] font-black uppercase text-gold/80 tracking-widest mb-1">Performance Index</p>
                         <p className="text-xs text-muted-foreground font-body max-w-[200px]">Aggregate score based on speed, reliability & fulfillment</p>
                      </div>
                      <div className="flex items-center gap-3 bg-background px-6 py-3 rounded-2xl shadow-md border border-gold/10">
                         <Star className="w-6 h-6 fill-gold text-gold" />
                         <span className="text-4xl font-heading font-black text-gold tracking-tighter">{viewVendor?.score}%</span>
                      </div>
                    </div>
                    <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10">
                      <p className="text-[10px] text-primary uppercase font-black tracking-widest mb-4">Payout Method Details</p>
                      <div className="bg-background/80 p-5 rounded-2xl border border-primary/10 shadow-inner">
                        {(() => {
                          try {
                            const payout = JSON.parse(viewVendor?.payment_details || "{}");
                            if (payout.type === 'bank') {
                              return (
                                <div className="space-y-2">
                                  <div className="flex justify-between text-xs border-b border-border/50 pb-2"><span className="text-muted-foreground">Bank</span><span className="font-bold">{payout.bank_name}</span></div>
                                  <div className="flex justify-between text-xs border-b border-border/50 pb-2"><span className="text-muted-foreground">Account #</span><span className="font-bold font-mono">{payout.account_number}</span></div>
                                  <div className="flex justify-between text-xs border-b border-border/50 pb-2"><span className="text-muted-foreground">Branch</span><span className="font-bold">{payout.branch_name}</span></div>
                                  <div className="flex justify-between text-xs pt-1"><span className="text-muted-foreground">Account Holder</span><span className="font-bold">{payout.account_holder}</span></div>
                                </div>
                              );
                            } else if (payout.type === 'mobile') {
                              return (
                                <div className="space-y-2">
                                  <div className="flex justify-between text-xs border-b border-border/50 pb-2"><span className="text-muted-foreground">Provider</span><span className="font-bold capitalize">{payout.provider}</span></div>
                                  <div className="flex justify-between text-xs border-b border-border/50 pb-2"><span className="text-muted-foreground">Mobile Number</span><span className="font-bold font-mono">{payout.phone_number}</span></div>
                                  <div className="flex justify-between text-xs pt-1"><span className="text-muted-foreground">Account Name</span><span className="font-bold">{payout.account_name}</span></div>
                                </div>
                              );
                            }
                          } catch (e) { /* Fallback to raw text */ }
                          return <p className="text-sm font-bold leading-relaxed font-body text-foreground/80">{viewVendor?.payment_details || "No payment information provided."}</p>;
                        })()}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* ── Products Tab ── */}
                <TabsContent value="products" className="m-0 outline-none">
                  {isLoadingVendorProfile ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-2xl bg-muted animate-pulse" />)}
                    </div>
                  ) : !vendorProfileData?.products?.length ? (
                    <div className="text-center py-14 text-muted-foreground">
                      <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="font-bold text-sm">No products listed</p>
                      <p className="text-xs mt-1">This vendor has no products in the catalog yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                      {vendorProfileData.products.map((product: any) => (
                        <div key={product.id} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                          <div className="w-10 h-10 rounded-xl bg-background border border-border/50 overflow-hidden flex-shrink-0">
                            {product.images?.[0] ? (
                              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-muted-foreground/40" /></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{product.name}</p>
                            <p className="text-[10px] text-muted-foreground font-body">{product.category || "Uncategorised"} · Stock: {product.stock_quantity ?? "—"}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-black text-sm text-primary">MWK {Number(product.price).toLocaleString()}</p>
                            <Badge variant={product.status === "active" ? "default" : "secondary"} className="text-[9px] font-black uppercase px-2 py-0 rounded-md mt-0.5">
                              {product.status || "active"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* ── Orders Tab ── */}
                <TabsContent value="orders" className="m-0 outline-none">
                  {isLoadingVendorProfile ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-2xl bg-muted animate-pulse" />)}
                    </div>
                  ) : !vendorProfileData?.orders?.length ? (
                    <div className="text-center py-14 text-muted-foreground">
                      <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="font-bold text-sm">No orders yet</p>
                      <p className="text-xs mt-1">Orders containing this vendor's products will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                      {vendorProfileData.orders.map((order: any) => (
                        <div key={order.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <ShoppingCart className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-bold text-sm">{order.customer_name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">#{order.id.slice(0, 8)} · {new Date(order.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-black text-sm text-primary">{order.currency} {Number(order.total).toLocaleString()}</p>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md inline-block mt-0.5 ${
                              order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                              order.status === 'shipped'   ? 'bg-primary/90 text-white' :
                              order.status === 'pending'   ? 'bg-yellow-100 text-yellow-800' :
                              order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-muted text-muted-foreground'
                            }`}>{order.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Action buttons always visible at bottom */}
              <div className="flex gap-4 pt-2 border-t border-border/30">
                <Button onClick={() => setViewVendor(null)} variant="outline" className="flex-1 rounded-2xl h-12 font-bold">Close Profile</Button>
                <Button onClick={() => { setEditVendor(viewVendor); setViewVendor(null); }} className="flex-1 rounded-2xl h-12 font-bold bg-primary shadow-lg shadow-primary/20">Edit Vendor</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function VendorForm({ vendor, onSave, onCancel, isLoading }: { vendor?: any; onSave: (data: any) => void; onCancel: () => void; isLoading?: boolean }) {
  const initialPayout = useMemo(() => {
    try {
      return JSON.parse(vendor?.payment_details || '{"type":"bank"}');
    } catch {
      return { type: 'bank', bank_name: '', account_number: '', branch_name: '', account_holder: '' };
    }
  }, [vendor]);

  const [form, setForm] = useState({
    business_name: vendor?.business_name || "",
    contact_person: vendor?.contact_person || "",
    phone: vendor?.phone || "",
    address: vendor?.address || "",
    category: vendor?.category || "",
    status: vendor?.status || "active",
    email: "",
    password: "",
  });

  const [payout, setPayout] = useState(initialPayout);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.business_name || !form.phone) return;
    if (!vendor && (!form.email || !form.password)) {
      toast({ variant: "destructive", title: "Missing Credentials", description: "Email and password are required for new vendors." });
      return;
    }
    onSave({
      ...form,
      payment_details: JSON.stringify(payout)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Identity & Logistics */}
        <div className="space-y-6">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Identity & Logistics</label>
            <div className="space-y-4">
              {!vendor && (
                <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 space-y-4 mb-2">
                   <p className="text-[10px] font-black text-primary uppercase tracking-widest px-1">Login Credentials</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground/70 uppercase px-1">Login Email *</label>
                        <Input 
                          type="email"
                          placeholder="vendor@example.com" 
                          value={form.email} 
                          onChange={e => setForm(f => ({ ...f, email: e.target.value }))} 
                          required 
                          className="font-body h-11 rounded-xl bg-background border-primary/20" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground/70 uppercase px-1">Temp Password *</label>
                        <Input 
                          type="text"
                          placeholder="Set password" 
                          value={form.password} 
                          onChange={e => setForm(f => ({ ...f, password: e.target.value }))} 
                          required 
                          className="font-body h-11 rounded-xl bg-background border-primary/20" 
                        />
                      </div>
                   </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground/70 uppercase px-1">Business Name *</label>
                <Input 
                  placeholder="e.g. Forgiven Shoes Ltd" 
                  value={form.business_name} 
                  onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} 
                  required 
                  className="font-body h-11 rounded-xl bg-muted/20 border-border/50 focus:bg-background transition-all" 
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground/70 uppercase px-1">Contact Name</label>
                  <Input 
                    placeholder="John Doe" 
                    value={form.contact_person} 
                    onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} 
                    className="font-body h-11 rounded-xl bg-muted/20 border-border/50" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground/70 uppercase px-1">Phone Number *</label>
                  <Input 
                    placeholder="+265..." 
                    value={form.phone} 
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} 
                    required 
                    className="font-body h-11 rounded-xl bg-muted/20 border-border/50" 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground/70 uppercase px-1">Warehouse Address</label>
                <Input 
                  placeholder="Blantyre, Malawi" 
                  value={form.address} 
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))} 
                  className="font-body h-11 rounded-xl bg-muted/20 border-border/50" 
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground/70 uppercase px-1">Business Category</label>
                  <Input 
                    placeholder="Shoes / Apparel" 
                    value={form.category} 
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))} 
                    className="font-body h-11 rounded-xl bg-muted/20 border-border/50" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground/70 uppercase px-1">Partnership Status</label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger className="font-body h-11 rounded-xl bg-muted/20 border-border/50"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="limited">Limited</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Payout Configuration */}
        <div className="space-y-5">
          <div className="p-5 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 shadow-sm space-y-5">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest inline-flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5" /> Payout Configuration
              </label>
              <div className="flex gap-1 bg-muted/50 p-1 rounded-xl">
                <Button 
                  type="button" 
                  variant={payout.type === 'bank' ? 'default' : 'ghost'} 
                  onClick={() => setPayout(p => ({ ...p, type: 'bank' }))}
                  className="h-7 text-[10px] font-black rounded-lg px-3"
                >BANK</Button>
                <Button 
                  type="button" 
                  variant={payout.type === 'mobile' ? 'default' : 'ghost'} 
                  onClick={() => setPayout(p => ({ ...p, type: 'mobile' }))}
                  className="h-7 text-[10px] font-black rounded-lg px-3"
                >MOBILE</Button>
              </div>
            </div>

            {payout.type === 'bank' ? (
              <div className="space-y-3 animate-in fade-in slide-in-from-right-2 duration-300">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-muted-foreground uppercase">Bank Name</label>
                  <Input 
                    placeholder="e.g. Standard Bank" 
                    value={payout.bank_name || ""} 
                    onChange={e => setPayout(p => ({ ...p, bank_name: e.target.value }))}
                    className="h-10 rounded-xl bg-background border-emerald-500/20"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted-foreground uppercase">Account Number</label>
                    <Input 
                      placeholder="012..." 
                      value={payout.account_number || ""} 
                      onChange={e => setPayout(p => ({ ...p, account_number: e.target.value }))}
                      className="h-10 rounded-xl bg-background border-emerald-500/20 font-mono font-bold text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted-foreground uppercase">Branch Name</label>
                    <Input 
                      placeholder="Blantyre" 
                      value={payout.branch_name || ""} 
                      onChange={e => setPayout(p => ({ ...p, branch_name: e.target.value }))}
                      className="h-10 rounded-xl bg-background border-emerald-500/20"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-muted-foreground uppercase">Account Holder Name</label>
                  <Input 
                    placeholder="Business or Personal Name" 
                    value={payout.account_holder || ""} 
                    onChange={e => setPayout(p => ({ ...p, account_holder: e.target.value }))}
                    className="h-10 rounded-xl bg-background border-emerald-500/20"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 animate-in fade-in slide-in-from-right-2 duration-300">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-muted-foreground uppercase">Mobile Money Provider</label>
                  <Select value={payout.provider} onValueChange={v => setPayout(p => ({ ...p, provider: v }))}>
                    <SelectTrigger className="h-10 rounded-xl bg-background border-emerald-500/20"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="airtel">Airtel Money</SelectItem>
                      <SelectItem value="mpamba">TNM Mpamba</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-muted-foreground uppercase">Mobile Number</label>
                  <Input 
                    placeholder="099..." 
                    value={payout.phone_number || ""} 
                    onChange={e => setPayout(p => ({ ...p, phone_number: e.target.value }))}
                    className="h-10 rounded-xl bg-background border-emerald-500/20 font-mono font-bold text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-muted-foreground uppercase">Registered Account Name</label>
                  <Input 
                    placeholder="Full Registered Name" 
                    value={payout.account_name || ""} 
                    onChange={e => setPayout(p => ({ ...p, account_name: e.target.value }))}
                    className="h-10 rounded-xl bg-background border-emerald-500/20"
                  />
                </div>
              </div>
            )}
            
            <div className="bg-emerald-500/10 p-4 rounded-2xl flex gap-3 items-start border border-emerald-500/20 shadow-inner">
               <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
               <p className="text-[10px] text-emerald-700/80 leading-relaxed font-bold">
                 PAYOUT SECURITY: These details are used for automated disbursement of vendor funds.
               </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 pt-4 border-t border-border/50">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1 h-12 rounded-2xl font-bold hover:bg-muted/50">Cancel</Button>
        <Button type="submit" disabled={isLoading} className="flex-[2] bg-primary text-white hover:bg-primary/90 h-12 rounded-2xl font-black shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]">
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : null}
          {vendor ? "Update Vendor Profile" : "Activate New Vendor Partnership"}
        </Button>
      </div>
    </form>
  );
}

export default VendorsPage;
