import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Video, Image as ImageIcon, FileText, Share2, 
  Copy, Download, ExternalLink, Sparkles, 
  CheckCircle2, Play, User
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import type { Tables } from "@/integrations/supabase/types";

type Content = Tables<"content">;

export default function AgentContentPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: agent } = useQuery({
    queryKey: ["agent-profile", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("agents")
        .select("*")
        .eq("user_id", session!.user.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: content, isLoading } = useQuery({
    queryKey: ["agent-published-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content")
        .select("*, products(name, description)")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as (Content & { products: { name: string, description: string } | null })[];
    },
  });

  const referralUrl = agent ? `${window.location.origin}/shop?ref=${agent.referral_code}` : "";

  const getShareText = (item: any) => {
    const productParam = item.product_id ? `&product=${item.product_id}` : "";
    const link = `${referralUrl}${productParam}`;
    // Prioritize product description over content body if it's a campaign/visual
    const description = item.products?.description || item.body || "";
    return `${description}\n\nShop here: ${link}`;
  };

  const copyPromotion = (item: any) => {
    const text = getShareText(item);
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    toast({ title: "Promotion Copied!", description: "Text and referral link ready to share." });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const shareAsset = async (item: any) => {
    const text = getShareText(item);
    const hasMedia = !!item.media_url;
    
    // 1. Mobile/Native Sharing Attempt
    if (navigator.share) {
      setSharingId(item.id);
      try {
        if (hasMedia) {
          // Use absolute URL for fetch
          const mediaUrl = item.media_url?.startsWith('http') ? item.media_url : `${window.location.origin}${item.media_url}`;
          const response = await fetch(mediaUrl);
          if (!response.ok) throw new Error("Media fetch failed");
          
          const blob = await response.blob();
          const mimeType = blob.type || (item.type === 'video' || item.type === 'ugc' ? 'video/mp4' : 'image/jpeg');
          const ext = mimeType.split("/")[1]?.split("+")[0] || (item.type === 'video' || item.type === 'ugc' ? 'mp4' : 'jpg');
          const fileName = `promo-${item.id.slice(0, 5)}.${ext}`;
          
          const file = new File([blob], fileName, { type: mimeType });
          
          // Test sharing with files
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              text: text
            });
            setSharingId(null);
            return;
          }
        }
        
        // Fallback to text-only native share
        await navigator.share({ text });
        setSharingId(null);
        return;
      } catch (e) {
        console.error("Native share error:", e);
      }
      setSharingId(null);
    }
    
    // 2. Desktop Fallback (WhatsApp Web)
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, "_blank");
    
    if (hasMedia) {
      toast({
        title: "Sharing to Desktop?",
        description: "WhatsApp desktop does not support auto-media sharing. Please download the file to share it manually.",
      });
    }
  };

  const downloadMedia = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Network response was not ok");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("Download failed:", e);
      toast({
        title: "Download failed",
        description: "Could not download the file directly. You can try right-clicking the image and selecting 'Save Image As'.",
        variant: "destructive"
      });
    }
  };

  const filteredContent = content?.filter(item => {
    if (activeTab === "all") return true;
    if (activeTab === "videos") return item.type === "ugc" || item.type === "video";
    if (activeTab === "campaigns") return item.type === "ai_visual";
    if (activeTab === "posts") return item.type === "social_post" || item.type === "description";
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-muted-foreground font-body animate-pulse">Loading promotion kit...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="font-heading text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-gold">
            Promotion Kit
          </h2>
          <p className="text-muted-foreground font-body">
            High-quality marketing assets with your referral link built-in.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-muted/30 px-4 py-3 rounded-2xl border border-border shadow-sm">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Share2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Your Referral Code</p>
            <p className="font-heading font-bold text-foreground">{agent?.referral_code || "---"}</p>
          </div>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-muted/50 p-1 rounded-xl border border-border inline-flex h-auto flex-wrap">
          <TabsTrigger value="all" className="rounded-lg py-2.5 px-5 gap-2">
            <Sparkles className="w-4 h-4" /> All Assets
          </TabsTrigger>
          <TabsTrigger value="videos" className="rounded-lg py-2.5 px-5 gap-2">
            <Video className="w-4 h-4" /> UGC Videos
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="rounded-lg py-2.5 px-5 gap-2">
            <ImageIcon className="w-4 h-4" /> Influencer Campaigns
          </TabsTrigger>
          <TabsTrigger value="posts" className="rounded-lg py-2.5 px-5 gap-2">
            <FileText className="w-4 h-4" /> Social Posts
          </TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredContent?.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full py-20 text-center border-2 border-dashed border-border rounded-3xl bg-muted/5"
              >
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <h3 className="font-heading text-xl font-bold">No assets found</h3>
                <p className="text-muted-foreground font-body mt-2">Check back later for new marketing content.</p>
              </motion.div>
            ) : (
              filteredContent?.map((item, idx) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group flex flex-col bg-card border border-border rounded-3xl overflow-hidden hover:shadow-2xl hover:border-primary/20 transition-all duration-300"
                >
                  {/* Media Preview Section */}
                  <div className="aspect-[4/5] bg-muted relative overflow-hidden">
                    {item.media_url ? (
                      item.type === 'ugc' || item.type === 'video' ? (
                        <div className="w-full h-full relative group/video">
                          <video 
                            src={item.media_url} 
                            className="w-full h-full object-cover"
                            muted
                            loop
                            onMouseEnter={e => e.currentTarget.play()}
                            onMouseLeave={e => e.currentTarget.pause()}
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/video:bg-transparent transition-colors z-20">
                            <Play className="w-12 h-12 text-white fill-white opacity-80 group-hover/video:opacity-0 transition-opacity" />
                          </div>
                        </div>
                      ) : (
                        <img 
                          src={item.media_url} 
                          alt={item.title || ""} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-primary/5 p-6 text-center">
                        <FileText className="w-12 h-12 text-primary opacity-20 mb-3" />
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Text Only Asset</span>
                      </div>
                    )}
                    
                    {/* Badge Overlay */}
                    <div className="absolute top-4 left-4 z-30">
                      <Badge className="bg-background/80 backdrop-blur-md text-foreground font-bold shadow-sm border-0 capitalize">
                        {item.type.replace('_', ' ')}
                      </Badge>
                    </div>
 
                    {/* Download Button Overlay */}
                    {item.media_url && (
                      <div className="absolute bottom-4 right-4 translate-y-12 group-hover:translate-y-0 transition-all duration-300 z-30">
                        <Button 
                          size="icon" 
                          variant="secondary" 
                          className="rounded-full shadow-lg h-10 w-10 bg-white/90 hover:bg-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadMedia(item.media_url!, `fsc-${item.id}.mp4`);
                          }}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Content Info Section */}
                  <div className="p-5 flex-1 flex flex-col space-y-4">
                    <div>
                      <h3 className="font-heading font-bold text-lg leading-tight mb-2 line-clamp-1">{item.title}</h3>
                      <p className="text-sm font-body text-muted-foreground line-clamp-3 leading-relaxed">
                        {item.body}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 mt-auto">
                      <Button 
                        onClick={() => copyPromotion(item)}
                        className="w-full gap-2 rounded-xl h-11 font-bold shadow-sm"
                        variant={copiedId === item.id ? "default" : "secondary"}
                      >
                        {copiedId === item.id ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Copied Text + Link!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy Promotion</span>
                          </>
                        )}
                      </Button>
                      <Button 
                        onClick={() => shareAsset(item)}
                        disabled={sharingId === item.id}
                        className="w-full gap-2 rounded-xl h-11 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                      >
                        {sharingId === item.id ? (
                          <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Share2 className="w-4 h-4" />
                        )}
                        <span>{sharingId === item.id ? "Preparing Media..." : "Share to WhatsApp"}</span>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </Tabs>
    </div>
  );
}
