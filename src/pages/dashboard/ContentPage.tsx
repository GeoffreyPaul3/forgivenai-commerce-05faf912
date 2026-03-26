import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, Video, FileText, Share2, Plus } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Content = Tables<"content">;

const ContentPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [genType, setGenType] = useState<"description" | "social_post" | "campaign">("social_post");
  const [genContext, setGenContext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState("all");

  const { data: content, isLoading } = useQuery({
    queryKey: ["content", filter],
    queryFn: async () => {
      let q = supabase.from("content").select("*, products(name)").order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("type", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products-list"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name, category, price, currency").eq("status", "active");
      return data || [];
    },
  });

  const [selectedProduct, setSelectedProduct] = useState("");

  const generateContent = async () => {
    setGenerating(true);
    try {
      const product = products?.find(p => p.id === selectedProduct);
      const { data, error } = await supabase.functions.invoke("ai-generate", {
        body: {
          type: genType === "description" ? "product-description" : genType === "social_post" ? "social-post" : "campaign",
          productName: product?.name || "General",
          productCategory: product?.category || "",
          productPrice: product?.price || 0,
          currency: product?.currency || "MWK",
          context: genContext,
        },
      });
      if (error) throw error;
      if (data?.content) {
        await supabase.from("content").insert({
          type: genType,
          title: `${genType === "social_post" ? "Social Post" : genType === "campaign" ? "Campaign" : "Description"} - ${product?.name || "General"}`,
          body: data.content,
          product_id: selectedProduct || null,
          status: "draft",
        });
        queryClient.invalidateQueries({ queryKey: ["content"] });
        toast({ title: "Content generated!" });
        setGenContext("");
      }
    } catch (e) {
      toast({ title: "Generation failed", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("content").update({ status }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["content"] });
  };

  const deleteContent = async (id: string) => {
    await supabase.from("content").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["content"] });
    toast({ title: "Content deleted" });
  };

  const typeIcon = (type: string) => {
    if (type === "video" || type === "ugc") return <Video className="w-4 h-4" />;
    if (type === "social_post") return <Share2 className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Content & UGC</h2>
          <p className="text-muted-foreground text-sm font-body">AI-powered content generation engine</p>
        </div>
      </div>

      {/* Generator */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-gold" /> AI Content Generator
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select value={genType} onValueChange={(v: any) => setGenType(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="description">Product Description</SelectItem>
              <SelectItem value="social_post">Social Media Post</SelectItem>
              <SelectItem value="campaign">Campaign Idea</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger><SelectValue placeholder="Select product (optional)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">No product</SelectItem>
              {products?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={generateContent} disabled={generating} className="gap-2">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate
          </Button>
        </div>
        <Textarea
          placeholder="Additional context or instructions..."
          value={genContext}
          onChange={e => setGenContext(e.target.value)}
          className="min-h-[60px]"
        />
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {["all", "description", "social_post", "campaign", "video", "ugc"].map(t => (
          <Button key={t} size="sm" variant={filter === t ? "default" : "outline"} onClick={() => setFilter(t)} className="text-xs capitalize">
            {t === "all" ? "All" : t.replace("_", " ")}
          </Button>
        ))}
      </div>

      {/* Content List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl border border-border bg-card animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {content?.map((item: any) => (
            <div key={item.id} className="rounded-xl border border-border bg-card p-4 hover:border-gold/20 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-1 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    {typeIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-heading text-sm font-semibold text-foreground">{item.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 font-body line-clamp-3 whitespace-pre-wrap">{item.body}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{item.type.replace("_", " ")}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === "published" ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>{item.status}</span>
                      {item.products?.name && <span className="text-xs text-muted-foreground">• {item.products.name}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {item.status === "draft" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(item.id, "published")} className="text-xs">Publish</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => deleteContent(item.id)} className="text-xs text-destructive">Delete</Button>
                </div>
              </div>
            </div>
          ))}
          {(!content || content.length === 0) && (
            <div className="text-center py-12 text-muted-foreground font-body">
              <Sparkles className="w-8 h-8 mx-auto mb-3 text-gold" />
              No content yet. Use the AI generator above to create your first piece.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContentPage;
