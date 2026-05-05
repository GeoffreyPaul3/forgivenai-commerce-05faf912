import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Copy, CheckCircle2, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function AgentProductsPage() {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
        if (data) return data;
      }
      const { data } = await supabase
        .from("agents")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["agent-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      return data || [];
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
            {agent?.commission_rate ?? 5}% Commission
          </Badge>
          <span className="text-sm font-body text-muted-foreground">on first orders</span>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((p, i) => (
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
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
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
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">{p.category || "General"}</p>
                <h3 className="font-heading font-bold text-lg mb-2 line-clamp-2 leading-tight">{p.name}</h3>
                
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
      )}
    </div>
  );
}
