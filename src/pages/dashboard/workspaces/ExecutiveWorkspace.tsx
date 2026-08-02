import React, { useState } from "react";
import { computeDecisionIntelligence } from "@/services/intelligence/decisionEngine";
import { IntelligentKPICard } from "@/components/intelligence/IntelligentKPICard";
import { ApprovalCenter } from "@/components/approvals/ApprovalCenter";
import { AuditCenter } from "@/components/audit/AuditCenter";
import { ApprovalRequestModal } from "@/components/approvals/ApprovalRequestModal";
import { HighRiskWorkflowType } from "@/types/rbac";
import { ShieldCheck, Bot, Sparkles, AlertCircle, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ExecutiveWorkspace: React.FC = () => {
  const recommendations = computeDecisionIntelligence();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<HighRiskWorkflowType>("Pricing Override");

  const handleAction = (item: any) => {
    if (item.id === "rec_revenue_perfume") {
      setSelectedWorkflow("Pricing Override");
    } else if (item.id === "rec_treasury_reserve") {
      setSelectedWorkflow("Reserve Withdrawal");
    } else {
      setSelectedWorkflow("Strategic Expansion");
    }
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-gold">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider font-body">Executive Workspace</span>
          </div>
          <h2 className="font-heading text-2xl font-bold">Managing Director Intelligence Hub</h2>
          <p className="text-xs text-white/70 font-body max-w-xl">
            Real-time FSC decision intelligence, corporate governance, risk monitoring, and strategic resource allocation.
          </p>
        </div>

        <Button
          onClick={() => {
            setSelectedWorkflow("Strategic Expansion");
            setModalOpen(true);
          }}
          className="bg-gold text-slate-950 font-bold hover:bg-gold/90 text-xs shrink-0 gap-1.5"
        >
          <span>Request High-Risk Authorization</span>
          <ArrowUpRight className="w-4 h-4" />
        </Button>
      </div>

      {/* AI Executive Briefing */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold text-sm">
            <Bot className="w-5 h-5 animate-pulse" />
            <span>AI Executive Briefing</span>
          </div>
          <span className="text-[10px] uppercase font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
            Real-Time Synthesis
          </span>
        </div>
        <p className="text-xs text-foreground font-body leading-relaxed">
          Overall enterprise performance is <strong>Optimal (+18% MoM)</strong>. Highest revenue acceleration detected in{" "}
          <strong>Perfumes & Fragrances</strong>. Treasury reserves stand at <strong>MWK 14.2M</strong>. Warehouse turnover velocity is supporting 41 additional days without expansion. 
          Action item: 1 pending vendor response review required by Operations.
        </p>
      </div>

      {/* Decision Intelligence Cards */}
      <div>
        <h3 className="font-heading text-lg font-bold text-foreground mb-4">
          FSC Decision Intelligence Recommendations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((rec) => (
            <IntelligentKPICard key={rec.id} item={rec} onExecuteAction={handleAction} />
          ))}
        </div>
      </div>

      {/* Approval Engine */}
      <ApprovalCenter />

      {/* Immutable Audit Engine */}
      <AuditCenter />

      {/* High Risk Approval Modal */}
      <ApprovalRequestModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        workflowType={selectedWorkflow}
      />
    </div>
  );
};

export default ExecutiveWorkspace;
