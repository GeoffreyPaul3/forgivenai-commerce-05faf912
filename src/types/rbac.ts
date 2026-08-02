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
  | "Content"
  | "UGC"
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
  | "Export"
  | "Generate";

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

/** Functional classification of an enterprise application */
export type AppType = "workspace" | "module" | "utility";

/**
 * Where this application surfaces in the platform UI.
 *   "sidebar"   — visible in the admin sidebar navigation
 *   "workspace" — embedded inside a workspace panel (not in sidebar)
 *   "hidden"    — background services or future capabilities not yet surfaced
 */
export type AppPlacement = "sidebar" | "workspace" | "hidden";

/**
 * A named section in the sidebar navigation.
 * Groups are pure data — no logic lives here. The sidebar reads
 * NAVIGATION_GROUPS to determine section labels and render order.
 */
export interface NavigationGroupDefinition {
  /** Stable code — used as the foreign key in ApplicationDefinition.navigationGroup */
  code: string;
  /** Display label rendered as a SidebarGroupLabel */
  title: string;
  /** Lower = higher in the sidebar */
  priority: number;
}

/**
 * A child page/module within an application.
 * Enables nested navigation (e.g. Content Studio → AI Copywriter, Publishing…)
 * and powers the command palette and AI Assistant tool discovery.
 */
export interface ApplicationModule {
  code: string;
  title: string;
  route: string;
  /** OR logic: any one match grants access */
  requiredPermissions: string[];
  /** Key into the shared ICON_MAP */
  icon?: string;
}

/**
 * Enterprise Application Definition — the central platform catalog entry.
 *
 * One definition drives all subsystems:
 *   Sidebar navigation    — placement: "sidebar" + navigationGroup
 *   Command palette       — title + searchKeywords + children
 *   AI Assistant tools    — title + description + route + children
 *   Global search         — title + description + searchKeywords
 *   Breadcrumb generation — title + route hierarchy
 *   Route guards          — requiredPermissions
 *   Workspace composition — type: "workspace"
 *   Feature flags         — featureFlag (future)
 *   Usage analytics       — code as stable key (future)
 *   Favorites / pinning   — code + title (future)
 */
export interface ApplicationDefinition {
  /** Unique stable identifier — the platform catalog key */
  code: string;
  title: string;
  description?: string;
  /** Key into the shared ICON_MAP in dynamicNavigationService */
  icon: string;
  /** Primary route this application renders at */
  route: string;
  /** Functional classification */
  type: AppType;
  /** Where this app surfaces — sidebar | workspace | hidden */
  placement: AppPlacement;
  /**
   * Code reference to a NavigationGroupDefinition.
   * Determines which sidebar section this app appears under.
   */
  navigationGroup: string;
  /** OR logic: any one match grants access. Empty [] = always visible. */
  requiredPermissions: string[];
  /** Lower = higher within its navigation group */
  priority: number;
  /** Child modules/pages — powers nested nav, command palette & AI discovery */
  children?: ApplicationModule[];
  /** Keywords for global search and AI tool discovery */
  searchKeywords?: string[];
}
