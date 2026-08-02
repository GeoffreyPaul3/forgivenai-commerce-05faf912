import { WidgetDefinition } from "@/types/rbac";

export const ENTERPRISE_WIDGETS: WidgetDefinition[] = [
  {
    id: "exec_kpi_revenue",
    code: "exec_kpi_revenue",
    title: "Executive Revenue Intelligence",
    workspaceCode: "executive_workspace",
    requiredPermissions: ["intelligence.view"],
    priority: 1,
    recommendationProvider: "revenue_growth_provider",
  },
  {
    id: "exec_kpi_capacity",
    code: "exec_kpi_capacity",
    title: "Warehouse Capacity & Operations",
    workspaceCode: "executive_workspace",
    requiredPermissions: ["inventory.view"],
    priority: 2,
    recommendationProvider: "capacity_provider",
  },
  {
    id: "exec_kpi_treasury",
    code: "exec_kpi_treasury",
    title: "Treasury Reserve & Liquidity",
    workspaceCode: "executive_workspace",
    requiredPermissions: ["treasury.view"],
    priority: 3,
    recommendationProvider: "treasury_provider",
  },
  {
    id: "exec_kpi_vendor_health",
    code: "exec_kpi_vendor_health",
    title: "Vendor Response & Health Index",
    workspaceCode: "executive_workspace",
    requiredPermissions: ["vendors.view"],
    priority: 4,
    recommendationProvider: "vendor_sla_provider",
  },
  {
    id: "finance_kpi_profit",
    code: "finance_kpi_profit",
    title: "Net Profit & Margin Analysis",
    workspaceCode: "finance_workspace",
    requiredPermissions: ["finance.view"],
    priority: 1,
    recommendationProvider: "profit_margin_provider",
  },
  {
    id: "ops_kpi_dispatch",
    code: "ops_kpi_dispatch",
    title: "Dispatch Velocity & On-Time Delivery",
    workspaceCode: "operations_workspace",
    requiredPermissions: ["logistics.view"],
    priority: 1,
    recommendationProvider: "dispatch_velocity_provider",
  },
];

export function getVisibleWidgets(workspaceCode: string, userPermissions: Set<string>): WidgetDefinition[] {
  if (userPermissions.has("all.manage")) {
    return ENTERPRISE_WIDGETS.filter((w) => w.workspaceCode === workspaceCode);
  }

  return ENTERPRISE_WIDGETS.filter(
    (w) =>
      w.workspaceCode === workspaceCode &&
      w.requiredPermissions.every((perm) => userPermissions.has(perm))
  ).sort((a, b) => a.priority - b.priority);
}
