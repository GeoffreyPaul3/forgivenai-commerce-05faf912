import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Play } from "lucide-react";

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
  const { toast } = useToast();

  useEffect(() => {
    if (!product || !product.images?.[0]) {
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
          body: { imageUrl: product.images[0], productId: product.id, forceRegenerate: true }
        });
        
        if (error) throw error;
        if (data?.variants && data.variants.length > 1) {
          if (isMounted) {
            setVariations(data.variants);
            const allIds = new Set<number>();
            data.variants.forEach((v: any, i: number) => {
              const conf = v.details?.confidence;
              if (conf === undefined || conf >= 90) allIds.add(i);
            });
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
  }, [product?.id, product?.images?.[0]]);

  const toggleSelection = (index: number, v: any) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setSelectedIds(newSet);
    onVariationsChange(variations.filter((_, i) => newSet.has(i)));
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-6 flex flex-col items-center justify-center animate-pulse mt-4">
        <Loader2 className="w-6 h-6 animate-spin text-primary mb-3" />
        <p className="text-sm font-semibold font-heading text-foreground">Analyzing Product Image</p>
        <p className="text-xs text-muted-foreground">Detecting garments and colors via Qwen Vision...</p>
      </div>
    );
  }

  if (variations.length <= 1) return null;

  return (
    <div className="rounded-xl border border-primary/20 bg-card p-4 space-y-4 mt-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="font-heading text-base font-semibold">Multiple Variations Detected</h3>
      </div>
      <p className="text-xs text-muted-foreground font-body">
        The AI detected {variations.length} garments in this image. Select which ones to generate.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {variations.map((v, i) => {
          const conf = v.details?.confidence || 0;
          const isLowConf = conf > 0 && conf < 90;
          const isSelected = selectedIds.has(i);
          return (
            <div 
              key={i} 
              className={`relative rounded-lg border-2 p-2 flex items-start gap-3 transition-colors cursor-pointer ${isSelected ? "border-primary bg-primary/5" : "border-border bg-muted/20 hover:border-primary/50"}`}
              onClick={() => toggleSelection(i, v)}
            >
              <div className="absolute top-2 right-2">
                <input type="checkbox" checked={isSelected} readOnly className="w-4 h-4 rounded border-primary text-primary focus:ring-primary pointer-events-none" />
              </div>
              <img src={v.url} className="w-16 h-16 rounded-md object-cover border border-border" alt="" />
              <div className="flex-1 min-w-0 pr-6">
                <p className="text-xs font-bold font-heading truncate">{v.details?.name || v.details?.description || `Variation ${i+1}`}</p>
                <p className="text-[10px] text-muted-foreground truncate">{v.details?.primaryColor || v.details?.color} {v.details?.garmentType}</p>
                {isLowConf ? (
                  <Badge variant="destructive" className="mt-1 text-[9px] py-0">✗ Manual Selection</Badge>
                ) : (
                  <Badge variant="outline" className="mt-1 text-[9px] py-0 border-emerald-500/30 text-emerald-600">✓ {conf ? `${conf}% ` : ""}Locked</Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {generateAction && (
        <Button onClick={generateAction} disabled={isGenerating || selectedIds.size === 0} className="w-full gap-2 mt-4">
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Generate Selected ({selectedIds.size})
        </Button>
      )}
    </div>
  );
}
