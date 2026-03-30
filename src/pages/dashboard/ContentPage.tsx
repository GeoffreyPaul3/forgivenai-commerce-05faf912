import { useState, useEffect, useRef } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles, Loader2, Video, FileText, Share2, Pencil, Trash2, Eye, Download,
  User, Wand2, Play, Upload, X, MoreHorizontal,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Tables } from "@/integrations/supabase/types";
import { motion } from "framer-motion";

type Content = Tables<"content">;
const PAGE_SIZE = 8;

const ContentPage = () => {
  const [activeTab, setActiveTab] = useState("content");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground tracking-tight">Content & UGC</h2>
        <p className="text-muted-foreground text-sm font-body">AI-powered content generation & UGC video creator</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="content" className="gap-2"><FileText className="w-4 h-4" />Content Manager</TabsTrigger>
          <TabsTrigger value="ugc" className="gap-2"><Video className="w-4 h-4" />UGC Video Creator</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-6">
          <ContentManager />
        </TabsContent>
        <TabsContent value="ugc" className="mt-6">
          <UGCVideoCreator />
        </TabsContent>
      </Tabs>
    </div>
  );
};

/* ─── Content Manager ─── */
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
        body: {
          type: typeMap[genType] || "social-post",
          productName: product?.name || "General",
          productCategory: product?.category || "",
          productPrice: product?.price || 0,
          currency: product?.currency || "MWK",
          context: genContext,
        },
      });
      if (error) throw error;
      if (data?.content) {
        const labels: Record<string, string> = { social_post: "Social Post", campaign: "Campaign", description: "Description" };
        const { error: insertError } = await supabase.from("content").insert({
          type: genType,
          title: `${labels[genType] || genType} - ${product?.name || "General"}`,
          body: data.content,
          product_id: selectedProduct !== "none" ? selectedProduct : null,
          status: "draft",
        });
        if (insertError) {
          console.error("Insert error:", insertError);
          throw insertError;
        }
        await refetch();
        toast({ title: "Content generated & saved!" });
        setGenContext("");
      }
    } catch (err) {
      console.error("Generation error:", err);
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
    onSuccess: () => {
      refetch();
      setEditItem(null);
      toast({ title: "Content updated" });
    },
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
      {/* Generator */}
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

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", "description", "social_post", "campaign", "ugc"].map(t => (
          <Button key={t} size="sm" variant={filter === t ? "default" : "outline"} onClick={() => setFilter(t)} className="text-xs capitalize">
            {t === "all" ? "All" : t.replace("_", " ")}
          </Button>
        ))}
      </div>

      {/* Table */}
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
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginatedContent.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground font-body">
                  <Sparkles className="w-8 h-8 mx-auto mb-3 text-gold/60" />
                  No content yet. Use the AI generator above to create your first piece.
                </TableCell>
              </TableRow>
            ) : (
              paginatedContent.map(item => (
                <TableRow key={item.id} className="group">
                  <TableCell>
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      {typeIcon(item.type)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-heading text-sm font-semibold text-foreground truncate max-w-xs">{item.title || "Untitled"}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.body?.slice(0, 80)}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs capitalize">{item.type.replace("_", " ")}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`text-xs ${item.status === "published" ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"}`}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => setViewItem(item)}>
                          <Eye className="w-4 h-4 mr-2" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditItem(item)}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteItem(item)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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

      {/* View Dialog with Markdown */}
      <Dialog open={!!viewItem} onOpenChange={v => !v && setViewItem(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading">{viewItem?.title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Badge variant="secondary" className="capitalize">{viewItem?.type.replace("_", " ")}</Badge>
              <Badge variant="secondary">{viewItem?.status}</Badge>
            </div>
            <div className="prose prose-sm max-w-none font-body prose-headings:font-heading prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground">
              <ReactMarkdown>{viewItem?.body || ""}</ReactMarkdown>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <ContentEditDialog item={editItem} open={!!editItem} onClose={() => setEditItem(null)} onSave={(data) => updateMutation.mutate(data)} />

      {/* Delete Alert Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Delete content?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "{deleteItem?.title || "this content"}" from your AI content library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteItem) return;
                try {
                  await deleteContent(deleteItem.id);
                } catch {
                  toast({ title: "Delete failed", variant: "destructive" });
                } finally {
                  setDeleteItem(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ContentEditDialog({ item, open, onClose, onSave }: {
  item: Content | null; open: boolean; onClose: () => void; onSave: (d: any) => void;
}) {
  const [form, setForm] = useState({ title: "", body: "", status: "draft" });

  useEffect(() => {
    if (item) setForm({ title: item.title || "", body: item.body || "", status: item.status || "draft" });
  }, [item]);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="font-heading">Edit Content</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <Textarea placeholder="Body" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} className="min-h-[120px]" />
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
          <Button className="w-full" onClick={() => { if (item) onSave({ id: item.id, ...form }); }}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── UGC Video Creator ─── */
function UGCVideoCreator() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState("none");
  const [avatarGender, setAvatarGender] = useState("female");
  const [avatarEthnicity, setAvatarEthnicity] = useState("african");
  const [avatarSetting, setAvatarSetting] = useState("studio");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState("");
  const [script, setScript] = useState("");
  const [generatingScript, setGeneratingScript] = useState(false);
  const [generatingAvatar, setGeneratingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: products } = useQuery({
    queryKey: ["products-active"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("status", "active");
      return data || [];
    },
  });

  const selectedProd = products?.find(p => p.id === selectedProduct);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    const url = URL.createObjectURL(file);
    setUploadedPreview(url);
    setAvatarPreview(""); // clear AI avatar
    toast({ title: "File uploaded!", description: file.name });
  };

  const clearUpload = () => {
    setUploadedFile(null);
    setUploadedPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const generateScript = async () => {
    if (!selectedProd) { toast({ title: "Select a product first", variant: "destructive" }); return; }
    setGeneratingScript(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate", {
        body: {
          type: "chat",
          context: `Write a 30-second UGC-style video script for the product "${selectedProd.name}" (${selectedProd.category}, ${selectedProd.currency} ${selectedProd.price}). The script should be engaging, authentic, and feel like a real person reviewing the product. Format using markdown:\n\n## Title\n**Product:** name\n**Price:** price\n**Tone:** style\n\n---\n\n### [Scene 1: Hook (0:00-0:03)]\n[Camera direction in brackets]\n**Creator:** "Dialog here"\n\n### [Scene 2: Product Showcase (0:03-0:12)]\n[Camera direction]\n**Creator:** "Dialog here"\n\n### [Scene 3: Key Benefits (0:12-0:22)]\n[Camera direction]\n**Creator:** "Dialog here"\n\n### [Scene 4: CTA (0:22-0:30)]\n[Camera direction]\n**Creator:** "Dialog here"\n\nUse bullet points for text overlays at the end.`,
        },
      });
      if (error) throw error;
      setScript(data?.content || "");
      toast({ title: "Script generated!" });
    } catch {
      toast({ title: "Script generation failed", variant: "destructive" });
    } finally {
      setGeneratingScript(false);
    }
  };

  const generateAvatar = async () => {
    setGeneratingAvatar(true);
    try {
      const { data, error } = await supabase.functions.invoke("ugc-generate", {
        body: {
          action: "generate-avatar",
          gender: avatarGender,
          ethnicity: avatarEthnicity,
          setting: avatarSetting,
        },
      });
      if (error) throw error;
      if (data?.imageUrl) {
        setAvatarPreview(data.imageUrl);
        setUploadedPreview(""); // clear upload
        setUploadedFile(null);
        toast({ title: "Avatar generated!" });
      }
    } catch {
      toast({ title: "Avatar generation failed", variant: "destructive" });
    } finally {
      setGeneratingAvatar(false);
    }
  };

  const generateVideo = async () => {
    if (!script || (!avatarPreview && !uploadedPreview)) {
      toast({ title: "Generate avatar and script first", variant: "destructive" });
      return;
    }
    setGeneratingVideo(true);
    setVideoProgress(0);

    const interval = setInterval(() => {
      setVideoProgress(p => Math.min(p + 2, 90));
    }, 1000);

    try {
      const { data, error } = await supabase.functions.invoke("ugc-generate", {
        body: {
          action: "generate-video",
          script,
          avatarUrl: avatarPreview || uploadedPreview,
          productName: selectedProd?.name,
          productImages: selectedProd?.images || [],
        },
      });
      if (error) throw error;
      clearInterval(interval);
      setVideoProgress(100);
      if (data?.videoUrl) {
        setVideoUrl(data.videoUrl);
        await supabase.from("content").insert({
          type: "ugc",
          title: `UGC Video - ${selectedProd?.name || "Product"}`,
          body: script,
          media_url: data.videoUrl,
          product_id: selectedProduct !== "none" ? selectedProduct : null,
          status: "draft",
        });
        queryClient.invalidateQueries({ queryKey: ["content"] });
        toast({ title: "Video generated!" });
      } else {
        throw new Error(data?.error || "Video generation did not return a video URL.");
      }
    } catch (err) {
      clearInterval(interval);
      setVideoProgress(0);

      let message = "Video generation failed. Please try again.";

      if (err && typeof err === "object" && "context" in err) {
        try {
          const context = (err as { context?: { json?: () => Promise<{ error?: string }> } }).context;
          const payload = await context?.json?.();
          if (payload?.error) message = payload.error;
        } catch {
          // no-op
        }
      }

      if (message === "Video generation failed. Please try again." && err instanceof Error) {
        const jsonMatch = err.message.match(/\{\s*"error"\s*:\s*"([^"]+)"\s*\}/);
        message = jsonMatch?.[1] || err.message;
      }

      toast({
        title: "Video generation failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setGeneratingVideo(false);
    }
  };

  const currentAvatarSrc = uploadedPreview || avatarPreview;
  const isVideo = uploadedFile?.type?.startsWith("video/");

  return (
    <div className="space-y-6">
      {/* Steps */}
      <div className="flex items-center gap-2">
        {[
          { n: 1, label: "Select Product" },
          { n: 2, label: "Avatar & Script" },
          { n: 3, label: "Generate Video" },
        ].map(s => (
          <button
            key={s.n}
            onClick={() => setStep(s.n)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-body transition-all ${
              step === s.n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <span className="w-6 h-6 rounded-full bg-background/20 flex items-center justify-center text-xs font-bold">{s.n}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-heading text-lg font-semibold">Select Product</h3>
          <p className="text-sm text-muted-foreground font-body">Choose a product to create UGC video for</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {products?.map(p => (
              <button
                key={p.id}
                onClick={() => { setSelectedProduct(p.id); setStep(2); }}
                className={`rounded-xl border p-3 text-left transition-all hover:border-primary/30 ${
                  selectedProduct === p.id ? "border-primary bg-primary/5" : "border-border bg-card"
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
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Avatar Panel */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
              <User className="w-5 h-5" /> Avatar Customization
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-body text-muted-foreground mb-1 block">Gender</label>
                <Select value={avatarGender} onValueChange={setAvatarGender}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-body text-muted-foreground mb-1 block">Ethnicity</label>
                <Select value={avatarEthnicity} onValueChange={setAvatarEthnicity}>
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
              <label className="text-xs font-body text-muted-foreground mb-1 block">Background Setting</label>
              <Select value={avatarSetting} onValueChange={setAvatarSetting}>
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

            <Button onClick={generateAvatar} disabled={generatingAvatar} className="w-full gap-2">
              {generatingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              Generate AI Avatar
            </Button>

            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground mb-2 font-body">Or upload your own photo / video</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button variant="outline" className="w-full gap-2" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4" /> Choose File
              </Button>
              {uploadedFile && (
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                  <span className="truncate">{uploadedFile.name}</span>
                  <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0" onClick={clearUpload}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Avatar/Upload Preview */}
            {currentAvatarSrc && (
              <div className="rounded-lg overflow-hidden border border-border">
                {isVideo ? (
                  <video src={currentAvatarSrc} controls className="w-full h-48 object-cover" />
                ) : (
                  <img src={currentAvatarSrc} alt="Avatar preview" className="w-full h-48 object-cover" />
                )}
              </div>
            )}
          </div>

          {/* Script Panel */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5" /> Video Script
            </h3>

            {selectedProd && (
              <div className="rounded-lg bg-muted/50 p-3 flex items-center gap-3">
                {selectedProd.images?.[0] && (
                  <img src={selectedProd.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />
                )}
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

            {/* Script with markdown preview toggle */}
            {script ? (
              <div className="space-y-2">
                <div className="rounded-lg border border-border bg-muted/30 p-4 max-h-[300px] overflow-y-auto">
                  <div className="prose prose-sm max-w-none font-body prose-headings:font-heading prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-headings:mt-2 prose-headings:mb-1">
                    <ReactMarkdown>{script}</ReactMarkdown>
                  </div>
                </div>
                <Textarea
                  placeholder="Edit your script..."
                  value={script}
                  onChange={e => setScript(e.target.value)}
                  className="min-h-[120px] font-body text-sm"
                />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
                <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">Click "Generate AI Script" to create a video script</p>
              </div>
            )}

            <Button onClick={() => setStep(3)} disabled={!script} className="w-full gap-2">
              <Play className="w-4 h-4" /> Continue to Generate
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-6">
          <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
            <Video className="w-5 h-5" /> Video Generation
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <p className="text-xs text-muted-foreground font-body font-semibold uppercase tracking-wider">Avatar</p>
              {currentAvatarSrc ? (
                isVideo ? (
                  <video src={currentAvatarSrc} controls className="w-full h-32 object-cover rounded-lg" />
                ) : (
                  <img src={currentAvatarSrc} alt="Avatar" className="w-full h-32 object-cover rounded-lg" />
                )
              ) : (
                <div className="h-32 bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-xs">No avatar</div>
              )}
            </div>
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <p className="text-xs text-muted-foreground font-body font-semibold uppercase tracking-wider">Script Preview</p>
              <div className="text-xs text-foreground font-body line-clamp-6 prose prose-xs max-w-none">
                <ReactMarkdown>{script}</ReactMarkdown>
              </div>
            </div>
          </div>

          <Button onClick={generateVideo} disabled={generatingVideo} className="w-full gap-2" size="lg">
            {generatingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {generatingVideo ? "Generating Video..." : "Generate UGC Video"}
          </Button>

          {generatingVideo && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              <Progress value={videoProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center font-body">{videoProgress}% — Processing with AI...</p>
            </motion.div>
          )}

          {videoUrl && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
              <div className="aspect-video rounded-lg overflow-hidden bg-charcoal">
                <video src={videoUrl} controls className="w-full h-full" />
              </div>
              <div className="flex gap-2">
                <a href={videoUrl} download className="flex-1">
                  <Button className="w-full gap-2"><Download className="w-4 h-4" /> Download Video</Button>
                </a>
                <Button variant="outline" onClick={() => { navigator.clipboard.writeText(videoUrl); toast({ title: "Link copied!" }); }}>
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

export default ContentPage;
