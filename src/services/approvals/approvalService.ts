import { supabase } from "@/integrations/supabase/client";
import { ApprovalRequest, HighRiskWorkflowType } from "@/types/rbac";
import { recordAuditEvent } from "@/services/audit/auditService";

export async function createApprovalRequest(
  workflowType: HighRiskWorkflowType,
  title: string,
  details: Record<string, any>,
  reason: string
): Promise<ApprovalRequest | null> {
  const { data: { user } } = await supabase.auth.getUser();

  // Get active staff position code
  const { data: userPos } = await supabase
    .from("user_positions")
    .select("staff_positions(code, name)")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  const posName = (userPos?.staff_positions as any)?.name || "Admin Staff";

  const payload = {
    workflow_type: workflowType,
    title,
    details,
    requester_id: user?.id,
    requester_position: posName,
    status: "pending",
    reason,
  };

  const { data, error } = await supabase
    .from("approval_requests")
    .insert([payload])
    .select("*")
    .single();

  if (error) {
    console.error("Error creating approval request:", error);
    return null;
  }

  // Record audit log entry
  await recordAuditEvent({
    module: "Approvals Engine",
    action: `REQUESTED_${workflowType.replace(/\s+/g, "_").toUpperCase()}`,
    permissionUsed: "approvals.manage",
    new_value: details,
    reason: `Created approval request: ${title} (${reason})`,
    approval_id: data.id,
  });

  return data as ApprovalRequest;
}

export async function resolveApprovalRequest(
  requestId: string,
  status: "approved" | "rejected",
  resolutionReason: string
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data: request } = await supabase
    .from("approval_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (!request) return false;

  const { error } = await supabase
    .from("approval_requests")
    .update({
      status,
      approver_id: user?.id,
      reason: resolutionReason,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) {
    console.error("Error resolving approval request:", error);
    return false;
  }

  await recordAuditEvent({
    module: "Approvals Engine",
    action: `APPROVAL_${status.toUpperCase()}`,
    permissionUsed: "approvals.manage",
    old_value: { status: request.status },
    new_value: { status, resolutionReason },
    reason: `${status.toUpperCase()} request: ${request.title}. Reason: ${resolutionReason}`,
    approval_id: requestId,
  });

  return true;
}

export async function fetchPendingApprovalRequests(): Promise<ApprovalRequest[]> {
  const { data, error } = await supabase
    .from("approval_requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching approval requests:", error);
    return [];
  }

  return (data || []) as ApprovalRequest[];
}
