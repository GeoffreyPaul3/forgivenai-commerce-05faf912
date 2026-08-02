import React from "react";
import { Store, TrendingUp, Users, Target, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

export const BusinessDevelopmentWorkspace: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-950 via-orange-950 to-amber-950 p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-300">
            <Store className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider font-body">Business Development Workspace</span>
          </div>
          <h2 className="font-heading text-2xl font-bold">Vendor Expansion & Growth Pipeline</h2>
          <p className="text-xs text-white/70 font-body max-w-xl">
            Vendor recruitment onboarding, growth pipeline analytics, campaign performance, and strategic partnership deals.
          </p>
        </div>

        <Button className="bg-gold text-slate-950 font-bold hover:bg-gold/90 text-xs shrink-0 gap-1.5">
          <Rocket className="w-4 h-4" />
          Launch Vendor Campaign
        </Button>
      </div>

      {/* Growth Pipeline Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Active Vendors</span>
          <p className="text-2xl font-heading font-bold text-foreground mt-1">28</p>
          <p className="text-xs text-emerald-600 font-body mt-0.5">↑ 4 new this month</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Onboarding Pipeline</span>
          <p className="text-2xl font-heading font-bold text-foreground mt-1">7</p>
          <p className="text-xs text-muted-foreground font-body mt-0.5">Awaiting verification</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Exclusive Contracts</span>
          <p className="text-2xl font-heading font-bold text-foreground mt-1">11</p>
          <p className="text-xs text-emerald-600 font-body mt-0.5">High margin tier</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Target Expansion</span>
          <p className="text-2xl font-heading font-bold text-foreground mt-1">15 Vendors</p>
          <p className="text-xs text-amber-600 font-body mt-0.5">Q3 Target Goal</p>
        </div>
      </div>
    </div>
  );
};

export default BusinessDevelopmentWorkspace;
