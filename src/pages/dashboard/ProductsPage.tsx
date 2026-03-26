import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Sparkles, Pencil, Trash2, ExternalLink, Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;

const ProductsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);

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
    } catch (e) {
      toast({ title: "Failed to generate description", variant: "destructive" });
    } finally {
      setAiLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Products</h2>
          <p className="text-muted-foreground text-sm font-body">{products?.length || 0} products in catalog</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="rounded-xl border border-border bg-card animate-pulse h-72" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products?.map(product => (
            <div key={product.id} className="rounded-xl border border-border bg-card overflow-hidden group hover:border-gold/20 transition-all">
              {product.images && product.images.length > 0 ? (
                <div className="relative h-48 overflow-hidden">
                  <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <span className="px-2 py-0.5 text-xs rounded-full bg-primary/90 text-primary-foreground font-body">{product.status}</span>
                  </div>
                </div>
              ) : (
                <div className="h-48 bg-muted flex items-center justify-center text-muted-foreground text-sm">No image</div>
              )}
              <div className="p-4 space-y-2">
                <h4 className="font-heading font-semibold text-foreground text-sm truncate">{product.name}</h4>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-body">{product.category}</span>
                  <span className="text-sm font-semibold text-primary font-body">{product.currency} {product.price?.toLocaleString()}</span>
                </div>
                {product.ai_description && (
                  <p className="text-xs text-muted-foreground font-body line-clamp-2">{product.ai_description}</p>
                )}
                <div className="flex gap-1 pt-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditProduct(product)} className="gap-1 text-xs">
                    <Pencil className="w-3 h-3" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => generateAiDescription(product)}
                    disabled={aiLoading === product.id}
                    className="gap-1 text-xs"
                  >
                    {aiLoading === product.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    AI Desc
                  </Button>
                  {product.source_url && (
                    <a href={product.source_url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost" className="gap-1 text-xs">
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </a>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(product.id)} className="gap-1 text-xs text-destructive hover:text-destructive">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <ProductDialog
        product={editProduct}
        open={!!editProduct}
        onClose={() => setEditProduct(null)}
        onSave={(p) => updateMutation.mutate(p as any)}
        categories={categories || []}
      />

      {/* Add Dialog */}
      <ProductDialog
        product={null}
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={(p) => insertMutation.mutate(p as any)}
        categories={categories || []}
        isNew
      />
    </div>
  );
};

function ProductDialog({
  product,
  open,
  onClose,
  onSave,
  categories,
  isNew,
}: {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onSave: (p: any) => void;
  categories: string[];
  isNew?: boolean;
}) {
  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    description: "",
    status: "draft",
  });

  useState(() => {
    if (product) {
      setForm({
        name: product.name,
        category: product.category || "",
        price: product.price?.toString() || "",
        description: product.description || "",
        status: product.status || "draft",
      });
    } else {
      setForm({ name: "", category: "", price: "", description: "", status: "draft" });
    }
  });

  const handleSave = () => {
    if (!form.name.trim()) return;
    const data: any = {
      name: form.name,
      category: form.category || null,
      price: form.price ? parseFloat(form.price) : null,
      description: form.description || null,
      status: form.status,
    };
    if (product) data.id = product.id;
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">{isNew ? "Add Product" : "Edit Product"}</DialogTitle>
        </DialogHeader>
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
