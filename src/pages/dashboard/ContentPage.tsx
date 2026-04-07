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
  Clapperboard, Film, Layers, Volume2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Tables } from "@/integrations/supabase/types";
import { motion, AnimatePresence } from "framer-motion";
import { assembleVideo, type VideoFrame } from "@/lib/videoAssembler";

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
      const { data } = await supabase.from("products").select("id, name, category, price, currency").eq("status", "active");
      return data || [];
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
          <Sparkles className="w-5 h-5 text-gold" /> AI Content Generator
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
  const [frames, setFrames] = useState<StoryboardFrame[]>([]);
  const [frameCount, setFrameCount] = useState(4);
  const [projectId, setProjectId] = useState<string | null>(null);

  // Video state
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [enableTTS, setEnableTTS] = useState(true);

  // Loading states
  const [generatingAvatar, setGeneratingAvatar] = useState(false);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [generatingStoryboard, setGeneratingStoryboard] = useState(false);
  const [storyboardProgress, setStoryboardProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: products } = useQuery({
    queryKey: ["products-active"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("status", "active");
      return data || [];
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
        productImageUrl: selectedProd?.images?.[0] || null,
      };

      // If user uploaded their own photo, convert to base64 and send
      if (uploadedFile && uploadedFile.type.startsWith("image/")) {
        const base64 = await fileToBase64(uploadedFile);
        body.avatarImageBase64 = base64;
      }

      const { data, error } = await supabase.functions.invoke("ugc-generate", { body });
      if (error) throw error;
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

      if (data?.scriptData) {
        setScriptData(data.scriptData);
        const sd = data.scriptData;
        const lines = [`## ${sd.title || "UGC Script"}`, "", `**Hook:** ${sd.hook || ""}`, ""];
        sd.scenes?.forEach((s: any) => {
          lines.push(`### Scene ${s.scene} (${s.duration})`);
          lines.push(`*${s.direction}*`);
          lines.push(`**Creator:** "${s.dialogue}"`);
          if (s.text_overlay) lines.push(`📝 Text overlay: ${s.text_overlay}`);
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

  // ── Generate Storyboard Frames ──
  const generateStoryboard = async () => {
    if (!currentAvatar || !script || !selectedProd) {
      toast({ title: "Complete previous steps first", variant: "destructive" });
      return;
    }
    setGeneratingStoryboard(true);
    setStoryboardProgress(0);
    setFrames([]);
    setVideoBlob(null);
    setVideoUrl("");

    const progressInterval = setInterval(() => {
      setStoryboardProgress(p => Math.min(p + (90 / (frameCount * 8)), 90));
    }, 1000);

    try {
      const body: any = {
        action: "generate-storyboard",
        productName: selectedProd.name,
        productImageUrl: selectedProd.images?.[0] || null,
        avatarDescription,
        avatarImageUrl: currentAvatar, // pass the avatar image (generated or uploaded)
        script,
        frameCount,
      };

      const { data, error } = await supabase.functions.invoke("ugc-generate", { body });
      if (error) throw error;

      clearInterval(progressInterval);
      setStoryboardProgress(100);

      if (data?.frames?.length) {
        // Enrich frames with dialogue from script
        const enrichedFrames = data.frames.map((f: StoryboardFrame, i: number) => ({
          ...f,
          dialogue: scriptData?.scenes?.[i]?.dialogue || f.scene,
        }));
        setFrames(enrichedFrames);

        // Save project to DB
        const { data: project } = await supabase.from("ugc_projects").insert({
          product_id: selectedProduct,
          avatar_url: currentAvatar,
          avatar_settings: { gender: avatarGender, ethnicity: avatarEthnicity, setting: avatarSetting } as any,
          script,
          storyboard: enrichedFrames as any,
          status: "storyboard",
          provider: "lovable-ai",
        }).select().single();

        if (project) {
          setProjectId(project.id);
          const frameInserts = enrichedFrames.map((f: StoryboardFrame) => ({
            project_id: project.id,
            frame_index: f.frame,
            image_url: f.imageUrl,
            scene: f.scene,
            dialogue: f.dialogue,
          }));
          await supabase.from("ugc_frames").insert(frameInserts);
        }

        toast({ title: `${data.frames.length} frames generated! Now create your video.` });
        // Auto-advance to video step
        setTimeout(() => setStep(5), 500);
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      setStoryboardProgress(0);
      toast({ title: "Frame generation failed", description: err?.message, variant: "destructive" });
    } finally {
      setGeneratingStoryboard(false);
    }
  };

  // ── Assemble Video from Frames ──
  const assembleVideoFromFrames = async () => {
    if (frames.length === 0) {
      toast({ title: "Generate frames first", variant: "destructive" });
      return;
    }
    setGeneratingVideo(true);
    setVideoProgress(0);

    try {
      const videoFrames: VideoFrame[] = frames.map(f => ({
        imageUrl: f.imageUrl,
        scene: f.scene,
        dialogue: f.dialogue || f.scene,
      }));

      const blob = await assembleVideo(videoFrames, {
        frameDuration: 3500,
        width: 720,
        height: 1280,
        enableTTS,
        onProgress: (pct) => setVideoProgress(pct),
      });

      const url = URL.createObjectURL(blob);
      setVideoBlob(blob);
      setVideoUrl(url);

      // Save to content table
      await supabase.from("content").insert({
        type: "ugc",
        title: `UGC Video - ${selectedProd?.name}`,
        body: script,
        media_url: frames[0]?.imageUrl,
        product_id: selectedProduct,
        status: "draft",
        metadata: { provider: "lovable-ai", type: "video", frameCount: frames.length, hasTTS: enableTTS } as any,
      });
      queryClient.invalidateQueries({ queryKey: ["content"] });

      // Update project status
      if (projectId) {
        await supabase.from("ugc_projects").update({ status: "completed" }).eq("id", projectId);
      }

      toast({ title: "🎬 Video created!", description: "Your UGC video is ready to download and share." });
    } catch (err: any) {
      toast({ title: "Video assembly failed", description: err?.message, variant: "destructive" });
    } finally {
      setGeneratingVideo(false);
    }
  };

  const downloadVideo = () => {
    if (!videoBlob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(videoBlob);
    a.download = `ugc-${selectedProd?.name?.replace(/\s+/g, "-") || "video"}-${Date.now()}.webm`;
    a.click();
  };

  // Pipeline steps
  const steps = [
    { n: 1, label: "Product", icon: <Layers className="w-4 h-4" />, done: !!selectedProduct },
    { n: 2, label: "Avatar", icon: <User className="w-4 h-4" />, done: !!currentAvatar },
    { n: 3, label: "Script", icon: <FileText className="w-4 h-4" />, done: !!script },
    { n: 4, label: "Frames", icon: <Film className="w-4 h-4" />, done: frames.length > 0 },
    { n: 5, label: "Video", icon: <Video className="w-4 h-4" />, done: !!videoUrl },
  ];

  return (
    <div className="space-y-6">
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
              <h3 className="font-heading text-lg font-semibold">🔒 Lock Product</h3>
              <p className="text-sm text-muted-foreground font-body">Select a product — its exact images will be used in every frame for consistency.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {products?.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedProduct(p.id); setStep(2); }}
                    className={`rounded-xl border p-3 text-left transition-all hover:border-primary/30 hover:shadow-md ${
                      selectedProduct === p.id ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border bg-card"
                    }`}
                  >
                    {p.images && p.images.length > 0 && (
                      <img src={p.images[0]} alt={p.name} className="w-full h-28 object-cover rounded-lg mb-2" loading="lazy" />
                    )}
                    <p className="font-heading text-sm font-semibold truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.currency} {p.price?.toLocaleString()}</p>
                  </button>
                ))}
              </div>
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
                    <Button onClick={generateAvatar} disabled={generatingAvatar} className="w-full gap-2">
                      {generatingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                      Generate Avatar with Your Photo + Product
                    </Button>
                  )}
                </div>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
                  <div className="relative flex justify-center"><span className="bg-card px-3 text-xs text-muted-foreground">or generate AI avatar</span></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
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
                  <Button onClick={generateAvatar} disabled={generatingAvatar} className="w-full gap-2">
                    {generatingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    Generate AI Avatar with Product
                  </Button>
                )}

                {(avatarUrl) && (
                  <div className="space-y-2">
                    <Badge className="bg-emerald-500/10 text-emerald-700 text-xs">🔒 Avatar Locked</Badge>
                    <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => { setAvatarUrl(""); clearUpload(); setFrames([]); setVideoBlob(null); setVideoUrl(""); }}>
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
                  <Button onClick={() => setStep(3)} className="w-full gap-2">
                    Continue to Script <ChevronRight className="w-4 h-4" />
                  </Button>
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

        {/* ── Step 4: Frame Generation ── */}
        {step === 4 && (
          <motion.div key="step4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
                  <Film className="w-5 h-5" /> Generate Video Frames
                </h3>
                <p className="text-sm text-muted-foreground font-body">
                  AI will generate {frameCount} cinematic frames with your avatar holding your actual product.
                </p>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-body text-muted-foreground mb-1 block">Frame Count</label>
                    <Select value={String(frameCount)} onValueChange={v => setFrameCount(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4">4 Frames</SelectItem>
                        <SelectItem value="5">5 Frames</SelectItem>
                        <SelectItem value="6">6 Frames</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-body text-muted-foreground mb-1 block">Product</label>
                    <div className="text-sm font-heading font-semibold truncate">{selectedProd?.name || "None"}</div>
                  </div>
                </div>

                <Button onClick={generateStoryboard} disabled={generatingStoryboard || !currentAvatar || !script} className="w-full gap-2" size="lg">
                  {generatingStoryboard ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clapperboard className="w-4 h-4" />}
                  {generatingStoryboard ? "Generating frames..." : `Generate ${frameCount} Video Frames`}
                </Button>

                {generatingStoryboard && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                    <Progress value={storyboardProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center font-body">
                      {Math.round(storyboardProgress)}% — Generating cinematic frames with your product...
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Avatar</p>
                  {currentAvatar ? (
                    <img src={currentAvatar} alt="" className="w-16 h-16 rounded-full object-cover mx-auto border-2 border-primary/20" />
                  ) : <div className="w-16 h-16 rounded-full bg-muted mx-auto" />}
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Product</p>
                  {selectedProd?.images?.[0] ? (
                    <img src={selectedProd.images[0]} alt="" className="w-16 h-16 rounded-lg object-cover mx-auto border-2 border-primary/20" />
                  ) : <div className="w-16 h-16 rounded-lg bg-muted mx-auto" />}
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Frames</p>
                  <p className="text-2xl font-heading font-bold text-foreground">{frames.length}/{frameCount}</p>
                </div>
              </div>

              {/* Frames preview */}
              {frames.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-heading text-md font-semibold">🎬 Generated Frames</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {frames.map((f, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="rounded-xl border border-border bg-card overflow-hidden group"
                      >
                        <div className="aspect-[9/16] relative">
                          <img src={f.imageUrl} alt={`Frame ${f.frame}`} className="w-full h-full object-cover" />
                          <div className="absolute top-2 left-2">
                            <Badge className="bg-charcoal/80 text-white text-[10px]">Frame {f.frame}</Badge>
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                            <p className="text-white text-[10px] font-body line-clamp-2">{f.dialogue || f.scene}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <Button onClick={() => setStep(5)} className="w-full gap-2" size="lg">
                    <Video className="w-4 h-4" /> Continue to Video Assembly <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Step 5: Video Assembly ── */}
        {step === 5 && (
          <motion.div key="step5" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
                  <Video className="w-5 h-5" /> 🎥 Create UGC Video
                </h3>
                <p className="text-sm text-muted-foreground font-body">
                  Assemble your {frames.length} frames into a cinematic video with zoom/pan effects and voiceover.
                </p>

                <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-body">Voice Narration</span>
                  </div>
                  <Button
                    size="sm"
                    variant={enableTTS ? "default" : "outline"}
                    onClick={() => setEnableTTS(!enableTTS)}
                    className="text-xs"
                  >
                    {enableTTS ? "On" : "Off"}
                  </Button>
                </div>

                {!videoUrl ? (
                  <Button
                    onClick={assembleVideoFromFrames}
                    disabled={generatingVideo || frames.length === 0}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {generatingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    {generatingVideo ? "Creating video..." : "🎬 Generate Video"}
                  </Button>
                ) : (
                  <Badge className="bg-emerald-500/10 text-emerald-700 text-sm py-1.5 px-3">✓ Video Ready</Badge>
                )}

                {generatingVideo && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                    <Progress value={videoProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center font-body">
                      {videoProgress}% — Assembling video with effects{enableTTS ? " and voiceover" : ""}...
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Video Player */}
              {videoUrl && (
                <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                  <h4 className="font-heading text-lg font-semibold">📺 Video Preview</h4>
                  <div className="aspect-[9/16] max-h-[500px] rounded-xl overflow-hidden border border-border bg-charcoal mx-auto">
                    <video src={videoUrl} controls className="w-full h-full object-contain" />
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={downloadVideo} className="flex-1 gap-2" size="lg">
                      <Download className="w-4 h-4" /> Download Video
                    </Button>
                    <Button variant="outline" onClick={() => { setVideoBlob(null); setVideoUrl(""); }} className="gap-2">
                      <RefreshCw className="w-4 h-4" /> Regenerate
                    </Button>
                    <Button variant="outline" onClick={() => { navigator.clipboard.writeText(JSON.stringify({ frames, script }, null, 2)); toast({ title: "Project data copied!" }); }}>
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Frames strip */}
              {frames.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider font-body">Frame Strip</p>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {frames.map((f, i) => (
                      <div key={i} className="flex-shrink-0 w-20">
                        <img src={f.imageUrl} alt={`Frame ${f.frame}`} className="w-20 h-36 object-cover rounded-lg border border-border" />
                        <p className="text-[9px] text-muted-foreground mt-1 text-center">Frame {f.frame}</p>
                      </div>
                    ))}
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
   INFLUENCER MANAGER
   ═══════════════════════════════════════════════════════════ */
function InfluencerManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", tone: "friendly", niche: "fashion", gender: "female", ethnicity: "african", setting: "studio" });
  const [generatingAvatar, setGeneratingAvatar] = useState(false);
  const [newAvatarUrl, setNewAvatarUrl] = useState("");

  const { data: influencers, isLoading } = useQuery({
    queryKey: ["influencers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("influencers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const generateInfluencerAvatar = async () => {
    setGeneratingAvatar(true);
    try {
      const { data, error } = await supabase.functions.invoke("ugc-generate", {
        body: { action: "generate-avatar", gender: form.gender, ethnicity: form.ethnicity, setting: form.setting },
      });
      if (error) throw error;
      if (data?.imageUrl) {
        setNewAvatarUrl(data.imageUrl);
        toast({ title: "Influencer avatar generated!" });
      }
    } catch {
      toast({ title: "Avatar generation failed", variant: "destructive" });
    } finally {
      setGeneratingAvatar(false);
    }
  };

  const createInfluencer = async () => {
    if (!form.name) { toast({ title: "Name is required", variant: "destructive" }); return; }
    try {
      const { error } = await supabase.from("influencers").insert({ ...form, avatar_url: newAvatarUrl || null } as any);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["influencers"] });
      setShowCreate(false);
      setForm({ name: "", tone: "friendly", niche: "fashion", gender: "female", ethnicity: "african", setting: "studio" });
      setNewAvatarUrl("");
      toast({ title: "Influencer created!" });
    } catch {
      toast({ title: "Failed to create influencer", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading text-lg font-semibold">AI Influencers</h3>
          <p className="text-sm text-muted-foreground font-body">Persistent digital brand ambassadors</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <User className="w-4 h-4" /> Create Influencer
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {influencers?.map((inf) => (
          <motion.div
            key={inf.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card p-4 space-y-3 group hover:border-primary/20 transition-all hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              {inf.avatar_url ? (
                <img src={inf.avatar_url} alt={inf.name} className="w-14 h-14 rounded-full object-cover border-2 border-primary/20" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
              )}
              <div>
                <p className="font-heading font-semibold text-foreground">{inf.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{inf.niche} • {inf.tone}</p>
              </div>
            </div>
            <div className="flex gap-1 flex-wrap">
              <Badge variant="secondary" className="text-[10px] capitalize">{inf.gender}</Badge>
              <Badge variant="secondary" className="text-[10px] capitalize">{inf.ethnicity}</Badge>
              <Badge variant="secondary" className="text-[10px] capitalize">{inf.setting}</Badge>
            </div>
          </motion.div>
        ))}

        {!influencers?.length && !isLoading && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-body">No influencers yet. Create your first AI brand ambassador.</p>
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-heading">Create AI Influencer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Influencer name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tone</label>
                <Select value={form.tone} onValueChange={v => setForm(f => ({ ...f, tone: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="playful">Playful</SelectItem>
                    <SelectItem value="luxury">Luxury</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Niche</label>
                <Select value={form.niche} onValueChange={v => setForm(f => ({ ...f, niche: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fashion">Fashion</SelectItem>
                    <SelectItem value="beauty">Beauty</SelectItem>
                    <SelectItem value="lifestyle">Lifestyle</SelectItem>
                    <SelectItem value="tech">Tech</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.ethnicity} onValueChange={v => setForm(f => ({ ...f, ethnicity: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="african">African</SelectItem>
                  <SelectItem value="caucasian">Caucasian</SelectItem>
                  <SelectItem value="asian">Asian</SelectItem>
                  <SelectItem value="hispanic">Hispanic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newAvatarUrl && (
              <img src={newAvatarUrl} alt="Preview" className="w-24 h-24 rounded-full object-cover mx-auto border-2 border-primary/20" />
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={generateInfluencerAvatar} disabled={generatingAvatar} className="flex-1 gap-2">
                {generatingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                Generate Avatar
              </Button>
              <Button onClick={createInfluencer} className="flex-1 gap-2">
                <User className="w-4 h-4" /> Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ContentPage;
