import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Play,
  Download,
  Trash2,
  Film,
  Loader2,
  AlertCircle,
  RefreshCw,
  Package,
  Calendar,
  Zap,
  Star,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type ContentRow = Tables<"content">;

// ─── Query key constant — shared with UGCStudio for cache invalidation ──────
export const UGC_GALLERY_QUERY_KEY = ["ugc-video-gallery"] as const;

// ─── Gallery query ────────────────────────────────────────────────────────────
// Fetches content rows that are UGC videos: type='ugc' with a non-null media_url
// that ends with a video extension or whose metadata.is_ugc_video flag is true.
// This covers both legacy rows (type='ugc') and new rows we persist going forward.
async function fetchUGCVideos(): Promise<ContentRow[]> {
  const { data, error } = await supabase
    .from("content")
    .select("*")
    .eq("type", "ugc")
    .not("media_url", "is", null)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Filter client-side to only rows where media_url is a video (mp4/webm/mov/ogg)
  // This guards against any legacy 'ugc' type rows that stored images not videos.
  return (data ?? []).filter((row) => {
    if (!row.media_url) return false;
    const url = row.media_url.toLowerCase().split("?")[0]; // strip query params
    return (
      url.endsWith(".mp4") ||
      url.endsWith(".webm") ||
      url.endsWith(".mov") ||
      url.endsWith(".ogg") ||
      // Also include rows explicitly flagged as ugc_video in metadata
      (row.metadata as any)?.is_ugc_video === true
    );
  });
}

