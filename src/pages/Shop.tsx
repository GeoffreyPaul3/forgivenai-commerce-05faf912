import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, Search, SlidersHorizontal, MessageCircle, Star,
  ChevronDown, Heart, Eye, ArrowRight, Sparkles, X, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const WHATSAPP_NUMBER = "+265997128899";

export default function Shop() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [liked, setLiked] = useState<Set<string>>(new Set());

  // Save referral code
  useEffect(() => {
    if (refCode) {
      localStorage.setItem("referral_code", refCode);
      console.log("Shop: Captured referral code:", refCode);
    }
  }, [refCode]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["shop-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const categories = useMemo(() => {
    if (!products) return [];
    const cats = [...new Set(products.map((p: any) => p.category).filter(Boolean))];
    return cats.sort();
  }, [products]);

  const filtered = useMemo(() => {
    if (!products) return [];
    return products.filter((p: any) => {
      const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase());
      const matchCategory = selectedCategory === "all" || p.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [products, search, selectedCategory]);

  const orderViaWhatsApp = (product: any) => {
    const ref = localStorage.getItem("referral_code") || refCode || "";
    let message = `Hi! I'd like to order:\n\n🛍️ *${product.name}*\n💰 ${product.currency || "MWK"} ${product.price?.toLocaleString()}\n📦 Category: ${product.category || "Fashion"}`;
    if (ref) {
      message += `\n🏷️ Referral: ${ref}`;
    }
    message += `\n\nPlease let me know about availability and delivery. Thank you!`;
    const url = `https://wa.me/${WHATSAPP_NUMBER.replace("+", "")}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const toggleLike = (id: string) => {
    setLiked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold to-gold-light flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-maroon-dark" />
            </div>
            <span className="font-heading text-lg font-bold text-white tracking-tight">
              Forgiven<span className="text-gold">.</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-full px-5 h-9"
              onClick={() => {
                const ref = localStorage.getItem("referral_code") || refCode || "";
                let msg = "Hi! I'm browsing your shop and would like to learn more about your products.";
                if (ref) msg += ` (Ref: ${ref})`;
                window.open(`https://wa.me/${WHATSAPP_NUMBER.replace("+", "")}?text=${encodeURIComponent(msg)}`, "_blank");
              }}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chat with us</span>
            </Button>
          </div>
        </div>
      </nav>

      {/* Referral Welcome Banner */}
      {refCode && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-16 left-0 right-0 z-40 bg-gradient-to-r from-gold/20 via-gold/10 to-gold/20 border-b border-gold/20 backdrop-blur-xl"
        >
          <div className="container mx-auto px-4 py-2.5 flex items-center justify-center gap-3">
            <Sparkles className="w-4 h-4 text-gold" />
            <p className="text-sm text-gold-light font-body">
              You've been referred! Enjoy our premium collection.
            </p>
            <Badge className="bg-gold/20 text-gold border-gold/30 text-[10px] font-mono">
              REF: {refCode}
            </Badge>
          </div>
        </motion.div>
      )}

      {/* Hero */}
      <section className={`relative overflow-hidden ${refCode ? "pt-32" : "pt-24"} pb-16`}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-[150px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-maroon/10 rounded-full blur-[150px]" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Premium{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold via-gold-light to-gold">
                Fashion
              </span>
            </h1>
            <p className="text-white/50 text-base md:text-lg font-body font-light max-w-xl mx-auto mb-10">
              Curated collection of world-class fashion. Order instantly via WhatsApp.
            </p>
          </motion.div>

          {/* Search & Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-2xl mx-auto"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 pr-4 h-14 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/30 text-base focus:border-gold/40 focus:ring-gold/20"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-white/40 hover:text-white" />
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`shrink-0 px-5 py-2 rounded-full text-sm font-body font-medium transition-all ${
                  selectedCategory === "all"
                    ? "bg-gold text-maroon-dark"
                    : "bg-white/5 text-white/60 hover:bg-white/10 border border-white/10"
                }`}
              >
                All Products
              </button>
              {categories.map((cat: string) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 px-5 py-2 rounded-full text-sm font-body font-medium transition-all capitalize ${
                    selectedCategory === cat
                      ? "bg-gold text-maroon-dark"
                      : "bg-white/5 text-white/60 hover:bg-white/10 border border-white/10"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="container mx-auto px-4 pb-24">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white/5 animate-pulse">
                <div className="aspect-[3/4] rounded-t-2xl bg-white/5" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-white/5 rounded w-3/4" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24"
          >
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-white/10" />
            <h3 className="font-heading text-xl font-bold text-white/60 mb-2">No products found</h3>
            <p className="text-white/30 text-sm font-body">Try adjusting your search or filter.</p>
            {search && (
              <Button variant="outline" className="mt-4 border-white/10 text-white/60" onClick={() => { setSearch(""); setSelectedCategory("all"); }}>
                Clear Filters
              </Button>
            )}
          </motion.div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-white/40 text-sm font-body">
                {filtered.length} product{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              <AnimatePresence mode="popLayout">
                {filtered.map((product: any, i: number) => (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="group rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden hover:border-gold/20 hover:bg-white/[0.05] transition-all duration-500"
                  >
                    {/* Image */}
                    <div className="aspect-[3/4] relative overflow-hidden bg-gradient-to-b from-white/5 to-transparent">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-12 h-12 text-white/10" />
                        </div>
                      )}

                      {/* Overlay Actions */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      {/* Like Button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleLike(product.id); }}
                        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-black/60"
                      >
                        <Heart className={`w-4 h-4 transition-colors ${liked.has(product.id) ? "fill-red-500 text-red-500" : "text-white/70"}`} />
                      </button>

                      {/* Category Badge */}
                      {product.category && (
                        <div className="absolute top-3 left-3">
                          <Badge className="bg-black/40 backdrop-blur-sm text-white/80 border-none text-[9px] uppercase tracking-widest font-bold">
                            {product.category}
                          </Badge>
                        </div>
                      )}

                      {/* Quick Actions */}
                      <div className="absolute bottom-3 left-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 duration-300">
                        <Button
                          size="sm"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 gap-2 text-xs font-bold shadow-lg"
                          onClick={(e) => { e.stopPropagation(); orderViaWhatsApp(product); }}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Order Now
                        </Button>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border-none rounded-xl h-10 w-10"
                          onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4 space-y-2" onClick={() => setSelectedProduct(product)}>
                      <h3 className="font-heading text-sm font-bold text-white truncate group-hover:text-gold transition-colors cursor-pointer">
                        {product.name}
                      </h3>
                      <div className="flex items-center justify-between">
                        <p className="text-gold font-heading font-black text-base">
                          {product.currency || "MWK"} {product.price?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </section>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6"
            onClick={() => setSelectedProduct(null)}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="bg-[#111] border border-white/10 rounded-t-3xl md:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close */}
              <div className="sticky top-0 z-10 flex justify-end p-4 bg-gradient-to-b from-[#111] to-transparent">
                <button onClick={() => setSelectedProduct(null)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                  <X className="w-4 h-4 text-white/70" />
                </button>
              </div>

              {/* Product Image */}
              {selectedProduct.images?.[0] && (
                <div className="px-6">
                  <div className="aspect-square rounded-2xl overflow-hidden bg-white/5">
                    <img src={selectedProduct.images[0]} alt={selectedProduct.name} className="w-full h-full object-cover" />
                  </div>
                </div>
              )}

              {/* Multiple Images */}
              {selectedProduct.images?.length > 1 && (
                <div className="flex gap-2 px-6 mt-3 overflow-x-auto">
                  {selectedProduct.images.slice(1, 5).map((img: string, i: number) => (
                    <div key={i} className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-white/10">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {/* Details */}
              <div className="p-6 space-y-4">
                {selectedProduct.category && (
                  <Badge className="bg-gold/10 text-gold border-gold/20 text-[10px] uppercase tracking-widest">
                    {selectedProduct.category}
                  </Badge>
                )}
                <h2 className="font-heading text-2xl font-bold text-white">
                  {selectedProduct.name}
                </h2>
                <p className="text-gold font-heading font-black text-3xl">
                  {selectedProduct.currency || "MWK"} {selectedProduct.price?.toLocaleString()}
                </p>
                {selectedProduct.description && (
                  <p className="text-white/50 text-sm font-body leading-relaxed">
                    {selectedProduct.description}
                  </p>
                )}

                <div className="pt-4 space-y-3">
                  <Button
                    className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base gap-3 shadow-xl shadow-emerald-600/20"
                    onClick={() => orderViaWhatsApp(selectedProduct)}
                  >
                    <MessageCircle className="w-5 h-5" />
                    Order via WhatsApp
                  </Button>
                  <p className="text-center text-white/30 text-xs font-body">
                    Fast delivery • Secure payment • Quality guaranteed
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gold to-gold-light flex items-center justify-center">
              <ShoppingBag className="w-3 h-3 text-maroon-dark" />
            </div>
            <span className="font-heading text-sm font-bold text-white/60">
              Forgiven Shopping Centre
            </span>
          </div>
          <p className="text-white/20 text-xs font-body">
            © {new Date().getFullYear()} Forgiven Shopping Centre. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
