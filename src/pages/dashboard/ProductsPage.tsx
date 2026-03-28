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

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", search, categoryFilter],
    queryFn: async () => {
      let query = supabase.from("products").select("*").order("created_at", { ascending: false });
      if (search) query = query.ilike("name", `%${search}%`);
      if (categoryFilter !== "all") query = query.eq("category", categoryFilter);
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
  const [form, setForm] = useState({ name: "", category: "", price: "", description: "", status: "draft" });

  useEffect(() => {
    if (product) {
      setForm({ name: product.name, category: product.category || "", price: product.price?.toString() || "", description: product.description || "", status: product.status || "draft" });
    } else {
      setForm({ name: "", category: "", price: "", description: "", status: "draft" });
    }
  }, [product]);

  const handleSave = () => {
    if (!form.name.trim()) return;
    const data: any = { name: form.name, category: form.category || null, price: form.price ? parseFloat(form.price) : null, description: form.description || null, status: form.status };
    if (product) data.id = product.id;
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-heading">{isNew ? "Add Product" : "Edit Product"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Product name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input placeholder="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
          <Input placeholder="Price" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
          <Textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSave} className="w-full">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ProductsPage;
