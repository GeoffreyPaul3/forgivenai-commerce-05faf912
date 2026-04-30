import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Search, ShoppingBag, Plus, Pencil, Trash2, Check, X, AlertCircle, ImageOff, TrendingUp
} from "lucide-react";
import { useVendorProfile } from "./VendorDashboard";

export default function VendorProductsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editProduct, setEditProduct] = useState<any | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  useQuery({
    queryKey: ["session-vendor-products"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      return data.session;
    },
  });

  const { data: vendor } = useVendorProfile(session?.user?.id);

  // Fetch only this vendor's products
  const { data: products, isLoading } = useQuery({
    queryKey: ["vendor-products", vendor?.id],
    enabled: !!vendor?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("products")
        .select("*")
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const categories = useMemo(() => {
    const cats = new Set<string>();
    (products || []).forEach((p: any) => p.category && cats.add(p.category));
    return ["all", ...Array.from(cats)];
  }, [products]);

  const filtered = useMemo(() => {
    return (products || []).filter((p: any) => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === "all" || p.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [products, search, categoryFilter]);

  const insertMutation = useMutation({
    mutationFn: async (product: any) => {
      const { error } = await (supabase as any).from("products").insert({
        ...product,
        vendor_id: vendor.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-products"] });
      setShowAdd(false);
      toast({ title: "Product added to catalogue" });
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  const updateMutation = useMutation({
    mutationFn: async (product: any) => {
      const { error } = await (supabase as any)
        .from("products")
        .update(product)
        .eq("id", product.id)
        .eq("vendor_id", vendor.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-products"] });
      setEditProduct(null);
      toast({ title: "Product updated!" });
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("products").delete().eq("id", id).eq("vendor_id", vendor.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-products"] });
      toast({ title: "Product deleted" });
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  const updateStockStatus = useMutation({
    mutationFn: async ({ productId, stock_status }: { productId: string; stock_status: string }) => {
      const { error } = await (supabase as any)
        .from("products")
        .update({ stock_status })
        .eq("id", productId)
        .eq("vendor_id", vendor?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-products"] });
      toast({ title: "Inventory status updated!" });
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
            My Product Catalogue
          </h2>
          <p className="text-muted-foreground font-body mt-1">
            Manage your inventory, pricing, and stock availability.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 font-black px-4 py-2 rounded-xl">
            <Package className="w-4 h-4 mr-2" /> {products?.length || 0} Listed Items
          </Badge>
          <Button onClick={() => setShowAdd(true)} className="gap-2 bg-primary hover:bg-primary/90 rounded-xl px-6">
            <Plus className="w-4 h-4" /> Add Product
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search your products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-card border-border/50 rounded-xl h-12 focus:ring-primary/20"
          />
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {categories.slice(0, 6).map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                categoryFilter === cat
                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                  : "bg-card text-muted-foreground border-border/50 hover:border-primary/30"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Notice: Core Principle */}
      <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 flex items-start gap-4">
        <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-black text-primary uppercase tracking-tighter">Forgiven Pricing Engine</p>
          <p className="text-xs text-muted-foreground font-body leading-relaxed">
            As an FSC Vendor, you set the <strong className="text-foreground">Vendor Cost</strong> for your items. The platform automatically calculates and manages the final selling price. You are responsible for ensuring your <strong className="text-foreground">Stock Status</strong> is accurate to prevent unfulfillable orders.
          </p>
        </div>
      </div>

      {/* Product Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-3xl border border-border/50 bg-card overflow-hidden animate-pulse">
              <div className="h-48 bg-muted" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-muted rounded-full w-3/4" />
                <div className="h-3 bg-muted rounded-full w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-3xl bg-muted/30 flex items-center justify-center mb-6">
             <ShoppingBag className="w-10 h-10 text-muted-foreground/30" />
          </div>
          <p className="font-heading font-black text-xl text-foreground tracking-tight">Your catalogue is empty</p>
          <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">Click "Add Product" to start supplying inventory to the platform.</p>
          <Button onClick={() => setShowAdd(true)} className="mt-6 gap-2 bg-primary hover:bg-primary/90 rounded-xl">
            <Plus className="w-4 h-4" /> Add Your First Product
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <AnimatePresence>
            {filtered.map((product: any, i: number) => {
              const displayPrice = product.price; // Read-only FSC price
              const stockStatus = product.stock_status || "available";

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="rounded-[2rem] border border-primary/20 ring-1 ring-primary/5 shadow-xl shadow-primary/5 overflow-hidden bg-card transition-all group"
                >
                  {/* Image */}
                  <div className="relative h-48 bg-muted overflow-hidden">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageOff className="w-10 h-10 text-muted-foreground/20" />
                      </div>
                    )}
                    
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button
                         onClick={() => setEditProduct(product)}
                         className="w-8 h-8 rounded-xl bg-white/90 text-primary hover:bg-white flex items-center justify-center shadow-lg backdrop-blur-md transition-transform hover:scale-110"
                       >
                         <Pencil className="w-4 h-4" />
                       </button>
                       <button
                         onClick={() => deleteMutation.mutate(product.id)}
                         className="w-8 h-8 rounded-xl bg-white/90 text-destructive hover:bg-white flex items-center justify-center shadow-lg backdrop-blur-md transition-transform hover:scale-110"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>

                    <div className="absolute top-4 left-4">
                      <Badge className="bg-primary text-white border-0 font-black text-[9px] uppercase tracking-widest px-3 py-1 shadow-lg">
                        {product.status || 'draft'}
                      </Badge>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-6 space-y-4">
                    <div>
                      <p className="font-heading font-black text-sm truncate tracking-tight">{product.name}</p>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">{product.category || 'Uncategorized'}</p>
                    </div>

                    <div className="flex items-center justify-between">
                       <p className="text-lg font-heading font-black text-primary">
                         {product.currency || "MWK"} {(displayPrice || 0).toLocaleString()}
                       </p>
                       <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter border-border/50 text-muted-foreground">
                         Selling Price
                       </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between pb-2 border-b border-border/50">
                       <p className="text-sm font-bold text-foreground">
                         {product.currency || "MWK"} {(product.vendor_cost || 0).toLocaleString()}
                       </p>
                       <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground">
                         Your Cost
                       </span>
                    </div>

                    {product.inventory_mode === 'flexible' && (
                      <div className="pt-2">
                        <p className="text-[9px] font-black uppercase text-muted-foreground mb-2 tracking-widest">Inventory Status</p>
                        <div className="flex gap-1.5">
                           {['available', 'low_stock', 'unavailable'].map((status) => (
                              <button
                                key={status}
                                onClick={() => updateStockStatus.mutate({ productId: product.id, stock_status: status })}
                                className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all border ${
                                   stockStatus === status 
                                   ? (status === 'available' ? 'bg-emerald-500 text-white border-emerald-500' : status === 'low_stock' ? 'bg-amber-500 text-white border-amber-500' : 'bg-red-500 text-white border-red-500')
                                   : 'bg-muted/30 text-muted-foreground border-transparent hover:border-border'
                                }`}
                              >
                                {status.replace('_', ' ')}
                              </button>
                           ))}
                        </div>
                      </div>
                    )}
                    
                    {product.inventory_mode === 'fixed' && (
                      <div className="pt-2">
                        <p className="text-[9px] font-black uppercase text-muted-foreground mb-2 tracking-widest">Inventory Status</p>
                        <div className="flex items-center justify-between bg-muted/30 p-2 rounded-xl border border-border/50">
                          <span className="text-[10px] font-black uppercase text-muted-foreground">Fixed Stock:</span>
                          <span className="text-sm font-bold">{product.stock_quantity || 0}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <VendorProductDialog 
        product={editProduct} 
        open={!!editProduct} 
        onClose={() => setEditProduct(null)} 
        onSave={(p) => updateMutation.mutate(p)} 
        isNew={false} 
      />
      
      <VendorProductDialog 
        product={null} 
        open={showAdd} 
        onClose={() => setShowAdd(false)} 
        onSave={(p) => insertMutation.mutate(p)} 
        isNew={true} 
      />
    </div>
  );
}

function VendorProductDialog({ product, open, onClose, onSave, isNew }: {
  product: any | null; open: boolean; onClose: () => void; onSave: (p: any) => void; isNew?: boolean;
}) {
  const [form, setForm] = useState({
    name: "",
    category: "",
    description: "",
    status: "active",
    vendor_cost: "",
    price: "",
    imageUrl: "",
    inventory_mode: "flexible",
    stock_quantity: "0",
    stock_status: "available",
    sizes: [] as string[],
    colors: [] as string[],
    newSize: "",
    newColor: "",
  });

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        category: product.category || "",
        description: product.description || "",
        status: product.status || "active",
        vendor_cost: product.vendor_cost?.toString() || "",
        price: product.price?.toString() || "",
        imageUrl: product.images?.[0] || "",
        inventory_mode: product.inventory_mode || "flexible",
        stock_quantity: product.stock_quantity?.toString() || "0",
        stock_status: product.stock_status || "available",
        sizes: product.sizes || [],
        colors: product.colors || [],
        newSize: "",
        newColor: "",
      });
    } else {
      setForm({
        name: "",
        category: "",
        description: "",
        status: "active",
        vendor_cost: "",
        price: "",
        imageUrl: "",
        inventory_mode: "flexible",
        stock_quantity: "0",
        stock_status: "available",
        sizes: [],
        colors: [],
        newSize: "",
        newColor: "",
      });
    }
  }, [product, open]);

  const handleSave = () => {
    if (!form.name.trim() || !form.vendor_cost) return;
    
    // Auto-calculate suggested price using FSC Engine formula (Vendor Cost / 0.7)
    // Only if price isn't explicitly overridden or we want to strictly enforce it
    const cost = parseFloat(form.vendor_cost);
    const calculatedPrice = Math.ceil(cost / 0.7 / 100) * 100;
    
    const data: any = {
      name: form.name,
      category: form.category || null,
      description: form.description || null,
      status: form.status,
      vendor_cost: cost,
      price: calculatedPrice, // Enforced by FSC
      images: form.imageUrl ? [form.imageUrl] : [],
      inventory_mode: form.inventory_mode,
      stock_quantity: parseInt(form.stock_quantity) || 0,
      stock_status: form.stock_status,
      sizes: form.sizes,
      colors: form.colors,
    };
    if (product) data.id = product.id;
    onSave(data);
  };

  const addTag = (type: "sizes" | "colors") => {
    const val = type === "sizes" ? form.newSize.trim() : form.newColor.trim();
    if (!val) return;
    setForm(f => ({
      ...f,
      [type]: [...f[type], val],
      [type === "sizes" ? "newSize" : "newColor"]: "",
    }));
  };

  const removeTag = (type: "sizes" | "colors", idx: number) => {
    setForm(f => ({
      ...f,
      [type]: f[type].filter((_, i) => i !== idx),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-6xl overflow-y-auto max-h-[95vh] rounded-[2rem] p-0 border-0 shadow-2xl">
        <div className="bg-gradient-to-br from-primary/10 via-background to-background p-8 pb-6 border-b border-border/50">
           <DialogTitle className="font-heading text-2xl font-black tracking-tight">
             {isNew ? "Supply New Product" : "Edit Supply Item"}
           </DialogTitle>
           <p className="text-muted-foreground text-sm font-body mt-1">Upload inventory directly to the Forgiven Shopping Centre platform.</p>
        </div>
        
        <div className="p-8 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Column 1: Basic Identity */}
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Product Identity</label>
                <div className="space-y-4">
                  <Input placeholder="Product name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="font-body h-12 rounded-xl bg-muted/20 border-border/50 focus:bg-background transition-all" />
                  <Input placeholder="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="font-body h-12 rounded-xl bg-muted/20 border-border/50 focus:bg-background transition-all" />
                  <Textarea placeholder="Full description..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="font-body min-h-[140px] rounded-xl bg-muted/20 border-border/50 p-4 focus:bg-background transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Main Image URL</label>
                <Input placeholder="https://..." value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} className="font-body h-12 rounded-xl bg-muted/20 border-border/50 focus:bg-background transition-all" />
              </div>
            </div>

            {/* Column 2: Vendor Costing */}
            <div className="space-y-6">
              <div className="p-6 rounded-[2rem] bg-primary/5 border border-primary/10 space-y-6 shadow-sm">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-primary uppercase tracking-widest px-1 inline-flex items-center gap-2">
                    <Package className="w-3.5 h-3.5" /> Pricing Configuration
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase px-1">Your Supply Cost (MWK) *</label>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={form.vendor_cost} 
                      onChange={e => {
                        const cost = e.target.value;
                        const suggested = cost ? Math.ceil(parseFloat(cost) / 0.7 / 100) * 100 : "";
                        setForm(f => ({ ...f, vendor_cost: cost, price: suggested.toString() }));
                      }} 
                      className="h-12 rounded-xl bg-background border-border/50 font-mono font-bold" 
                    />
                  </div>
                  <div className="space-y-2 opacity-80 pointer-events-none">
                    <label className="text-[10px] font-black text-primary uppercase px-1">Platform Selling Price</label>
                    <Input 
                      type="number" 
                      placeholder="Auto-calculated" 
                      value={form.price} 
                      readOnly
                      className="h-12 rounded-xl bg-background/50 border-primary/20 font-mono font-black text-primary text-lg" 
                    />
                  </div>
                </div>
                <div className="bg-primary/10 p-4 rounded-2xl flex gap-3 items-start border border-primary/20 shadow-inner">
                   <TrendingUp className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                   <p className="text-[10px] text-primary/80 leading-relaxed font-bold">
                     FSC PRICING ENGINE ACTIVE: The platform automatically determines the final selling price. You will receive your exact Vendor Cost upon successful fulfillment.
                   </p>
                </div>
              </div>
            </div>

            {/* Column 3: Inventory & Variants */}
            <div className="space-y-6">
              <div className="space-y-4 p-6 rounded-[2rem] border border-border/50 bg-muted/10 shadow-inner">
                 <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Inventory Mode</label>
                 <div className="flex gap-6 items-center">
                   <div className="flex items-center gap-2">
                     <input type="radio" checked={form.inventory_mode === "flexible"} onChange={() => setForm(f => ({ ...f, inventory_mode: "flexible" }))} id="flexible" className="w-4 h-4 accent-primary" />
                     <label htmlFor="flexible" className="text-xs font-black cursor-pointer uppercase tracking-tighter">Flexible</label>
                   </div>
                   <div className="flex items-center gap-2">
                     <input type="radio" checked={form.inventory_mode === "fixed"} onChange={() => setForm(f => ({ ...f, inventory_mode: "fixed" }))} id="fixed" className="w-4 h-4 accent-primary" />
                     <label htmlFor="fixed" className="text-xs font-black cursor-pointer uppercase tracking-tighter">Fixed Stock</label>
                   </div>
                 </div>
                 
                 {form.inventory_mode === "fixed" ? (
                   <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                     <label className="text-[9px] font-black uppercase text-muted-foreground">Available Quantity</label>
                     <Input type="number" value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))} className="h-12 rounded-xl bg-background border-border/50" />
                   </div>
                 ) : (
                   <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                     <label className="text-[9px] font-black uppercase text-muted-foreground">Supply Status</label>
                     <Select value={form.stock_status} onValueChange={v => setForm(f => ({ ...f, stock_status: v }))}>
                       <SelectTrigger className="h-12 rounded-xl bg-background border-border/50"><SelectValue /></SelectTrigger>
                       <SelectContent className="rounded-xl">
                         <SelectItem value="available">Available</SelectItem>
                         <SelectItem value="low_stock">Low Stock</SelectItem>
                         <SelectItem value="unavailable">Unavailable</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                 )}
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase px-1">Size Variants</label>
                    <div className="flex gap-2">
                      <Input value={form.newSize} onChange={e => setForm(f => ({ ...f, newSize: e.target.value }))} onKeyDown={e => e.key === "Enter" && addTag("sizes")} placeholder="XL, 42..." className="h-10 rounded-xl text-xs bg-muted/20" />
                      <Button size="icon" variant="secondary" className="h-10 w-10 rounded-xl" onClick={() => addTag("sizes")}><Plus className="w-4 h-4" /></Button>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {form.sizes.map((s, i) => (
                        <Badge key={i} variant="secondary" className="gap-2 text-[10px] font-black uppercase px-3 py-1 rounded-lg bg-background border border-border/50 shadow-sm">
                          {s} <Trash2 className="w-3 h-3 cursor-pointer text-destructive/60 hover:text-destructive transition-colors" onClick={() => removeTag("sizes", i)} />
                        </Badge>
                      ))}
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase px-1">Color Variants</label>
                    <div className="flex gap-2">
                      <Input value={form.newColor} onChange={e => setForm(f => ({ ...f, newColor: e.target.value }))} onKeyDown={e => e.key === "Enter" && addTag("colors")} placeholder="Red, Tan..." className="h-10 rounded-xl text-xs bg-muted/20" />
                      <Button size="icon" variant="secondary" className="h-10 w-10 rounded-xl" onClick={() => addTag("colors")}><Plus className="w-4 h-4" /></Button>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {form.colors.map((c, i) => (
                        <Badge key={i} variant="secondary" className="gap-2 text-[10px] font-black uppercase px-3 py-1 rounded-lg bg-background border border-border/50 shadow-sm">
                          {c} <Trash2 className="w-3 h-3 cursor-pointer text-destructive/60 hover:text-destructive transition-colors" onClick={() => removeTag("colors", i)} />
                        </Badge>
                      ))}
                    </div>
                 </div>
              </div>
            </div>
          </div>
          
          <Button disabled={!form.name || !form.vendor_cost} onClick={handleSave} className="w-full bg-primary text-white hover:bg-primary/90 font-heading font-black h-20 text-2xl rounded-[2rem] shadow-2xl shadow-primary/30 transition-all hover:scale-[1.005] active:scale-[0.995] flex items-center justify-center gap-3">
            <Package className="w-6 h-6" /> Save Product & Upload to Platform
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

