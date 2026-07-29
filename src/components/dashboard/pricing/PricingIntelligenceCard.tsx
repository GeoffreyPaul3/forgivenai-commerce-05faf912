import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePricingEngine } from "./usePricingEngine";
import {
  TrendingUp, TrendingDown, ChevronDown, ChevronUp,
  Zap, BarChart2, Percent, Package, Calendar, AlertTriangle, CheckCircle, Info
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PricingIntelligenceCardProps {
  vendorCost: number;
  operationsCost: number;
  currency?: string;
}

export default function PricingIntelligenceCard({
  vendorCost,
  operationsCost,
  currency = "MWK",
}: PricingIntelligenceCardProps) {
  const [activeDiscount, setActiveDiscount] = useState<number | null>(null);
  const [targetMarginPct, setTargetMarginPct] = useState<number | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showSensitivity, setShowSensitivity] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [dailySalesTarget, setDailySalesTarget] = useState(3);

  const p = usePricingEngine(vendorCost, operationsCost, targetMarginPct ? { targetMarginPct } : undefined);

  const fmt = (n: number) => `${currency} ${Math.round(n).toLocaleString()}`;

  return (
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black text-primary uppercase tracking-widest inline-flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5" /> FSC Financial Intelligence
        </label>
        {p.isValid && (
          <Badge className={`text-[9px] font-black uppercase border px-2 py-0.5 ${p.health.color.replace('text-', 'bg-').replace('500', '50')} ${p.health.color.replace('text-', 'border-').replace('500', '200')} ${p.health.color.replace('500', '700')}`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1 inline-block ${p.health.color.replace('text-', 'bg-')}`} />
            {p.health.tier} ({p.health.score})
          </Badge>
        )}
      </div>

      {!p.isValid ? (
        <div className="p-6 rounded-2xl border border-dashed border-border/40 bg-muted/10 flex flex-col items-center justify-center text-center min-h-[180px]">
          <BarChart2 className="w-8 h-8 text-muted-foreground/20 mb-3" />
          <p className="text-sm font-bold text-muted-foreground">Enter supplier cost to activate</p>
          <p className="text-xs text-muted-foreground/50 mt-1">Enterprise financial model will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">

          {/* 1. Executive KPI Strip */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Selling Price", value: fmt(p.inputs.sellingPrice), variant: "accent" },
              { label: "Net Profit", value: fmt(p.profit.netProfit), variant: "emerald" },
              { label: "Net Margin", value: `${p.margins.netMarginPct.toFixed(1)}%`, variant: "neutral" },
              { label: "ROI", value: `${p.margins.roi.toFixed(1)}%`, variant: "neutral" },
              { label: "Break-Even", value: fmt(p.margins.breakEvenPrice), variant: "amber" },
              { label: "Cost Ratio", value: `${p.margins.costRatio.toFixed(1)}%`, variant: "muted" },
            ].map((m) => (
              <div
                key={m.label}
                className={`rounded-xl p-3 border ${
                  m.variant === "accent" ? "bg-primary/5 border-primary/20" :
                  m.variant === "amber" ? "bg-amber-50 border-amber-200" :
                  m.variant === "emerald" ? "bg-emerald-50 border-emerald-200" :
                  m.variant === "muted" ? "bg-muted/30 border-border/30" :
                  "bg-card border-border/40"
                }`}
              >
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">{m.label}</p>
                <p className={`text-xs font-heading font-black truncate ${
                  m.variant === "accent" ? "text-primary" :
                  m.variant === "amber" ? "text-amber-700" :
                  m.variant === "emerald" ? "text-emerald-700" :
                  "text-foreground"
                }`}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* 2. Smart Alerts / Recommendations */}
          {p.recommendations.length > 0 && (
            <div className="space-y-2">
              {p.recommendations.slice(0, 2).map((rule) => {
                const Icon = rule.severity === 'critical' ? AlertTriangle : rule.severity === 'success' ? CheckCircle : Info;
                const colors = 
                  rule.severity === 'critical' ? 'bg-red-50 border-red-200 text-red-700' :
                  rule.severity === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                  rule.severity === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                  'bg-blue-50 border-blue-200 text-blue-700';

                return (
                  <div key={rule.id} className={`rounded-xl border p-3 flex gap-3 ${colors}`}>
                    <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest mb-0.5">{rule.title(p.inputs, p.margins)}</p>
                      <p className="text-[11px] leading-tight opacity-90">{rule.message(p.inputs, p.margins, p.profit)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}



        </div>
      )}
    </div>
  );
}
