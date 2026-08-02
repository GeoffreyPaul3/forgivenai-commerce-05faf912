import { WorkspaceDefinition } from "@/types/rbac";

export const ENTERPRISE_WORKSPACES: WorkspaceDefinition[] = [
  {
    id: "executive_workspace",
    code: "executive_workspace",
    title: "Executive Workspace",
    icon: "ShieldCheck",
    description: "Executive Intelligence, Financial & Treasury Intelligence, Decision Engine, Risk Engine & AI Executive Briefings.",
    requiredPermissions: ["intelligence.view", "all.manage"],
    priority: 1,
    navigationNodes: [
      { title: "Executive Overview", url: "/dashboard/workspace/executive", icon: "LayoutDashboard" },
      { title: "Decision Engine", url: "/dashboard/workspace/executive?tab=decision", icon: "Bot" },
      { title: "Risk & Approvals", url: "/dashboard/workspace/executive?tab=approvals", icon: "ShieldCheck" },
      { title: "Audit Trail", url: "/dashboard/workspace/executive?tab=audit", icon: "FileText" },
    ],
  },
  {
    id: "finance_workspace",
    code: "finance_workspace",
    title: "Finance Workspace",
    icon: "BarChart3",
    description: "Treasury Reserves, Expenses, Revenue, Profit Intelligence, Debt & Payout Disbursements.",
    requiredPermissions: ["finance.view", "treasury.view"],
    priority: 2,
    navigationNodes: [
      { title: "Treasury & Capital", url: "/dashboard/workspace/finance", icon: "CreditCard" },
      { title: "Profit Intelligence", url: "/dashboard/workspace/finance?tab=profit", icon: "TrendingUp" },
      { title: "Vendor Payouts", url: "/dashboard/workspace/finance?tab=payouts", icon: "DollarSign" },
      { title: "Financial Ledger", url: "/dashboard/workspace/finance?tab=ledger", icon: "FileSpreadsheet" },
    ],
  },
  {
    id: "operations_workspace",
    code: "operations_workspace",
    title: "Operations Workspace",
    icon: "Package",
    description: "Orders, Logistics, Warehouse Capacity, Inventory Management & Operational Alerts.",
    requiredPermissions: ["orders.view", "inventory.view", "logistics.view"],
    priority: 3,
    navigationNodes: [
      { title: "Operations Hub", url: "/dashboard/workspace/operations", icon: "LayoutDashboard" },
      { title: "Logistics & Courier", url: "/dashboard/workspace/operations?tab=logistics", icon: "Truck" },
      { title: "Warehouse Stock", url: "/dashboard/workspace/operations?tab=stock", icon: "Package" },
      { title: "Vendor SLA Intel", url: "/dashboard/workspace/operations?tab=vendor-sla", icon: "Store" },
    ],
  },
  {
    id: "fulfillment_workspace",
    code: "fulfillment_workspace",
    title: "Fulfillment Workspace",
    icon: "Truck",
    description: "Assigned Orders, Picking Lists, Packing Verification, Label Generation & Shipping Status.",
    requiredPermissions: ["fulfillment.manage", "orders.view"],
    priority: 4,
    navigationNodes: [
      { title: "Picking & Packing", url: "/dashboard/workspace/fulfillment", icon: "CheckSquare" },
      { title: "Dispatch Queue", url: "/dashboard/workspace/fulfillment?tab=dispatch", icon: "Send" },
      { title: "Label Printing", url: "/dashboard/workspace/fulfillment?tab=labels", icon: "Printer" },
    ],
  },
  {
    id: "biz_dev_workspace",
    code: "biz_dev_workspace",
    title: "Business Development Workspace",
    icon: "Store",
    description: "Vendor Recruitment, Growth Pipeline, Expansion Opportunities & Campaign Performance.",
    requiredPermissions: ["vendors.view", "bizdev.view"],
    priority: 5,
    navigationNodes: [
      { title: "Growth Pipeline", url: "/dashboard/workspace/bizdev", icon: "TrendingUp" },
      { title: "Vendor Recruitment", url: "/dashboard/workspace/bizdev?tab=recruitment", icon: "Store" },
      { title: "Campaign Intel", url: "/dashboard/workspace/bizdev?tab=campaigns", icon: "Video" },
    ],
  },
];

export function getVisibleWorkspaces(userPermissions: Set<string>): WorkspaceDefinition[] {
  if (userPermissions.has("all.manage")) {
    return ENTERPRISE_WORKSPACES;
  }

  return ENTERPRISE_WORKSPACES.filter((ws) =>
    ws.requiredPermissions.some((perm) => userPermissions.has(perm))
  ).sort((a, b) => a.priority - b.priority);
}
