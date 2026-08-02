import React from "react";
import { KPIMetricRecommendation, HealthStatus } from "@/types/intelligence";
import { TrendingUp, TrendingDown, Minus, Lightbulb, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IntelligentKPICardProps {
  item: KPIMetricRecommendation;
  onExecuteAction?: (item: KPIMetricRecommendation) => void;
}

const healthBadgeStyles: Record<HealthStatus, string> = {
  Optimal: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Healthy: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "Attention Required": "bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse",
  Critical: "bg-rose-500/10 text-rose-600 border-rose-500/20 animate-bounce",
  "Low Risk": "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

export const IntelligentKPICard: React.FC<IntelligentKPICardProps> = ({ item, onExecuteAction }) => {
  const isUp = item.trendDirection === "up";
  const isDown = item.trendDirection === "down";

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all space-y-4">
      {/* Metric Header */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-body">
            {item.metricName}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-heading font-bold text-foreground">{item.value}</h3>
            <span
              className={`inline-flex items-center text-xs font-bold font-body ${
                isUp ? "text-emerald-600" : isDown ? "text-rose-600" : "text-muted-foreground"
              }`}
            >
              {isUp && <TrendingUp className="w-3.5 h-3.5 mr-0.5 inline" />}
              {isDown && <TrendingDown className="w-3.5 h-3.5 mr-0.5 inline" />}
              {!isUp && !isDown && <Minus className="w-3.5 h-3.5 mr-0.5 inline" />}
              {item.trend}
            </span>
          </div>
        </div>

        {/* Health Badge */}
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${healthBadgeStyles[item.health]}`}>
          {item.health}
        </span>
      </div>

      {/* Recommendation Block */}
      <div className="rounded-xl bg-muted/40 p-3.5 border border-border/60 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
          <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
          <span>FSC Decision Recommendation</span>
        </div>
        <p className="text-xs text-foreground font-body leading-relaxed">{item.recommendation}</p>

        {/* Business Impact & Confidence */}
        <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground font-body">
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">{item.businessImpact}</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            Confidence: <strong className="text-foreground">{item.confidenceScore}%</strong>
          </span>
        </div>
      </div>

      {/* Suggested Action Button */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] text-muted-foreground font-body">
          Owner: <strong className="text-foreground">{item.recommendedOwner}</strong>
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onExecuteAction?.(item)}
          className="text-xs font-medium gap-1.5 hover:bg-primary hover:text-primary-foreground transition-all"
        >
          <span>{item.suggestedAction}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};
