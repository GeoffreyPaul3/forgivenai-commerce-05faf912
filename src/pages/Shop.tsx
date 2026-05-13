import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, Search, MessageCircle, X, Phone, MapPin, ArrowRight, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import logo from "@/assets/forgiven.png"

const WHATSAPP_NUMBER = "+265997128899";

export default function Shop() {
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref");
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const [detail, setDetail] = useState<any>(null);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (refCode) localStorage.setItem("referral_code", refCode);
  }, [refCode]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["shop-products-synced"],
    queryFn: async () => {
      // 1. Fetch local products
      const { data: local } = await supabase.from("products").select("*").eq("status", "active").order("created_at", { ascending: false });
      
      // 2. Fetch live website products
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
        console.warn("Could not fetch live products:", e);
      }
      return local || [];
    },
  });

  const categories = useMemo(() => {
    if (!products) return [];
    return [...new Set(products.map((p: any) => p.category).filter(Boolean))].sort();
  }, [products]);

  const filtered = useMemo(() => {
    if (!products) return [];
    const f = products.filter((p: any) => {
      const s = !search || p.name?.toLowerCase().includes(search.toLowerCase());
      const c = activeCat === "all" || p.category === activeCat;
      return s && c;
    });
    return f;
  }, [products, search, activeCat]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, activeCat]);

  const order = (p: any, size?: string, color?: string) => {
    const ref = localStorage.getItem("referral_code") || "";
    let m = `Hi! I'd like to order:\n🛍️ *${p.name}*`;
    if (size) m += `\n📏 Size: ${size}`;
    if (color) m += `\n🎨 Colour: ${color}`;
    m += `\n💰 ${p.currency||"MWK"} ${p.price?.toLocaleString()}`;
    if (ref) m += `\n🏷️ Ref: ${ref}`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER.replace("+","")}?text=${encodeURIComponent(m)}`, "_blank");
  };

  const openDetail = (p: any) => {
    setDetail(p);
    setSelectedSize("");
    setSelectedColor("");
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #FFF9F5 0%, #FFFFFF 30%)" }}>
      {/* Slim Top Accent */}
      <div className="h-1 w-full bg-gradient-to-r from-[#8B1A4A] via-[#C2185B] to-[#D4A574]" />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100/80">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/shop" className="font-heading text-xl font-black tracking-tight text-gray-900">
            <img src={logo} alt="Forgiven Shop Logo" width={60} height={60}/>
          </Link>

          <div className="hidden sm:flex flex-1 max-w-md mx-8 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <Input
              placeholder="What are you looking for?"
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-full bg-gray-50/80 border-gray-200/60 text-sm placeholder:text-gray-400"
            />
          </div>

          <div className="flex items-center gap-3">
            <a href={`tel:${WHATSAPP_NUMBER}`} className="hidden md:flex items-center gap-2 text-xs text-gray-500 hover:text-[#8B1A4A] transition-colors">
              <Phone className="w-3.5 h-3.5" /> +265 997-128-899
            </a>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER.replace("+","")}?text=${encodeURIComponent("Hi, I'd like to browse your collection!")}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1DA851] text-white text-xs font-bold px-4 py-2 rounded-full transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" /> Chat
            </a>
          </div>
        </div>
      </nav>

      {/* Referral Banner */}
      {refCode && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#8B1A4A] to-[#C2185B] text-white"
        >
          <div className="container mx-auto px-4 py-3 flex items-center justify-center gap-3 text-sm">
            <span>Welcome! You've been referred by a Forgiven agent</span>
            <Badge className="bg-white/20 text-white border-white/30 text-[10px] font-mono tracking-wider">{refCode}</Badge>
          </div>
        </motion.div>
      )}

      {/* Hero — editorial, not a clone */}
      <section className="container mx-auto px-4 pt-12 pb-8">
        <div className="rounded-3xl overflow-hidden relative h-56 md:h-80 lg:h-[420px]" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}>
          <div className="absolute inset-0 opacity-20 mix-blend-overlay"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1400&q=80')", backgroundSize: "cover", backgroundPosition: "center" }} />
          <div className="relative z-10 h-full flex flex-col justify-center px-8 md:px-14 max-w-2xl">
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className="text-amber-300/80 text-[10px] md:text-xs font-bold uppercase tracking-[0.35em] mb-4"
            >
              Forgiven Shopping Centre
            </motion.span>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="font-heading text-3xl md:text-5xl lg:text-6xl font-black text-white leading-[1.05] mb-4"
            >
              Elevate Your <br /><span className="italic text-amber-200">Wardrobe</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="text-white/50 text-sm md:text-base font-body max-w-md mb-6"
            >
              Premium fashion delivered across Malawi. Order directly via WhatsApp.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <Button onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}
                className="bg-white text-gray-900 hover:bg-gray-100 rounded-full px-8 h-12 font-bold gap-2 shadow-lg"
              >
                Shop Now <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button onClick={() => setActiveCat("all")}
            className={`shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${activeCat === "all" ? "bg-[#8B1A4A] text-white shadow-lg shadow-[#8B1A4A]/20" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >All</button>
          {categories.map((c: string) => (
            <button key={c} onClick={() => setActiveCat(c)}
              className={`shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold capitalize transition-all ${activeCat === c ? "bg-[#8B1A4A] text-white shadow-lg shadow-[#8B1A4A]/20" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >{c}</button>
          ))}
        </div>
      </section>

      {/* Products */}
      <section id="products" className="container mx-auto px-4 pb-16">
        {(() => {
          const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
          const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
          return (<>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-lg font-bold text-gray-800">
                {activeCat === "all" ? "All Products" : <span className="capitalize">{activeCat}</span>}
              </h2>
              <span className="text-xs text-gray-400 font-body">{filtered.length} items · Page {page}/{totalPages || 1}</span>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-square bg-gray-100 rounded-xl mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-2/3 mb-1" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-24">
                <ShoppingBag className="w-14 h-14 mx-auto text-gray-200 mb-4" />
                <p className="text-gray-400 font-heading font-bold text-lg">Nothing here yet</p>
                <p className="text-gray-300 text-sm mt-1">Try a different search or category</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  <AnimatePresence mode="popLayout">
                    {paginated.map((p: any, i: number) => (
                      <motion.div key={p.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.3) }}
                        className="group cursor-pointer" onClick={() => openDetail(p)}
                      >
                        <div className="aspect-square rounded-xl overflow-hidden bg-gray-50 mb-2 relative shadow-sm group-hover:shadow-md transition-shadow duration-400">
                          {p.images?.[0] ? (
                            <img src={p.images[0]} alt={p.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                              <ShoppingBag className="w-6 h-6 text-gray-200" />
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                            <button onClick={(e) => { e.stopPropagation(); openDetail(p); }}
                              className="w-full flex items-center justify-center gap-1.5 bg-[#8B1A4A] text-white text-[10px] font-bold py-2 rounded-lg shadow-lg hover:bg-[#A31E56] transition-colors"
                            >
                              <MessageCircle className="w-3 h-3" /> Select Options
                            </button>
                          </div>
                        </div>
                        <h3 className="text-xs font-semibold text-gray-800 truncate group-hover:text-[#8B1A4A] transition-colors">{p.name}</h3>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-[#8B1A4A] font-bold text-xs">{p.currency||"MWK"} {p.price?.toLocaleString()}</p>
                          {(p.sizes?.length > 0 || p.colors?.length > 0) && (
                            <div className="flex gap-1">
                              {p.sizes?.length > 0 && <span className="text-[8px] text-gray-400 font-bold uppercase">{p.sizes[0]}{p.sizes.length > 1 ? '+' : ''}</span>}
                              {p.colors?.length > 0 && <div className="w-1.5 h-1.5 rounded-full mt-1" style={{ backgroundColor: p.colors[0].toLowerCase() }} />}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10">
                    <button
                      disabled={page <= 1}
                      onClick={() => { setPage(p => p - 1); document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }); }}
                      className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >Prev</button>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button key={i} onClick={() => { setPage(i + 1); document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }); }}
                        className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${page === i + 1 ? "bg-[#8B1A4A] text-white shadow-md" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                      >{i + 1}</button>
                    ))}
                    <button
                      disabled={page >= totalPages}
                      onClick={() => { setPage(p => p + 1); document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }); }}
                      className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >Next</button>
                  </div>
                )}
              </>
            )}
          </>);
        })()}
      </section>

      {/* Detail Modal */}
      <AnimatePresence>
        {detail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center"
            onClick={() => setDetail(null)}
          >
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-5 pb-0">
                <Badge className="bg-[#8B1A4A]/10 text-[#8B1A4A] border-[#8B1A4A]/15 text-[10px] uppercase tracking-widest">{detail.category || "Fashion"}</Badge>
                <button onClick={() => setDetail(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"><X className="w-4 h-4 text-gray-500" /></button>
              </div>
              {detail.images?.[0] && (
                <div className="p-5"><div className="aspect-square rounded-2xl overflow-hidden bg-gray-50"><img src={detail.images[0]} alt={detail.name} className="w-full h-full object-contain" /></div></div>
              )}
              {detail.images?.length > 1 && (
                <div className="flex gap-2 px-5 overflow-x-auto">
                  {detail.images.slice(1, 5).map((img: string, i: number) => (
                    <div key={i} className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-gray-100 bg-gray-50"><img src={img} alt="" className="w-full h-full object-contain" /></div>
                  ))}
                </div>
              )}
              <div className="p-5 pt-4 space-y-3">
                <h2 className="font-heading text-xl font-bold text-gray-900">{detail.name}</h2>
                <p className="text-[#8B1A4A] font-heading font-black text-2xl">{detail.currency||"MWK"} {detail.price?.toLocaleString()}</p>
                
                {detail.sizes && detail.sizes.length > 0 && (
                  <div className="py-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      Available Sizes <span className="text-red-500">*</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {detail.sizes.map((s: string) => (
                        <button 
                          key={s} 
                          onClick={() => setSelectedSize(s)}
                          className={`px-4 py-2 rounded-xl border transition-all text-xs font-black uppercase ${
                            selectedSize === s 
                            ? "bg-[#8B1A4A] border-[#8B1A4A] text-white shadow-md shadow-[#8B1A4A]/20" 
                            : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {detail.colors && detail.colors.length > 0 && (
                  <div className="py-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      Available Colours <span className="text-red-500">*</span>
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {detail.colors.map((c: string) => (
                        <button 
                          key={c} 
                          onClick={() => setSelectedColor(c)}
                          className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                            selectedColor === c 
                            ? "bg-gray-900 border-gray-900 text-white shadow-lg" 
                            : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200"
                          }`}
                        >
                          <div className="w-4 h-4 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: c.toLowerCase() }} />
                          <span className="text-[10px] font-bold uppercase pr-1">{c}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {(detail.sizes?.length > 0 || detail.colors?.length > 0) && (
                  <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100/50">
                    <p className="text-[10px] font-bold text-amber-700/70 uppercase tracking-tight flex items-center gap-2">
                      <Sparkles className="w-3 h-3" /> 
                      {(!selectedSize && detail.sizes?.length > 0) || (!selectedColor && detail.colors?.length > 0) 
                        ? "Please select size & color to proceed" 
                        : "Ready to order with your selection!"}
                    </p>
                  </div>
                )}

                {detail.description && (
                  <div className="py-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Description</p>
                    <p className="text-gray-500 text-sm leading-relaxed font-body">{detail.description}</p>
                  </div>
                )}
                <div className="pt-3">
                  <Button 
                    disabled={(detail.sizes?.length > 0 && !selectedSize) || (detail.colors?.length > 0 && !selectedColor)}
                    className={`w-full h-13 rounded-2xl font-bold gap-3 text-base shadow-lg transition-all ${
                      (detail.sizes?.length > 0 && !selectedSize) || (detail.colors?.length > 0 && !selectedColor)
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                      : "bg-[#25D366] hover:bg-[#1DA851] text-white shadow-emerald-200/50 active:scale-[0.98]"
                    }`} 
                    onClick={() => order(detail, selectedSize, selectedColor)}
                  >
                    <MessageCircle className="w-5 h-5" /> 
                    Order via WhatsApp
                  </Button>
                  <p className="text-center text-gray-400 text-[11px] mt-3">Nationwide delivery • Quality guaranteed</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WhatsApp FAB */}
      <a href={`https://wa.me/${WHATSAPP_NUMBER.replace("+","")}`} target="_blank" rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-xl shadow-emerald-300/30 hover:scale-110 transition-transform"
      >
        <MessageCircle className="w-7 h-7 text-white fill-white" />
      </a>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10 bg-gray-50/50">
        <div className="container mx-auto px-4 flex flex-col items-center gap-3">
          <span className="font-heading text-sm font-bold text-gray-500">Forgiven Shopping Centre</span>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Lilongwe, Malawi</span>
            <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> +265 997-128-899</span>
          </div>
          <p className="text-gray-300 text-[10px]">© {new Date().getFullYear()} All rights reserved</p>
        </div>
      </footer>
    </div>
  );
}
