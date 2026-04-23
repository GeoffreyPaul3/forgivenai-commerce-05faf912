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
  Check, X, AlertCircle, Filter, Star, ImageOff
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

  const updateMarkup = useMutation({
    mutationFn: async ({ productId, price }: { productId: string; price: number }) => {
      const { error } = await (supabase as any)
        .from("products")
        .update({ price })
        .eq("id", productId)
        .eq("vendor_id", vendor?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-my-products"] });
      queryClient.invalidateQueries({ queryKey: ["all-products-vendor-view"] });
      setEditingId(null);
      toast({ title: "Price updated!", description: "Your markup price has been saved." });
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
            My Products
          </h2>
          <p className="text-muted-foreground font-body mt-1">
            Browse all available products · select which ones to sell · set your markup price.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 font-bold px-3 py-1.5">
            <Package className="w-3 h-3 mr-1.5" /> {enabledCount} in catalogue
          </Badge>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-muted/30 border-border focus:border-primary/40 h-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.slice(0, 6).map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-tight transition-all border ${
                categoryFilter === cat
                  ? "bg-primary text-white border-primary"
                  : "bg-muted/30 text-muted-foreground border-transparent hover:border-border"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Notice */}
      <div className="p-3.5 rounded-xl border border-border bg-muted/20 flex items-center gap-3">
        <AlertCircle className="w-4 h-4 text-primary shrink-0" />
        <p className="text-xs text-muted-foreground font-body">
          <strong className="text-foreground">Read-only base data:</strong> Product details are managed by admin. You can enable/disable products and set your own markup price only.
        </p>
      </div>

      {/* Product Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden animate-pulse">
              <div className="h-40 bg-muted" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="font-heading font-bold text-lg text-muted-foreground">No products found</p>
          <p className="text-muted-foreground/60 text-sm mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <AnimatePresence>
            {filtered.map((product: any, i: number) => {
              const isEnabled = myProductIds.has(product.id);
              const myData = myProductMap[product.id];
              const isEditing = editingId === product.id;
              const displayPrice = myData?.price ?? product.price;

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`rounded-2xl border overflow-hidden bg-card transition-all hover:shadow-md group ${
                    isEnabled ? "border-primary/30" : "border-border opacity-75 hover:opacity-100"
                  }`}
                >
                  {/* Image */}
                  <div className="relative h-40 bg-muted overflow-hidden">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageOff className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                    )}
                    {/* Enable/Disable Toggle */}
                    <button
                      onClick={() => toggleProduct.mutate({ productId: product.id, enable: !isEnabled })}
                      className={`absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center transition-all shadow-sm ${
                        isEnabled
                          ? "bg-primary text-white hover:bg-primary/80"
                          : "bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm"
                      }`}
                      title={isEnabled ? "Disable product" : "Enable product"}
                    >
                      {isEnabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    {isEnabled && (
                      <div className="absolute top-2 left-2">
                        <Badge className="text-[9px] bg-primary/90 text-white border-0 font-bold">✓ Active</Badge>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 space-y-2">
                    <div>
                      <p className="font-semibold text-sm truncate leading-tight">{product.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{product.category}</p>
                    </div>

                    {/* Price Section */}
                    <div className="flex items-center justify-between gap-2">
                      {isEditing ? (
                        <div className="flex items-center gap-1 flex-1">
                          <Input
                            type="number"
                            value={editPrice}
                            onChange={e => setEditPrice(e.target.value)}
                            className="h-7 text-xs px-2 bg-muted/50 border-border"
                            placeholder="Price"
                            autoFocus
                          />
                          <button
                            onClick={() => updateMarkup.mutate({ productId: product.id, price: Number(editPrice) })}
                            className="w-6 h-7 flex items-center justify-center rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="w-6 h-7 flex items-center justify-center rounded bg-muted text-muted-foreground hover:bg-muted/80"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <p className="text-sm font-bold text-primary">
                              {product.currency || "MWK"} {(displayPrice || 0).toLocaleString()}
                            </p>
                            {myData?.price && myData.price !== product.price && (
                              <p className="text-[9px] text-muted-foreground line-through">
                                Base: {(product.price || 0).toLocaleString()}
                              </p>
                            )}
                          </div>
                          {isEnabled && (
                            <button
                              onClick={() => { setEditingId(product.id); setEditPrice(String(displayPrice || "")); }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                              title="Set markup price"
                            >
                              <Tag className="w-3 h-3 text-muted-foreground" />
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    {/* Enable / Disable button */}
                    <Button
                      size="sm"
                      variant={isEnabled ? "outline" : "default"}
                      className={`w-full h-7 text-xs font-bold ${
                        isEnabled
                          ? "border-red-500/20 text-red-500 hover:bg-red-500/5"
                          : "bg-primary hover:bg-primary/90"
                      }`}
                      onClick={() => toggleProduct.mutate({ productId: product.id, enable: !isEnabled })}
                      disabled={toggleProduct.isPending}
                    >
                      {isEnabled ? "Remove from Catalogue" : "Add to Catalogue"}
                    </Button>
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
