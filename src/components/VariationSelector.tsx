import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";

export function VariationSelector({ 
  product, 
  onVariationsChange, 
  generateAction, 
  isGenerating = false 
}: { 
  product: any; 
  onVariationsChange: (variations: any[]) => void;
  generateAction?: () => void;
  isGenerating?: boolean;
}) {
  const [variations, setVariations] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!product) {
      setVariations([]);
      setSelectedIds(new Set());
      onVariationsChange([]);
      return;
    }

    const primaryImage = (Array.isArray(product.images) && product.images[0])
      ? product.images[0]
      : (typeof product.images === "string" && product.images.trim()
          ? product.images.trim()
          : (product.image_url || product.product_image || product.url || ""));

    if (!primaryImage) {
      setVariations([]);
      setSelectedIds(new Set());
      onVariationsChange([]);
      return;
    }

    let isMounted = true;
    const fetchVariations = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("decompose-image", {
          body: { imageUrl: primaryImage, productId: product.id, forceRegenerate: true }
        });
        
        if (error) throw error;
        if (data?.variants && data.variants.length > 0) {
          if (isMounted) {
            setVariations(data.variants);
            const allIds = new Set<number>();
            data.variants.forEach((v: any, i: number) => {
              const conf = v.details?.confidence;
              if (conf === undefined || conf >= 90) allIds.add(i);
            });
            // If all confidences are below 90, select all by default so user isn't stuck with 0 selected
            if (allIds.size === 0) {
              data.variants.forEach((_: any, i: number) => allIds.add(i));
            }
            setSelectedIds(allIds);
            onVariationsChange(data.variants.filter((_: any, i: number) => allIds.has(i)));
          }
        } else {
          if (isMounted) {
            setVariations([]);
            onVariationsChange([]);
          }
        }
      } catch (err: any) {
        console.error("Failed to detect variations:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchVariations();
    return () => { isMounted = false; };
  }, [product?.id, Array.isArray(product?.images) ? product?.images?.[0] : product?.images, product?.image_url]);

  const toggleSelection = (index: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setSelectedIds(newSet);
    onVariationsChange(variations.filter((_, i) => newSet.has(i)));
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-5 flex flex-col items-center justify-center mt-4 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <p className="text-sm font-semibold font-heading text-foreground">Analyzing Product Image</p>
        <p className="text-xs text-muted-foreground">Detecting garments and colours via Qwen Vision...</p>
      </div>
    );
  }

  if (variations.length < 1) return null;

  return (
    <div className="rounded-xl border border-primary/20 bg-card p-4 space-y-3 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary shrink-0" />
          <h3 className="font-heading text-sm font-semibold">Multiple Variations Detected</h3>
        </div>
        <Badge variant="outline" className="text-[10px] shrink-0">
          {selectedIds.size}/{variations.length} selected
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground font-body">
        The AI detected {variations.length} colour variants. Select which ones to generate.
      </p>

      {/* Variation Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {variations.map((v, i) => {
          const conf = v.details?.confidence;
          const isLowConf = conf !== undefined && conf < 90;
          const isSelected = selectedIds.has(i);
          const colorName = v.details?.primaryColor || v.details?.name || `Colour ${i + 1}`;

          return (
            <button
              key={i}
              type="button"
              onClick={() => toggleSelection(i)}
              className={`group relative flex flex-col rounded-xl border-2 overflow-hidden transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isSelected
                  ? "border-primary shadow-md shadow-primary/10"
                  : "border-border hover:border-primary/40"
              }`}
            >
              {/* Image */}
              <div className="relative w-full aspect-square bg-muted overflow-hidden">
                <img
                  src={v.url}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  alt={colorName}
                />
                {/* Selection overlay */}
                <div className={`absolute inset-0 transition-colors ${isSelected ? "bg-primary/10" : "bg-transparent"}`} />
                {/* Checkmark */}
                <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                  isSelected
                    ? "bg-primary text-primary-foreground scale-100"
                    : "bg-background/70 border border-border scale-90 opacity-0 group-hover:opacity-100"
                }`}>
                  <CheckCircle2 className="w-3 h-3" />
                </div>
              </div>

              {/* Label area */}
              <div className="px-1.5 py-1.5 bg-card flex flex-col justify-center min-h-[44px]">
                <p className="text-[10px] font-bold font-heading text-foreground leading-tight line-clamp-1 text-left mb-0.5">
                  {colorName}
                </p>
                {isLowConf ? (
                  <div className="flex items-center gap-0.5 text-amber-600 w-full overflow-hidden">
                    <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                    <span className="text-[9px] font-semibold truncate">Manual check</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-0.5 text-emerald-600 w-full overflow-hidden">
                    <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                    <span className="text-[9px] font-semibold truncate">{conf ? `${conf}% ` : ""}Locked</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