// ─── Reliable cross-origin download ─────────────────────────────────────────
// Direct anchor[download] fails for cross-origin URLs (CORS).
// We fetch the resource as a blob and create an object URL instead.
async function downloadVideo(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    // Delay revoke to allow download to start
    setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
  } catch {
    // Fallback: open in new tab — user can save manually
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

// ─── Metadata helpers ────────────────────────────────────────────────────────
function getMetaField(row: ContentRow | null | undefined, key: string): string | null {
  if (!row || !row.metadata || typeof row.metadata !== "object") return null;
  return (row.metadata as Record<string, unknown>)[key] as string | null;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function buildFilename(row: ContentRow | null | undefined): string {
  const product = getMetaField(row, "product_name") || row?.title || "video";
  const date = row?.created_at
    ? new Date(row.created_at).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  return `ugc-${product.replace(/\s+/g, "-").toLowerCase()}-${date}.mp4`;
}

// ─── Video Card ───────────────────────────────────────────────────────────────
function UGCVideoCard({
  row,
  onWatch,
  onDelete,
}: {
  row: ContentRow;
  onWatch: (row: ContentRow) => void;
  onDelete: (row: ContentRow) => void;
}) {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const productName =
    getMetaField(row, "product_name") || row.title || "UGC Video";
  const gender = getMetaField(row, "avatar_gender");
  const ethnicity = getMetaField(row, "avatar_ethnicity");
  const isUGCMode = (row.metadata as any)?.is_ugc_mode !== false; // default true
  const fidelityScore = (row.metadata as any)?.fidelity_score as
    | number
    | null
    | undefined;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadVideo(row.media_url!, buildFilename(row));
    } catch {
      toast({
        title: "Download failed",
        description: "Try opening the video in a new tab.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative flex flex-col rounded-xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200"
    >
      {/* Thumbnail — native video element, muted, first-frame poster */}
      <div
        className="relative aspect-[9/16] bg-charcoal cursor-pointer overflow-hidden"
        onClick={() => onWatch(row)}
        role="button"
        aria-label={`Watch ${productName}`}
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onWatch(row)}
      >
        <video
          src={row.media_url!}
          className="w-full h-full object-cover"
          muted
          playsInline
          preload="metadata"
          // Show first frame as poster
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            v.currentTime = 0.1;
          }}
        />
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
        </div>
        {/* Mode badge */}
        <div className="absolute top-2 left-2">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
              isUGCMode
                ? "bg-primary/80 text-white border-primary/40"
                : "bg-gold/80 text-white border-gold/40"
            } backdrop-blur-sm`}
          >
            {isUGCMode ? (
              <Zap className="w-2.5 h-2.5" />
            ) : (
              <Star className="w-2.5 h-2.5" />
            )}
            {isUGCMode ? "UGC" : "Studio"}
          </span>
        </div>
        {/* Fidelity score badge */}
        {fidelityScore != null && (
          <div className="absolute top-2 right-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border backdrop-blur-sm ${
                fidelityScore >= 0.92
                  ? "bg-emerald-500/80 text-white border-emerald-400/40"
                  : fidelityScore >= 0.8
                  ? "bg-amber-500/80 text-white border-amber-400/40"
                  : "bg-red-500/80 text-white border-red-400/40"
              }`}
            >
              <CheckCircle2 className="w-2.5 h-2.5" />
              {Math.round(fidelityScore * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div className="flex-1 min-w-0">
          <p
            className="font-heading text-sm font-semibold text-foreground truncate"
            title={productName}
          >
            {productName}
          </p>
          {(gender || ethnicity) && (
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate capitalize">
              {[gender, ethnicity].filter(Boolean).join(" · ")} influencer
            </p>
          )}
          <div className="flex items-center gap-1 mt-1.5">
            <Calendar className="w-3 h-3 text-muted-foreground/60 shrink-0" />
            <span className="text-[10px] text-muted-foreground">
              {formatDate(row.created_at)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1.5 pt-1 border-t border-border/50">
          <Button
            size="sm"
            className="flex-1 h-8 gap-1.5 text-xs"
            onClick={() => onWatch(row)}
          >
            <Play className="w-3 h-3" />
            Watch
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 shrink-0"
            onClick={handleDownload}
            disabled={downloading}
            title="Download MP4"
          >
            {downloading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Download className="w-3 h-3" />
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30"
            onClick={() => onDelete(row)}
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Watch Dialog ─────────────────────────────────────────────────────────────
function WatchDialog({
  row,
  open,
  onClose,
}: {
  row: ContentRow | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  if (!row) return null;

  const productName =
    getMetaField(row, "product_name") || row.title || "UGC Video";

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadVideo(row.media_url!, buildFilename(row));
    } catch {
      toast({
        title: "Download failed",
        description: "Opening in new tab instead.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm sm:max-w-md p-0 overflow-hidden bg-charcoal border-border/50">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="font-heading text-base text-white truncate">
            {productName}
          </DialogTitle>
          <p className="text-xs text-white/50 mt-0.5">
            Generated {formatDate(row.created_at)}
          </p>
        </DialogHeader>
        <div className="relative bg-black">
          <video
            key={row.id} // re-mount when row changes
            src={row.media_url!}
            controls
            autoPlay
            loop
            playsInline
            className="w-full max-h-[70vh] object-contain"
          />
        </div>
        <div className="p-4 flex gap-3">
          <Button
            className="flex-1 gap-2"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download MP4
          </Button>
          <Button variant="outline" onClick={onClose} className="border-border/40 text-white hover:bg-white/10">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Gallery Component ───────────────────────────────────────────────────
export function UGCVideoGallery() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [watchRow, setWatchRow] = useState<ContentRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<ContentRow | null>(null);

  const {
    data: videos,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: UGC_GALLERY_QUERY_KEY,
    queryFn: fetchUGCVideos,
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("content").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UGC_GALLERY_QUERY_KEY });
      setDeleteRow(null);
      toast({ title: "Video deleted" });
    },
    onError: (err: any) => {
      toast({
        title: "Delete failed",
        description: err?.message || "You may not have permission to delete this video.",
        variant: "destructive",
      });
    },
  });

  const handleWatch = useCallback((row: ContentRow) => setWatchRow(row), []);
  const handleDeleteRequest = useCallback(
    (row: ContentRow) => setDeleteRow(row),
    []
  );

  return (
    <>
      {/* ── Section header ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Film className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-heading text-base font-semibold text-foreground">
                UGC Video Gallery
              </h3>
              <p className="text-xs text-muted-foreground font-body">
                {isLoading
                  ? "Loading videos…"
                  : `${videos?.length ?? 0} generated video${videos?.length === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 text-xs h-8"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        <div className="p-6">
          {/* ── Loading state ── */}
          {isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border overflow-hidden"
                >
                  <div className="aspect-[9/16] bg-muted animate-pulse" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
                    <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                    <div className="h-8 bg-muted animate-pulse rounded mt-3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Error state ── */}
          {isError && !isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
              <div className="p-3 rounded-full bg-destructive/10">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="font-heading text-sm font-semibold text-foreground">
                  Failed to load gallery
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Check your connection or permissions.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Try again
              </Button>
            </div>
          )}

          {/* ── Empty state ── */}
          {!isLoading && !isError && videos?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
              <div className="relative">
                <div className="p-4 rounded-full bg-muted/50 border border-border">
                  <Film className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-primary/10 border border-primary/20">
                  <Package className="w-3.5 h-3.5 text-primary" />
                </div>
              </div>
              <div>
                <p className="font-heading text-sm font-semibold text-foreground">
                  No UGC videos yet
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
                  Generate your first UGC video using the pipeline above. It
                  will appear here automatically.
                </p>
              </div>
            </div>
          )}

          {/* ── Gallery grid ── */}
          {!isLoading && !isError && videos && videos.length > 0 && (
            <AnimatePresence mode="popLayout">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {videos.map((row) => (
                  <UGCVideoCard
                    key={row.id}
                    row={row}
                    onWatch={handleWatch}
                    onDelete={handleDeleteRequest}
                  />
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ── Watch Dialog ── */}
      <WatchDialog
        row={watchRow}
        open={!!watchRow}
        onClose={() => setWatchRow(null)}
      />

      {/* ── Delete Confirmation ── */}
      <AlertDialog
        open={!!deleteRow}
        onOpenChange={(open) => !open && setDeleteRow(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">
              Delete this video?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "
              {deleteRow
                ? getMetaField(deleteRow, "product_name") ||
                  deleteRow.title ||
                  "this video"
                : "this video"}
              " from the gallery. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteRow && deleteMutation.mutate(deleteRow.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
