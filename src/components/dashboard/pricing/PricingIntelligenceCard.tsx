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

          {/* 3. Full Cost Waterfall */}
          <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-2.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Enterprise Revenue Distribution</p>
            {[
              { label: "Selling Price", value: p.inputs.sellingPrice, pct: 100, color: "bg-primary", prefix: "" },
              { label: "↓ Vendor Cost", value: p.costs.vendorCost, pct: (p.costs.vendorCost/p.inputs.sellingPrice)*100, color: "bg-slate-400", prefix: "−" },
              { label: "↓ Operations", value: p.costs.operationsCost, pct: (p.costs.operationsCost/p.inputs.sellingPrice)*100, color: "bg-slate-300", prefix: "−" },
              { label: "↓ Agent Commission", value: p.costs.commissionAmount, pct: (p.costs.commissionAmount/p.inputs.sellingPrice)*100, color: "bg-orange-300", prefix: "−" },
              { label: "↓ Marketing & Gateway", value: p.costs.marketingCost + p.costs.gatewayFee, pct: ((p.costs.marketingCost + p.costs.gatewayFee)/p.inputs.sellingPrice)*100, color: "bg-purple-300", prefix: "−" },
              { label: "↓ Delivery & Pkg", value: p.costs.deliveryCost + p.costs.packagingCost, pct: ((p.costs.deliveryCost + p.costs.packagingCost)/p.inputs.sellingPrice)*100, color: "bg-blue-300", prefix: "−" },
              { label: "↓ Platform & Reserve", value: p.costs.platformFee + p.costs.reserveAmount, pct: ((p.costs.platformFee + p.costs.reserveAmount)/p.inputs.sellingPrice)*100, color: "bg-indigo-300", prefix: "−" },
              { label: "✓ Net FSC Profit", value: p.profit.netProfit, pct: p.margins.netMarginPct, color: "bg-emerald-500", prefix: "" },
            ].map((row, i) => (
              <div key={row.label} className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className={`font-bold ${
                    row.label.startsWith("✓") ? "text-emerald-700 font-black" :
                    row.label.startsWith("↓") ? "text-muted-foreground" :
                    "text-foreground font-black"
                  }`}>{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground/50">{(row.pct || 0).toFixed(1)}%</span>
                    <span className={`font-black tabular-nums ${
                      row.label.startsWith("✓") ? "text-emerald-700" :
                      row.label.startsWith("↓") ? "text-slate-500" :
                      "text-primary"
                    }`}>{row.prefix}{fmt(Math.abs(row.value))}</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${row.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.abs(row.pct || 0))}%` }}
                    transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* 4. Margin Targets */}
          <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Target Margin Optimizer</p>
              <span className="text-[9px] font-bold text-muted-foreground/50">Current Default: {p.inputs.targetMarginPct}%</span>
            </div>
            <div className="flex gap-1.5">
              {[20, 25, 30, 35, 40].map((pct) => {
                const isActive = targetMarginPct === pct;
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setTargetMarginPct(isActive ? null : pct)}
                    className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${
                      isActive
                        ? "bg-primary text-white border-primary shadow-md"
                        : "bg-muted/20 text-muted-foreground border-border/40 hover:border-primary/40"
                    }`}
                  >
                    {pct}%
                  </button>
                );
              })}
            </div>
            <AnimatePresence>
              {targetMarginPct !== null && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 mt-3">
                    <p className="text-[9px] text-muted-foreground font-bold uppercase">
                      Recommended price for {targetMarginPct}% Net Margin
                    </p>
                    <p className="font-heading font-black text-lg text-primary mt-0.5">
                      {fmt(p.priceForMargin(targetMarginPct))}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {p.priceForMargin(targetMarginPct) > p.inputs.sellingPrice
                        ? `+${fmt(p.priceForMargin(targetMarginPct) - p.inputs.sellingPrice)} above current formula price`
                        : `${fmt(p.inputs.sellingPrice - p.priceForMargin(targetMarginPct))} below current formula price`}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 5. Discount Simulator */}
          <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Discount Simulator</p>
            <div className="flex gap-1.5">
              {[5, 10, 15, 20].map((d) => {
                const margin = p.discountedMargin(d);
                const isActive = activeDiscount === d;
                const barColor = margin >= 15 ? "bg-emerald-500" : margin >= 5 ? "bg-amber-500" : "bg-red-500";
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setActiveDiscount(isActive ? null : d)}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black border transition-all ${
                      isActive
                        ? `${barColor} text-white border-transparent shadow-md`
                        : "bg-muted/20 text-muted-foreground border-border/40 hover:border-muted-foreground/30"
                    }`}
                  >
                    -{d}%
                  </button>
                );
              })}
            </div>
            <AnimatePresence>
              {activeDiscount !== null && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {(() => {
                      const discMargin = p.discountedMargin(activeDiscount);
                      const accentCls = discMargin >= 15 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : discMargin >= 5 ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-red-50 border-red-200 text-red-700";
                      return [
                        { label: "New Price", value: fmt(p.discountedPrice(activeDiscount)), cls: "bg-card border-border/40 text-foreground" },
                        { label: "Net Profit", value: fmt(p.discountedProfit(activeDiscount)), cls: "bg-card border-border/40 text-foreground" },
                        { label: "Net Margin", value: `${discMargin.toFixed(1)}%`, cls: accentCls },
                      ].map((m) => (
                        <div key={m.label} className={`rounded-xl p-2.5 border text-center ${m.cls}`}>
                          <p className="text-[8px] font-bold uppercase text-muted-foreground">{m.label}</p>
                          <p className="text-xs font-black mt-0.5">{m.value}</p>
                        </div>
                      ));
                    })()}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 6. Sensitivity Analysis (Collapsible) */}
          <div className="rounded-2xl border border-border/40 overflow-hidden">
            <button type="button" onClick={() => setShowSensitivity(v => !v)} className="w-full flex items-center justify-between px-4 py-3 bg-muted/10 hover:bg-muted/20 transition-colors">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Sensitivity Analysis & Scenarios</span>
              {showSensitivity ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
            <AnimatePresence>
              {showSensitivity && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="p-4 border-t border-border/40 space-y-4">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">Cost Impact Ranking (1% increase)</p>
                      <div className="space-y-2">
                        {p.sensitivity.slice(0, 3).map((s, i) => (
                          <div key={s.key} className="flex items-center text-[10px]">
                            <div className="w-24 shrink-0 font-bold text-muted-foreground">{s.label}</div>
                            <div className="flex-1 mx-2 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${s.impactPct}%` }} />
                            </div>
                            <div className="w-16 shrink-0 text-right font-black text-red-600">-{fmt(s.impactOnProfit)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">What-If Scenarios</p>
                      <div className="space-y-0">
                        {p.scenarios.slice(0, 3).map(s => (
                          <div key={s.label} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                            <span className="text-[10px] font-bold text-muted-foreground">{s.label}</span>
                            <div className="text-right">
                              <span className="text-[10px] font-black text-foreground mr-2">{s.netMarginPct.toFixed(1)}% margin</span>
                              <span className={`text-[9px] font-bold ${s.delta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                {s.delta >= 0 ? "+" : ""}{fmt(s.delta)} profit
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 7. Profit Projections & Timeline (Collapsible) */}
          <div className="rounded-2xl border border-border/40 overflow-hidden">
            <button type="button" onClick={() => setShowTimeline(v => !v)} className="w-full flex items-center justify-between px-4 py-3 bg-muted/10 hover:bg-muted/20 transition-colors">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Profit Timeline & Projections
              </span>
              {showTimeline ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
            <AnimatePresence>
              {showTimeline && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="p-4 border-t border-border/40 space-y-4">
                    <div className="space-y-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Daily Sales Target</p>
                      <div className="flex gap-2">
                        {[1, 2, 3, 5, 10].map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setDailySalesTarget(n)}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-black border transition-all ${
                              dailySalesTarget === n ? "bg-primary text-white border-primary shadow-md" : "bg-muted/20 text-muted-foreground border-border/40 hover:border-primary/40"
                            }`}
                          >
                            {n}/day
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Monthly Profit", value: p.forecast.day.profit * dailySalesTarget * 30, cls: "bg-emerald-50 border-emerald-200 text-emerald-800" },
                        { label: "Yearly Profit", value: p.forecast.day.profit * dailySalesTarget * 365, cls: "bg-amber-50 border-amber-200 text-amber-800" },
                      ].map(item => (
                        <div key={item.label} className={`rounded-xl p-3 border ${item.cls}`}>
                          <p className="text-[8px] font-bold uppercase opacity-70">{item.label}</p>
                          <p className="font-heading font-black text-sm mt-0.5">{fmt(item.value)}</p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">Volume Projections</p>
                      <div className="space-y-0">
                        {p.forecast.projections.slice(0, 4).map(row => (
                          <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
                            <span className="text-[10px] font-bold text-muted-foreground">{row.label}</span>
                            <span className="text-[10px] font-black text-emerald-700">{fmt(row.profit)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* 8. Full Breakdown Table (Collapsible) */}
          <div className="rounded-2xl border border-border/40 overflow-hidden">
            <button type="button" onClick={() => setShowBreakdown(v => !v)} className="w-full flex items-center justify-between px-4 py-3 bg-muted/10 hover:bg-muted/20 transition-colors">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Enterprise Financial Breakdown</span>
              {showBreakdown ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
            <AnimatePresence>
              {showBreakdown && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="p-4 border-t border-border/40 space-y-2">
                    {[
                      { label: "Revenue (Selling Price)", value: fmt(p.inputs.sellingPrice), cls: "font-black text-primary" },
                      { label: "Direct Costs", value: fmt(p.costs.totalDirectCosts), cls: "font-bold text-muted-foreground" },
                      { label: "Sales Costs", value: fmt(p.costs.totalSalesCosts), cls: "font-bold text-muted-foreground" },
                      { label: "Business Costs", value: fmt(p.costs.totalBusinessCosts), cls: "font-bold text-muted-foreground" },
                      { label: "Total Cost", value: fmt(p.costs.totalCost), cls: "font-black text-red-600" },
                      { label: "Gross Profit (Legacy)", value: fmt(p.profit.grossProfit), cls: "font-black text-amber-600 border-t border-border pt-2 mt-1" },
                      { label: "Net FSC Profit", value: fmt(p.profit.netProfit), cls: "font-black text-emerald-600 border-t border-border pt-2 mt-1 text-base" },
                    ].map(row => (
                      <div key={row.label} className={`flex justify-between text-[10px] ${row.cls}`}>
                        <span>{row.label}</span>
                        <span>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      )}
    </div>
  );
}
