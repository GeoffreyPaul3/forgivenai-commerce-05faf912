import { useState, useEffect, useMemo } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Sparkles, Pencil, Trash2, ExternalLink, Loader2, Image as ImageIcon, Package, TrendingUp, X, ImageOff, Layers, Zap } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { motion } from "framer-motion";
import PricingIntelligenceCard from "@/components/dashboard/pricing/PricingIntelligenceCard";

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

type Product = Tables<"products">;
const PAGE_SIZE = 12;

const ProductsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [statusTab, setStatusTab] = useState<"all" | "active" | "draft" | "archived">("all");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [decomposeProduct, setDecomposeProduct] = useState<Product | null>(null);
  const [isDecomposing, setIsDecomposing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [page, setPage] = useState(1);

  const { data: allVendors } = useQuery({
    queryKey: ["vendors-all-list"],
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("id, business_name").eq("status", "active");
      return data || [];
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      return data;
    }
  });

  // Fetch Operations Cost from Settings
  const { data: operationsCostStr } = useQuery({
    queryKey: ["settings", "operations_cost"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "operations_cost")
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data?.value || "5000";
    },
  });
  const operationsCost = Number(operationsCostStr || "5000");

  const { data: vendorId } = useQuery({
    queryKey: ["user-vendor-id", profile?.id],
    enabled: profile?.role === "vendor",
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("id").eq("user_id", profile!.id).maybeSingle();
      return data?.id;
    }
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products-all-synced", categoryFilter, vendorFilter, profile?.role, vendorId],
    enabled: !!profile,
    queryFn: async () => {
      // 1. Fetch local products
      let query = supabase.from("products").select("*").order("created_at", { ascending: false });
      if (categoryFilter !== "all") query = query.eq("category", categoryFilter);
      if (profile?.role === "vendor" && vendorId) {
        query = query.eq("vendor_id", vendorId);
      } else if (vendorFilter !== "all") {
        if (vendorFilter === "in_house") {
          query = query.is("vendor_id", null);
        } else {
          query = query.eq("vendor_id", vendorFilter);
        }
      }
      const { data: local, error } = await query;
      if (error) throw error;

      // 2. Fetch live website products
      try {
        const res = await fetch("https://www.forgivenshoppingcentre.com/api/products/all");
        const live = await res.json();
        if (live.success && Array.isArray(live.data)) {
          const mappedLive = live.data.map((p: any) => ({
            id: `live_${p.id}`,
            name: `[LIVE] ${p.name}`,
            category: p.category?.name || p.productType || "General",
            price: p.salePrice || p.price,
            currency: "MWK",
            images: p.images || [],
            description: p.description,
            status: p.isActive ? "active" : "archived",
            isLive: true,
            created_at: p.createdAt,
            vendor_id: null,
            metadata: p.metadata || {}
          }));
          
          let filteredLive = mappedLive;
          if (categoryFilter !== "all") {
            filteredLive = filteredLive.filter((p: any) => p.category === categoryFilter);
          }

          // Only show live products to non-vendors or if they are "admin"
          const allProducts = profile?.role === "vendor" ? (local || []) : [...(local || []), ...filteredLive];
          return (allProducts as any[]).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        }
      } catch (e) {
        console.warn("Could not fetch live products:", e);
      }
      
      return local as Product[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("category").not("category", "is", null);
      return [...new Set((data || []).map(d => d.category).filter(Boolean))] as string[];
    },
  });

  const duplicateSKUs = useMemo(() => {
    if (!products) return new Set<string>();
    const skusCount = new Map<string, number>();
    products.forEach((p: any) => {
      const adminSku = p.metadata?.sku;
      const vendorSku = p.metadata?.vendor_sku;
      if (adminSku) {
        const cleanAdmin = adminSku.toLowerCase().trim();
        skusCount.set(cleanAdmin, (skusCount.get(cleanAdmin) || 0) + 1);
      }
      if (vendorSku) {
        const cleanVendor = vendorSku.toLowerCase().trim();
        skusCount.set(cleanVendor, (skusCount.get(cleanVendor) || 0) + 1);
      }
    });
    const duplicates = new Set<string>();
    skusCount.forEach((count, sku) => {
      if (count > 1) duplicates.add(sku);
    });
    return duplicates;
  }, [products]);

  const statusCounts = useMemo(() => {
    if (!products) return { all: 0, active: 0, draft: 0, archived: 0 };
    const all = products.length;
    const active = products.filter((p: any) => (p.status || "draft") === "active").length;
    const draft = products.filter((p: any) => (p.status || "draft") === "draft").length;
    const archived = products.filter((p: any) => (p.status || "draft") === "archived").length;
    return { all, active, draft, archived };
  }, [products]);

  const filteredProductsList = useMemo(() => {
    if (!products) return [];
    // Apply status tab filter first
    const byStatus = statusTab === "all"
      ? products
      : products.filter((p: any) => (p.status || "draft") === statusTab);
    // Then apply search
    if (!search.trim()) return byStatus;
    const searchLower = search.toLowerCase().trim();
    return byStatus.filter((p: any) => {
      const nameMatch = p.name?.toLowerCase().includes(searchLower);
      const skuMatch = p.metadata?.sku?.toLowerCase().includes(searchLower);
      const vendorSkuMatch = p.metadata?.vendor_sku?.toLowerCase().includes(searchLower);
      return nameMatch || skuMatch || vendorSkuMatch;
    });
  }, [products, search, statusTab]);

  useEffect(() => { setPage(1); }, [search, categoryFilter, vendorFilter, statusTab]);

  const totalPages = Math.ceil((filteredProductsList?.length || 0) / PAGE_SIZE);
  const paginatedProducts = filteredProductsList?.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) || [];

  
  const handleDecompose = async (product: Product) => {
    if (!product.images || product.images.length === 0) {
      toast({ title: "No images", description: "Product needs an image to decompose", variant: "destructive" });
      return;
    }
    setDecomposeProduct(product);
    setIsDecomposing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${supabase['supabaseUrl']}/functions/v1/decompose-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          imageUrl: product.images[0],
          productId: product.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Decomposition failed");
      toast({ title: "Intelligence Extracted", description: `Found ${data.analysis?.garment_count || 1} item(s) in this image.` });
      queryClient.invalidateQueries({ queryKey: ["products-all-synced"] });
    } catch (e: any) {
      toast({ title: "Decomposition failed", description: e.message, variant: "destructive" });
    } finally {
      setIsDecomposing(false);
    }
  };

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

      {/* Status Tabs */}
      <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as typeof statusTab)}>
        <TabsList className="h-auto bg-card border border-border rounded-xl p-1 gap-1 flex-wrap">
          <TabsTrigger
            value="all"
            className="rounded-lg text-xs font-bold px-4 py-2 gap-2 data-[state=active]:bg-foreground data-[state=active]:text-background transition-all"
          >
            All
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-muted text-muted-foreground data-[state=active]:bg-background/20 data-[state=active]:text-inherit">
              {statusCounts.all}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="active"
            className="rounded-lg text-xs font-bold px-4 py-2 gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white transition-all"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
            Active
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-700 data-[state=active]:bg-white/20 data-[state=active]:text-white">
              {statusCounts.active}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="draft"
            className="rounded-lg text-xs font-bold px-4 py-2 gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-white transition-all"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
            Draft
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-700 data-[state=active]:bg-white/20 data-[state=active]:text-white">
              {statusCounts.draft}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="archived"
            className="rounded-lg text-xs font-bold px-4 py-2 gap-2 data-[state=active]:bg-muted-foreground data-[state=active]:text-background transition-all"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
            Archived
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-muted text-muted-foreground data-[state=active]:bg-white/20 data-[state=active]:text-inherit">
              {statusCounts.archived}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

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
        {profile?.role !== "vendor" && (
          <Select value={vendorFilter} onValueChange={setVendorFilter}>
            <SelectTrigger className="w-[180px] bg-card">
              <SelectValue placeholder="All Vendors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              <SelectItem value="in_house">In-House Products</SelectItem>
              {allVendors?.map(v => (
                <SelectItem key={v.id} value={v.id}>{v.business_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
          {paginatedProducts.map((product, idx) => {
            const isDuplicateSku = (product as any).metadata?.sku && duplicateSKUs.has((product as any).metadata.sku.toLowerCase().trim());
            const isDuplicateVendorSku = (product as any).metadata?.vendor_sku && duplicateSKUs.has((product as any).metadata.vendor_sku.toLowerCase().trim());
            const hasDuplicate = isDuplicateSku || isDuplicateVendorSku;

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              className="group rounded-xl border border-border bg-card relative hover:border-gold/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
            >
              {/* Floating Large Hover Preview */}
              {product.images && product.images.length > 0 && (
                <div className="absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 w-64 h-64 rounded-2xl border border-border bg-popover shadow-2xl p-1.5 pointer-events-none opacity-0 scale-95 translate-y-3 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 transition-all duration-300 z-50 overflow-hidden flex flex-col items-center justify-center">
                  <img
                    src={product.images[0]}
                    alt={`${product.name} Hover Preview`}
                    className="w-full h-full object-cover rounded-xl bg-background shadow-inner"
                  />
                  <div className="absolute bottom-3 left-3 right-3 bg-background/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-border text-center shadow-md">
                    <p className="text-[10px] font-black text-foreground truncate uppercase tracking-tighter">{product.name}</p>
                    <p className="text-[9px] font-bold text-primary font-body mt-0.5">{product.currency} {product.price?.toLocaleString()}</p>
                  </div>
                </div>
              )}

              {/* Image */}
              <div className="relative h-48 bg-muted overflow-hidden rounded-t-xl">
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
                <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
                  <Badge variant="outline" className={`text-[10px] font-semibold backdrop-blur-sm ${statusColor(product.status)}`}>
                    {product.status || "draft"}
                  </Badge>
                  <Badge variant="secondary" className="text-[9px] font-bold uppercase backdrop-blur-sm bg-background/80">
                    {product.vendor_id ? "Vendor" : "In-House"}
                  </Badge>
                  {product.is_luxury && (
                    <Badge className="bg-primary text-white text-[9px] font-black uppercase tracking-tighter shadow-sm shadow-primary/20">
                      LUXURY
                    </Badge>
                  )}
                </div>
                {/* Quick actions overlay */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!(product as any).isLive ? (
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7 backdrop-blur-sm bg-background/80 hover:bg-background"
                      onClick={() => setEditProduct(product)}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                  ) : (
                    <Badge variant="secondary" className="bg-primary text-white text-[10px] h-7 px-2 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> SYNCED
                    </Badge>
                  )}
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
                <div className="flex flex-wrap gap-1.5 items-center">
                  {((product as any).metadata?.sku) && (
                    <div className="text-[10px] font-mono font-bold text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-md">
                      SKU: {(product as any).metadata.sku}
                    </div>
                  )}
                  {((product as any).metadata?.vendor_sku) && (
                    <div className="text-[10px] font-mono font-bold text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-md">
                      V-SKU: {(product as any).metadata.vendor_sku}
                    </div>
                  )}
                  {hasDuplicate && (
                    <Badge variant="destructive" className="text-[8px] font-bold py-0.5 px-1 bg-red-500 text-white rounded">
                      ⚠️ Duplicate SKU
                    </Badge>
                  )}
                </div>

                {/* Bottom actions */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="flex gap-1">
                    {product.source_url && (
                      <a href={product.source_url} target="_blank" rel="noopener noreferrer">
                        <Button size="icon" variant="ghost" className="h-7 w-7"><ExternalLink className="w-3 h-3" /></Button>
                      </a>
                    )}
                  </div>
                  {!(product as any).isLive && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(product.id)}
                      className="h-7 w-7 text-destructive/60 hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )})}
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

      <ProductDialog product={editProduct} open={!!editProduct} onClose={() => setEditProduct(null)} onSave={(p) => updateMutation.mutate(p as any)} categories={categories || []} operationsCost={operationsCost} />
      <ProductDialog product={null} open={showAdd} onClose={() => setShowAdd(false)} onSave={(p) => insertMutation.mutate(p as any)} categories={categories || []} isNew operationsCost={operationsCost} />
    </div>
  );
};

function ProductDialog({ product, open, onClose, onSave, categories, isNew, operationsCost }: {
  product: Product | null; open: boolean; onClose: () => void; onSave: (p: any) => void; categories: string[]; isNew?: boolean; operationsCost: number;
}) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  
  const [form, setForm] = useState({
    name: "",
    sku: "",
    vendor_sku: "",
    category: "",
    price: "",
    description: "",
    status: "draft",
    vendor_id: "",
    vendor_cost: "",
    inventory_mode: "flexible",
    stock_quantity: "0",
    stock_status: "available",
    sizes: [] as string[],
    colors: [] as string[],
    is_luxury: false,
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
        sku: (product as any).metadata?.sku || "",
        vendor_sku: (product as any).metadata?.vendor_sku || "",
        category: product.category || "",
        price: product.price?.toString() || "",
        description: product.description || "",
        status: (product as any).status || "draft",
        vendor_id: (product as any).vendor_id || "none",
        vendor_cost: (product as any).vendor_cost?.toString() || "",
        inventory_mode: (product as any).inventory_mode || "flexible",
        stock_quantity: (product as any).stock_quantity?.toString() || "0",
        stock_status: (product as any).stock_status || "available",
        sizes: (product as any).sizes || [],
        colors: (product as any).colors || [],
        is_luxury: product.is_luxury || false,
        newSize: "",
        newColor: "",
      });
      setPreviewUrls(product.images || []);
      setImageFiles([]);
    } else {
      setForm({
        name: "",
        sku: "",
        vendor_sku: "",
        category: "",
        price: "",
        description: "",
        status: "draft",
        vendor_id: "none",
        vendor_cost: "",
        inventory_mode: "flexible",
        stock_quantity: "0",
        stock_status: "available",
        sizes: [],
        colors: [],
        is_luxury: false,
        newSize: "",
        newColor: "",
      });
      setPreviewUrls([]);
      setImageFiles([]);
    }
  }, [product, open]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const totalFiles = previewUrls.length + files.length;
      if (totalFiles > 5) {
        toast({ title: "Maximum 5 images allowed", variant: "destructive" });
        return;
      }
      const newFiles = [...imageFiles, ...files].slice(0, 5);
      setImageFiles(newFiles);
      
      const newPreviews = [...previewUrls, ...files.map(f => URL.createObjectURL(f))].slice(0, 5);
      setPreviewUrls(newPreviews);
    }
  };

  const removeImage = (idx: number) => {
    const urlToRemove = previewUrls[idx];
    
    if (urlToRemove.startsWith("blob:")) {
      const existingCount = previewUrls.filter(u => !u.startsWith("blob:")).length;
      const fileIndex = idx - existingCount;
      if (fileIndex >= 0) {
        const newFiles = [...imageFiles];
        newFiles.splice(fileIndex, 1);
        setImageFiles(newFiles);
      }
    }
    
    const newPreviews = [...previewUrls];
    newPreviews.splice(idx, 1);
    setPreviewUrls(newPreviews);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    
    setIsUploading(true);
    try {
      // 1. Check admin SKU uniqueness
      const cleanSku = form.sku.trim();
      if (cleanSku) {
        let query = supabase.from("products").select("id").eq("metadata->>sku", cleanSku);
        if (product) query = query.neq("id", product.id);
        const { data: duplicateSku, error: skuErr } = await query;
        if (skuErr) throw skuErr;
        if (duplicateSku && duplicateSku.length > 0) {
          toast({
            title: "Duplicate SKU Error ⚠️",
            description: `A product with SKU "${cleanSku}" already exists in the catalog.`,
            variant: "destructive",
          });
          setIsUploading(false);
          return;
        }
      }

      // 2. Check vendor SKU uniqueness
      const cleanVendorSku = form.vendor_sku.trim();
      if (cleanVendorSku) {
        let query = supabase.from("products").select("id").eq("metadata->>vendor_sku", cleanVendorSku);
        if (product) query = query.neq("id", product.id);
        const { data: duplicateVendorSku, error: vendorSkuErr } = await query;
        if (vendorSkuErr) throw vendorSkuErr;
        if (duplicateVendorSku && duplicateVendorSku.length > 0) {
          toast({
            title: "Duplicate Vendor SKU Error ⚠️",
            description: `A product with Vendor SKU "${cleanVendorSku}" already exists in the catalog.`,
            variant: "destructive",
          });
          setIsUploading(false);
          return;
        }
      }

      const uploadedUrls: string[] = [];
      
      for (const file of imageFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `product_images/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('vendor-products')
          .upload(filePath, file);
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('vendor-products')
          .getPublicUrl(filePath);
          
        uploadedUrls.push(publicUrl);
      }

      const existingUrls = previewUrls.filter(url => !url.startsWith('blob:'));
      const finalImages = [...existingUrls, ...uploadedUrls].slice(0, 5);

      let metadata = product?.metadata as any || {};
      
      // Update metadata with input SKUs if they exist
      if (cleanSku) {
        metadata.sku = cleanSku;
      } else if (!product) {
        const isVendor = form.vendor_id !== "none";
        const prefix = isVendor ? "FSC-VEN-" : "FSC-";
        metadata.sku = `${prefix}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      }

      if (cleanVendorSku) {
        metadata.vendor_sku = cleanVendorSku;
      } else {
        delete metadata.vendor_sku;
      }

      const data: any = {
        name: form.name,
        category: form.category || null,
        price: form.price ? parseFloat(form.price) : null,
        description: form.description || null,
        status: form.status,
        vendor_id: form.vendor_id === "none" ? null : (form.vendor_id || null),
        vendor_cost: form.vendor_cost ? parseFloat(form.vendor_cost) : null,
        inventory_mode: form.inventory_mode,
        stock_quantity: parseInt(form.stock_quantity) || 0,
        stock_status: form.stock_status,
        sizes: form.sizes,
        colors: form.colors,
        is_luxury: form.is_luxury,
        images: finalImages,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
      };
      if (product) data.id = product.id;
      onSave(data);
    } catch (err: any) {
      toast({ title: "Failed to upload images", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
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

  const generateAiDescription = async () => {
    if (!form.name.trim()) {
      toast({ title: "Product name required", description: "Please enter a name first.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    try {
      let productImage: string | null = null;
      if (imageFiles && imageFiles.length > 0) {
        productImage = await fileToBase64(imageFiles[0]);
      } else if (previewUrls && previewUrls.length > 0 && !previewUrls[0].startsWith("blob:")) {
        productImage = previewUrls[0];
      }

      const { data, error } = await supabase.functions.invoke("ai-generate", {
        body: {
          type: "product-description",
          productName: form.name,
          productCategory: form.category,
          productPrice: form.price,
          currency: "MWK",
          productImage: productImage,
        },
      });
      if (error) throw error;
      if (data?.content) {
        setForm(f => ({ ...f, description: data.content }));
        toast({ title: "AI description generated!" });
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: "Failed to generate description", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const removeTag = (type: "sizes" | "colors", idx: number) => {
    setForm(f => ({
      ...f,
      [type]: f[type].filter((_, i) => i !== idx),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-4xl overflow-y-auto max-h-[85vh] rounded-3xl p-0 border-0 shadow-2xl custom-scrollbar">
        <div className="bg-gradient-to-br from-primary/10 via-background to-background p-5 sm:p-8 pb-4 sm:pb-6 border-b border-border/50">
           <DialogTitle className="font-heading text-2xl font-black tracking-tight">
             {isNew ? "Create New Product" : "Edit Product Details"}
           </DialogTitle>
           <p className="text-muted-foreground text-sm font-body mt-1">Configure your product, inventory, and vendor costing.</p>
        </div>
        
        <div className="p-5 sm:p-8 space-y-6 sm:space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-10">
            {/* Column 1: Basic Identity */}
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Product Identity</label>
                <div className="space-y-4">
                  <Input 
                    placeholder="SKU (Auto-generated on save)" 
                    value={form.sku} 
                    onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                    className="font-body h-12 rounded-xl bg-muted/20 border-border/50 text-foreground font-mono focus:bg-background transition-all" 
                  />
                  <Input 
                    placeholder="Vendor SKU (Optional)" 
                    value={form.vendor_sku} 
                    onChange={e => setForm(f => ({ ...f, vendor_sku: e.target.value }))}
                    className="font-body h-12 rounded-xl bg-muted/20 border-border/50 text-foreground font-mono focus:bg-background transition-all" 
                  />
                  <Input placeholder="Product name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="font-body h-12 rounded-xl bg-muted/20 border-border/50 focus:bg-background transition-all" />
                  <Input placeholder="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="font-body h-12 rounded-xl bg-muted/20 border-border/50 focus:bg-background transition-all" />
                  <div className="relative group/desc">
                    <Textarea 
                      placeholder="Full description..." 
                      value={form.description} 
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
                      className="font-body min-h-[200px] rounded-xl bg-muted/20 border-border/50 p-4 focus:bg-background transition-all pr-12" 
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="absolute right-3 top-3 h-8 w-8 text-primary hover:bg-primary/10 transition-colors"
                      onClick={generateAiDescription}
                      disabled={isGenerating}
                      title="Generate AI Description"
                    >
                      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Visibility Status</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="font-body h-12 rounded-xl bg-muted/20 border-border/50"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="draft">Draft (Internal Only)</SelectItem>
                    <SelectItem value="active">Active (Storefront Visible)</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Product Tier (Workflow V2)</label>
                <Select value={form.is_luxury ? "luxury" : "essentials"} onValueChange={v => setForm(f => ({ ...f, is_luxury: v === "luxury" }))}>
                  <SelectTrigger className="font-body h-12 rounded-xl bg-muted/20 border-border/50"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="essentials">Essentials (Agent Marketable)</SelectItem>
                    <SelectItem value="luxury">Luxury (In-House Only)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[9px] text-muted-foreground px-1">Luxury products are hidden from the Agent Portal.</p>
              </div>

              <div className="space-y-4 pt-4 border-t border-border/40">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Product Images (Max 5)</label>
                <div className="flex flex-wrap gap-4">
                  {previewUrls.map((url, idx) => (
                    <div key={idx} className="relative w-20 h-20 group">
                      <div className="w-full h-full rounded-xl border border-border/50 overflow-hidden bg-muted/20 shadow-inner relative">
                        <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover group-hover:opacity-40 transition-opacity" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute inset-0 m-auto w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      {/* Floating full-size preview on hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 h-64 rounded-2xl border border-border bg-popover shadow-2xl p-1.5 pointer-events-none opacity-0 scale-95 translate-y-2 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 transition-all duration-200 z-50 overflow-hidden">
                        <img src={url} alt={`Full Preview ${idx + 1}`} className="w-full h-full object-contain rounded-xl bg-background" />
                      </div>
                    </div>
                  ))}
                  
                  {previewUrls.length < 5 && (
                    <label className="w-20 h-20 flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border/50 bg-muted/10 cursor-pointer hover:bg-muted/20 hover:border-primary/50 transition-all group">
                      <div className="w-6 h-6 rounded-full bg-background shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <span className="text-[8px] font-black uppercase text-muted-foreground group-hover:text-primary">Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Column 2: Vendor & Pricing */}
            <div className="space-y-6">
              <div className="p-6 rounded-[2rem] bg-primary/5 border border-primary/10 space-y-6 shadow-sm">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-primary uppercase tracking-widest px-1 inline-flex items-center gap-2">
                    <Package className="w-3.5 h-3.5" /> Vendor Fulfillment
                  </label>
                  <Select value={form.vendor_id} onValueChange={v => setForm(f => ({ ...f, vendor_id: v }))}>
                    <SelectTrigger className="font-body h-12 rounded-xl bg-background border-primary/20 shadow-sm">
                      <SelectValue placeholder="Select Supply Partner" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="none" className="font-bold text-primary">In-house stock</SelectItem>
                      {vendors?.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.business_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase px-1">Vendor Cost (MWK)</label>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={form.vendor_cost} 
                      onChange={e => {
                        const cost = e.target.value;
                        const suggested = cost ? Math.ceil((parseFloat(cost) + operationsCost) / 0.55) : "";
                        setForm(f => ({ ...f, vendor_cost: cost, price: suggested.toString() }));
                      }} 
                      className="h-12 rounded-xl bg-background border-border/50 font-mono font-bold" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-primary uppercase px-1">FSC Store Price (MWK)</label>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={form.price} 
                      onChange={e => setForm(f => ({ ...f, price: e.target.value }))} 
                      className="h-12 rounded-xl bg-background border-primary/30 font-mono font-black text-primary text-lg" 
                    />
                  </div>
                </div>
                <PricingIntelligenceCard
                  vendorCost={form.vendor_cost ? parseFloat(form.vendor_cost) : 0}
                  operationsCost={operationsCost}
                />
              </div>
            </div>

            {/* Column 3: Inventory & Variants */}
            <div className="space-y-6">
              <div className="space-y-4 p-6 rounded-[2rem] border border-border/50 bg-muted/10 shadow-inner">
                 <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Inventory Management</label>
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
          
          <Button disabled={!form.name.trim() || isUploading} onClick={handleSave} className="w-full bg-primary text-white hover:bg-primary/90 font-heading font-black h-14 sm:h-20 text-lg sm:text-2xl rounded-2xl sm:rounded-[2rem] shadow-2xl shadow-primary/30 transition-all hover:scale-[1.005] active:scale-[0.995] flex items-center justify-center gap-3">
            {isUploading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Saving & Uploading...
              </>
            ) : (
              <>
                <Package className="w-6 h-6" /> Save Product & Update Catalog
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ProductsPage;
