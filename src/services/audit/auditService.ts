import { supabase } from "@/integrations/supabase/client";
import { AuditLog } from "@/types/rbac";

export interface AuditEventInput {
  module: string;
  action: string;
  permissionUsed?: string;
  old_value?: Record<string, any> | null;
  new_value?: Record<string, any> | null;
  reason?: string | null;
  approval_id?: string | null;
}

export async function recordAuditEvent(input: AuditEventInput): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch user position
    const { data: userPos } = await supabase
      .from("user_positions")
      .select("staff_positions(name)")
      .eq("user_id", user?.id ?? "")
      .maybeSingle();

    const posName = (userPos?.staff_positions as any)?.name || "Executive Admin";

    const payload = {
      actor_id: user?.id,
      actor_position: posName,
      permission_used: input.permissionUsed || "all.manage",
      module: input.module,
      action: input.action,
      old_value: input.old_value || null,
      new_value: input.new_value || null,
      reason: input.reason || null,
      approval_id: input.approval_id || null,
      ip_address: "127.0.0.1",
      device_info: typeof window !== "undefined" ? window.navigator.userAgent.slice(0, 100) : "Browser",
    };

    const { error } = await supabase.from("audit_logs").insert([payload]);
    if (error) {
      console.error("Failed to insert audit log:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Audit log error:", err);
    return false;
  }
}

export async function fetchAuditLogs(limit = 100): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching audit logs:", error);
    return [];
  }

  return (data || []) as AuditLog[];
}
