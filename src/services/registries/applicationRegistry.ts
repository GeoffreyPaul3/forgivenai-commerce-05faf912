import { ApplicationDefinition } from "@/types/rbac";

/**
 * ENTERPRISE APPLICATION REGISTRY
 *
 * The single source of truth for every application in the platform.
 *
 * One entry drives all subsystems:
 *   Sidebar navigation       placement: "sidebar" + navigationGroup
 *   Command palette          title + searchKeywords + children
 *   AI Assistant tools       title + description + route + children
 *   Global search            title + description + searchKeywords
 *   Breadcrumb generation    title + route
 *   Route guards             requiredPermissions
 *   Workspace composition    type: "workspace"
 *
 * TO ADD A NEW APPLICATION: add one entry below. Nothing else changes.
 *
 * Priority bands:
 *   0        — Overview anchor (always first)
 *   10–90    — Workspace shortcuts
 *   100–199  — Commerce modules
 *   140–199  — Operations modules
 *   200–299  — Creative modules
 *   300–399  — Intelligence & Finance modules
 *   900–920  — Pinned utilities (always visible)
 */
export const APPLICATION_REGISTRY: ApplicationDefinition[] = [

  // ─── Overview ─────────────────────────────────────────────────────────────

  {
    code: "overview",
    title: "Overview",
    description: "Enterprise dashboard with live KPIs, recent activity, and quick actions.",
    icon: "LayoutDashboard",
    route: "/dashboard",
    type: "module",
    placement: "sidebar",
    navigationGroup: "executive",
    requiredPermissions: [],
    priority: 0,
    searchKeywords: ["home", "overview", "dashboard", "summary", "kpi"],
  },

  // ─── Workspaces (priority 10–90) ──────────────────────────────────────────

  {
    code: "workspace_executive",
    title: "Executive Workspace",
    description: "Executive Intelligence, Financial & Treasury Intelligence, Decision Engine, Risk Engine & AI Executive Briefings.",
    icon: "ShieldCheck",
    route: "/dashboard/workspace/executive",
    type: "workspace",
    placement: "sidebar",
    navigationGroup: "executive",
    requiredPermissions: ["intelligence.view", "all.manage"],
    priority: 10,
    searchKeywords: ["executive", "intelligence", "decision engine", "risk", "approvals", "audit", "briefing"],
  },
  {
    code: "workspace_finance",
    title: "Finance Workspace",
    description: "Treasury Reserves, Expenses, Revenue, Profit Intelligence, Debt & Payout Disbursements.",
    icon: "BarChart3",
    route: "/dashboard/workspace/finance",
    type: "workspace",
    placement: "sidebar",
    navigationGroup: "finance",
    requiredPermissions: ["finance.view", "treasury.view"],
    priority: 20,
    searchKeywords: ["finance", "treasury", "reserves", "payouts", "ledger", "profit", "debt"],
  },
  {
    code: "workspace_operations",
    title: "Operations Workspace",
    description: "Orders, Logistics, Warehouse Capacity, Inventory Management & Operational Alerts.",
    icon: "Package",
    route: "/dashboard/workspace/operations",
    type: "workspace",
    placement: "sidebar",
    navigationGroup: "operations",
    requiredPermissions: ["orders.view", "inventory.view", "logistics.view"],
    priority: 30,
    searchKeywords: ["operations", "logistics", "warehouse", "inventory", "stock", "sla", "alerts"],
  },
  {
    code: "workspace_fulfillment",
    title: "Fulfillment Workspace",
    description: "Assigned Orders, Picking Lists, Packing Verification, Label Generation & Shipping Status.",
    icon: "Truck",
    route: "/dashboard/workspace/fulfillment",
    type: "workspace",
    placement: "sidebar",
    navigationGroup: "operations",
    requiredPermissions: ["fulfillment.manage", "orders.view"],
    priority: 40,
    searchKeywords: ["fulfillment", "picking", "packing", "shipping", "labels", "dispatch", "parcels"],
  },
  {
    code: "workspace_bizdev",
    title: "Business Dev Workspace",
    description: "Vendor Recruitment, Growth Pipeline, Expansion Opportunities & Campaign Performance.",
    icon: "Store",
    route: "/dashboard/workspace/bizdev",
    type: "workspace",
    placement: "sidebar",
    navigationGroup: "commerce",
    requiredPermissions: ["vendors.view", "bizdev.view"],
    priority: 50,
    searchKeywords: ["business development", "bizdev", "growth", "recruitment", "pipeline", "expansion", "campaign"],
  },

  // ─── Commerce Modules (priority 100–139) ──────────────────────────────────

  {
    code: "products",
    title: "Products",
    description: "Full product catalog management — pricing, stock, images, and vendor assignment.",
    icon: "ShoppingBag",
    route: "/dashboard/products",
    type: "module",
    placement: "sidebar",
    navigationGroup: "commerce",
    requiredPermissions: ["products.view"],
    priority: 100,
    searchKeywords: ["products", "catalog", "sku", "pricing", "stock", "images", "vendor"],
  },
  {
    code: "orders",
    title: "Orders",
    description: "Customer and enterprise order management with dispatch status and overrides.",
    icon: "CreditCard",
    route: "/dashboard/orders",
    type: "module",
    placement: "sidebar",
    navigationGroup: "commerce",
    requiredPermissions: ["orders.view"],
    priority: 110,
    searchKeywords: ["orders", "transactions", "purchases", "dispatch", "status", "override"],
  },
  {
    code: "customers",
    title: "Customers",
    description: "Customer profiles, purchase histories, and engagement data.",
    icon: "Users",
    route: "/dashboard/customers",
    type: "module",
    placement: "sidebar",
    navigationGroup: "commerce",
    requiredPermissions: ["customers.view"],
    priority: 120,
    searchKeywords: ["customers", "buyers", "profiles", "crm", "contacts", "engagement"],
  },
  {
    code: "conversations",
    title: "Conversations",
    description: "Real-time WhatsApp customer conversations, AI sales assistant chats, and order inquiries.",
    icon: "MessageSquare",
    route: "/dashboard/conversations",
    type: "module",
    placement: "sidebar",
    navigationGroup: "commerce",
    requiredPermissions: ["customers.view"],
    priority: 125,
    searchKeywords: ["conversations", "whatsapp", "chat", "messages", "support", "inbox"],
  },
  {
    code: "vendors",
    title: "Vendors",
    description: "Vendor directory, performance metrics, approvals, and exclusivity contracts.",
    icon: "Store",
    route: "/dashboard/vendors",
    type: "module",
    placement: "sidebar",
    navigationGroup: "commerce",
    requiredPermissions: ["vendors.view"],
    priority: 130,
    searchKeywords: ["vendors", "suppliers", "partners", "marketplace", "sla", "performance"],
  },
  {
    code: "agents",
    title: "Agents",
    description: "Manage commission sales agents, referrals, tiers, and partner payouts.",
    icon: "ShieldCheck",
    route: "/dashboard/agents",
    type: "module",
    placement: "sidebar",
    navigationGroup: "commerce",
    requiredPermissions: ["staff.manage"],
    priority: 135,
    searchKeywords: ["agents", "sales agents", "commission", "referrals", "partners"],
  },


  // ─── Operations Modules (priority 140–199) ────────────────────────────────

  {
    code: "courier",
    title: "Courier Operations",
    description: "Track courier partners, delivery performance, and last-mile dispatch.",
    icon: "Truck",
    route: "/dashboard/courier",
    type: "module",
    placement: "sidebar",
    navigationGroup: "operations",
    requiredPermissions: ["logistics.view"],
    priority: 140,
    searchKeywords: ["courier", "delivery", "logistics", "shipping", "last-mile", "tracking", "dispatch"],
  },

  // ─── Creative Modules (priority 200–299) ──────────────────────────────────

  {
    code: "content_studio",
    title: "Content Studio",
    description: "Author, manage, and publish branded content across campaigns, product pages, and channels.",
    icon: "Video",
    route: "/dashboard/content",
    type: "module",
    placement: "sidebar",
    navigationGroup: "creative",
    requiredPermissions: ["content.view"],
    priority: 200,
    searchKeywords: ["content", "studio", "articles", "copy", "brand", "publishing", "campaigns", "images", "video", "ugc", "user generated content", "actors", "scripts"],
    children: [
      { code: "content_dashboard",    title: "Dashboard",        route: "/dashboard/content",                icon: "LayoutDashboard", requiredPermissions: ["content.view"]    },
      { code: "content_campaigns",    title: "Campaigns",        route: "/dashboard/content?tab=campaigns",  icon: "BarChart3",       requiredPermissions: ["content.view"]    },
      { code: "content_brand_assets", title: "Brand Assets",     route: "/dashboard/content?tab=assets",     icon: "ShoppingBag",     requiredPermissions: ["content.view"]    },
      { code: "content_ai_copy",      title: "AI Copywriter",    route: "/dashboard/content?tab=ai-copy",    icon: "Bot",             requiredPermissions: ["content.create"]  },
      { code: "content_image_studio", title: "Image Studio",     route: "/dashboard/content?tab=images",     icon: "Sparkles",        requiredPermissions: ["content.create"]  },
      { code: "content_video_studio", title: "Video Studio",     route: "/dashboard/content?tab=video",      icon: "Video",           requiredPermissions: ["content.create"]  },
      { code: "content_ugc_studio",   title: "UGC Studio",       route: "/dashboard/content?tab=ugc",        icon: "Sparkles",        requiredPermissions: ["ugc.view", "content.view"] },
      { code: "content_publishing",   title: "Publishing",       route: "/dashboard/content?tab=publishing", icon: "FileText",        requiredPermissions: ["content.publish"] },
      { code: "content_analytics",    title: "Analytics",        route: "/dashboard/content?tab=analytics",  icon: "BarChart3",       requiredPermissions: ["content.view"]    },
    ],
  },

  // ─── Intelligence & Finance Modules (priority 300–399) ────────────────────

  {
    code: "profit_intelligence",
    title: "Profit Intelligence",
    description: "Net profit analysis, margin trends, category breakdown, and financial forecasting.",
    icon: "BarChart3",
    route: "/dashboard/profit-intel",
    type: "module",
    placement: "sidebar",
    navigationGroup: "finance",
    requiredPermissions: ["finance.view"],
    priority: 300,
    searchKeywords: ["profit", "intelligence", "margins", "revenue", "financial analysis", "forecasting", "p&l"],
  },

  // ─── Administration (priority 400–499) ───────────────────────────────────

  {
    code: "staff_rbac",
    title: "Staff & RBAC",
    description: "Manage staff positions, assign granular permissions, and review access control.",
    icon: "ShieldCheck",
    route: "/dashboard/settings?tab=rbac",
    type: "utility",
    placement: "sidebar",
    navigationGroup: "administration",
    requiredPermissions: ["staff.manage"],
    priority: 400,
    searchKeywords: ["staff", "rbac", "permissions", "positions", "access control", "roles", "assign"],
  },

  // ─── Pinned Utilities — always visible (priority 900+) ───────────────────

  {
    code: "ai_assistant",
    title: "AI Assistant",
    description: "Conversational AI for enterprise queries, recommendations, and task automation.",
    icon: "Bot",
    route: "/dashboard/assistant",
    type: "utility",
    placement: "sidebar",
    navigationGroup: "utilities",
    requiredPermissions: [],
    priority: 900,
    searchKeywords: ["ai", "assistant", "chat", "recommendations", "automation", "ask"],
  },
  {
    code: "settings",
    title: "Settings",
    description: "Platform configuration, integrations, billing, and preferences.",
    icon: "Settings",
    route: "/dashboard/settings",
    type: "utility",
    placement: "sidebar",
    navigationGroup: "utilities",
    requiredPermissions: [],
    priority: 910,
    searchKeywords: ["settings", "configuration", "preferences", "integrations", "billing"],
  },
];

/**
 * Returns all permission-visible applications regardless of placement.
 *
 * Use this for:
 *   - Command palette
 *   - AI Assistant tool discovery
 *   - Global search
 *   - Route guards
 *   - Workspace composition
 *
 * For sidebar-only items, use getDynamicMenuItems() from dynamicNavigationService.
 */
export function getVisibleApplications(
  userPermissions: Set<string>
): ApplicationDefinition[] {
  const hasAll = userPermissions.has("all.manage");
  return APPLICATION_REGISTRY
    .filter(
      (app) =>
        app.requiredPermissions.length === 0 ||
        hasAll ||
        app.requiredPermissions.some((p) => userPermissions.has(p))
    )
    .sort((a, b) => a.priority - b.priority);
}
