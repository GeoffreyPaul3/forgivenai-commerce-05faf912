import React, { useState } from "react";
import { HighRiskWorkflowType } from "@/types/rbac";
import { createApprovalRequest } from "@/services/approvals/approvalService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ShieldAlert, Loader2 } from "lucide-react";

interface ApprovalRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowType: HighRiskWorkflowType;
  defaultTitle?: string;
  defaultDetails?: Record<string, any>;
  onSuccess?: () => void;
}

export const ApprovalRequestModal: React.FC<ApprovalRequestModalProps> = ({
  open,
  onOpenChange,
  workflowType,
  defaultTitle = "",
  defaultDetails = {},
  onSuccess,
}) => {
  const [title, setTitle] = useState(defaultTitle || `${workflowType} Request`);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Please provide a business justification reason.");
      return;
    }

    setLoading(true);
    try {
      const res = await createApprovalRequest(workflowType, title, defaultDetails, reason);
      if (res) {
        toast.success(`Approval Request Submitted for ${workflowType}`);
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error("Failed to submit approval request");
      }
    } catch (err) {
      toast.error("An error occurred during submission");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600">
            <ShieldAlert className="w-5 h-5" />
            <DialogTitle>High-Risk Enterprise Action Request</DialogTitle>
          </div>
          <DialogDescription>
            Executing <strong>{workflowType}</strong> requires authorized administrative approval and generates an immutable audit record.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="req-title" className="text-xs font-semibold">Workflow Title</Label>
            <Input
              id="req-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Perfume Category 15% Price Discount Override"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="req-reason" className="text-xs font-semibold">Business Justification Reason</Label>
            <Textarea
              id="req-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Specify rationale, expected revenue impact, and operational risk mitigation..."
              rows={3}
              required
            />
          </div>

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit for Approval
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
