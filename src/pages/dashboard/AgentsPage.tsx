import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, Plus, Copy, DollarSign, TrendingUp, Search, 
  MoreHorizontal, Pencil, Trash2, Eye, UserCheck, 
  UserX, Wallet, CheckCircle2, Clock, Timer
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tables } from "@/integrations/supabase/types";
import { motion } from "framer-motion";

type Agent = Tables<"agents">;
const PAGE_SIZE = 8;

const AgentsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [deleteAgent, setDeleteAgent] = useState<Agent | null>(null);
  const [viewAgent, setViewAgent] = useState<Agent | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("agents");

  const { data: agents, isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agents").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Agent[];
    },
  });

  const { data: orders } = useQuery({
    queryKey: ["agent-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("agent_id, total, status, is_first_order, surplus_profit, created_at");
      return data || [];
    },
  });

  const { data: commissions } = useQuery({
    queryKey: ["all-commissions"],
    queryFn: async () => {
      const { data } = await supabase.from("commissions").select("*");
      return data || [];
    },
  });

  const { data: customers } = useQuery({
    queryKey: ["all-customers"],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("first_agent_id");
      return data || [];
    },
  });

  const { data: payouts } = useQuery({
    queryKey: ["admin-all-agent-payouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_payouts")
        .select("*, agents(name, payment_details)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createAgent = useMutation({
    mutationFn: async (agent: any) => {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: agent.email,
          password: agent.password,
          full_name: agent.name,
          role: 'agent',
          phone: agent.phone
        }
      });
      if (error) throw error;
      
      const userId = data.user.id;
      const { error: updateError } = await supabase.from("agents")
        .update({
          referral_code: agent.referral_code,
          commission_rate: agent.commission_rate,
          national_id: agent.national_id,
          emergency_contact: agent.emergency_contact,
          location: agent.location
        })
        .eq("user_id", userId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      setShowAdd(false);
      toast({ title: "Agent registered! 🚀", description: "Login credentials have been sent to their email." });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Registration Failed", 
        description: error.message || "Please check your permissions and try again."
      });
    },
  });

  const updateAgent = useMutation({
    mutationFn: async (agent: Partial<Agent> & { id: string }) => {
      const { error } = await supabase.from("agents").update(agent).eq("id", agent.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      setEditAgent(null);
      toast({ title: "Agent updated!" });
    },
  });

  const deleteAgentMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      setDeleteAgent(null);
      toast({ title: "Agent removed" });
    },
  });

  const updatePayoutStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("agent_payouts").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-agent-payouts"] });
      toast({ title: "Payout status updated!" });
    },
  });

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "FGV-";
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  };

  // Calculate real commissions and stats from DB
  const agentStats = useMemo(() => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const stats: Record<string, { sales: number; monthlySales: number; commission: number; surplus: number; orderCount: number; customerCount: number }> = {};
    for (const agent of agents || []) {
      const agentOrders = orders?.filter(o => o.agent_id === agent.id && o.status !== "cancelled") || [];
      const agentCommissions = commissions?.filter(c => c.agent_id === agent.id) || [];
      const agentCustomers = customers?.filter(c => c.first_agent_id === agent.id) || [];
      
      const totalSales = agentOrders.reduce((s, o) => s + (o.total || 0), 0);
      const monthlySales = agentOrders
        .filter(o => o.status === "delivered" && new Date(o.created_at) >= startOfMonth)
        .reduce((s, o) => s + (o.total || 0), 0);
      
      const totalComm = agentCommissions.reduce((s, c) => s + (c.amount || 0), 0);
      const totalSurplus = agentOrders.reduce((s, o) => s + (o.surplus_profit || 0), 0);

      stats[agent.id] = {
        sales: totalSales,
        monthlySales,
        commission: totalComm,
        surplus: totalSurplus,
        orderCount: agentOrders.length,
        customerCount: agentCustomers.length,
      };
    }
    return stats;
  }, [agents, orders, commissions, customers]);

  const totalSales = Object.values(agentStats).reduce((s, a) => s + a.sales, 0);
  const totalCommission = Object.values(agentStats).reduce((s, a) => s + a.commission, 0);

  const filteredAgents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return agents || [];
    return (agents || []).filter(a =>
      [a.name, a.phone, a.email, a.referral_code].filter(Boolean).join(" ").toLowerCase().includes(term)
    );
  }, [agents, search]);

  useEffect(() => { setPage(1); }, [search]);
  const totalPages = Math.max(1, Math.ceil(filteredAgents.length / PAGE_SIZE));
  const paginatedAgents = filteredAgents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60 tracking-tight">Agents & Referrals</h2>
          <p className="text-muted-foreground text-sm font-body tracking-tight">Manage your influencer network and commissions.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAdd(true)} className="gap-2 bg-primary hover:bg-primary/90 rounded-xl px-6 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" /> Add Agent
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="bg-muted/50 p-1 rounded-2xl border border-border/50">
            <TabsTrigger value="agents" className="rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">Agents</TabsTrigger>
            <TabsTrigger value="payouts" className="rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm flex gap-2 items-center">
              Payouts
              {payouts?.some(p => p.status === 'pending') && (
                <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </TabsTrigger>
          </TabsList>
          
          <div className="relative max-w-sm hidden md:block">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search network..." 
              className="pl-9 bg-card border-border/50 rounded-xl h-10 w-[240px] focus:w-[320px] transition-all" 
            />
          </div>
        </div>

        <TabsContent value="agents" className="m-0 space-y-6 outline-none">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Agents", value: agents?.length || 0, icon: Users, color: "text-primary", bg: "bg-primary/5", border: "border-primary/20" },
              { label: "Active", value: agents?.filter(a => a.status === "active").length || 0, icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-600/5", border: "border-emerald-600/20" },
              { label: "Total Sales", value: `MWK ${totalSales.toLocaleString()}`, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-600/5", border: "border-blue-600/20" },
              { label: "Unpaid Payouts", value: payouts?.filter(p => p.status === 'pending').length || 0, icon: Wallet, color: "text-gold", bg: "bg-gold/5", border: "border-gold/20" },
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
            <div className="p-4 border-b border-border/50 md:hidden">
              <div className="relative">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agents..." className="pl-9 rounded-xl" />
              </div>
            </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Agents</TableHead>
              <TableHead>Referral Code</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Customers</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Monthly Sales</TableHead>
              <TableHead>Total Sales</TableHead>
              <TableHead>Surplus Pool</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 8 }).map((__, j) => <TableCell key={j}><div className="h-4 rounded bg-muted animate-pulse" /></TableCell>)}</TableRow>
            )) : paginatedAgents.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground font-body">
                <Users className="w-8 h-8 mx-auto mb-3 opacity-30" />No agents found.
              </TableCell></TableRow>
            ) : paginatedAgents.map(agent => {
              const stats = agentStats[agent.id] || { sales: 0, commission: 0, orderCount: 0, customerCount: 0 };
              return (
                <TableRow key={agent.id} className="group">
                  <TableCell>
                    <div>
                      <p className="font-heading font-semibold text-foreground">{agent.name}</p>
                      <p className="text-xs text-muted-foreground font-body">{agent.phone || agent.email || "No contact"}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1">
                      <code className="text-sm font-mono text-foreground">{agent.referral_code}</code>
                      <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => { navigator.clipboard.writeText(agent.referral_code); toast({ title: "Copied!" }); }}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{agent.commission_rate || 0}%</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{stats.customerCount}</Badge></TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{stats.orderCount}</Badge></TableCell>
                  <TableCell className="font-semibold text-xs">MWK {stats.monthlySales.toLocaleString()}</TableCell>
                  <TableCell className="font-semibold text-xs">MWK {stats.sales.toLocaleString()}</TableCell>
                  <TableCell className="text-emerald-600 font-bold text-xs">MWK {Math.round(stats.surplus).toLocaleString()}</TableCell>
                  <TableCell className="text-gold font-semibold text-xs">MWK {Math.round(stats.commission).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={agent.status === "active" ? "default" : "secondary"} className="capitalize text-xs">{agent.status || "inactive"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => setViewAgent(agent)}><Eye className="w-4 h-4 mr-2" />View</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditAgent(agent)}><Pencil className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={async () => {
                          const newStatus = agent.status === "active" ? "inactive" : "active";
                          await updateAgent.mutateAsync({ id: agent.id, status: newStatus });
                        }}>
                          {agent.status === "active" ? <UserX className="w-4 h-4 mr-2" /> : <UserCheck className="w-4 h-4 mr-2" />}
                          {agent.status === "active" ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteAgent(agent)}>
                          <Trash2 className="w-4 h-4 mr-2" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination className="mt-6"><PaginationContent>
          <PaginationItem><PaginationPrevious href="#" onClick={e => { e.preventDefault(); setPage(p => Math.max(1, p - 1)); }} /></PaginationItem>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <PaginationItem key={p}><PaginationLink href="#" isActive={p === page} onClick={e => { e.preventDefault(); setPage(p); }}>{p}</PaginationLink></PaginationItem>
          ))}
          <PaginationItem><PaginationNext href="#" onClick={e => { e.preventDefault(); setPage(p => Math.min(totalPages, p + 1)); }} /></PaginationItem>
        </PaginationContent></Pagination>
      )}
        </TabsContent>

        <TabsContent value="payouts" className="m-0 space-y-6 outline-none">
          <Card className="rounded-3xl border-border/50 bg-card overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-heading text-xl font-bold flex gap-2 items-center">
                    <Wallet className="w-5 h-5 text-emerald-500" /> Agent Payout Management
                  </CardTitle>
                  <CardDescription>Review and settle commission withdrawal requests</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10 border-0">
                    <TableHead className="pl-6">Agent</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Requested On</TableHead>
                    <TableHead>Payout Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!payouts || payouts.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20 text-muted-foreground font-body">
                        <Wallet className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-bold">No payouts recorded</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    payouts.map(p => {
                      let paymentInfo = "Not configured";
                      try {
                        const d = JSON.parse((p.agents as any)?.payment_details || "{}");
                        if (d.type === 'bank') paymentInfo = `${d.bank_name}: ${d.account_number}`;
                        if (d.type === 'mobile') paymentInfo = `${d.provider}: ${d.phone_number}`;
                      } catch(e) {}
                      
                      return (
                        <TableRow key={p.id} className="hover:bg-muted/30 transition-colors border-b border-border/50">
                          <TableCell className="pl-6">
                            <p className="font-bold text-sm">{(p.agents as any)?.name}</p>
                          </TableCell>
                          <TableCell className="font-mono font-black text-emerald-600">
                            MWK {(p.amount || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(p.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-xs font-medium max-w-[200px] truncate">
                            {paymentInfo}
                          </TableCell>
                          <TableCell>
                            <Badge variant={p.status === 'paid' ? 'default' : 'outline'} className={`font-black text-[10px] uppercase px-3 ${p.status === 'paid' ? 'bg-emerald-500' : 'text-amber-500 border-amber-200'}`}>
                              {p.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            {p.status === 'pending' && (
                              <div className="flex justify-end gap-2">
                                <Button 
                                  size="sm" 
                                  onClick={() => updatePayoutStatus.mutate({ id: p.id, status: 'paid' })}
                                  className="bg-emerald-500 hover:bg-emerald-600 h-8 rounded-lg font-bold text-xs"
                                >
                                  Mark Paid
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => updatePayoutStatus.mutate({ id: p.id, status: 'rejected' })}
                                  className="text-red-500 hover:bg-red-50 h-8 rounded-lg font-bold text-xs"
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
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
      </Tabs>

      {/* View Agent */}
      <Dialog open={!!viewAgent} onOpenChange={v => !v && setViewAgent(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">{viewAgent?.name}</DialogTitle></DialogHeader>
          {viewAgent && (() => {
            const stats = agentStats[viewAgent.id] || { sales: 0, commission: 0, orderCount: 0, customerCount: 0 };
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] text-muted-foreground uppercase">Phone</p><p className="font-semibold text-sm">{viewAgent.phone || "—"}</p></div>
                  <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] text-muted-foreground uppercase">Email</p><p className="font-semibold text-sm truncate">{viewAgent.email || "—"}</p></div>
                  <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] text-muted-foreground uppercase">Referral Code</p><p className="font-mono font-semibold text-sm">{viewAgent.referral_code}</p></div>
                  <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] text-muted-foreground uppercase">Commission Rate</p><p className="font-semibold text-sm">{viewAgent.commission_rate}%</p></div>
                  
                  <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] text-muted-foreground uppercase">National ID</p><p className="font-semibold text-sm">{(viewAgent as any).national_id || "—"}</p></div>
                  <div className="rounded-lg bg-muted/50 p-3"><p className="text-[10px] text-muted-foreground uppercase">Location</p><p className="font-semibold text-sm">{(viewAgent as any).location || "—"}</p></div>
                  <div className="rounded-lg bg-muted/50 p-3 sm:col-span-2"><p className="text-[10px] text-muted-foreground uppercase">Emergency Contact</p><p className="font-semibold text-sm">{(viewAgent as any).emergency_contact || "—"}</p></div>

                  <div className="rounded-lg bg-primary/5 p-3"><p className="text-[10px] text-muted-foreground uppercase">Total Sales</p><p className="font-heading font-bold text-lg">MWK {stats.sales.toLocaleString()}</p></div>
                  <div className="rounded-lg bg-gold/5 p-3"><p className="text-[10px] text-muted-foreground uppercase">Commission Earned</p><p className="font-heading font-bold text-lg text-gold">MWK {Math.round(stats.commission).toLocaleString()}</p></div>
                </div>
                <p className="text-[10px] text-muted-foreground">Joined {new Date(viewAgent.created_at).toLocaleDateString()}</p>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Edit Agent */}
      <Dialog open={!!editAgent} onOpenChange={v => !v && setEditAgent(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">Edit Agent</DialogTitle></DialogHeader>
          {editAgent && <EditAgentForm agent={editAgent} onSave={d => updateAgent.mutate(d)} />}
        </DialogContent>
      </Dialog>

      {/* Delete Agent */}
      <AlertDialog open={!!deleteAgent} onOpenChange={v => !v && setDeleteAgent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Delete agent?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove "{deleteAgent?.name}".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteAgent && deleteAgentMut.mutate(deleteAgent.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Agent */}
      <Dialog open={showAdd} onOpenChange={v => !v && setShowAdd(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">Register Agent</DialogTitle></DialogHeader>
          <AddAgentForm onSave={a => createAgent.mutate(a)} generateCode={generateCode} isLoading={createAgent.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

function AddAgentForm({ onSave, generateCode, isLoading }: { onSave: (a: any) => void; generateCode: () => string; isLoading?: boolean }) {
  const [form, setForm] = useState({ 
    name: "", phone: "", email: "", password: "", 
    referral_code: generateCode(), commission_rate: "8",
    national_id: "", emergency_contact: "", location: ""
  });
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-3">
        <p className="text-[10px] font-black text-primary uppercase tracking-widest">Login Credentials</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input type="email" placeholder="Login Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="bg-background" required />
          <Input placeholder="Temp Password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="bg-background" required />
        </div>
      </div>
      <div className="space-y-3">
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Agent Details</p>
        <Input placeholder="Agent Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        <Input placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
        <div className="flex gap-2">
          <Input placeholder="Referral Code" value={form.referral_code} onChange={e => setForm(f => ({ ...f, referral_code: e.target.value }))} required />
          <Button variant="outline" onClick={() => setForm(f => ({ ...f, referral_code: generateCode() }))}>Generate</Button>
        </div>
        <Input placeholder="Commission Rate (%)" type="number" value={form.commission_rate} onChange={e => setForm(f => ({ ...f, commission_rate: e.target.value }))} />
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Mandatory Verification (Stage 2)</p>
        <Input placeholder="National ID Number" value={form.national_id} onChange={e => setForm(f => ({ ...f, national_id: e.target.value }))} required />
        <Input placeholder="Location / Address" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} required />
        <Input placeholder="Emergency Contact (Name & Phone)" value={form.emergency_contact} onChange={e => setForm(f => ({ ...f, emergency_contact: e.target.value }))} required />
      </div>

      <Button className="w-full" disabled={isLoading || !form.name || !form.referral_code || !form.email || !form.password || !form.national_id} onClick={() => onSave({ ...form, commission_rate: parseFloat(form.commission_rate) || 10 })}>
        {isLoading ? "Registering..." : "Register Agent"}
      </Button>
    </div>
  );
}

function EditAgentForm({ agent, onSave }: { agent: Agent; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    name: agent.name, phone: agent.phone || "", email: agent.email || "",
    commission_rate: String(agent.commission_rate || 10), status: agent.status || "active",
  });
  return (
    <div className="space-y-3">
      <Input placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      <Input placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
      <Input placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
      <Input placeholder="Commission Rate (%)" type="number" value={form.commission_rate} onChange={e => setForm(f => ({ ...f, commission_rate: e.target.value }))} />
      <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>
      <Button className="w-full" onClick={() => onSave({ id: agent.id, ...form, commission_rate: parseFloat(form.commission_rate) || 10 })}>Save Changes</Button>
    </div>
  );
}

export default AgentsPage;
