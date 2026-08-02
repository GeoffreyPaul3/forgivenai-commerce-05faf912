import React from "react";
import { Truck, CheckSquare, Send, Printer, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const FulfillmentWorkspace: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-950 via-indigo-900 to-purple-950 p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-purple-300">
            <Truck className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider font-body">Fulfillment Workspace</span>
          </div>
          <h2 className="font-heading text-2xl font-bold">Order Picking, Packing & Dispatch Center</h2>
          <p className="text-xs text-white/70 font-body max-w-xl">
            Live picking lists, barcode verification, shipping label generation, and automated courier handoffs.
          </p>
        </div>

        <Button variant="secondary" className="text-xs font-bold gap-1.5 shrink-0">
          <Printer className="w-4 h-4" />
          Print Batch Shipping Labels
        </Button>
      </div>

      {/* Fulfillment Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Ready to Pick</span>
          <p className="text-2xl font-heading font-bold text-foreground mt-1">12</p>
          <p className="text-xs text-muted-foreground font-body mt-0.5">High priority items</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Packing Station</span>
          <p className="text-2xl font-heading font-bold text-foreground mt-1">5</p>
          <p className="text-xs text-muted-foreground font-body mt-0.5">Verification stage</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Awaiting Pickup</span>
          <p className="text-2xl font-heading font-bold text-foreground mt-1">8</p>
          <p className="text-xs text-emerald-600 font-body mt-0.5">Impala Courier assigned</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Dispatched Today</span>
          <p className="text-2xl font-heading font-bold text-foreground mt-1">42</p>
          <p className="text-xs text-emerald-600 font-body mt-0.5">100% on-time SLA</p>
        </div>
      </div>
    </div>
  );
};

export default FulfillmentWorkspace;
