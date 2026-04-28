import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Package, Clock, Truck, CheckCircle, DollarSign, AlertTriangle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Order = Tables<"orders">;

/** Returns delay state for pending orders (spec §7) */
function getConfirmDelay(order: Order): { mins: number; state: "ok" | "flagged" | "escalated" } | null {
  if ((order as any).vendor_confirmation_status !== 'pending' && order.status !== 'pending') return null;
  const mins = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
  if (mins >= 60) return { mins, state: "escalated" };
  if (mins >= 30) return { mins, state: "flagged" };
  return { mins, state: "ok" };
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-200 text-green-900",
  cancelled: "bg-red-100 text-red-800",
};

const statusSteps = ["pending", "confirmed", "paid", "processing", "shipped", "delivered"];

const OrdersPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      return data;
    }
  });

  const { data: vendorId } = useQuery({
    queryKey: ["user-vendor-id", profile?.id],
    enabled: profile?.role === "vendor",
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("id").eq("user_id", profile!.id).maybeSingle();
      return data?.id;
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

  const { data: myProducts } = useQuery({
    queryKey: ["vendor-products", vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id").eq("vendor_id", vendorId!);
      return (data || []).map(p => p.id);
    }
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", search, statusFilter, profile?.role, vendorId, agentId, myProducts],
    enabled: !!profile,
    queryFn: async () => {
      let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
      
      if (search) q = q.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      
      if (profile?.role === "agent" && agentId) {
        q = q.eq("agent_id", agentId);
      }
      
      const { data, error } = await q;
      if (error) throw error;
      
      let filtered = data || [];
      if (profile?.role === "vendor" && myProducts) {
        filtered = filtered.filter((o: any) => 
          (o.items as any[]).some(item => myProducts.includes(item.product_id))
        );
      }
      
      return filtered as Order[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "Order status updated" });
    },
  });

  const createOrder = useMutation({
    mutationFn: async (order: any) => {
      const { error } = await supabase.from("orders").insert(order);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setShowAdd(false);
      toast({ title: "Order created" });
    },
  });

  const totalRevenue = orders?.filter(o => o.status === "paid" || o.status === "delivered").reduce((sum, o) => sum + (o.total || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Orders</h2>
          <p className="text-muted-foreground text-sm font-body">{orders?.length || 0} total orders</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus className="w-4 h-4" /> New Order</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Orders", value: orders?.length || 0, icon: Package },
          { label: "Pending", value: orders?.filter(o => o.status === "pending").length || 0, icon: Clock },
          { label: "Shipped", value: orders?.filter(o => o.status === "shipped").length || 0, icon: Truck },
          { label: "Revenue", value: `MWK ${totalRevenue.toLocaleString()}`, icon: DollarSign },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground font-body">{s.label}</span>
              <s.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-xl font-heading font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statusSteps.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl border animate-pulse bg-card" />)}</div>
      ) : (
        <div className="space-y-3">
          {orders?.map(order => (
            <div key={order.id} className="rounded-xl border border-border bg-card p-4 hover:border-gold/20 transition-colors cursor-pointer" onClick={() => setSelectedOrder(order)}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-heading text-sm font-semibold">{order.customer_name || "Unknown Customer"}</h4>
                  <p className="text-xs text-muted-foreground font-body">{order.customer_phone || order.customer_email || "No contact"} • {order.channel} • {new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Confirmation delay flag — spec §7 & §13 */}
                  {(() => {
                    const delay = getConfirmDelay(order);
                    if (!delay || delay.state === "ok") return null;
                    return (
                      <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        delay.state === "escalated"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        <AlertTriangle className="w-3 h-3" />
                        {delay.state === "escalated" ? `${delay.mins}m – Escalate` : `${delay.mins}m – Delayed`}
                      </span>
                    );
                  })()}
                  <span className="text-sm font-semibold font-body">{order.currency} {order.total.toLocaleString()}</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${statusColors[order.status || "pending"]}`}>{order.status}</span>
                </div>
              </div>
            </div>
          ))}
          {(!orders || orders.length === 0) && (
            <div className="text-center py-12 text-muted-foreground font-body">
              <Package className="w-8 h-8 mx-auto mb-3" />
              No orders yet. Orders from WhatsApp and web will appear here.
            </div>
          )}
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={v => !v && setSelectedOrder(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">Order Details</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Customer:</span> {selectedOrder.customer_name}</div>
                <div><span className="text-muted-foreground">Phone:</span> {selectedOrder.customer_phone}</div>
                <div><span className="text-muted-foreground">Channel:</span> {selectedOrder.channel}</div>
                <div><span className="text-muted-foreground">Total:</span> {selectedOrder.currency} {selectedOrder.total.toLocaleString()}</div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Update Status:</p>
                <div className="flex flex-wrap gap-2">
                  {statusSteps.map(s => (
                    <Button key={s} size="sm" variant={selectedOrder.status === s ? "default" : "outline"} onClick={() => { updateStatus.mutate({ id: selectedOrder.id, status: s }); setSelectedOrder({ ...selectedOrder, status: s }); }} className="text-xs capitalize">{s}</Button>
                  ))}
                </div>
              </div>
              {selectedOrder.notes && <p className="text-sm text-muted-foreground">Notes: {selectedOrder.notes}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Order Dialog */}
      <Dialog open={showAdd} onOpenChange={v => !v && setShowAdd(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">Create Order</DialogTitle></DialogHeader>
          <AddOrderForm onSave={o => createOrder.mutate(o)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

function AddOrderForm({ onSave }: { onSave: (o: any) => void }) {
  const [form, setForm] = useState({ customer_name: "", customer_phone: "", total: "", channel: "web", notes: "" });
  return (
    <div className="space-y-3">
      <Input placeholder="Customer Name" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
      <Input placeholder="Phone" value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} />
      <Input placeholder="Total Amount" type="number" value={form.total} onChange={e => setForm(f => ({ ...f, total: e.target.value }))} />
      <Select value={form.channel} onValueChange={v => setForm(f => ({ ...f, channel: v }))}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="web">Web</SelectItem>
          <SelectItem value="whatsapp">WhatsApp</SelectItem>
          <SelectItem value="agent">Agent</SelectItem>
        </SelectContent>
      </Select>
      <Input placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      <Button className="w-full" onClick={() => onSave({ ...form, total: parseFloat(form.total) || 0 })}>Create Order</Button>
    </div>
  );
}

export default OrdersPage;
