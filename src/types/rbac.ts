export type PortalIdentity = "admin" | "vendor" | "agent" | "customer";

export type StaffPositionCode =
  | "managing_director"
  | "operations_manager"
  | "finance_officer"
  | "fulfillment_officer"
  | "biz_dev_manager";

export interface StaffPosition {
  id: string;
  code: StaffPositionCode | string;
  name: string;
  description: string | null;
  created_at?: string;
}

export type PermissionCategory =
  | "Executive"
  | "Orders"
  | "Products"
  | "Pricing"
  | "Treasury"
  | "Finance"
  | "Payments"
  | "Reports"
  | "Customers"
  | "Vendors"
  | "Inventory"
  | "Logistics"
  | "Fulfillment"
  | "Campaigns"
  | "Staff"
  | "Audit"
  | "Settings"
  | "Analytics"
  | "AI Intelligence"
  | "Decision Engine";

export type PermissionAction =
  | "View"
  | "Create"
  | "Edit"
  | "Approve"
  | "Delete"
  | "Override"
  | "Configure"
  | "Export";

export interface Permission {
  id: string;
  code: string;
  name: string;
  category: PermissionCategory;
  action: PermissionAction;
  description: string | null;
}

export interface UserPosition {
  user_id: string;
  position_id: string;
  assigned_by?: string | null;
  assigned_at?: string;
  staff_positions?: StaffPosition;
}

export type HighRiskWorkflowType =
  | "Pricing Override"
  | "Emergency Fund Transfer"
  | "Reserve Withdrawal"
  | "Bonus Release"
  | "Commission Override"
  | "Vendor Exclusivity"
  | "Large Refund"
  | "Strategic Expansion"
  | "Treasury Adjustment"
  | "Staff Termination"
  | "Debt Write-Off";

export interface ApprovalRequest {
  id: string;
  workflow_type: HighRiskWorkflowType;
  title: string;
  details: Record<string, any>;
  requester_id: string;
  requester_position?: string;
  approver_id?: string | null;
  status: "pending" | "approved" | "rejected";
  reason?: string | null;
  created_at: string;
  resolved_at?: string | null;
  requester_name?: string;
  approver_name?: string;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  actor_position?: string;
  permission_used?: string;
  module: string;
  action: string;
  old_value?: Record<string, any> | null;
  new_value?: Record<string, any> | null;
  reason?: string | null;
  approval_id?: string | null;
  ip_address?: string | null;
  device_info?: string | null;
  created_at: string;
  actor_name?: string;
}

export interface NavigationNode {
  title: string;
  url: string;
  icon: string;
  requiredPermission?: string;
  badge?: string | number;
}

export interface WorkspaceDefinition {
  id: string;
  code: string;
  title: string;
  icon: string;
  description: string;
  requiredPermissions: string[];
  navigationNodes: NavigationNode[];
  priority: number;
}

export interface WidgetDefinition {
  id: string;
  code: string;
  title: string;
  workspaceCode: string;
  requiredPermissions: string[];
  priority: number;
  dependencies?: string[];
  recommendationProvider?: string;
}
