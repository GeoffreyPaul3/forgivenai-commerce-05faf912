import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { 
  ShoppingBag, Copy, CheckCircle2, 
  Image as ImageIcon, Eye, Package, 
  Ruler, Palette, Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
} from "@/components/ui/dialog";

export default function AgentProductsPage() {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const ITEMS_PER_PAGE = 8;

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: agent, isLoading: agentLoading } = useQuery({
    queryKey: ["agent-profile", session?.user?.id],
    queryFn: async () => {
      if (session?.user?.id) {
        const { data } = await supabase
          .from("agents")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();
        return data;
      }
      return null;
    },
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["agent-products"],
    queryFn: async () => {
      // 1. Local products
      const { data: local } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .eq("is_luxury", false)
        .order("created_at", { ascending: false });

      // 2. Live products
      try {
        const res = await fetch("https://www.forgivenshoppingcentre.com/api/products/all");
        const live = await res.json();
        if (live.success && Array.isArray(live.data)) {
          const mappedLive = live.data.map((p: any) => ({
            id: `live_${p.id}`,
            name: p.name,
            category: p.category?.name || p.productType || "General",
            price: p.salePrice || p.price,
            currency: "MWK",
            images: p.images || [],
            description: p.description,
            sizes: (p.sizes && p.sizes.length > 0) ? p.sizes : 
                   (p.variants && p.variants.length > 0 && [...new Set(p.variants.map((v: any) => v.size || v.value || v.name).filter(Boolean))].length > 0) ? [...new Set(p.variants.map((v: any) => v.size || v.value || v.name).filter(Boolean))] :
                   (p.options?.find((o: any) => o.name?.toLowerCase().includes("size"))?.values || []),
            colors: (p.colors && p.colors.length > 0) ? p.colors :
                    (p.variants && p.variants.length > 0 && [...new Set(p.variants.map((v: any) => v.color || v.colour || v.name).filter(Boolean))].length > 0) ? [...new Set(p.variants.map((v: any) => v.color || v.colour || v.name).filter(Boolean))] :
                    (p.options?.find((o: any) => o.name?.toLowerCase().includes("color") || o.name?.toLowerCase().includes("colour"))?.values || []),
            isLive: true,
            created_at: p.createdAt
          }));
          const all = [...(local || []), ...mappedLive];
          return all.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        }
      } catch (e) {
        console.warn("Could not fetch live products for agents:", e);
      }

      return local || [];
    },
  });

  const copyLink = (productId: string) => {
    if (!agent?.referral_code) {
      toast({ title: "Referral code not found", variant: "destructive" });
      return;
    }
    const url = `${window.location.origin}/shop?ref=${agent.referral_code}&product=${productId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(productId);
    toast({ title: "Link Copied!", description: "Share this link to earn commission on this product." });
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (agentLoading || productsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm font-body">Loading catalog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-gold">
            Product Catalog
          </h2>
          <p className="text-muted-foreground font-body mt-1">
            Browse available products and grab your specific referral links to share with customers.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-muted/30 px-4 py-2 rounded-2xl border border-border">
          <Badge className="bg-gold/20 text-gold-dark hover:bg-gold/30 border-gold/30 font-bold">
            {agent?.commission_rate ?? 8}% Commission
          </Badge>
          <span className="text-sm font-body text-muted-foreground">on every referred order</span>
        </div>
      </div>

      {!products || products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border border-dashed border-border rounded-3xl bg-muted/10">
          <ShoppingBag className="w-12 h-12 text-muted-foreground/30" />
          <h3 className="font-heading text-xl font-bold">No Products Available</h3>
          <p className="text-muted-foreground font-body text-sm max-w-sm">
            There are currently no active products in the catalog to promote. Check back later!
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group rounded-3xl border border-border bg-card overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                <div className="aspect-[4/5] bg-muted relative overflow-hidden">
                  {p.images?.[0] ? (
                    <img 
                      src={p.images[0]} 
                      alt={p.name} 
                      className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105" 
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center opacity-30">
                      <ImageIcon className="w-12 h-12 mb-2" />
                      <span className="text-xs font-body font-bold uppercase">No Image</span>
                    </div>
                  )}
                  <div className="absolute top-3 right-3 flex flex-col gap-2">
                    <Badge className="bg-background/80 backdrop-blur-md text-foreground font-bold shadow-sm border-0">
                      MWK {(p.price || 0).toLocaleString()}
                    </Badge>
                  </div>
                  
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="rounded-full gap-2 font-bold shadow-xl scale-90 group-hover:scale-100 transition-transform"
                      onClick={() => setSelectedProduct(p)}
                    >
                      <Eye className="w-4 h-4" /> View Details
                    </Button>
                  </div>
                </div>
                
                <div className="p-5 flex-1 flex flex-col">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">{p.category || "General"}</p>
                  <h3 
                    className="font-heading font-bold text-lg mb-2 line-clamp-2 leading-tight hover:text-primary cursor-pointer transition-colors"
                    onClick={() => setSelectedProduct(p)}
                  >
                    {p.name}
                  </h3>
                  
                  <div className="space-y-3 mb-4">
                    {p.sizes && p.sizes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {p.sizes.map((s: string) => (
                          <Badge key={s} variant="outline" className="text-[10px] h-5 px-2 bg-muted/50 border-border/50 uppercase font-bold">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {p.colors && p.colors.length > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-1.5">
                          {p.colors.map((c: string) => (
                            <div 
                              key={c} 
                              className="w-4 h-4 rounded-full border-2 border-background shadow-sm" 
                              style={{ backgroundColor: c.toLowerCase() }}
                              title={c}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium truncate">
                          {p.colors.length} {p.colors.length === 1 ? 'Color' : 'Colors'} Available
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-auto pt-4">
                    <Button 
                      onClick={() => copyLink(p.id)}
                      className="w-full gap-2 rounded-xl h-11 font-bold shadow-sm"
                      variant={copiedId === p.id ? "default" : "secondary"}
                    >
                      {copiedId === p.id ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-white" />
                          <span className="text-white">Copied Link!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy Product Link
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {products.length > ITEMS_PER_PAGE && (
            <div className="mt-10 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(p => Math.max(1, p - 1));
                      }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: Math.ceil(products.length / ITEMS_PER_PAGE) }).map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(i + 1);
                        }}
                        isActive={currentPage === i + 1}
                        className="cursor-pointer"
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(p => Math.min(Math.ceil(products.length / ITEMS_PER_PAGE), p + 1));
                      }}
                      className={currentPage === Math.ceil(products.length / ITEMS_PER_PAGE) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}

      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="max-w-3xl rounded-[2rem] p-0 overflow-hidden border-0 shadow-2xl">
          {selectedProduct && (
            <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
              {/* Image Gallery Section */}
              <div className="w-full md:w-1/2 bg-muted/30 p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                <div className="aspect-square rounded-[1.5rem] overflow-hidden bg-white shadow-inner">
                  {selectedProduct.images?.[0] ? (
                    <img src={selectedProduct.images[0]} alt={selectedProduct.name} className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20"><ImageIcon className="w-20 h-20" /></div>
                  )}
                </div>
                {selectedProduct.images && selectedProduct.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-3">
                    {selectedProduct.images.slice(1).map((img: string, idx: number) => (
                      <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-border/50 bg-white">
                        <img src={img} alt={`${selectedProduct.name} ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Details Section */}
              <div className="w-full md:w-1/2 p-8 flex flex-col overflow-y-auto custom-scrollbar bg-card">
                <div className="mb-6">
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-0 font-bold mb-3 uppercase tracking-wider text-[10px]">
                    {selectedProduct.category || 'General'}
                  </Badge>
                  <DialogTitle className="font-heading text-2xl font-black leading-tight mb-2">
                    {selectedProduct.name}
                  </DialogTitle>
                  <div className="text-2xl font-black text-primary font-heading">
                    MWK {(selectedProduct.price || 0).toLocaleString()}
                  </div>
                </div>

                <div className="space-y-6 mb-8">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-black uppercase text-muted-foreground tracking-widest">
                      <Info className="w-3.5 h-3.5" /> Description
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed font-body">
                      {selectedProduct.description || selectedProduct.ai_description || "No description available for this product."}
                    </p>
                  </div>

                  {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-black uppercase text-muted-foreground tracking-widest">
                        <Ruler className="w-3.5 h-3.5" /> Available Sizes
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedProduct.sizes.map((s: string) => (
                          <Badge key={s} variant="outline" className="px-3 h-8 rounded-lg bg-muted/30 border-border/50 font-bold">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedProduct.colors && selectedProduct.colors.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-black uppercase text-muted-foreground tracking-widest">
                        <Palette className="w-3.5 h-3.5" /> Available Colours
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {selectedProduct.colors.map((c: string) => (
                          <div key={c} className="flex items-center gap-2">
                            <div 
                              className="w-5 h-5 rounded-full border-2 border-background shadow-md" 
                              style={{ backgroundColor: c.toLowerCase() }}
                            />
                            <span className="text-xs font-medium text-muted-foreground">{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-6 border-t border-border/50 flex flex-col gap-3">
                  <Button 
                    onClick={() => { copyLink(selectedProduct.id); setSelectedProduct(null); }}
                    className="w-full gap-2 rounded-2xl h-14 font-black text-lg shadow-lg shadow-primary/20 transition-all active:scale-95"
                  >
                    <Copy className="w-5 h-5" />
                    Copy Referral Link
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setSelectedProduct(null)}
                    className="w-full rounded-2xl h-12 font-bold text-muted-foreground"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
