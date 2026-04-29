import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Search, ShoppingBag, Tag, Eye, EyeOff, Pencil,
  Check, X, AlertCircle, Filter, Star, ImageOff, Plus
} from "lucide-react";
import { useVendorProfile } from "./VendorDashboard";

interface ProductOverride {
  product_id: string;
  enabled: boolean;
  markup_price: number | null;
}

export default function VendorProductsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");

  useQuery({
    queryKey: ["session-vendor-products"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      return data.session;
    },
  });

  const { data: vendor } = useVendorProfile(session?.user?.id);

  // All products from the main system (read-only base)
  const { data: allProducts, isLoading } = useQuery({
    queryKey: ["all-products-vendor-view"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("products")
        .select("id, name, category, subcategory, price, currency, images, status, vendor_id, vendor_cost, tags")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Vendor's own product overrides (enabled/markup)
  const { data: myProducts } = useQuery({
    queryKey: ["vendor-my-products", vendor?.id],
    enabled: !!vendor?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("products")
        .select("id, price, status")
        .eq("vendor_id", vendor.id);
      return (data || []) as { id: string; price: number; status: string }[];
    },
  });

  const myProductIds = new Set((myProducts || []).map((p: any) => p.id));
  const myProductMap = (myProducts || []).reduce((acc: any, p: any) => { acc[p.id] = p; return acc; }, {});

  const categories = useMemo(() => {
    const cats = new Set<string>();
    (allProducts || []).forEach((p: any) => p.category && cats.add(p.category));
    return ["all", ...Array.from(cats)];
  }, [allProducts]);

  const filtered = useMemo(() => {
    return (allProducts || []).filter((p: any) => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === "all" || p.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [allProducts, search, categoryFilter]);

  const toggleProduct = useMutation({
    mutationFn: async ({ productId, enable }: { productId: string; enable: boolean }) => {
      if (enable) {
        // "Select" a product: link it to this vendor
        const { error } = await (supabase as any)
          .from("products")
          .update({ vendor_id: vendor.id })
          .eq("id", productId);
        if (error) throw error;
      } else {
        // "Deselect": remove vendor link
        const { error } = await (supabase as any)
          .from("products")
          .update({ vendor_id: null })
          .eq("id", productId);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["vendor-my-products"] });
      queryClient.invalidateQueries({ queryKey: ["all-products-vendor-view"] });
      toast({
        title: vars.enable ? "Product enabled!" : "Product disabled",
        description: vars.enable ? "This product is now in your catalogue." : "Removed from your active catalogue.",
      });
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
      queryClient.invalidateQueries({ queryKey: ["all-products-vendor-view"] });
      toast({ title: "Inventory status updated!" });
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  const enabledCount = myProducts?.length || 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
            My Product Catalogue
          </h2>
          <p className="text-muted-foreground font-body mt-1">
            Browse main inventory · Enable products you supply · Manage stock status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 font-black px-4 py-2 rounded-xl">
            <Package className="w-4 h-4 mr-2" /> {enabledCount} Active Items
          </Badge>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Filter catalogue..."
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
          <p className="text-sm font-black text-primary uppercase tracking-tighter">Forgiven Pricing Policy</p>
          <p className="text-xs text-muted-foreground font-body leading-relaxed">
            As an FSC Vendor, selling prices are managed centrally by the platform. You are responsible for maintaining accurate 
            <strong className="text-foreground"> Stock Status</strong> for your flexible inventory to ensure seamless order fulfillment.
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
          <p className="font-heading font-black text-xl text-foreground tracking-tight">Catalogue is empty</p>
          <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">Try adjusting your search or filters to find products to supply.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <AnimatePresence>
            {filtered.map((product: any, i: number) => {
              const isEnabled = myProductIds.has(product.id);
              const displayPrice = product.price; // Read-only FSC price
              const stockStatus = product.stock_status || "available";

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className={`rounded-[2rem] border overflow-hidden bg-card transition-all group ${
                    isEnabled ? "border-primary/20 ring-1 ring-primary/5 shadow-xl shadow-primary/5" : "border-border/50 opacity-80 hover:opacity-100"
                  }`}
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
                    
                    <div className="absolute top-4 right-4 flex flex-col gap-2">
                       <button
                         onClick={() => toggleProduct.mutate({ productId: product.id, enable: !isEnabled })}
                         className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all shadow-xl backdrop-blur-md ${
                           isEnabled
                             ? "bg-primary text-white hover:rotate-12"
                             : "bg-white/90 text-primary hover:bg-white"
                         }`}
                       >
                         {isEnabled ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                       </button>
                    </div>

                    {isEnabled && (
                      <div className="absolute top-4 left-4">
                        <Badge className="bg-emerald-500 text-white border-0 font-black text-[9px] uppercase tracking-widest px-3 py-1 shadow-lg shadow-emerald-500/20">
                          My Product
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-6 space-y-4">
                    <div>
                      <p className="font-heading font-black text-sm truncate tracking-tight">{product.name}</p>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">{product.category}</p>
                    </div>

                    <div className="flex items-center justify-between">
                       <p className="text-lg font-heading font-black text-primary">
                         {product.currency || "MWK"} {(displayPrice || 0).toLocaleString()}
                       </p>
                       <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter border-border/50 text-muted-foreground">
                         FSC Selling Price
                       </Badge>
                    </div>

                    {isEnabled && product.inventory_mode === 'flexible' && (
                      <div className="pt-2 border-t border-border/50">
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

                    {!isEnabled && (
                      <Button
                        onClick={() => toggleProduct.mutate({ productId: product.id, enable: true })}
                        className="w-full rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-xs h-11 shadow-lg shadow-primary/10"
                      >
                        Add to Supply Catalog
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
