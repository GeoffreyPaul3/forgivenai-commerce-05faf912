import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { Search, Users, ExternalLink, TrendingUp, ShoppingBag, DollarSign, ShieldCheck, MapPin, Phone, Mail, Calendar, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const PAGE_SIZE = 10;

const CustomersPage = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      return data;
    }
  });

  const { data: agentId } = useQuery({
    queryKey: ["user-agent-id", profile?.id],
    enabled: profile?.role === "agent",
    queryFn: async () => {
      const { data } = await supabase.from("agents").select("id").eq("user_id", profile!.id).maybeSingle();
      return data?.id;
    }
  });

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers", profile?.role, agentId],
    enabled: !!profile,
    queryFn: async () => {
      if (profile?.role === "vendor") return []; // Vendors don't see the global customer list
      
      let query = supabase
        .from("customers")
        .select(`*, first_agent:agents!customers_first_agent_id_fkey(name)`)
        .order("created_at", { ascending: false });
      
      if (profile?.role === "agent" && agentId) {
        query = query.eq("first_agent_id", agentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
  
  const { data: customerOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["customer-orders", selectedCustomer?.id],
    enabled: !!selectedCustomer?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_id", selectedCustomer.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = (customers || []).filter(c => 
    [c.name, c.phone, c.email].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = [
    { label: "Total Customers", value: (customers || []).length, icon: Users, color: "text-[#A21D7F]" },
    { label: "Returning Customers", value: (customers || []).filter(c => c.customer_status !== 'new').length, icon: ShoppingBag, color: "text-emerald-600" },
    { label: "High Value", value: (customers || []).filter(c => c.customer_status === 'high_value').length, icon: TrendingUp, color: "text-gold" },
    { label: "Total Revenue", value: `MWK ${(customers || []).reduce((s, c) => s + (c.total_spent || 0), 0).toLocaleString()}`, icon: DollarSign, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Customer Directory</h2>
          <p className="text-muted-foreground text-sm font-body">Manage platform-owned customer relationships</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground font-body">{s.label}</span>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-heading font-bold">{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {profile?.role === "vendor" ? (
          <div className="p-12 text-center text-muted-foreground font-body">
            <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-heading font-bold text-foreground mb-2">Access Restricted</h3>
            <p className="max-w-xs mx-auto">The global customer directory is restricted to administrators and agents. View your customer data within your specific orders.</p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-border">
              <div className="relative max-w-sm">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone or email..." className="pl-9" />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>First Agent</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 6 }).map((__, j) => <TableCell key={j}><div className="h-4 rounded bg-muted animate-pulse" /></TableCell>)}</TableRow>
                )) : paginated.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No customers found.</TableCell></TableRow>
                ) : paginated.map(customer => (
                  <TableRow 
                    key={customer.id} 
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setIsDetailsOpen(true);
                    }}
                  >
                    <TableCell>
                      <div>
                        <p className="font-heading font-semibold text-foreground">{customer.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground font-body">{customer.phone} {customer.email && `• ${customer.email}`}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={customer.customer_status === 'high_value' ? 'default' : 'secondary'} className="capitalize text-xs">
                        {customer.customer_status || 'new'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-body">
                      {customer.first_agent?.name || <span className="text-muted-foreground">Direct</span>}
                    </TableCell>
                    <TableCell className="font-semibold">{customer.total_orders}</TableCell>
                    <TableCell className="font-semibold text-primary">MWK {customer.total_spent?.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(customer.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </div>

      {totalPages > 1 && (
        <Pagination><PaginationContent>
          <PaginationItem><PaginationPrevious href="#" onClick={e => { e.preventDefault(); setPage(p => Math.max(1, p - 1)); }} /></PaginationItem>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <PaginationItem key={p}><PaginationLink href="#" isActive={p === page} onClick={e => { e.preventDefault(); setPage(p); }}>{p}</PaginationLink></PaginationItem>
          ))}
          <PaginationItem><PaginationNext href="#" onClick={e => { e.preventDefault(); setPage(p => Math.min(totalPages, p + 1)); }} /></PaginationItem>
        </PaginationContent></Pagination>
      )}

      {/* Customer Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl h-[85vh] p-0 overflow-hidden bg-card border-border rounded-3xl">
          <DialogHeader className="p-6 bg-muted/20 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                {selectedCustomer?.name?.[0] || "?"}
              </div>
              <div>
                <DialogTitle className="text-2xl font-heading font-bold text-foreground">
                  {selectedCustomer?.name || "Unknown Customer"}
                </DialogTitle>
                <div className="flex items-center gap-3 mt-1">
                  <Badge variant="outline" className="text-[10px] font-bold bg-primary/5 text-primary border-primary/20 uppercase tracking-widest">
                    {selectedCustomer?.customer_status || 'new'}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-body flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Joined {selectedCustomer && new Date(selectedCustomer.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 h-[calc(85vh-88px)] min-h-0">
            {/* Left Sidebar: Profile Details */}
            <ScrollArea className="border-r border-border bg-muted/5">
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Profile Information</h4>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Phone className="w-4 h-4 text-primary mt-0.5" />
                      <div>
                        <p className="text-[10px] text-muted-foreground font-bold">PHONE</p>
                        <p className="text-sm font-body font-medium">{selectedCustomer?.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail className="w-4 h-4 text-primary mt-0.5" />
                      <div>
                        <p className="text-[10px] text-muted-foreground font-bold">EMAIL</p>
                        <p className="text-sm font-body font-medium">{selectedCustomer?.email || "No email provided"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-primary mt-0.5" />
                      <div>
                        <p className="text-[10px] text-muted-foreground font-bold">LOCATION</p>
                        <p className="text-sm font-body font-medium">{selectedCustomer?.location || "Not specified"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="bg-border/50" />

                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Lifetime Summary</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-4 rounded-2xl bg-background border border-border">
                      <p className="text-[10px] text-muted-foreground font-bold">TOTAL SPENT</p>
                      <p className="text-xl font-heading font-black text-primary">MWK {selectedCustomer?.total_spent?.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-background border border-border">
                      <p className="text-[10px] text-muted-foreground font-bold">TOTAL ORDERS</p>
                      <p className="text-xl font-heading font-black text-foreground">{selectedCustomer?.total_orders}</p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Right Side: Order History */}
            <div className="col-span-2 flex flex-col min-h-0 bg-background">
              <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Order History</h4>
                <Badge variant="secondary" className="text-[10px]">
                  {customerOrders?.length || 0} Transactions
                </Badge>
              </div>
              <ScrollArea className="flex-1 overflow-y-auto">
                <div className="p-6">
                  {ordersLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
                      ))}
                    </div>
                  ) : !customerOrders || customerOrders.length === 0 ? (
                    <div className="text-center py-20">
                      <ShoppingBag className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                      <p className="text-muted-foreground font-body">No orders recorded yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {customerOrders.map((order) => (
                        <div key={order.id} className="p-4 rounded-2xl border border-border bg-card/50 hover:border-primary/20 transition-all group">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</span>
                              <Badge 
                                className="text-[9px] font-black uppercase tracking-widest"
                                variant={order.status === 'delivered' ? 'default' : 'secondary'}
                              >
                                {order.status}
                              </Badge>
                            </div>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-body">
                              <Clock className="w-3 h-3" /> {new Date(order.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex -space-x-2 overflow-hidden">
                              {(order.items as any[])?.slice(0, 3).map((item, i) => (
                                <div key={i} className="w-8 h-8 rounded-lg border-2 border-background bg-muted flex items-center justify-center overflow-hidden">
                                  {item.image ? (
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <ShoppingBag className="w-3 h-3 text-muted-foreground" />
                                  )}
                                </div>
                              ))}
                              {(order.items as any[])?.length > 3 && (
                                <div className="w-8 h-8 rounded-lg border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                  +{(order.items as any[]).length - 3}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground font-body">Total Amount</p>
                              <p className="text-sm font-bold text-primary">MWK {order.total?.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomersPage;
