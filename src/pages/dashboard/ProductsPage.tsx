import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Sparkles, Pencil, Trash2, ExternalLink, Loader2, Image as ImageIcon, Package } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { motion } from "framer-motion";

type Product = Tables<"products">;
const PAGE_SIZE = 12;

const ProductsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [page, setPage] = useState(1);

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

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", search, categoryFilter, profile?.role, vendorId],
    enabled: !!profile,
    queryFn: async () => {
      let query = supabase.from("products").select("*").order("created_at", { ascending: false });
      
      if (search) query = query.ilike("name", `%${search}%`);
      if (categoryFilter !== "all") query = query.eq("category", categoryFilter);
      
      if (profile?.role === "vendor" && vendorId) {
        query = query.eq("vendor_id", vendorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("category").not("category", "is", null);
      return [...new Set((data || []).map(d => d.category).filter(Boolean))] as string[];
    },
  });

  useEffect(() => { setPage(1); }, [search, categoryFilter]);

  const totalPages = Math.ceil((products?.length || 0) / PAGE_SIZE);
  const paginatedProducts = products?.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) || [];

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Product deleted" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (product: Partial<Product> & { id: string }) => {
      const { error } = await supabase.from("products").update(product).eq("id", product.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setEditProduct(null);
      toast({ title: "Product updated" });
    },
  });

  const insertMutation = useMutation({
    mutationFn: async (product: Omit<Product, "id" | "created_at" | "updated_at">) => {
      const { error } = await supabase.from("products").insert(product as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setShowAdd(false);
      toast({ title: "Product added" });
    },
  });

  const generateAiDescription = async (product: Product) => {
    setAiLoading(product.id);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate", {
        body: {
          type: "product-description",
          productName: product.name,
          productCategory: product.category,
          productPrice: product.price,
          currency: product.currency || "MWK",
        },
      });
      if (error) throw error;
      if (data?.content) {
        await supabase.from("products").update({ ai_description: data.content }).eq("id", product.id);
        queryClient.invalidateQueries({ queryKey: ["products"] });
        toast({ title: "AI description generated!" });
      }
    } catch {
      toast({ title: "Failed to generate description", variant: "destructive" });
    } finally {
      setAiLoading(null);
    }
  };

  const statusColor = (status: string | null) => {
    if (status === "active") return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
    if (status === "archived") return "bg-muted text-muted-foreground border-border";
    return "bg-amber-500/10 text-amber-700 border-amber-500/20";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground tracking-tight">Products</h2>
          <p className="text-muted-foreground text-sm font-body">{products?.length || 0} products in catalog</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card border-border" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px] bg-card">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Product Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="h-48 bg-muted animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : paginatedProducts.length === 0 ? (
        <div className="text-center py-20">
          <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
          <p className="text-muted-foreground font-body">No products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedProducts.map((product, idx) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              className="group rounded-xl border border-border bg-card overflow-hidden hover:border-gold/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
            >
              {/* Image */}
              <div className="relative h-48 bg-muted overflow-hidden">
                {product.images && product.images.length > 0 ? (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                )}
                {/* Status badge overlay */}
                <div className="absolute top-3 left-3">
                  <Badge variant="outline" className={`text-[10px] font-semibold backdrop-blur-sm ${statusColor(product.status)}`}>
                    {product.status || "draft"}
                  </Badge>
                </div>
                {/* Quick actions overlay */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-7 w-7 backdrop-blur-sm bg-background/80 hover:bg-background"
                    onClick={() => setEditProduct(product)}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-7 w-7 backdrop-blur-sm bg-background/80 hover:bg-background"
                    onClick={() => generateAiDescription(product)}
                    disabled={aiLoading === product.id}
                  >
                    {aiLoading === product.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  </Button>
                </div>
              </div>

              {/* Info */}
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading text-sm font-semibold text-foreground line-clamp-2 leading-tight">{product.name}</h3>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-body">{product.category || "Uncategorized"}</span>
                  <span className="text-sm font-bold text-primary font-body">
                    {product.currency} {product.price?.toLocaleString() || "—"}
                  </span>
                </div>
                {product.ai_description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 font-body leading-relaxed">{product.ai_description}</p>
                )}

                {/* Bottom actions */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="flex gap-1">
                    {product.source_url && (
                      <a href={product.source_url} target="_blank" rel="noopener noreferrer">
                        <Button size="icon" variant="ghost" className="h-7 w-7"><ExternalLink className="w-3 h-3" /></Button>
                      </a>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(product.id)}
                    className="h-7 w-7 text-destructive/60 hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage(p => Math.max(1, p - 1)); }} />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .map((p, idx, arr) => {
                const elements: React.ReactNode[] = [];
                if (idx > 0 && arr[idx - 1] !== p - 1) {
                  elements.push(<PaginationItem key={`e-${p}`}><span className="px-2 text-muted-foreground">…</span></PaginationItem>);
                }
                elements.push(
                  <PaginationItem key={p}>
                    <PaginationLink href="#" isActive={p === page} onClick={(e) => { e.preventDefault(); setPage(p); }}>{p}</PaginationLink>
                  </PaginationItem>
                );
                return elements;
              })}
            <PaginationItem>
              <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage(p => Math.min(totalPages, p + 1)); }} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <ProductDialog product={editProduct} open={!!editProduct} onClose={() => setEditProduct(null)} onSave={(p) => updateMutation.mutate(p as any)} categories={categories || []} />
      <ProductDialog product={null} open={showAdd} onClose={() => setShowAdd(false)} onSave={(p) => insertMutation.mutate(p as any)} categories={categories || []} isNew />
    </div>
  );
};

