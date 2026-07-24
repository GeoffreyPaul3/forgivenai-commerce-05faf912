import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePricingEngine } from "./usePricingEngine";
import {
  TrendingUp, TrendingDown, ChevronDown, ChevronUp,
  Zap, BarChart2, Percent, Package, Calendar,
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
  const [showScalability, setShowScalability] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showForecast, setShowForecast] = useState(false);
  const [dailySalesTarget, setDailySalesTarget] = useState(3);

  const p = usePricingEngine(vendorCost, operationsCost);

  const fmt = (n: number) =>
    `${currency} ${Math.round(n).toLocaleString()}`;

  const healthConfig =
    p.grossMarginPct >= 35
      ? { label: "Excellent", cls: "text-emerald-700 bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" }
      : p.grossMarginPct >= 25
      ? { label: "Healthy", cls: "text-blue-700 bg-blue-50 border-blue-200", dot: "bg-blue-500" }
      : p.grossMarginPct >= 15
      ? { label: "Low Margin", cls: "text-amber-700 bg-amber-50 border-amber-200", dot: "bg-amber-500" }
      : { label: "Danger", cls: "text-red-700 bg-red-50 border-red-200", dot: "bg-red-500" };

  const confidenceColor =
    p.confidenceScore >= 80 ? "#10b981" :
    p.confidenceScore >= 60 ? "#3b82f6" :
    p.confidenceScore >= 40 ? "#f59e0b" : "#ef4444";

  // Arc circumference for semi-circle gauge (r=45)
  const ARC_LEN = Math.PI * 45;

  return (
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black text-primary uppercase tracking-widest inline-flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5" /> Pricing Intelligence
        </label>
        {p.isValid && (
          <Badge className={`text-[9px] font-black uppercase border px-2 py-0.5 ${healthConfig.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1 inline-block ${healthConfig.dot}`} />
            {healthConfig.label}
          </Badge>
        )}
      </div>

      {/* ── Empty state ──────────────────────────────────────────────── */}
      {!p.isValid ? (
        <div className="p-6 rounded-2xl border border-dashed border-border/40 bg-muted/10 flex flex-col items-center justify-center text-center min-h-[180px]">
          <BarChart2 className="w-8 h-8 text-muted-foreground/20 mb-3" />
          <p className="text-sm font-bold text-muted-foreground">Enter supplier cost to activate</p>
          <p className="text-xs text-muted-foreground/50 mt-1">Live pricing intelligence will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">

          {/* ── Executive Metrics 2×3 ────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-2">
            {([
              { label: "Selling Price", value: fmt(p.sellingPrice), variant: "accent" },
              { label: "Supplier Cost",  value: fmt(vendorCost),       variant: "muted" },
              { label: "Gross Profit",   value: fmt(p.grossProfit),    variant: "amber" },
              { label: "Gross Margin",   value: `${p.grossMarginPct.toFixed(1)}%`, variant: "neutral" },
              { label: "Markup",         value: `${p.markupPct.toFixed(1)}%`,       variant: "neutral" },
              { label: "FSC Revenue",    value: fmt(p.grossProfit),    variant: "emerald" },
            ] as { label: string; value: string; variant: string }[]).map((m) => (
              <motion.div
                key={m.label}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl p-3 border ${
                  m.variant === "accent"  ? "bg-primary/5 border-primary/20"      :
                  m.variant === "amber"   ? "bg-amber-50 border-amber-200"        :
                  m.variant === "emerald" ? "bg-emerald-50 border-emerald-200"    :
                  m.variant === "muted"   ? "bg-muted/30 border-border/30"        :
                  "bg-card border-border/40"
                }`}
              >
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">{m.label}</p>
                <p className={`text-xs font-heading font-black truncate ${
                  m.variant === "accent"  ? "text-primary"      :
                  m.variant === "amber"   ? "text-amber-700"    :
                  m.variant === "emerald" ? "text-emerald-700"  :
                  "text-foreground"
                }`}>{m.value}</p>
              </motion.div>
            ))}
          </div>

          {/* ── Confidence Score Arc Gauge ───────────────────────────── */}
          <div className="rounded-2xl border border-border/40 bg-card p-4 flex items-center gap-4">
            <div className="relative w-24 h-14 shrink-0">
              <svg viewBox="0 0 100 56" className="w-full h-full overflow-visible">
                {/* Track */}
                <path d="M 5 52 A 45 45 0 0 1 95 52" fill="none" stroke="#e5e7eb" strokeWidth="8" strokeLinecap="round" />
                {/* Progress */}
                <motion.path
                  d="M 5 52 A 45 45 0 0 1 95 52"
                  fill="none"
                  stroke={confidenceColor}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={ARC_LEN}
                  initial={{ strokeDashoffset: ARC_LEN }}
                  animate={{ strokeDashoffset: ARC_LEN * (1 - p.confidenceScore / 100) }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                />
                <text x="50" y="50" textAnchor="middle" fontSize="15" fontWeight="900" fill={confidenceColor}>
                  {p.confidenceScore}%
                </text>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Pricing Confidence</p>
              <p className="font-heading font-black text-base leading-tight" style={{ color: confidenceColor }}>
                {p.confidenceLabel}
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5 leading-tight">
                Margin · Resilience · Cost Structure
              </p>
            </div>
          </div>

          {/* ── Revenue Waterfall ────────────────────────────────────── */}
          <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-2.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Revenue Waterfall</p>
            {([
              { label: "Selling Price", value: p.sellingPrice, pct: 100, bar: p.sellingPrice, color: "bg-primary", prefix: "" },
              { label: "↓ Supplier Cost", value: vendorCost, pct: p.vendorCostPct, bar: p.vendorCostPct, color: "bg-slate-400", prefix: "−" },
              { label: "↓ Operations", value: operationsCost, pct: p.operationsPct, bar: p.operationsPct, color: "bg-slate-300", prefix: "−" },
              { label: "✓ FSC Net Profit", value: p.grossProfit, pct: p.fscProfitPct, bar: p.fscProfitPct, color: "bg-emerald-500", prefix: "" },
            ] as { label: string; value: number; pct: number; bar: number; color: string; prefix: string }[]).map((row, i) => (
              <motion.div
                key={row.label}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="space-y-1"
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className={`font-bold ${
                    row.label.startsWith("✓") ? "text-emerald-700 font-black" :
                    row.label.startsWith("↓") ? "text-muted-foreground"       :
                    "text-foreground font-black"
                  }`}>{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground/50">{row.pct.toFixed(1)}%</span>
                    <span className={`font-black tabular-nums ${
                      row.label.startsWith("✓") ? "text-emerald-700" :
                      row.label.startsWith("↓") ? "text-slate-500"   :
                      "text-primary"
                    }`}>{row.prefix}{currency} {Math.abs(row.value).toLocaleString()}</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${row.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.abs(row.bar))}%` }}
                    transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── Live Margin Slider (Advisory) ───────────────────────── */}
          <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Target Margin Advisor</p>
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
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
                    <p className="text-[9px] text-muted-foreground font-bold uppercase">
                      Recommended price for {targetMarginPct}% margin
                    </p>
                    <p className="font-heading font-black text-lg text-primary mt-0.5">
                      {fmt(p.priceForMargin(targetMarginPct))}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {p.priceForMargin(targetMarginPct) > p.sellingPrice
                        ? `+${fmt(p.priceForMargin(targetMarginPct) - p.sellingPrice)} above current price`
                        : `${fmt(p.sellingPrice - p.priceForMargin(targetMarginPct))} below current price`}
                      {" · Advisory only"}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Profit Sensitivity ───────────────────────────────────── */}
          <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Profit Sensitivity Analysis</p>
            <div className="space-y-0">
              {([
                { label: "Supplier cost +10%", s: p.scenarioSupplierUp10, Icon: TrendingUp,   iconCls: "text-red-500" },
                { label: "Supplier cost −10%", s: p.scenarioSupplierDown10, Icon: TrendingDown, iconCls: "text-emerald-500" },
                { label: "15% discount applied", s: p.scenarioDiscount15, Icon: Percent,      iconCls: "text-amber-500" },
              ] as { label: string; s: { margin: number; delta: number }; Icon: React.ElementType; iconCls: string }[]).map(({ label, s, Icon, iconCls }) => (
                <div key={label} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 ${iconCls}`} />
                    <span className="text-[10px] font-bold text-muted-foreground">{label}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-foreground">{s.margin.toFixed(1)}% margin</p>
                    <p className={`text-[9px] font-bold ${s.delta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {s.delta >= 0 ? "+" : ""}{s.delta.toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Discount Simulator ──────────────────────────────────── */}
          <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Live Discount Simulator</p>
            <div className="flex gap-1.5">
              {[5, 10, 15, 20].map((d) => {
                const margin = p.discountedMargin(d);
                const isActive = activeDiscount === d;
                const barColor =
                  margin >= 25 ? "bg-emerald-500" :
                  margin >= 15 ? "bg-amber-500"   : "bg-red-500";
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
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-3 gap-2">
                    {(() => {
                      const discMargin = p.discountedMargin(activeDiscount);
                      const accentCls =
                        discMargin >= 25 ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                        discMargin >= 15 ? "bg-amber-50 border-amber-200 text-amber-700"       :
                        "bg-red-50 border-red-200 text-red-700";
                      return [
                        { label: "Discounted Price",   value: fmt(p.discountedPrice(activeDiscount)),  cls: "bg-card border-border/40 text-foreground" },
                        { label: "Remaining Profit",   value: fmt(p.discountedProfit(activeDiscount)), cls: "bg-card border-border/40 text-foreground" },
                        { label: "Remaining Margin",   value: `${discMargin.toFixed(1)}%`,             cls: accentCls },
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

          {/* ── Executive AI Insight ─────────────────────────────────── */}
          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 flex gap-3">
            <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-1">Executive Insight</p>
              <p className="text-xs font-body text-foreground/80 leading-relaxed">{p.executiveInsight}</p>
            </div>
          </div>

          {/* ── Break-even & Scalability (collapsible) ──────────────── */}
          <div className="rounded-2xl border border-border/40 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowScalability((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-muted/10 hover:bg-muted/20 transition-colors"
            >
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                Break-even & Scalability
              </span>
              {showScalability
                ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
            <AnimatePresence>
              {showScalability && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 space-y-4 border-t border-border/40">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-muted/20 p-3">
                        <p className="text-[9px] uppercase font-black text-muted-foreground">Break-even Price</p>
                        <p className="font-heading font-black text-sm text-foreground mt-0.5">{fmt(p.breakEvenPrice)}</p>
                        <p className="text-[9px] text-muted-foreground/50 mt-0.5">Zero profit point</p>
                      </div>
                      <div className="rounded-xl bg-muted/20 p-3">
                        <p className="text-[9px] uppercase font-black text-muted-foreground">Max Discount</p>
                        <p className="font-heading font-black text-sm text-foreground mt-0.5">{p.maxDiscountPct.toFixed(1)}%</p>
                        <p className="text-[9px] text-muted-foreground/50 mt-0.5">Before break-even</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">Scalability Projections</p>
                      <div className="space-y-0">
                        {[
                          { label: "× 100 units",    profit: p.scalability.profit100 },
                          { label: "× 1,000 units",  profit: p.scalability.profit1000 },
                          { label: "× 10,000 units", profit: p.scalability.profit10000 },
                        ].map((row) => (
                          <div key={row.label} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
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

          {/* ── Min Profitable Price ─────────────────────────────────── */}
          <div className="rounded-2xl border border-amber-200/60 bg-amber-50/40 p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-amber-700">Min Profitable Price</p>
              <p className="font-heading font-black text-lg text-amber-800 mt-0.5">{fmt(p.minProfitablePrice)}</p>
              <p className="text-[10px] text-amber-600/70 mt-0.5">Lowest price that generates any profit</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Headroom</p>
              <p className="font-heading font-black text-base text-foreground">{fmt(p.sellingPrice - p.minProfitablePrice)}</p>
              <p className="text-[10px] text-muted-foreground/60">Above minimum</p>
            </div>
          </div>

          {/* ── Bulk Order Projections (collapsible) ─────────────────── */}
          <div className="rounded-2xl border border-border/40 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowBulk(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-muted/10 hover:bg-muted/20 transition-colors"
            >
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" /> Bulk Order Profit Projection
              </span>
              {showBulk ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
            <AnimatePresence>
              {showBulk && (
                <motion.div
                  initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 border-t border-border/40 space-y-0">
                    {p.bulkProjections.map((row) => (
                      <div key={row.units} className="flex items-center justify-between py-2.5 border-b border-border/20 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">{row.units}</span>
                          <div>
                            <p className="text-[10px] font-black text-foreground">{row.units} units</p>
                            <p className="text-[9px] text-muted-foreground">Revenue: {fmt(row.revenue)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-emerald-700">{fmt(row.totalProfit)}</p>
                          <p className="text-[9px] text-muted-foreground">Total Profit</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Monthly / Yearly Revenue Forecast (collapsible) ──────── */}
          <div className="rounded-2xl border border-border/40 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowForecast(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-muted/10 hover:bg-muted/20 transition-colors"
            >
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Monthly &amp; Yearly Forecast
              </span>
              {showForecast ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
            <AnimatePresence>
              {showForecast && (
                <motion.div
                  initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                  className="overflow-hidden"
                >
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
                              dailySalesTarget === n
                                ? "bg-primary text-white border-primary shadow-md"
                                : "bg-muted/20 text-muted-foreground border-border/40 hover:border-primary/40"
                            }`}
                          >
                            {n}/day
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Monthly Revenue", value: p.forecast.monthlyRevenue(dailySalesTarget), cls: "bg-blue-50 border-blue-200 text-blue-800" },
                        { label: "Monthly Profit", value: p.forecast.monthlyProfit(dailySalesTarget), cls: "bg-emerald-50 border-emerald-200 text-emerald-800" },
                        { label: "Yearly Revenue", value: p.forecast.yearlyRevenue(dailySalesTarget), cls: "bg-purple-50 border-purple-200 text-purple-800" },
                        { label: "Yearly Profit", value: p.forecast.yearlyProfit(dailySalesTarget), cls: "bg-amber-50 border-amber-200 text-amber-800" },
                      ].map(item => (
                        <div key={item.label} className={`rounded-xl p-3 border ${item.cls}`}>
                          <p className="text-[8px] font-bold uppercase opacity-70">{item.label}</p>
                          <p className="font-heading font-black text-sm mt-0.5">{fmt(item.value)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-xl bg-muted/20 p-3 border border-border/40">
                      <p className="text-[9px] text-muted-foreground font-bold uppercase">Units needed for MWK 500k/month profit</p>
                      <p className="font-heading font-black text-base mt-0.5">{p.forecast.dailyUnitsNeeded(500000)} <span className="text-xs font-body text-muted-foreground">units/day</span></p>
                    </div>
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
