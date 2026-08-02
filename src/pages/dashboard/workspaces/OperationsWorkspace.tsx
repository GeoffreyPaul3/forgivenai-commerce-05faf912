import React from "react";
import { computeDecisionIntelligence } from "@/services/intelligence/decisionEngine";
import { IntelligentKPICard } from "@/components/intelligence/IntelligentKPICard";
import { Package, Truck, Store, AlertTriangle, Layers } from "lucide-react";

export const OperationsWorkspace: React.FC = () => {
  const allRecs = computeDecisionIntelligence();
  const opsRecs = allRecs.filter(
    (r) => r.id === "rec_warehouse_capacity" || r.id === "rec_vendor_sla"
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-950 via-indigo-900 to-blue-950 p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sky-300">
            <Package className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider font-body">Operations Workspace</span>
          </div>
          <h2 className="font-heading text-2xl font-bold">Operations & Systems Intelligence</h2>
          <p className="text-xs text-white/70 font-body max-w-xl">
            Inventory stock capacity, courier delivery velocity, warehouse throughput, and vendor response SLAs.
          </p>
        </div>
      </div>

      {/* Decision Intelligence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {opsRecs.map((item) => (
          <IntelligentKPICard key={item.id} item={item} />
        ))}
      </div>

      {/* Operational Capacity Dashboard */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden p-5 space-y-4">
        <h3 className="font-heading text-base font-bold text-foreground">Warehouse & Stock Operations</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border p-4 bg-muted/20">
            <span className="text-xs text-muted-foreground uppercase font-body font-semibold">Capacity Used</span>
            <p className="text-xl font-heading font-bold text-foreground mt-1">63%</p>
            <p className="text-xs text-emerald-600 font-body mt-0.5">Optimal headroom (37%)</p>
          </div>
          <div className="rounded-xl border border-border p-4 bg-muted/20">
            <span className="text-xs text-muted-foreground uppercase font-body font-semibold">Active Dispatch Queue</span>
            <p className="text-xl font-heading font-bold text-foreground mt-1">18 Orders</p>
            <p className="text-xs text-muted-foreground font-body mt-0.5">Avg turnaround 45 mins</p>
          </div>
          <div className="rounded-xl border border-border p-4 bg-muted/20">
            <span className="text-xs text-muted-foreground uppercase font-body font-semibold">Vendor SLA Score</span>
            <p className="text-xl font-heading font-bold text-foreground mt-1">81%</p>
            <p className="text-xs text-amber-600 font-body mt-0.5">Review scheduled</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationsWorkspace;