function ProductDialog({ product, open, onClose, onSave, categories, isNew }: {
  product: Product | null; open: boolean; onClose: () => void; onSave: (p: any) => void; categories: string[]; isNew?: boolean;
}) {
  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    description: "",
    status: "draft",
    vendor_id: "",
    vendor_cost: "",
    inventory_mode: "flexible",
    stock_quantity: "0",
    sizes: [] as string[],
    colors: [] as string[],
    newSize: "",
    newColor: "",
  });

  const { data: vendors } = useQuery({
    queryKey: ["vendors-list"],
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("id, business_name").eq("status", "active");
      return data || [];
    },
  });

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        category: product.category || "",
        price: product.price?.toString() || "",
        description: product.description || "",
        status: (product as any).status || "draft",
        vendor_id: (product as any).vendor_id || "",
        vendor_cost: (product as any).vendor_cost?.toString() || "",
        inventory_mode: (product as any).inventory_mode || "flexible",
        stock_quantity: (product as any).stock_quantity?.toString() || "0",
        sizes: (product as any).sizes || [],
        colors: (product as any).colors || [],
        newSize: "",
        newColor: "",
      });
    } else {
      setForm({
        name: "",
        category: "",
        price: "",
        description: "",
        status: "draft",
        vendor_id: "",
        vendor_cost: "",
        inventory_mode: "flexible",
        stock_quantity: "0",
        sizes: [],
        colors: [],
        newSize: "",
        newColor: "",
      });
    }
  }, [product]);

  const handleSave = () => {
    if (!form.name.trim()) return;
    const data: any = {
      name: form.name,
      category: form.category || null,
      price: form.price ? parseFloat(form.price) : null,
      description: form.description || null,
      status: form.status,
      vendor_id: form.vendor_id || null,
      vendor_cost: form.vendor_cost ? parseFloat(form.vendor_cost) : null,
      inventory_mode: form.inventory_mode,
      stock_quantity: parseInt(form.stock_quantity) || 0,
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
      <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold">
            {isNew ? "Create New Product" : "Edit Product Details"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Left Column: Basic Info */}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Basic Information</label>
              <Input placeholder="Product name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="font-body" />
              <Input placeholder="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="font-body" />
              <Textarea placeholder="Full description..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="font-body min-h-[100px]" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Status</label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft (Private)</SelectItem>
                  <SelectItem value="active">Active (Visible)</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Right Column: Vendor & Pricing */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-primary uppercase tracking-wider px-1 inline-flex items-center gap-1">
                  <Package className="w-3 h-3" /> Vendor & Costing
                </label>
                <Select value={form.vendor_id} onValueChange={v => setForm(f => ({ ...f, vendor_id: v }))}>
                  <SelectTrigger className="font-body bg-background">
                    <SelectValue placeholder="Select Vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors?.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.business_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">Vendor Cost (MWK)</label>
                  <Input type="number" placeholder="Cost" value={form.vendor_cost} onChange={e => setForm(f => ({ ...f, vendor_cost: e.target.value }))} className="bg-background" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">Selling Price (MWK)</label>
                  <Input type="number" placeholder="Price" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="bg-background font-bold" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground bg-primary/5 p-2 rounded-lg leading-relaxed">
                💡 **PRO TIP:** If you enter the Vendor Cost, the AI Pricing Engine will automatically calculate the optimal Selling Price to guarantee your 30% profit margin!
              </p>
            </div>

            <div className="space-y-1 p-3 rounded-xl border border-border/50">
               <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Inventory Management</label>
               <div className="flex gap-4 items-center mt-1 mb-2">
                 <div className="flex items-center gap-1.5">
                   <input type="radio" checked={form.inventory_mode === "flexible"} onChange={() => setForm(f => ({ ...f, inventory_mode: "flexible" }))} id="flexible" />
                   <label htmlFor="flexible" className="text-xs font-medium cursor-pointer">Flexible</label>
                 </div>
                 <div className="flex items-center gap-1.5">
                   <input type="radio" checked={form.inventory_mode === "fixed"} onChange={() => setForm(f => ({ ...f, inventory_mode: "fixed" }))} id="fixed" />
                   <label htmlFor="fixed" className="text-xs font-medium cursor-pointer">Fixed</label>
                 </div>
               </div>
               {form.inventory_mode === "fixed" && (
                 <Input type="number" placeholder="Stock Quantity" value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))} className="h-8 text-xs" />
               )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
               <div className="space-y-2">
                 <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">Sizes</label>
                 <div className="flex gap-1">
                   <Input value={form.newSize} onChange={e => setForm(f => ({ ...f, newSize: e.target.value }))} onKeyDown={e => e.key === "Enter" && addTag("sizes")} placeholder="Add..." className="h-8 text-xs" />
                   <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => addTag("sizes")}><Plus className="w-3 h-3" /></Button>
                 </div>
                 <div className="flex flex-wrap gap-1">
                   {form.sizes.map((s, i) => (
                     <Badge key={i} variant="secondary" className="gap-1 text-[10px] px-1.5">
                       {s} <Trash2 className="w-2 w-2 cursor-pointer opacity-50 hover:opacity-100" onClick={() => removeTag("sizes", i)} />
                     </Badge>
                   ))}
                 </div>
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">Colors</label>
                 <div className="flex gap-1">
                   <Input value={form.newColor} onChange={e => setForm(f => ({ ...f, newColor: e.target.value }))} onKeyDown={e => e.key === "Enter" && addTag("colors")} placeholder="Add..." className="h-8 text-xs" />
                   <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => addTag("colors")}><Plus className="w-3 h-3" /></Button>
                 </div>
                 <div className="flex flex-wrap gap-1">
                   {form.colors.map((c, i) => (
                     <Badge key={i} variant="secondary" className="gap-1 text-[10px] px-1.5">
                       {c} <Trash2 className="w-2 w-2 cursor-pointer opacity-50 hover:opacity-100" onClick={() => removeTag("colors", i)} />
                     </Badge>
                   ))}
                 </div>
               </div>
            </div>
          </div>
        </div>
        <Button onClick={handleSave} className="w-full bg-primary hover:bg-primary/90 font-heading font-bold h-12 text-lg shadow-lg shadow-primary/20">
          Save Product & Sync
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default ProductsPage;
