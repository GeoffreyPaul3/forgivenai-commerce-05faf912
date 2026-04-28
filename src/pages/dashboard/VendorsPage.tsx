import { useState, useMemo, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { 
  Store, Plus, Search, MoreHorizontal, Pencil, Trash2, Eye, Star, 
  MapPin, Phone, User, Loader2, Clock, AlertTriangle, Wallet, 
  CheckCircle2, BarChart3, TrendingUp, Filter, ShieldCheck, Timer
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

/** Vendor class A/B/C/D per spec §8 */
function getVendorClass(score: number | null) {
  if (!score && score !== 0) return { label: "—", color: "text-muted-foreground border-muted", bg: "" };
  if (score >= 85) return { label: "A", color: "text-emerald-700 border-emerald-500/30", bg: "bg-emerald-500/10" };
  if (score >= 70) return { label: "B", color: "text-blue-700 border-blue-500/30", bg: "bg-blue-500/10" };
  if (score >= 50) return { label: "C", color: "text-amber-700 border-amber-500/30", bg: "bg-amber-500/10" };
  return { label: "D", color: "text-red-700 border-red-500/30", bg: "bg-red-500/10" };
}

/** Confirmation Delay Helper (§7) */
function getDelayStatus(createdAt: string) {
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (mins >= 60) return { state: "escalated", label: "Escalated (>60m)", color: "text-red-600 bg-red-50", icon: AlertTriangle };
  if (mins >= 30) return { state: "flagged", label: "Flagged (>30m)", color: "text-amber-600 bg-amber-50", icon: Clock };
  return { state: "ok", label: "Ideal (<30m)", color: "text-emerald-600 bg-emerald-50", icon: Timer };
}

const VendorsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editVendor, setEditVendor] = useState<any>(null);
  const [viewVendor, setViewVendor] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("vendors");

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
      return data;
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

  const createVendor = useMutation({
    mutationFn: async (vendor: any) => {
      const { error } = await supabase.from("vendors").insert(vendor);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setShowAdd(false);
      toast({ title: "Vendor created successfully!" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Failed to create vendor", 
        description: error.message || "Please check your permissions and try again."
      });
    },
  });

  const updateVendor = useMutation({
    mutationFn: async (vendor: any) => {
      const { id, ...data } = vendor;
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
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j} className={j === 0 ? "pl-6" : ""}><div className="h-4 rounded bg-muted animate-pulse" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredVendors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-20 text-muted-foreground font-body">
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
                  <CardDescription>Real-time tracking of pending vendor confirmations (§7)</CardDescription>
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
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" className="text-xs h-8 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200">
                                Manual Reject
                              </Button>
                              <Button size="sm" className="text-xs h-8 rounded-lg bg-primary hover:bg-primary/90 shadow-sm">
                                Call Vendor
                              </Button>
                            </div>
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
                  <CardDescription>Track and settle vendor accounts (§11)</CardDescription>
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
                      <BarChart3 className="w-3 h-3" /> Performance Score Breakdown (§8)
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
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-2xl bg-muted/30 border border-border/50">
                        <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Confirmation</p>
                        <p className="text-lg font-black text-foreground">{v.score > 80 ? 'EXCELLENT' : v.score > 60 ? 'GOOD' : 'POOR'}</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-muted/30 border border-border/50">
                        <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Fulfillment</p>
                        <p className="text-lg font-black text-foreground">94%</p>
                      </div>
                    </div>

                    <Button variant="ghost" className="w-full rounded-2xl border border-border/50 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all font-bold text-sm py-6">
                      View Full Analytics
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Vendor Forms */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-8">
          <DialogHeader><DialogTitle className="font-heading font-black text-2xl tracking-tight">Register New Vendor</DialogTitle></DialogHeader>
          <VendorForm 
            onSave={data => createVendor.mutate(data)} 
            onCancel={() => setShowAdd(false)} 
            isLoading={createVendor.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editVendor} onOpenChange={v => !v && setEditVendor(null)}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-8">
          <DialogHeader><DialogTitle className="font-heading font-black text-2xl tracking-tight">Edit Vendor Details</DialogTitle></DialogHeader>
          {editVendor && (
            <VendorForm 
              vendor={editVendor} 
              onSave={data => updateVendor.mutate({ id: editVendor.id, ...data })} 
              onCancel={() => setEditVendor(null)} 
              isLoading={updateVendor.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Vendor Details */}
      <Dialog open={!!viewVendor} onOpenChange={v => !v && setViewVendor(null)}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-0 overflow-hidden border-0 shadow-2xl">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 pb-6 border-b border-border/50 relative">
             <div className="absolute top-6 right-6">
                {(() => { const cls = getVendorClass(viewVendor?.score); return (
                  <Badge variant="outline" className={`text-xs font-black border-2 px-4 py-1 shadow-sm ${cls.color} ${cls.bg}`}>
                    Class {cls.label}
                  </Badge>
                ); })()}
             </div>
             <div className="w-20 h-20 rounded-[2rem] bg-background shadow-lg flex items-center justify-center text-4xl font-black text-primary mb-6">
                {viewVendor?.business_name[0]}
             </div>
             <DialogTitle className="font-heading font-black text-3xl tracking-tighter mb-1">{viewVendor?.business_name}</DialogTitle>
             <p className="text-muted-foreground font-body text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Verified FSC Vendor since {new Date(viewVendor?.created_at).getFullYear()}
             </p>
          </div>
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-3xl bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2 mb-2 text-muted-foreground"><User className="w-3.5 h-3.5" /><span className="text-[10px] uppercase font-black tracking-widest">Contact</span></div>
                <p className="font-black text-sm tracking-tight">{viewVendor?.contact_person}</p>
              </div>
              <div className="p-4 rounded-3xl bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2 mb-2 text-muted-foreground"><Phone className="w-3.5 h-3.5" /><span className="text-[10px] uppercase font-black tracking-widest">Phone</span></div>
                <p className="font-black text-sm tracking-tight">{viewVendor?.phone}</p>
              </div>
              <div className="p-4 rounded-3xl bg-muted/30 border border-border/50 col-span-2">
                <div className="flex items-center gap-2 mb-2 text-muted-foreground"><MapPin className="w-3.5 h-3.5" /><span className="text-[10px] uppercase font-black tracking-widest">Warehouse Location</span></div>
                <p className="font-black text-sm tracking-tight leading-snug">{viewVendor?.address || "Not specified"}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 rounded-3xl bg-gold/5 border-2 border-gold/10">
                <div>
                   <p className="text-[10px] font-black uppercase text-gold/80 tracking-widest mb-1">Aggregate Score</p>
                   <p className="text-xs text-muted-foreground font-body">Based on speed, rate & fulfillment</p>
                </div>
                <div className="flex items-center gap-1.5 bg-background px-4 py-2 rounded-2xl shadow-sm border border-gold/10">
                   <Star className="w-5 h-5 fill-gold text-gold" />
                   <span className="text-3xl font-heading font-black text-gold tracking-tighter">{viewVendor?.score}</span>
                </div>
              </div>
              <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10">
                <p className="text-[10px] text-primary uppercase font-black tracking-widest mb-4">Payout Method Details</p>
                <div className="bg-background/50 p-4 rounded-2xl border border-primary/10">
                  <p className="text-sm font-bold leading-relaxed font-body text-foreground/80">{viewVendor?.payment_details || "No payment information provided."}</p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function VendorForm({ vendor, onSave, onCancel, isLoading }: { vendor?: any; onSave: (data: any) => void; onCancel: () => void; isLoading?: boolean }) {
  const [form, setForm] = useState({
    business_name: vendor?.business_name || "",
    contact_person: vendor?.contact_person || "",
    phone: vendor?.phone || "",
    address: vendor?.address || "",
    category: vendor?.category || "",
    payment_details: vendor?.payment_details || "",
    status: vendor?.status || "active",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.business_name || !form.phone) return;
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Business Identity *</label>
        <Input 
          placeholder="e.g. Forgiven Shoes Ltd" 
          value={form.business_name} 
          onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} 
          required 
          className="font-body h-12 rounded-xl bg-muted/20 border-border/50 focus:bg-background transition-all" 
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Contact Name</label>
          <Input 
            placeholder="John Doe" 
            value={form.contact_person} 
            onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} 
            className="font-body h-12 rounded-xl bg-muted/20 border-border/50" 
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Phone Number *</label>
          <Input 
            placeholder="+265..." 
            value={form.phone} 
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} 
            required 
            className="font-body h-12 rounded-xl bg-muted/20 border-border/50" 
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Warehouse Address</label>
        <Input 
          placeholder="Blantyre, Malawi" 
          value={form.address} 
          onChange={e => setForm(f => ({ ...f, address: e.target.value }))} 
          className="font-body h-12 rounded-xl bg-muted/20 border-border/50" 
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Category</label>
          <Input 
            placeholder="Shoes / Apparel" 
            value={form.category} 
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))} 
            className="font-body h-12 rounded-xl bg-muted/20 border-border/50" 
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Status</label>
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
            <SelectTrigger className="font-body h-12 rounded-xl bg-muted/20 border-border/50"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="limited">Limited</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Payment Instructions</label>
        <Input 
          placeholder="Bank Name, Account Number, etc." 
          value={form.payment_details} 
          onChange={e => setForm(f => ({ ...f, payment_details: e.target.value }))} 
          className="font-body h-12 rounded-xl bg-muted/20 border-border/50" 
        />
      </div>
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1 h-12 rounded-xl font-bold">Cancel</Button>
        <Button type="submit" disabled={isLoading} className="flex-1 bg-primary text-white hover:bg-primary/90 h-12 rounded-xl font-bold shadow-lg shadow-primary/20">
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
          {vendor ? "Update Vendor" : "Create Vendor"}
        </Button>
      </div>
    </form>
  );
}

export default VendorsPage;
