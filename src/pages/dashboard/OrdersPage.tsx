import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Package, Clock, Truck, CheckCircle, DollarSign, AlertTriangle, Upload, Image, Loader2, MapPin } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Order = Tables<"orders">;

/** Returns delay state for pending orders */
function getConfirmDelay(order: Order): { mins: number; state: "ok" | "flagged" | "escalated" } | null {
  if ((order as any).vendor_confirmation_status !== 'pending' && order.status !== 'pending') return null;
  const mins = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
  if (mins >= 60) return { mins, state: "escalated" };
  if (mins >= 30) return { mins, state: "flagged" };
  return { mins, state: "ok" };
}

/** Determines whether an order originated from an agent, a vendor product, or in-house */
function getOrderSource(
  order: Order,
  vendorProducts?: { id: string; name: string }[]
): "agent" | "vendor" | "inhouse" {
  if (order.agent_id) return "agent";
  if (vendorProducts && vendorProducts.length > 0) {
    const items = Array.isArray(order.items) ? (order.items as any[]) : [];
    const productIds = new Set(vendorProducts.map(p => p.id));
    const cleanNames = new Set(vendorProducts.map(p => p.name ? p.name.replace(/\s*\([^)]*\)\s*$/, "").trim().toLowerCase() : ""));
    
    if (items.some(item => {
      if (item.product_id && productIds.has(item.product_id)) return true;
      const cleanedName = item.name ? item.name.replace(/\s*\([^)]*\)\s*$/, "").trim().toLowerCase() : "";
      return cleanedName && cleanNames.has(cleanedName);
    })) {
      return "vendor";
    }
  }
  return "inhouse";
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-primary/10 text-primary",
  paid: "bg-green-100 text-green-800",
  processing: "bg-[#A21D7F]/10 text-[#A21D7F]",
  shipped: "bg-primary text-white",
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
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, orderId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `${orderId}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('delivery-proofs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('delivery-proofs')
        .getPublicUrl(filePath);

      await supabase.from('orders').update({ delivery_proof_url: publicUrl } as any).eq('id', orderId);
      
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setSelectedOrder(prev => prev ? { ...prev, delivery_proof_url: publicUrl } as Order : null);
      toast({ title: "Delivery proof uploaded" });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

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

  // Admin-only: fetch products belonging to any vendor so we can
  // label orders containing those products as "Vendor Product" in the list & detail.
  const { data: vendorProducts } = useQuery({
    queryKey: ["vendor-products-list"],
    enabled: profile?.role === "admin",
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name").not("vendor_id", "is", null);
      return data || [];
    },
  });

  const { data: myProducts } = useQuery({
    queryKey: ["vendor-products", vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name").eq("vendor_id", vendorId!);
      return data || [];
    }
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", search, statusFilter, profile?.role, vendorId, agentId, myProducts],
    enabled: !!profile,
    queryFn: async () => {
      let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
      
      if (search) q = q.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      
      if (profile?.role === "agent") {
        if (!agentId) return [];
        q = q.eq("agent_id", agentId);
      }
      
      const { data, error } = await q;
      if (error) throw error;
      
      let filtered = data || [];
      if (profile?.role === "vendor") {
        if (!myProducts) return [];
        const productIds = new Set(myProducts.map(p => p.id));
        const cleanNames = new Set(myProducts.map(p => p.name ? p.name.replace(/\s*\([^)]*\)\s*$/, "").trim().toLowerCase() : ""));
        
        filtered = filtered.filter((o: any) => 
          (o.items as any[]).some(item => {
            if (item.product_id && productIds.has(item.product_id)) return true;
            const cleanedName = item.name ? item.name.replace(/\s*\([^)]*\)\s*$/, "").trim().toLowerCase() : "";
            return cleanedName && cleanNames.has(cleanedName);
          })
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
    mutationFn: async (orderPayload: any) => {
      const { delivery_provider, delivery_city, delivery_type, delivery_address, logistics_quote, ...order } = orderPayload;
      
      // For agent-created orders, inject order-level attribution fields
      const enrichedOrder = profile?.role === "agent" && agentId
        ? {
            ...order,
            agent_id:              agentId,
            attributed_agent_id:   agentId,
            attribution_source:    "assisted_checkout",
            attribution_timestamp: new Date().toISOString(),
            order_source_type:     "agent",
          }
        : order;

      // Ensure status is correctly set for delivery
      if (delivery_provider !== 'none') {
        enrichedOrder.status = 'awaiting_delivery_payment';
      }

      const { data: newOrder, error: orderError } = await supabase.from("orders").insert(enrichedOrder).select().single();
      if (orderError) throw orderError;

      if (delivery_provider !== 'none' && logistics_quote) {
        // Record the shipment intention. Actual shipment creation to courier API
        // will be handled by order-automation via logistics-orchestrator once paid.
        const providerCode = logistics_quote.selectedProviderCode;
        const { data: provider } = await supabase.from('courier_providers').select('id').eq('code', providerCode).single();
        
        if (provider) {
          await supabase.from('delivery_orders').insert({
            order_id: newOrder.id,
            courier_provider_id: provider.id,
            delivery_type: delivery_type,
            receiver_name: enrichedOrder.customer_name || 'Customer',
            receiver_phone: enrichedOrder.customer_phone || '',
            receiver_city: delivery_city,
            receiver_address: delivery_address || '',
            delivery_fee: logistics_quote.quote.amount,
            parcel_status: 'pending',
            idempotency_key: `${newOrder.id}-${providerCode}`
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setShowAdd(false);
      toast({ title: "Order created successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to create order", description: error.message, variant: "destructive" });
    }
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
                  <p className="text-xs text-muted-foreground font-body">
                    {order.customer_phone || order.customer_email || "No contact"} • {order.channel} 
                    {(() => {
                      const src = getOrderSource(order, vendorProducts);
                      if (src === "agent")  return " • Agent Referral";
                      if (src === "vendor") return " • Vendor Product";
                      return " • In-house";
                    })()} • {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Confirmation delay flag */}
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
        <DialogContent className="w-[95vw] lg:max-w-4xl overflow-y-auto max-h-[90vh] rounded-[2.5rem] p-0 border-0 shadow-2xl custom-scrollbar">
          <div className="bg-gradient-to-br from-primary/10 via-background to-background p-5 sm:p-8 pb-4 sm:pb-6 border-b border-border/50 relative">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="font-heading text-2xl font-black tracking-tight flex items-center gap-3">
                  <Package className="w-6 h-6 text-primary" /> Order Detail
                </DialogTitle>
                <p className="text-muted-foreground text-sm font-body mt-1 uppercase tracking-tighter font-black">Order ID: #{selectedOrder?.id.slice(0, 8)}</p>
              </div>
              <div className={`px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-widest ${statusColors[selectedOrder?.status || "pending"]}`}>
                {selectedOrder?.status}
              </div>
            </div>
          </div>

          {selectedOrder && (
            <div className="p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Info & Items */}
              <div className="lg:col-span-7 space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 rounded-[2rem] bg-muted/20 border border-border/50">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-3 flex items-center gap-2">
                      <Clock className="w-3 h-3" /> Customer Info
                    </p>
                    <p className="font-black text-sm">{selectedOrder.customer_name}</p>
                    <p className="text-xs text-muted-foreground font-body mt-0.5 mb-2">{selectedOrder.customer_phone}</p>
                    {(() => {
                      let address = "";
                      let city = "";
                      if (selectedOrder.notes) {
                        const match = selectedOrder.notes.match(/Delivery Address:\s*(.*?)\s*\|/i);
                        if (match && match[1] && match[1].trim() !== '') {
                          address = match[1].trim();
                          const addrLow = address.toLowerCase();
                          if (addrLow.includes("blantyre")) city = "Blantyre";
                          else if (addrLow.includes("mzuzu")) city = "Mzuzu";
                          else if (addrLow.includes("zomba")) city = "Zomba";
                          else if (addrLow.includes("lilongwe")) city = "Lilongwe";
                        }
                      }
                      if (!address || address === 'Not specified') {
                        return null;
                      }
                      return (
                        <div className="mt-2 pt-2 border-t border-border/30">
                          <p className="text-[9px] font-black uppercase text-primary/70 mb-0.5">Delivery Address</p>
                          <p className="text-xs font-medium text-foreground">{address}</p>
                          {city && <p className="text-[10px] text-muted-foreground">{city}</p>}
                        </div>
                      );
                    })()}
                    {(selectedOrder as any).courier_name && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-[9px] font-black uppercase text-primary/70 mb-1">Preferred Courier</p>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-black uppercase tracking-widest py-0">
                          {(selectedOrder as any).courier_name}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="p-5 rounded-[2rem] bg-muted/20 border border-border/50">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-3 flex items-center gap-2">
                      <DollarSign className="w-3 h-3" /> Order Value
                    </p>
                    <p className="font-black text-2xl text-primary">{selectedOrder.currency} {selectedOrder.total.toLocaleString()}</p>
                     <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter mt-1">{selectedOrder.channel} channel {(() => {
                        const src = getOrderSource(selectedOrder, vendorProducts);
                        if (src === "agent")  return " • Agent Referral";
                        if (src === "vendor") return " • Vendor Product";
                        return " • In-house";
                      })()}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">Ordered Items</label>
                  <div className="space-y-2">
                    {Array.isArray(selectedOrder.items) && (selectedOrder.items as any[]).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-4 rounded-[1.5rem] bg-muted/20 border border-border/50">
                        <div className="flex gap-3 items-center">
                           <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                             <Package className="w-5 h-5 text-primary" />
                           </div>
                           <div>
                             <p className="text-sm font-bold">{item.name}</p>
                             <div className="flex items-center gap-2 mt-0.5">
                               <p className="text-[10px] text-muted-foreground font-body">Qty: {item.quantity} × {selectedOrder.currency} {Number(item.price).toLocaleString()}</p>
                               {item.size && (
                                 <Badge variant="outline" className="h-4 px-1.5 text-[8px] font-black uppercase bg-muted/50 border-border/50">
                                   Size: {item.size}
                                 </Badge>
                               )}
                               {item.color && (
                                 <Badge variant="outline" className="h-4 px-1.5 text-[8px] font-black uppercase bg-muted/50 border-border/50">
                                   Colour: {item.color}
                                 </Badge>
                               )}
                             </div>
                           </div>
                        </div>
                        <p className="text-sm font-black text-foreground">{selectedOrder.currency} {(Number(item.price) * Number(item.quantity)).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">Lifecycle Status</label>
                  <div className="flex flex-wrap gap-2">
                    {statusSteps.map(s => (
                      <Button 
                        key={s} 
                        size="sm" 
                        variant={selectedOrder.status === s ? "default" : "outline"} 
                        onClick={() => { updateStatus.mutate({ id: selectedOrder.id, status: s }); setSelectedOrder({ ...selectedOrder, status: s } as Order); }} 
                        className={`text-[10px] font-black uppercase tracking-tighter px-4 py-4 rounded-xl ${selectedOrder.status === s ? 'bg-primary' : 'border-border/50'}`}
                      >
                        {s}
                      </Button>
                    ))}
                    <Button 
                      variant={selectedOrder.status === 'cancelled' ? 'destructive' : 'outline'}
                      size="sm" 
                      onClick={() => { updateStatus.mutate({ id: selectedOrder.id, status: 'cancelled' }); setSelectedOrder({ ...selectedOrder, status: 'cancelled' } as Order); }}
                      className="text-[10px] font-black uppercase tracking-tighter px-4 py-4 rounded-xl"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Column: Fulfillment & Notes */}
              <div className="lg:col-span-5 space-y-6">
                <div className="p-6 rounded-[2.5rem] bg-primary/5 border border-primary/10 space-y-6">
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest inline-flex items-center gap-2">
                    <Truck className="w-3.5 h-3.5" /> Fulfillment Logistics
                  </p>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-primary/60 px-1">Assigned Rider Name / ID</label>
                      <Input 
                        placeholder="e.g. Samuel (Rider 04)" 
                        defaultValue={(selectedOrder as any).rider_name}
                        onBlur={(e) => {
                          if (e.target.value !== (selectedOrder as any).rider_name) {
                            supabase.from('orders').update({ rider_name: e.target.value } as any).eq('id', selectedOrder.id).then(() => {
                              toast({ title: "Rider assigned" });
                            });
                          }
                        }}
                        className="bg-white border-primary/20 h-12 rounded-2xl" 
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <label className="text-[9px] font-black uppercase text-primary/60 px-1">Delivery Proof Image</label>
                      
                      {selectedOrder.delivery_proof_url ? (
                        <div className="relative group aspect-video rounded-3xl overflow-hidden border-2 border-primary/20 bg-white">
                          <img src={selectedOrder.delivery_proof_url} alt="Proof" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                             <Button size="sm" variant="secondary" className="rounded-xl font-black text-[10px] uppercase" onClick={() => window.open(selectedOrder.delivery_proof_url!, '_blank')}>
                               <Image className="w-3 h-3 mr-1" /> View Full
                             </Button>
                             <label className="cursor-pointer bg-white text-primary px-3 py-1.5 rounded-xl font-black text-[10px] uppercase flex items-center gap-1 hover:bg-primary/5 transition-colors">
                               <Upload className="w-3 h-3" /> Change
                               <input type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e, selectedOrder.id)} disabled={uploading} />
                             </label>
                          </div>
                        </div>
                      ) : (
                        <label className={`flex flex-col items-center justify-center aspect-video rounded-3xl border-2 border-dashed transition-all cursor-pointer ${uploading ? 'bg-muted/10 border-muted animate-pulse' : 'bg-white border-primary/10 hover:bg-primary/5 hover:border-primary/30'}`}>
                          {uploading ? (
                            <Loader2 className="w-8 h-8 text-primary/40 animate-spin" />
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-primary/40 mb-2" />
                              <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest">Upload Proof Image</p>
                              <p className="text-[9px] text-primary/40 mt-1">Tap to select photo</p>
                            </>
                          )}
                          <input type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e, selectedOrder.id)} disabled={uploading} />
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      className="flex-1 border-primary/20 text-primary hover:bg-primary/5 font-black text-xs h-12 rounded-2xl"
                      onClick={() => {
                        const now = new Date().toISOString();
                        supabase.from('orders').update({ fulfillment_collected_at: now, status: 'shipped' } as any).eq('id', selectedOrder.id).then(() => {
                          queryClient.invalidateQueries({ queryKey: ["orders"] });
                          toast({ title: "Marked as Collected" });
                        });
                      }}
                    >
                      Mark Collected
                    </Button>
                    <Button 
                      className="flex-1 bg-primary hover:bg-primary/90 text-white font-black text-xs h-12 rounded-2xl shadow-lg shadow-primary/10"
                      onClick={() => {
                        const now = new Date().toISOString();
                        supabase.from('orders').update({ delivery_confirmed_at: now, status: 'delivered' } as any).eq('id', selectedOrder.id).then(() => {
                          queryClient.invalidateQueries({ queryKey: ["orders"] });
                          toast({ title: "Delivery Confirmed" });
                        });
                      }}
                    >
                      Confirm Delivery
                    </Button>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div className="p-6 rounded-[2.5rem] bg-amber-50 border border-amber-100">
                    <p className="text-[9px] font-black uppercase text-amber-600 mb-2 flex items-center gap-2">
                      <MapPin className="w-3 h-3" /> Delivery Notes
                    </p>
                    <p className="text-sm font-body text-amber-900/80 leading-relaxed">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>
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
  const [form, setForm] = useState({ 
    customer_name: "", 
    customer_phone: "", 
    total: "", 
    channel: "whatsapp", 
    notes: "",
    delivery_provider: "none",
    delivery_city: "",
    delivery_type: "office_collection",
    delivery_address: ""
  });
  
  const [quote, setQuote] = useState<any>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);

  const fetchQuote = async () => {
    if (!form.delivery_city || form.delivery_provider === 'none') return;
    setLoadingQuote(true);
    try {
      const { LogisticsService } = await import('@/integrations/logistics/LogisticsService');
      const res = await LogisticsService.getLiveQuote({
        receiverCity: form.delivery_city,
        senderCity: 'Blantyre', // Default origin
        itemsCount: 1
      }, form.delivery_provider);
      setQuote(res);
    } catch (e: any) {
      console.error(e);
      setQuote(null);
    } finally {
      setLoadingQuote(false);
    }
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <div className="space-y-3">
        <h3 className="font-heading font-medium text-sm">Customer Details</h3>
        <Input placeholder="Customer Name" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
        <Input placeholder="Phone (+265...)" value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} />
        <Input placeholder="Total Amount (Items)" type="number" value={form.total} onChange={e => setForm(f => ({ ...f, total: e.target.value }))} />
        <Select value={form.channel} onValueChange={v => setForm(f => ({ ...f, channel: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="web">Web</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="agent">Agent</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <h3 className="font-heading font-medium text-sm">Delivery Options</h3>
        <Select value={form.delivery_provider} onValueChange={v => { setForm(f => ({ ...f, delivery_provider: v })); setQuote(null); }}>
          <SelectTrigger><SelectValue placeholder="Delivery Provider" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Delivery / Customer Pickup</SelectItem>
            <SelectItem value="AUTO">🤖 Auto-Select Best Courier</SelectItem>
            <SelectItem value="SMART_DELIVERIES">Smart Deliveries</SelectItem>
            <SelectItem value="IMPALA_COURIER">Impala Courier</SelectItem>
          </SelectContent>
        </Select>

        {form.delivery_provider !== 'none' && (
          <div className="space-y-3 bg-muted/50 p-3 rounded-lg border border-border">
            <Select value={form.delivery_city} onValueChange={v => { setForm(f => ({ ...f, delivery_city: v })); setQuote(null); }}>
              <SelectTrigger><SelectValue placeholder="Select City" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Lilongwe">Lilongwe</SelectItem>
                <SelectItem value="Blantyre">Blantyre</SelectItem>
                <SelectItem value="Mzuzu">Mzuzu</SelectItem>
                <SelectItem value="Zomba">Zomba</SelectItem>
              </SelectContent>
            </Select>

            <Select value={form.delivery_type} onValueChange={v => setForm(f => ({ ...f, delivery_type: v }))}>
              <SelectTrigger><SelectValue placeholder="Delivery Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="office_collection">Office Collection</SelectItem>
                <SelectItem value="door_to_door">Door to Door (+MWK 1,500)</SelectItem>
              </SelectContent>
            </Select>

            {form.delivery_type === 'door_to_door' && (
              <Input 
                placeholder="Full Delivery Address & Description" 
                value={form.delivery_address} 
                onChange={e => setForm(f => ({ ...f, delivery_address: e.target.value }))} 
              />
            )}

            <Button 
              type="button" 
              variant="outline" 
              className="w-full text-xs" 
              onClick={fetchQuote} 
              disabled={!form.delivery_city || loadingQuote}
            >
              {loadingQuote ? 'Calculating...' : 'Get Live Quote'}
            </Button>

            {quote && (
              <div className="p-3 bg-primary/10 rounded-xl mt-2 flex flex-col gap-1 text-sm border border-primary/20">
                <div className="flex justify-between items-center font-bold">
                  <span>Selected Courier:</span>
                  <span className="text-primary">{quote.providerName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Estimated Fee:</span>
                  <span>{quote.quote?.currency} {quote.quote?.amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                  <span>ETA: {quote.quote?.estimatedDays} Days</span>
                  <span>Score: {quote.score}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Button 
        className="w-full" 
        onClick={() => {
          if (form.delivery_provider !== 'none' && !form.delivery_city) {
            alert("Please select a city for delivery.");
            return;
          }
          if (form.delivery_provider !== 'none' && !quote) {
            alert("Please fetch a delivery quote first.");
            return;
          }
          onSave({ ...form, total: parseFloat(form.total) || 0, logistics_quote: quote });
        }}
      >
        Create Order
      </Button>
    </div>
  );
}

export default OrdersPage;

