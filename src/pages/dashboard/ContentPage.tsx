import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles, Loader2, Video, FileText, Share2, Pencil, Trash2, Eye, Download,
  User, Wand2, Play, Upload, X, MoreHorizontal, Image, RefreshCw, ChevronRight,
  Clapperboard, Film, Layers, Volume2, CheckCircle2, ShoppingBag, Star, Zap, Plus,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Tables } from "@/integrations/supabase/types";
import { motion, AnimatePresence } from "framer-motion";
// Removed legacy videoAssembler import as per True Motion Engine upgrade

type Content = Tables<"content">;
const PAGE_SIZE = 8;

const ContentPage = () => {
  const [activeTab, setActiveTab] = useState("content");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground tracking-tight">Content & UGC</h2>
        <p className="text-muted-foreground text-sm font-body">AI-powered content generation & UGC video studio</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="content" className="gap-2"><FileText className="w-4 h-4" />Content Manager</TabsTrigger>
          <TabsTrigger value="ugc" className="gap-2"><Clapperboard className="w-4 h-4" />UGC Studio</TabsTrigger>
          <TabsTrigger value="influencers" className="gap-2"><User className="w-4 h-4" />Influencers</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-6"><ContentManager /></TabsContent>
        <TabsContent value="ugc" className="mt-6"><UGCStudio /></TabsContent>
        <TabsContent value="influencers" className="mt-6"><InfluencerManager /></TabsContent>
      </Tabs>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   CONTENT MANAGER
   ═══════════════════════════════════════════════════════════ */
function ContentManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [genType, setGenType] = useState("social_post");
  const [genContext, setGenContext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState("none");
  const [editItem, setEditItem] = useState<Content | null>(null);
  const [viewItem, setViewItem] = useState<Content | null>(null);
  const [deleteItem, setDeleteItem] = useState<Content | null>(null);

  const { data: content, isLoading, refetch } = useQuery({
    queryKey: ["content", filter],
    queryFn: async () => {
      let q = supabase.from("content").select("*").order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("type", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data as Content[];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products-list"],
    queryFn: async () => {
      // 1. Fetch local products
      const { data: local } = await supabase.from("products").select("id, name, category, price, currency, images").eq("status", "active");
      
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
            isLive: true
          }));
          return [...(local || []), ...mappedLive];
        }
      } catch (e) {
        console.warn("Could not fetch live products:", e);
      }
      return local || [];
    },
  });

  useEffect(() => { setPage(1); }, [filter]);
  const totalPages = Math.ceil((content?.length || 0) / PAGE_SIZE);
  const paginatedContent = content?.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) || [];

  const generateContent = async () => {
    setGenerating(true);
    try {
      const product = products?.find(p => p.id === selectedProduct);
      const typeMap: Record<string, string> = { description: "product-description", social_post: "social-post", campaign: "campaign" };
      const { data, error } = await supabase.functions.invoke("ai-generate", {
        body: { type: typeMap[genType] || "social-post", productName: product?.name || "General", productCategory: product?.category || "", productPrice: product?.price || 0, currency: product?.currency || "MWK", context: genContext },
      });
      if (error) throw error;
      if (data?.content) {
        const labels: Record<string, string> = { social_post: "Social Post", campaign: "Campaign", description: "Description" };
        await supabase.from("content").insert({ type: genType, title: `${labels[genType] || genType} - ${product?.name || "General"}`, body: data.content, product_id: selectedProduct !== "none" ? selectedProduct : null, status: "draft" });
        await refetch();
        toast({ title: "Content generated & saved!" });
        setGenContext("");
      }
    } catch {
      toast({ title: "Generation failed", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (item: Partial<Content> & { id: string }) => {
      const { error } = await supabase.from("content").update(item).eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => { refetch(); setEditItem(null); toast({ title: "Content updated" }); },
  });

  const deleteContent = async (id: string) => {
    const { error } = await supabase.from("content").delete().eq("id", id);
    if (error) throw error;
    refetch();
    toast({ title: "Content deleted" });
  };

  const typeIcon = (type: string) => {
    if (type === "video" || type === "ugc") return <Video className="w-4 h-4" />;
    if (type === "social_post") return <Share2 className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
           AI Content Generator
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select value={genType} onValueChange={setGenType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="description">Product Description</SelectItem>
              <SelectItem value="social_post">Social Media Post</SelectItem>
              <SelectItem value="campaign">Campaign Idea</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No product</SelectItem>
              {products?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={generateContent} disabled={generating} className="gap-2">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate
          </Button>
        </div>
        <Textarea placeholder="Additional context or instructions..." value={genContext} onChange={e => setGenContext(e.target.value)} className="min-h-[60px]" />
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "description", "social_post", "campaign", "ugc"].map(t => (
          <Button key={t} size="sm" variant={filter === t ? "default" : "outline"} onClick={() => setFilter(t)} className="text-xs capitalize">
            {t === "all" ? "All" : t.replace("_", " ")}
          </Button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-10"></TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => (<TableCell key={j}><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>))}</TableRow>
            )) : paginatedContent.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground font-body">
                <Sparkles className="w-8 h-8 mx-auto mb-3 text-gold/60" />No content yet. Use the AI generator above.
              </TableCell></TableRow>
            ) : paginatedContent.map(item => (
              <TableRow key={item.id} className="group">
                <TableCell><div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">{typeIcon(item.type)}</div></TableCell>
                <TableCell>
                  <p className="font-heading text-sm font-semibold text-foreground truncate max-w-xs">{item.title || "Untitled"}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.body?.slice(0, 80)}</p>
                </TableCell>
                <TableCell><Badge variant="secondary" className="text-xs capitalize">{item.type.replace("_", " ")}</Badge></TableCell>
                <TableCell>
                  <Badge variant="secondary" className={`text-xs ${item.status === "published" ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"}`}>{item.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem onClick={() => setViewItem(item)}><Eye className="w-4 h-4 mr-2" /> View</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditItem(item)}><Pencil className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                      {item.status !== "published" && (
                        <DropdownMenuItem onClick={() => updateMutation.mutate({ id: item.id, status: "published" })} className="text-emerald-600 focus:text-emerald-600">
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Publish
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteItem(item)}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination><PaginationContent>
          <PaginationItem><PaginationPrevious href="#" onClick={e => { e.preventDefault(); setPage(p => Math.max(1, p - 1)); }} /></PaginationItem>
          {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1).map((p, idx, arr) => {
            const els: React.ReactNode[] = [];
            if (idx > 0 && arr[idx - 1] !== p - 1) els.push(<PaginationItem key={`e-${p}`}><span className="px-2 text-muted-foreground">…</span></PaginationItem>);
            els.push(<PaginationItem key={p}><PaginationLink href="#" isActive={p === page} onClick={e => { e.preventDefault(); setPage(p); }}>{p}</PaginationLink></PaginationItem>);
            return els;
          })}
          <PaginationItem><PaginationNext href="#" onClick={e => { e.preventDefault(); setPage(p => Math.min(totalPages, p + 1)); }} /></PaginationItem>
        </PaginationContent></Pagination>
      )}

      <Dialog open={!!viewItem} onOpenChange={v => !v && setViewItem(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading">{viewItem?.title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Badge variant="secondary" className="capitalize">{viewItem?.type.replace("_", " ")}</Badge>
              <Badge variant="secondary">{viewItem?.status}</Badge>
            </div>
            {viewItem?.media_url && (
              <img src={viewItem.media_url} alt="" className="w-full rounded-lg" />
            )}
            <div className="prose prose-sm max-w-none font-body prose-headings:font-heading prose-headings:text-foreground prose-p:text-foreground">
              <ReactMarkdown>{viewItem?.body || ""}</ReactMarkdown>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ContentEditDialog item={editItem} open={!!editItem} onClose={() => setEditItem(null)} onSave={d => updateMutation.mutate(d)} />

      <AlertDialog open={!!deleteItem} onOpenChange={open => !open && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Delete content?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove "{deleteItem?.title || "this content"}".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => { if (deleteItem) { try { await deleteContent(deleteItem.id); } catch {} } setDeleteItem(null); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ContentEditDialog({ item, open, onClose, onSave }: { item: Content | null; open: boolean; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({ title: "", body: "", status: "draft" });
  useEffect(() => { if (item) setForm({ title: item.title || "", body: item.body || "", status: item.status || "draft" }); }, [item]);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="font-heading">Edit Content</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <Textarea placeholder="Body" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} className="min-h-[120px]" />
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem></SelectContent>
          </Select>
          <Button className="w-full" onClick={() => { if (item) onSave({ id: item.id, ...form }); }}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════
   UGC STUDIO — Full Video Pipeline
   ═══════════════════════════════════════════════════════════ */

type StoryboardFrame = { frame: number; imageUrl: string; scene: string; dialogue?: string };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function UGCStudio() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Pipeline state
  const [step, setStep] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [avatarGender, setAvatarGender] = useState("female");
  const [avatarEthnicity, setAvatarEthnicity] = useState("african");
  const [avatarSetting, setAvatarSetting] = useState("studio");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState("");
  const [script, setScript] = useState("");
  const [scriptData, setScriptData] = useState<any>(null);
  const [isUGC, setIsUGC] = useState(true); // Default to True for "Real UGC"
  const [generatingAvatar, setGeneratingAvatar] = useState(false);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoFidelityScore, setVideoFidelityScore] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: products } = useQuery({
    queryKey: ["products-active-sync"],
    queryFn: async () => {
      // 1. Fetch local products
      const { data: local } = await supabase.from("products").select("*").eq("status", "active");
      
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
            isLive: true
          }));
          return [...(local || []), ...mappedLive];
        }
      } catch (e) {
        console.warn("Could not fetch live products:", e);
      }
      return local || [];
    },
  });

  const selectedProd = products?.find(p => p.id === selectedProduct);
  const currentAvatar = uploadedPreview || avatarUrl;
  const avatarDescription = `${avatarEthnicity} ${avatarGender} fashion influencer, stylish and authentic`;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setUploadedPreview(URL.createObjectURL(file));
    setAvatarUrl("");
    toast({ title: "Avatar uploaded!", description: `Using ${file.name} as your avatar reference` });
  };

  const clearUpload = () => {
    setUploadedFile(null);
    setUploadedPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Generate Avatar ──
  const generateAvatar = async () => {
    setGeneratingAvatar(true);
    try {
      const body: any = {
        action: "generate-avatar",
        gender: avatarGender,
        ethnicity: avatarEthnicity,
        setting: avatarSetting,
        productName: selectedProd?.name,
        productCategory: selectedProd?.category,
        // Send ONLY the primary product image URL as a direct string for quick access
        productImageUrl: selectedProd?.images?.[0] || null,
        // Also send the full product object so the edge function has ALL images for fidelity anchoring
        product: selectedProd ? {
          id: selectedProd.id,
          name: selectedProd.name,
          category: selectedProd.category,
          images: Array.isArray(selectedProd.images) ? selectedProd.images.filter(Boolean) : [],
        } : undefined,
        isUGC: isUGC,
      };

      // If user uploaded their own photo, convert to base64 and send
      if (uploadedFile && uploadedFile.type.startsWith("image/")) {
        const base64 = await fileToBase64(uploadedFile);
        body.avatarImageBase64 = base64;
      }

      const { data, error } = await supabase.functions.invoke("ugc-generate", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.imageUrl) {
        setAvatarUrl(data.imageUrl);
        // Don't clear upload - keep it as reference
        toast({ title: "Avatar generated with your product!" });
      }
    } catch (err: any) {
      toast({ title: "Avatar generation failed", description: err?.message, variant: "destructive" });
    } finally {
      setGeneratingAvatar(false);
    }
  };

  // ── Generate Script ──
  const generateScript = async () => {
    if (!selectedProd) return;
    setGeneratingScript(true);
    try {
      const { data, error } = await supabase.functions.invoke("ugc-generate", {
        body: { action: "generate-script", productName: selectedProd.name, productCategory: selectedProd.category, productPrice: selectedProd.price, currency: selectedProd.currency },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.scriptData) {
        setScriptData(data.scriptData);
        const sd = data.scriptData;
        const lines = [`## ${sd.title || "UGC Script"}`, "", `**Hook:** ${sd.hook || ""}`, ""];
        
        sd.scenes?.forEach((s: any, i: number) => {
          const sceneNum = s.scene || s.scene_number || (i + 1);
          const duration = s.duration || s.time || "3s";
          const direction = s.direction || s.visual || s.description || "Visual direction";
          const dialogue = s.dialogue || s.script || s.content || "Script line";
          
          lines.push(`### Scene ${sceneNum} (${duration})`);
          lines.push(`*${direction}*`);
          lines.push(`**Creator:** "${dialogue}"`);
          if (s.text_overlay || s.overlay) lines.push(`📝 Text overlay: ${s.text_overlay || s.overlay}`);
          lines.push("");
        });
        
        if (sd.cta) lines.push(`**CTA:** ${sd.cta}`);
        if (sd.hashtags?.length) lines.push(`\n${sd.hashtags.map((h: string) => `#${h}`).join(" ")}`);
        setScript(lines.join("\n"));
        toast({ title: "Script generated!" });
      } else if (data?.rawContent) {
        setScript(data.rawContent);
        toast({ title: "Script generated!" });
      }
    } catch {
      toast({ title: "Script generation failed", variant: "destructive" });
    } finally {
      setGeneratingScript(false);
    }
  };

  // Legacy storyboard functions removed as per high-motion engine requirements

  const generateDirectVideo = async () => {
    if (!selectedProd || (!avatarUrl && !uploadedPreview)) {
      toast({ title: "Complete Step 1 & 2 first", variant: "destructive" });
      return;
    }
    setGeneratingVideo(true);
    setVideoProgress(5);
    try {
      const body: any = {
        action: "generate-ugc-video",
        productImageUrl: selectedProd.images?.[0],
        product: {
          id: selectedProd.id,
          name: selectedProd.name,
          category: selectedProd.category,
          images: Array.isArray(selectedProd.images) ? selectedProd.images.filter(Boolean) : [],
          description: selectedProd.description,
        },
        influencerImageUrl: currentAvatar,
        avatarGender,
        avatarEthnicity,
        productName: selectedProd.name,
        productCategory: selectedProd.category,
        productDescription: selectedProd.description,
        isUGC,
        setting: avatarSetting,
        scriptText: script
      };

      if (uploadedFile && uploadedFile.type.startsWith("image/")) {
        const base64 = await fileToBase64(uploadedFile);
        body.avatarImageBase64 = base64;
      }

      // Phase 1: Submit job — returns immediately with { pending: true, requestId, statusUrl, responseUrl, masterFrameUrl }
      const { data: submitData, error: submitError } = await supabase.functions.invoke("ugc-generate", { body });
      if (submitError) throw submitError;
      if (submitData?.error) throw new Error(submitData.error);

      if (submitData?.masterFrameUrl) setAvatarUrl(submitData.masterFrameUrl);
      if (submitData?.fidelityScore !== undefined) setVideoFidelityScore(submitData.fidelityScore);
      setVideoProgress(30);

      if (!submitData?.pending) {
        // Already have a video URL (unexpected synchronous path)
        if (submitData?.videoUrl) {
          setVideoUrl(submitData.videoUrl);
          setStep(4);
          toast({ title: "UGC Video Ready!" });
        }
        return;
      }

      // Phase 2: Poll check-video-status until job completes
      toast({ title: "🎬 Video job submitted!", description: "Kling is generating your video. Polling for result..." });
      const { requestId, statusUrl: jobStatusUrl, responseUrl: jobResponseUrl } = submitData;

      let pollAttempt = 0;
      const MAX_POLLS = 90; // 90 × 4s = 6 minutes max
      const POLL_INTERVAL_MS = 4000;

      while (pollAttempt < MAX_POLLS) {
        pollAttempt++;
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

        // Progress animation: ramp from 30% → 90% over polling window
        setVideoProgress(Math.min(90, 30 + Math.floor((pollAttempt / MAX_POLLS) * 60)));

        const { data: statusData, error: statusError } = await supabase.functions.invoke("ugc-generate", {
          body: {
            action: "check-video-status",
            requestId,
            statusUrl: jobStatusUrl,
            responseUrl: jobResponseUrl,
            masterFrameUrl: submitData.masterFrameUrl,
            productName: selectedProd.name,
            voiceId: body.voiceId,
            musicPrompt: body.musicPrompt,
            scriptText: script,
            setting: avatarSetting,
          }
        });

        if (statusError) {
          console.warn(`[poll] Attempt ${pollAttempt} error:`, statusError.message);
          continue;
        }
        if (statusData?.error) {
          throw new Error(statusData.error);
        }

        if (statusData?.status === "COMPLETED" && statusData?.videoUrl) {
          setVideoUrl(statusData.videoUrl);
          setVideoProgress(100);
          setStep(4);
          toast({ title: "🎬 UGC Video Created!", description: "Your video is ready to download." });
          return;
        }

        if (statusData?.status === "FAILED") {
          throw new Error(statusData.error || "Video generation failed on Fal.ai");
        }

        // Still IN_PROGRESS — keep polling
        if (pollAttempt % 5 === 0) {
          console.log(`[poll] Attempt ${pollAttempt}/${MAX_POLLS} — still waiting...`);
        }
      }

      throw new Error("Video generation timed out after 6 minutes. Please try again.");
    } catch (err: any) {
      toast({ title: "Video generation failed", description: err?.message, variant: "destructive" });
    } finally {
      setGeneratingVideo(false);
    }
  };


  // Pipeline steps
  const steps = [
    { n: 1, label: "Product", icon: <Layers className="w-4 h-4" />, done: !!selectedProduct },
    { n: 2, label: "Avatar", icon: <User className="w-4 h-4" />, done: !!currentAvatar },
    { n: 3, label: "Script", icon: <FileText className="w-4 h-4" />, done: !!script },
    { n: 4, label: "Render", icon: <Video className="w-4 h-4" />, done: !!videoUrl },
  ];

  return (
    <div className="space-y-6">
      {/* Locked Product Header */}
      {selectedProd && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img src={selectedProd.images?.[0]} alt="" className="w-16 h-16 rounded-lg object-cover border-2 border-primary" />
              <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-md">
                <Layers className="w-3 h-3" />
              </div>
            </div>
            <div>
              <h4 className="font-heading text-base font-bold text-foreground">LOCKED PRODUCT: {selectedProd.name}</h4>
              <div className="flex items-center gap-3 mt-1">
                <Badge variant="outline" className="text-[10px] font-body bg-background/50 border-primary/20">
                  ID: {selectedProd.id.slice(0, 8)}...
                </Badge>
                <Badge className="bg-emerald-500/10 text-emerald-700 text-[10px]">
                  100% VISUAL INTEGRITY ENFORCED
                </Badge>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-xs text-muted-foreground hover:text-primary">
            <RefreshCw className="w-3 h-3 mr-2" /> Change Product
          </Button>
        </div>
      )}

      {/* Mode Selection */}
      <div className="flex items-center justify-between bg-card border border-border p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isUGC ? "bg-primary/10 text-primary" : "bg-gold/10 text-gold"}`}>
            {isUGC ? <Zap className="w-5 h-5" /> : <Star className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="font-heading text-sm font-bold">{isUGC ? "Real UGC Mode" : "Studio Cinematic Mode"}</h4>
            <p className="text-xs text-muted-foreground font-body">
              {isUGC ? "Handheld phone quality, realistic movement (Kling 1.5 Pro)" : "High-end editorial look, stable cinematic shots (Veo 3.1)"}
            </p>
          </div>
        </div>
        <div className="flex p-1 bg-muted rounded-lg border border-border">
          <button 
            onClick={() => setIsUGC(true)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${isUGC ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Real UGC
          </button>
          <button 
            onClick={() => setIsUGC(false)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${!isUGC ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Studio
          </button>
        </div>
      </div>

      {/* Pipeline Steps */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/30 border border-border">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center flex-1">
            <button
              onClick={() => setStep(s.n)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-body transition-all w-full justify-center ${
                step === s.n
                  ? "bg-primary text-primary-foreground shadow-md"
                  : s.done
                    ? "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20"
                    : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {s.done && step !== s.n ? (
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
              ) : s.icon}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0 mx-1" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Step 1: Product Selection ── */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
                    <Layers className="w-5 h-5 text-primary" /> 🔒 Step 1: Product Lock
                  </h3>
                  <p className="text-sm text-muted-foreground font-body">Select the real product you want to feature. Its images are the single source of truth.</p>
                </div>
                {selectedProd && (
                  <Badge className="bg-emerald-500/10 text-emerald-700 gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Product Locked
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {products?.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedProduct(p.id); }}
                    className={`rounded-xl border p-3 text-left transition-all hover:border-primary/30 hover:shadow-md ${
                      selectedProduct === p.id ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border bg-card"
                    }`}
                  >
                    <div className="relative">
                      {p.images && p.images.length > 0 && (
                        <img src={p.images[0]} alt={p.name} className="w-full h-28 object-cover rounded-lg mb-2" loading="lazy" />
                      )}
                      {selectedProduct === p.id && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-lg">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-heading text-sm font-semibold truncate">{p.name}</p>
                      {p.isLive && (
                        <Badge variant="outline" className="bg-primary/10 text-primary text-[10px] py-0 h-4 border-primary/20">
                          LIVE
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{p.currency} {p.price?.toLocaleString()}</p>
                  </button>
                ))}
              </div>

              {selectedProduct && (
                <div className="flex justify-end">
                  <Button onClick={() => setStep(2)} className="gap-2">
                    Lock & Continue <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {!products?.length && (
                <div className="text-center py-8 text-muted-foreground">
                  <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No active products. Add products first.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Step 2: Avatar ── */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
                  <User className="w-5 h-5" /> 🔒 Avatar Lock
                </h3>
                <p className="text-xs text-muted-foreground font-body">
                  Upload YOUR photo to use as the creator, or generate an AI avatar. The avatar will hold/wear your actual product.
                </p>

                {/* Upload first - primary option */}
                <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
                  <p className="text-sm font-semibold font-heading text-primary">📸 Use Your Own Photo (Recommended)</p>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  <Button variant="outline" className="w-full gap-2 border-primary/30 hover:bg-primary/10" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4" /> Choose Your Photo
                  </Button>
                  {uploadedPreview && (
                    <div className="flex items-center gap-3 p-2 bg-card rounded-lg border">
                      <img src={uploadedPreview} alt="Uploaded" className="w-12 h-12 rounded-lg object-cover" />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-emerald-700">✓ Photo uploaded</p>
                        <p className="text-[10px] text-muted-foreground">{uploadedFile?.name}</p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={clearUpload}><X className="w-3 h-3" /></Button>
                    </div>
                  )}
                  {uploadedPreview && (
                    <div className="flex flex-col gap-2">
                      <Button onClick={generateAvatar} disabled={generatingAvatar || !selectedProduct} className="w-full gap-2">
                        {generatingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                        Generate Avatar with Your Photo + Product
                      </Button>
                      <Button onClick={generateDirectVideo} disabled={generatingVideo || !selectedProduct} variant="secondary" className="w-full gap-2 h-11 border-primary/10">
                        {generatingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-primary" />}
                        Quick Generate Real Video
                      </Button>
                    </div>
                  )}
                  {!selectedProduct && (
                    <p className="text-[10px] text-destructive text-center font-body mt-1">
                      ! Select a product in Step 1 to enable generation
                    </p>
                  )}
                </div>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
                  <div className="relative flex justify-center"><span className="bg-card px-3 text-xs text-muted-foreground">or generate AI avatar</span></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-body text-muted-foreground mb-1 block">Gender</label>
                    <Select value={avatarGender} onValueChange={setAvatarGender} disabled={!!avatarUrl}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-body text-muted-foreground mb-1 block">Ethnicity</label>
                    <Select value={avatarEthnicity} onValueChange={setAvatarEthnicity} disabled={!!avatarUrl}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="african">African</SelectItem>
                        <SelectItem value="caucasian">Caucasian</SelectItem>
                        <SelectItem value="asian">Asian</SelectItem>
                        <SelectItem value="hispanic">Hispanic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-body text-muted-foreground mb-1 block">Setting</label>
                  <Select value={avatarSetting} onValueChange={setAvatarSetting} disabled={!!avatarUrl}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="studio">Studio</SelectItem>
                      <SelectItem value="bedroom">Bedroom</SelectItem>
                      <SelectItem value="outdoor">Outdoor</SelectItem>
                      <SelectItem value="office">Office</SelectItem>
                      <SelectItem value="fashion_store">Fashion Store</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {!avatarUrl && !uploadedPreview && (
                  <div className="flex flex-col gap-2">
                    <Button onClick={generateAvatar} disabled={generatingAvatar || !selectedProduct} className="w-full gap-2">
                      {generatingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                      Generate AI Avatar with Product
                    </Button>
                    <Button onClick={generateDirectVideo} disabled={generatingVideo || !selectedProduct} variant="secondary" className="w-full gap-2 h-11 border-primary/10">
                      {generatingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-primary" />}
                      Quick Generate Real Video
                    </Button>
                  </div>
                )}

                {(avatarUrl) && (
                  <div className="space-y-2">
                    <Badge className="bg-emerald-500/10 text-emerald-700 text-xs">🔒 Avatar Locked</Badge>
                    <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => { setAvatarUrl(""); clearUpload(); setVideoUrl(""); }}>
                      <RefreshCw className="w-3 h-3" /> Reset Avatar
                    </Button>
                  </div>
                )}
              </div>

              {/* Avatar Preview */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <h3 className="font-heading text-lg font-semibold">Preview</h3>
                {currentAvatar ? (
                  <div className="aspect-[9/16] max-h-[400px] rounded-xl overflow-hidden border border-border bg-charcoal mx-auto">
                    <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-[9/16] max-h-[400px] rounded-xl border border-dashed border-border bg-muted/20 flex items-center justify-center">
                    <div className="text-center">
                      <User className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">Upload your photo or generate an avatar</p>
                    </div>
                  </div>
                )}
                {currentAvatar && (
                  <div className="flex flex-col gap-2">
                    <Button onClick={() => setStep(3)} className="w-full gap-2">
                      Continue to Script <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button onClick={generateDirectVideo} disabled={generatingVideo} variant="outline" className="w-full gap-2 border-primary/20">
                      {generatingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-primary" />}
                      Quick Generate Real Video
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Step 3: Script ── */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5" /> Video Script
                </h3>
                {selectedProd && (
                  <div className="rounded-lg bg-muted/50 p-3 flex items-center gap-3">
                    {selectedProd.images?.[0] && <img src={selectedProd.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />}
                    <div>
                      <p className="text-sm font-semibold font-heading">{selectedProd.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedProd.currency} {selectedProd.price?.toLocaleString()}</p>
                    </div>
                  </div>
                )}
                <Button onClick={generateScript} disabled={generatingScript || !selectedProd} className="w-full gap-2">
                  {generatingScript ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Generate AI Script
                </Button>
                <Textarea
                  placeholder="Script will appear here... You can also write your own."
                  value={script}
                  onChange={e => setScript(e.target.value)}
                  className="min-h-[200px] font-body text-sm"
                />
              </div>
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <h3 className="font-heading text-lg font-semibold">Script Preview</h3>
                {script ? (
                  <div className="rounded-lg border border-border bg-muted/30 p-4 max-h-[400px] overflow-y-auto">
                    <div className="prose prose-sm max-w-none font-body prose-headings:font-heading prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground">
                      <ReactMarkdown>{script}</ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground">Generate or write a script</p>
                  </div>
                )}
                {script && (
                  <Button onClick={() => setStep(4)} className="w-full gap-2">
                    Continue to Frames <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Step 4: Final Video Render ── */}
        {step === 4 && (
          <motion.div key="step4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
                      <Video className="w-5 h-5 text-primary" /> 🎬 Step 4: High-Motion Render
                    </h3>
                    <p className="text-sm text-muted-foreground font-body">
                      Generate a 5-second realistic UGC video with handheld camera motion and natural influencer behavior.
                    </p>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/20">Kling 1.5 Pro</Badge>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-3">
                  <div className="flex items-center gap-4">
                    <img src={currentAvatar} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-primary" />
                    <div>
                      <p className="text-sm font-bold font-heading">Influencer Identity Locked</p>
                      <p className="text-xs text-muted-foreground">Ready to generate high-motion performance</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <img src={selectedProd?.images?.[0]} alt="" className="w-16 h-16 rounded-lg object-cover border-2 border-emerald-500" />
                    <div>
                      <p className="text-sm font-bold font-heading">Product Fidelity Locked</p>
                      <p className="text-xs text-muted-foreground">Verification engine active (Qwen VL)</p>
                    </div>
                  </div>
                </div>

                {!videoUrl ? (
                  <Button
                    onClick={generateDirectVideo}
                    disabled={generatingVideo || !currentAvatar || !script}
                    className="w-full gap-2 h-14 text-lg font-bold shadow-lg shadow-primary/20"
                    size="lg"
                  >
                    {generatingVideo ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                    {generatingVideo ? "Rendering High-Motion Video..." : "GENERATE FINAL UGC VIDEO"}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 justify-center p-3 bg-emerald-500/10 text-emerald-700 rounded-lg">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-bold">VIDEO RENDER COMPLETE</span>
                  </div>
                )}

                {/* ── Trust Badges ── */}
                {videoUrl && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Virtual Try-On Verification</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Identity Locked
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                        <Layers className="w-3 h-3" /> Using Real Product
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-gold/10 text-amber-700 border border-gold/20">
                        <ShoppingBag className="w-3 h-3" /> Garment Preserved
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-violet-500/10 text-violet-700 border border-violet-500/20">
                        <Zap className="w-3 h-3" /> No AI Hallucination
                      </span>
                    </div>
                    {videoFidelityScore !== null && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                          <span>Garment Fidelity Score</span>
                          <span className={`${
                            videoFidelityScore >= 0.92 ? "text-emerald-600" :
                            videoFidelityScore >= 0.80 ? "text-amber-600" : "text-red-600"
                          }`}>{Math.round(videoFidelityScore * 100)}%</span>
                        </div>
                        <Progress
                          value={videoFidelityScore * 100}
                          className="h-2"
                        />
                        <p className="text-[9px] text-muted-foreground font-body">
                          {videoFidelityScore >= 0.92 ? "✓ Passed high-fidelity threshold (92%+) — garment matches source product." :
                           videoFidelityScore >= 0.80 ? "⚠ Acceptable fidelity — minor variation detected." :
                           "✗ Below fidelity threshold — re-generate or check product image quality."}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {generatingVideo && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                    <Progress value={videoProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center font-body">
                      {videoProgress < 30
                        ? "⚙️ Creating VTON master frame + submitting video job..."
                        : videoProgress < 90
                        ? `🎬 Kling 3.0 Pro is rendering your video... (${videoProgress}%)`
                        : "✅ Finalizing video + adding audio layers..."}
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Video Player */}
              {videoUrl && (
                <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                  <h4 className="font-heading text-lg font-semibold">📺 Video Preview</h4>
                  <div className="aspect-[9/16] max-h-[500px] rounded-xl overflow-hidden border border-border bg-charcoal mx-auto shadow-2xl">
                    <video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={() => {
                      const a = document.createElement("a");
                      a.href = videoUrl;
                      a.download = `ugc-${selectedProd?.name?.replace(/\s+/g, "-") || "video"}.mp4`;
                      a.click();
                    }} className="flex-1 gap-2 h-12" size="lg">
                      <Download className="w-4 h-4" /> Download MP4
                    </Button>
                    <Button variant="outline" onClick={() => { setVideoUrl(""); }} className="h-12 gap-2">
                      <RefreshCw className="w-4 h-4" /> Regenerate
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   AI INFLUENCER VISUAL ENGINE — World-Class Output
   ═══════════════════════════════════════════════════════════ */
function InfluencerManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedInfluencer, setSelectedInfluencer] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [styleMode, setStyleMode] = useState("luxury_campaign");
  const [sceneType, setSceneType] = useState("studio");
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  // Influencer management state
  const [viewInfluencer, setViewInfluencer] = useState<any>(null);
  const [editInfluencer, setEditInfluencer] = useState<any>(null);
  const [deleteInfluencer, setDeleteInfluencer] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);
  
  // Influencer creation state
  const [newInfluencer, setNewInfluencer] = useState({ 
    name: "", gender: "female", ethnicity: "african", face_embedding: "", body_type: "tall_editorial",
    style_profile: "High-End Editorial", pose_style: "Dynamic Fashion"
  });
  const [generatingIdentity, setGeneratingIdentity] = useState(false);
  const [campaignFidelityScore, setCampaignFidelityScore] = useState<number | null>(null);
  const [galleryPage, setGalleryPage] = useState(1);
  const GALLERY_PAGE_SIZE = 8;

  const { data: influencers, isLoading: influencersLoading } = useQuery({
    queryKey: ["influencers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("influencers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products-active-influencer"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("status", "active");
      return data || [];
    },
  });

  const { data: generatedVisuals, refetch: refetchVisuals } = useQuery({
    queryKey: ["generated-visuals", selectedInfluencer?.id],
    enabled: !!selectedInfluencer?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("content")
        .select("*")
        .eq("type", "ai_visual")
        .contains("metadata", { influencer_id: selectedInfluencer.id })
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const deleteInfluencerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("influencers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["influencers"] });
      if (selectedInfluencer?.id === deleteInfluencer?.id) setSelectedInfluencer(null);
      setDeleteInfluencer(null);
      toast({ title: "Model deleted", description: "The identity has been permanently removed." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Delete failed", description: error.message });
    },
  });

  const saveEditInfluencer = async () => {
    if (!editInfluencer) return;
    setSavingEdit(true);
    try {
      const { error } = await supabase.from("influencers").update(editForm).eq("id", editInfluencer.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["influencers"] });
      if (selectedInfluencer?.id === editInfluencer.id) setSelectedInfluencer({ ...editInfluencer, ...editForm });
      setEditInfluencer(null);
      toast({ title: "Model updated", description: "Identity details have been saved." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update failed", description: err.message });
    } finally {
      setSavingEdit(false);
    }
  };

  const setCoverImage = useMutation({
    mutationFn: async (visual: any) => {
      const productId = visual.metadata?.product_id || visual.product_id;
      if (!productId) throw new Error("This visual is not linked to a specific product.");
      
      const { data: prod } = await supabase.from("products").select("images").eq("id", productId).single();
      if (!prod) throw new Error("Product not found.");
      
      const currentImages = prod.images || [];
      const filtered = currentImages.filter((img: string) => img !== visual.media_url);
      const newImages = [visual.media_url, ...filtered];
      
      const { error } = await supabase.from("products").update({ images: newImages }).eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-active-influencer"] });
      toast({ title: "Cover Image Updated 🌟", description: "The AI mockup will now be the primary image across all storefronts and portals." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to update cover", description: error.message });
    }
  });

  const selectedProd = products?.find(p => p.id === selectedProduct);

  const generateCampaignVisual = async () => {
    if (!selectedInfluencer || !selectedProduct) {
      toast({ title: "Select an influencer and product first" });
      return;
    }
    setGenerating(true);
    setGenerationStep(1); // Identity Lock

    try {
      // Step 1: Identity Lock (Simulated)
      await new Promise(r => setTimeout(r, 1500));
      setGenerationStep(2); // Product Lock

      // Step 2: Product Lock (Simulated)
      await new Promise(r => setTimeout(r, 2000));
      setGenerationStep(3); // Styling Engine

      // Step 3: Styling Engine (Simulated)
      await new Promise(r => setTimeout(r, 1500));
      setGenerationStep(4); // Rendering Campaign

      const { data, error } = await supabase.functions.invoke("ugc-generate", {
        body: {
          action: "generate-campaign-shot",
          influencer: selectedInfluencer,
          product: selectedProd,
          style: styleMode,
          scene: sceneType,
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Save to content gallery
      const { error: insertError } = await supabase.from("content").insert({
        type: "ai_visual",
        title: `${selectedInfluencer.name} x ${selectedProd.name} Campaign`,
        body: `Campaign Visual: ${styleMode.replace("_", " ")} styling in ${sceneType.replace("_", " ")} scene.`,
        media_url: data.imageUrl,
        product_id: selectedProduct,
        metadata: {
          influencer_id: selectedInfluencer.id,
          style: styleMode,
          scene: sceneType,
          campaign_ready: true
        } as any
      });

      if (insertError) throw insertError;

      if (data.fidelityScore !== undefined) setCampaignFidelityScore(data.fidelityScore);
      await refetchVisuals();
      const scoreLabel = data.fidelityScore != null ? ` · Fidelity ${Math.round(data.fidelityScore * 100)}%` : "";
      toast({ title: "Campaign visual generated! 📸", description: `Garment & identity preserved${scoreLabel}.` });
    } catch (err: any) {
      console.error("Generation error:", err);
      toast({ 
        title: "Generation failed", 
        description: err.message || "An error occurred during generation", 
        variant: "destructive" 
      });
    } finally {
      setGenerating(false);
      setGenerationStep(0);
    }
  };

  const handleDownload = async (url: string, title: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${title.toLowerCase().replace(/\s+/g, "-")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      window.open(url, "_blank");
    }
  };

  const handleView = (url: string) => {
    window.open(url, "_blank");
  };

  const createInfluencerIdentity = async () => {
    if (!newInfluencer.name) return;
    setGeneratingIdentity(true);
    try {
      // 1. Generate identity reference image
      const { data: imgData, error: imgError } = await supabase.functions.invoke("ugc-generate", {
        body: { 
          action: "generate-avatar", 
          gender: newInfluencer.gender, 
          ethnicity: newInfluencer.ethnicity,
          setting: "studio-portrait"
        }
      });
      if (imgError) throw imgError;
      if (imgData?.error) throw new Error(imgData.error);

      // 2. Save identity
      const { error: insError } = await supabase.from("influencers").insert({
        ...newInfluencer,
        avatar_url: imgData.imageUrl,
      } as any);
      if (insError) throw insError;

      queryClient.invalidateQueries({ queryKey: ["influencers"] });
      setShowCreate(false);
      toast({ title: "Influencer identity locked!" });
    } catch (err: any) {
      toast({ title: "Failed to create identity", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingIdentity(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 pb-20">
      {/* LEFT PANEL: CONFIGURATION */}
      <div className="xl:col-span-4 space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg font-bold flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> 1. Identity Lock
            </h3>
            <Button size="sm" variant="ghost" onClick={() => setShowCreate(true)} className="text-xs h-7 gap-1">
              <Plus className="w-3 h-3" /> New Identity
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {influencers?.map(inf => (
              <div
                key={inf.id}
                className={`group relative rounded-xl border-2 p-2 transition-all hover:shadow-md ${
                  selectedInfluencer?.id === inf.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                }`}
              >
                {/* Three-dot menu */}
                <div className="absolute top-1.5 right-1.5 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={e => e.stopPropagation()}
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 flex items-center justify-center rounded-md bg-background/80 backdrop-blur-sm border border-border hover:bg-muted shadow-sm"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32">
                      <DropdownMenuItem onClick={e => { e.stopPropagation(); setViewInfluencer(inf); }}>
                        <Eye className="w-3.5 h-3.5 mr-2" /> View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={e => { e.stopPropagation(); setEditForm({ name: inf.name, gender: inf.gender, ethnicity: inf.ethnicity, body_type: inf.body_type, style_profile: inf.style_profile, pose_style: inf.pose_style }); setEditInfluencer(inf); }}>
                        <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={e => { e.stopPropagation(); setDeleteInfluencer(inf); }}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Card body — clicking selects influencer */}
                <button className="w-full text-left" onClick={() => setSelectedInfluencer(inf)}>
                  <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-muted">
                    <img src={inf.avatar_url} alt={inf.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                  <p className="text-xs font-bold font-heading truncate text-center">{inf.name}</p>
                </button>

                {selectedInfluencer?.id === inf.id && (
                  <div className="absolute -top-1.5 -left-1.5 bg-primary text-white p-0.5 rounded-full shadow-sm pointer-events-none">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── VIEW DIALOG ── */}
          {viewInfluencer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setViewInfluencer(null)}>
              <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between">
                  <h3 className="font-heading text-lg font-bold">{viewInfluencer.name}</h3>
                  <button onClick={() => setViewInfluencer(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="aspect-square rounded-xl overflow-hidden bg-muted">
                  <img src={viewInfluencer.avatar_url} alt={viewInfluencer.name} className="w-full h-full object-cover" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: "Gender", value: viewInfluencer.gender },
                    { label: "Ethnicity", value: viewInfluencer.ethnicity },
                    { label: "Body Type", value: viewInfluencer.body_type },
                    { label: "Style", value: viewInfluencer.style_profile },
                    { label: "Pose", value: viewInfluencer.pose_style },
                  ].map(row => (
                    <div key={row.label} className="bg-muted/40 rounded-lg p-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">{row.label}</p>
                      <p className="font-medium truncate capitalize">{row.value || "—"}</p>
                    </div>
                  ))}
                </div>
                <Button className="w-full" onClick={() => { setSelectedInfluencer(viewInfluencer); setViewInfluencer(null); }}>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Select this Model
                </Button>
              </div>
            </div>
          )}

          {/* ── EDIT DIALOG ── */}
          {editInfluencer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setEditInfluencer(null)}>
              <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between">
                  <h3 className="font-heading text-lg font-bold">Edit Model</h3>
                  <button onClick={() => setEditInfluencer(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <img src={editInfluencer.avatar_url} alt="" className="w-14 h-14 rounded-xl object-cover border border-border" />
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Display Name</label>
                    <input
                      value={editForm.name || ""}
                      onChange={e => setEditForm((f: any) => ({ ...f, name: e.target.value }))}
                      className="w-full mt-1 text-sm bg-muted/40 border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { key: "gender", label: "Gender", options: ["female", "male", "non-binary"] },
                    { key: "ethnicity", label: "Ethnicity", options: ["african", "asian", "caucasian", "latina", "mixed"] },
                    { key: "body_type", label: "Body Type", options: ["tall_editorial", "petite", "curvy", "athletic"] },
                    { key: "style_profile", label: "Style", options: ["High-End Editorial", "Streetwear", "Casual Chic", "Minimalist"] },
                  ] as { key: string; label: string; options: string[] }[]).map(field => (
                    <div key={field.key}>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{field.label}</label>
                      <select
                        value={editForm[field.key] || ""}
                        onChange={e => setEditForm((f: any) => ({ ...f, [field.key]: e.target.value }))}
                        className="w-full mt-1 text-sm bg-muted/40 border border-border rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setEditInfluencer(null)}>Cancel</Button>
                  <Button className="flex-1" onClick={saveEditInfluencer} disabled={savingEdit}>
                    {savingEdit ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── DELETE ALERT DIALOG ── */}
          <AlertDialog open={!!deleteInfluencer} onOpenChange={open => !open && setDeleteInfluencer(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-heading">Delete "{deleteInfluencer?.name}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove this AI model identity and all its associated data. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => deleteInfluencer && deleteInfluencerMutation.mutate(deleteInfluencer.id)}
                >
                  Delete Model
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="pt-4 border-t border-border/50">
            <h3 className="font-heading text-lg font-bold flex items-center gap-2 mb-4">
              <ShoppingBag className="w-5 h-5 text-gold" /> 2. Product Lock
            </h3>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="rounded-xl h-12 bg-muted/20">
                <SelectValue placeholder="Select product to wear..." />
              </SelectTrigger>
              <SelectContent>
                {products?.map(p => (
                  <SelectItem key={p.id} value={p.id} className="py-3">
                    <div className="flex items-center gap-3">
                      <img src={p.images?.[0]} alt="" className="w-8 h-8 rounded-md object-cover" />
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4 border-t border-border/50 space-y-4">
            <h3 className="font-heading text-lg font-bold flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-emerald-500" /> 3. Styling Engine
            </h3>
            
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Style Mode</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: "luxury_campaign", label: "Luxury", icon: <Star className="w-3 h-3" /> },
                  { id: "editorial_minimal", label: "Editorial", icon: <Image className="w-3 h-3" /> },
                  { id: "streetwear_vibe", label: "Street", icon: <Zap className="w-3 h-3" /> },
                  { id: "ecommerce_clean", label: "E-comm", icon: <CheckCircle2 className="w-3 h-3" /> },
                  { id: "social_media_influencer", label: "Influencer", icon: <Share2 className="w-3 h-3" /> },
                  { id: "vintage_aesthetic", label: "Vintage", icon: <Film className="w-3 h-3" /> }
                ].map(s => (
                  <Button
                    key={s.id}
                    variant={styleMode === s.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStyleMode(s.id)}
                    className="text-[10px] rounded-lg gap-1.5 h-8"
                  >
                    {s.icon} {s.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Scene Type</label>
              <Select value={sceneType} onValueChange={setSceneType}>
                <SelectTrigger className="rounded-xl h-10 bg-muted/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="studio">Studio (White/Neutral)</SelectItem>
                  <SelectItem value="luxury_lobby">Luxury Lobby</SelectItem>
                  <SelectItem value="modern_office">Modern Office</SelectItem>
                  <SelectItem value="city_street">Parisian Street</SelectItem>
                  <SelectItem value="high_fashion_runway">Runway Stage</SelectItem>
                  <SelectItem value="minimal_loft">Minimal Loft</SelectItem>
                  <SelectItem value="sunset_beach">Sunset Beach Editorial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            className="w-full h-14 rounded-2xl gap-3 font-bold text-lg shadow-xl shadow-primary/20"
            onClick={generateCampaignVisual}
            disabled={generating || !selectedInfluencer || !selectedProduct}
          >
            {generating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5 text-gold" />
            )}
            {generating ? "Producing..." : "Generate"}
          </Button>

          {generating && (
            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <span>{generationStep === 1 ? "Identity Lock" : generationStep === 2 ? "Product Sync" : generationStep === 3 ? "Styling Outfit" : "Final Render"}</span>
                <span>{generationStep * 25}%</span>
              </div>
              <Progress value={generationStep * 25} className="h-1.5" />
              <p className="text-[9px] text-muted-foreground animate-pulse text-center italic font-body">
                {generationStep === 1 && "Verifying influencer facial embedding..."}
                {generationStep === 2 && `Applying ${selectedProd?.name} textures to model...`}
                {generationStep === 3 && `Styling ${styleMode.replace("_", " ")} campaign look...`}
                {generationStep === 4 && "Final high-end cinematography pass..."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: GENERATION WORKSPACE & GALLERY */}
      <div className="xl:col-span-8 space-y-6">
        {/* Latest Generation / Hero */}
        <div className={`rounded-2xl border-2 border-primary/20 bg-card overflow-hidden shadow-xl relative ${generatedVisuals?.[0] ? 'min-h-[400px]' : 'min-h-[600px]'} flex items-center justify-center bg-[url('/grid-bg.png')] bg-repeat`}>
          {generatedVisuals?.[0] ? (
            <div className="w-full h-full group">
              <img src={generatedVisuals[0].media_url} alt="Campaign Shot" className="w-full h-full object-contain" />
              <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-charcoal to-transparent">
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <Badge className="bg-primary/20 text-white border-white/20 mb-2">Campaign Ready</Badge>
                    <h2 className="text-white font-heading text-2xl font-bold">{generatedVisuals[0].title}</h2>
                    <p className="text-white/60 text-sm font-body">{generatedVisuals[0].body}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="rounded-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                      onClick={() => handleView(generatedVisuals[0].media_url)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="rounded-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                      onClick={() => handleDownload(generatedVisuals[0].media_url, generatedVisuals[0].title)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4 max-w-sm px-6">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Clapperboard className="w-10 h-10 text-primary opacity-40" />
              </div>
              <h3 className="font-heading text-xl font-bold">Campaign Workspace</h3>
              <p className="text-muted-foreground text-sm font-body">Select your influencer, product, and style to generate production-ready fashion photography.</p>
              <div className="pt-4 flex justify-center gap-2">
                <Badge variant="outline" className="opacity-50">Photorealistic</Badge>
                <Badge variant="outline" className="opacity-50">Identity-Locked</Badge>
                <Badge variant="outline" className="opacity-50">4K Render</Badge>
              </div>
            </div>
          )}
          
          {/* Workflow Status Overlay */}
          <div className="absolute top-6 left-6 flex flex-col gap-2">
            <div className="flex items-center gap-2 bg-background/80 backdrop-blur-md border border-border px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm">
              <div className={`w-2 h-2 rounded-full ${selectedInfluencer ? "bg-emerald-500 animate-pulse" : "bg-muted"}`} />
              Identity: {selectedInfluencer ? selectedInfluencer.name : "Unlocked"}
            </div>
            <div className="flex items-center gap-2 bg-background/80 backdrop-blur-md border border-border px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm">
              <div className={`w-2 h-2 rounded-full ${selectedProduct ? "bg-emerald-500 animate-pulse" : "bg-muted"}`} />
              Product: {selectedProd ? selectedProd.name : "Ready"}
            </div>
            {campaignFidelityScore !== null && (
              <div className={`flex items-center gap-2 backdrop-blur-md border px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm ${
                campaignFidelityScore >= 0.92 ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-700" :
                campaignFidelityScore >= 0.80 ? "bg-amber-500/20 border-amber-500/40 text-amber-700" :
                "bg-red-500/20 border-red-500/40 text-red-700"
              }`}>
                <CheckCircle2 className="w-3 h-3" />
                Fidelity {Math.round(campaignFidelityScore * 100)}%
              </div>
            )}
          </div>

          {/* Trust Badges — bottom-right corner */}
          {generatedVisuals?.[0] && (
            <div className="absolute top-6 right-6 flex flex-col gap-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-background/80 backdrop-blur-md border border-emerald-500/30 text-emerald-700 shadow-sm">
                <CheckCircle2 className="w-3 h-3" /> Identity Locked
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-background/80 backdrop-blur-md border border-primary/30 text-primary shadow-sm">
                <Layers className="w-3 h-3" /> Real Product
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-background/80 backdrop-blur-md border border-gold/30 text-amber-700 shadow-sm">
                <ShoppingBag className="w-3 h-3" /> Garment Preserved
              </span>
            </div>
          )}
        </div>

        {/* Gallery of Past Visuals */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg font-bold">Campaign Gallery</h3>
            <p className="text-xs text-muted-foreground">All images maintain full brand consistency</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {generatedVisuals?.slice((galleryPage - 1) * GALLERY_PAGE_SIZE, galleryPage * GALLERY_PAGE_SIZE).map((visual: any) => (
              <div key={visual.id} className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-border bg-muted cursor-pointer hover:shadow-xl transition-all">
                <img src={visual.media_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-charcoal/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                   <Button 
                    size="icon" 
                    variant="secondary" 
                    className="h-8 w-8 rounded-full"
                    onClick={() => handleView(visual.media_url)}
                    title="View Full Size"
                   >
                    <Eye className="w-4 h-4" />
                   </Button>
                   <Button 
                    size="icon" 
                    variant="secondary" 
                    className="h-8 w-8 rounded-full bg-gold/90 hover:bg-gold text-maroon-dark"
                    onClick={(e) => { e.stopPropagation(); setCoverImage.mutate(visual); }}
                    disabled={setCoverImage.isPending}
                    title="Set as Product Cover Image"
                   >
                    {setCoverImage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4 fill-maroon-dark" />}
                   </Button>
                   <Button 
                    size="icon" 
                    variant="secondary" 
                    className="h-8 w-8 rounded-full"
                    onClick={() => handleDownload(visual.media_url, visual.title)}
                    title="Download"
                   >
                    <Download className="w-4 h-4" />
                   </Button>
                </div>
              </div>
            ))}
            
            {(!generatedVisuals || generatedVisuals.length === 0) && (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-xl border border-dashed border-border flex items-center justify-center opacity-20">
                  <Image className="w-8 h-8" />
                </div>
              ))
            )}
          </div>

          {generatedVisuals && generatedVisuals.length > GALLERY_PAGE_SIZE && (
            <div className="pt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setGalleryPage(p => Math.max(1, p - 1))}
                      className={galleryPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.ceil(generatedVisuals.length / GALLERY_PAGE_SIZE) }).map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink 
                        onClick={() => setGalleryPage(i + 1)}
                        isActive={galleryPage === i + 1}
                        className="cursor-pointer"
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setGalleryPage(p => Math.min(Math.ceil(generatedVisuals.length / GALLERY_PAGE_SIZE), p + 1))}
                      className={galleryPage === Math.ceil(generatedVisuals.length / GALLERY_PAGE_SIZE) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </div>

      {/* CREATE INFLUENCER DIALOG */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold">Lock New Identity</DialogTitle>
            <p className="text-sm text-muted-foreground font-body">Create a persistent AI persona for your brand campaigns.</p>
          </DialogHeader>
          
          <div className="space-y-5 pt-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Persona Name</label>
              <Input 
                placeholder="e.g. Elena V" 
                value={newInfluencer.name} 
                onChange={e => setNewInfluencer(f => ({ ...f, name: e.target.value }))}
                className="rounded-xl bg-muted/20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ethnicity</label>
                <Select value={newInfluencer.ethnicity} onValueChange={v => setNewInfluencer(f => ({ ...f, ethnicity: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="african">African</SelectItem>
                    <SelectItem value="caucasian">Caucasian</SelectItem>
                    <SelectItem value="asian">Asian</SelectItem>
                    <SelectItem value="hispanic">Hispanic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Body Type</label>
                <Select value={newInfluencer.body_type} onValueChange={v => setNewInfluencer(f => ({ ...f, body_type: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="athletic">Athletic / Slim</SelectItem>
                    <SelectItem value="curvy">Curvy</SelectItem>
                    <SelectItem value="tall_editorial">Tall Editorial</SelectItem>
                    <SelectItem value="plus_size">Plus Size</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <Button 
                onClick={createInfluencerIdentity} 
                disabled={generatingIdentity || !newInfluencer.name} 
                className="w-full h-12 rounded-xl gap-2 font-bold"
              >
                {generatingIdentity ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {generatingIdentity ? "Generating Portrait Reference..." : "Create & Lock Identity"}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center font-body">
                Identity locking ensures the same facial features appear in every campaign shot.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ContentPage;
