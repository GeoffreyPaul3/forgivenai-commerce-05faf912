import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPendingApprovalRequests, resolveApprovalRequest } from "@/services/approvals/approvalService";
import { ShieldCheck, CheckCircle2, XCircle, Clock, AlertTriangle, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const ApprovalCenter: React.FC = () => {
  const queryClient = useQueryClient();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["pending-approval-requests"],
    queryFn: fetchPendingApprovalRequests,
    refetchInterval: 15000,
  });

  const handleResolve = async (id: string, status: "approved" | "rejected") => {
    setResolvingId(id);
    try {
      const ok = await resolveApprovalRequest(id, status, `Action ${status} via Executive Approval Center.`);
      if (ok) {
        toast.success(`Request ${status.toUpperCase()} successfully.`);
        queryClient.invalidateQueries({ queryKey: ["pending-approval-requests"] });
      } else {
        toast.error("Failed to update approval request.");
      }
    } catch (err) {
      toast.error("An error occurred during approval resolution.");
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden space-y-4 p-5">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold text-foreground">High-Risk Approval Engine</h3>
            <p className="text-xs text-muted-foreground font-body">
              Pending authorization requests for high-risk operations
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
          {requests.length} Pending
        </span>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground font-body">Loading pending requests...</div>
      ) : requests.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <p className="text-sm font-semibold text-foreground font-body">All High-Risk Requests Processed</p>
          <p className="text-xs text-muted-foreground font-body">No pending approval workflows require attention.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="rounded-xl border border-border/80 p-4 bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-500/20 text-amber-700 dark:text-amber-300">
                    {req.workflow_type}
                  </span>
                  <span className="text-xs text-muted-foreground font-body flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(req.created_at).toLocaleString()}
                  </span>
                </div>
                <h4 className="font-heading text-sm font-bold text-foreground">{req.title}</h4>
                <p className="text-xs text-muted-foreground font-body">{req.reason}</p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
                  <UserCheck className="w-3.5 h-3.5 text-primary" />
                  <span>Requester: <strong className="text-foreground">{req.requester_position || "Staff"}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={resolvingId === req.id}
                  onClick={() => handleResolve(req.id, "rejected")}
                  className="text-xs border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  disabled={resolvingId === req.id}
                  onClick={() => handleResolve(req.id, "approved")}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Authorize & Execute
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
