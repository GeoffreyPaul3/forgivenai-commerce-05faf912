import React from "react";
import { computeDecisionIntelligence } from "@/services/intelligence/decisionEngine";
import { IntelligentKPICard } from "@/components/intelligence/IntelligentKPICard";
import { CreditCard, DollarSign, TrendingUp, FileSpreadsheet, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export const FinanceWorkspace: React.FC = () => {
  const allRecs = computeDecisionIntelligence();
  const financeRecs = allRecs.filter(
    (r) => r.id === "rec_revenue_perfume" || r.id === "rec_treasury_reserve"
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-950 p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-300">
            <DollarSign className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider font-body">Finance Workspace</span>
          </div>
          <h2 className="font-heading text-2xl font-bold">Finance & Administration Intelligence</h2>
          <p className="text-xs text-white/70 font-body max-w-xl">
            Treasury management, liquidity reserves, cash flow allocation, revenue intelligence, and audit-ready disbursements.
          </p>
        </div>

        <Button variant="secondary" className="text-xs font-bold gap-1.5 shrink-0">
          <FileSpreadsheet className="w-4 h-4" />
          Export General Ledger
        </Button>
      </div>

      {/* Intelligent KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {financeRecs.map((item) => (
          <IntelligentKPICard key={item.id} item={item} />
        ))}
      </div>

      {/* Financial Health Summary Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden p-5 space-y-4">
        <h3 className="font-heading text-base font-bold text-foreground">Treasury Reserve & Liquidity Breakdown</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border p-4 bg-muted/20">
            <span className="text-xs text-muted-foreground uppercase font-body font-semibold">Total Reserves</span>
            <p className="text-xl font-heading font-bold text-foreground mt-1">MWK 14.2M</p>
            <p className="text-xs text-emerald-600 font-body mt-0.5">↑ 5.2% liquid pool</p>
          </div>
          <div className="rounded-xl border border-border p-4 bg-muted/20">
            <span className="text-xs text-muted-foreground uppercase font-body font-semibold">Vendor Disbursements</span>
            <p className="text-xl font-heading font-bold text-foreground mt-1">MWK 6.8M</p>
            <p className="text-xs text-muted-foreground font-body mt-0.5">Pending approval cycle</p>
          </div>
          <div className="rounded-xl border border-border p-4 bg-muted/20">
            <span className="text-xs text-muted-foreground uppercase font-body font-semibold">Net Profit Margin</span>
            <p className="text-xl font-heading font-bold text-foreground mt-1">32.4%</p>
            <p className="text-xs text-emerald-600 font-body mt-0.5">Optimal profit health</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceWorkspace;
