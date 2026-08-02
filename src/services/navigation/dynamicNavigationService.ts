import {
  LayoutDashboard,
  ShoppingBag,
  CreditCard,
  Users,
  MessageSquare,
  Video,
  Truck,
  ShieldCheck,
  Store,
  BarChart3,
  Bot,
  Settings,
  DollarSign,
  Package,
  FileText,
  Sparkles,
  LucideIcon,
} from "lucide-react";
import { getVisibleApplications } from "@/services/registries/applicationRegistry";
import type { AppType, AppPlacement, ApplicationModule } from "@/types/rbac";

export interface MenuItem {
  code: string;
  title: string;
  url: string;
  icon: LucideIcon;
  type: AppType;
  placement: AppPlacement;
  /** Code reference to a NavigationGroupDefinition */
  navigationGroup: string;
  children?: ApplicationModule[];
}

/**
 * ICON_MAP — resolves string icon keys from registries to Lucide components.
 *
 * Exported so consuming components (AdminSidebar, child item renderers)
 * can resolve icons without re-importing from lucide-react directly.
 *
 * Add an import + entry here whenever a new icon key is used in any registry.
 */
export const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  ShoppingBag,
  CreditCard,
  Users,
  MessageSquare,
  Video,
  Truck,
  ShieldCheck,
  Store,
  BarChart3,
  Bot,
  Settings,
  DollarSign,
  Package,
  FileText,
  Sparkles,
};

/**
 * getDynamicMenuItems — pure registry mapper for sidebar navigation.
 *
 * Pipeline:
 *   1. getVisibleApplications() — permission filter over APPLICATION_REGISTRY
 *   2. Filter placement === "sidebar" — exclude workspace-only and hidden apps
 *   3. Map each to a typed MenuItem with icon resolved to a LucideIcon component
 *
 * For command palette / AI discovery / global search, call
 * getVisibleApplications() from applicationRegistry directly — it returns
 * all permission-visible apps regardless of placement.
 */
export function getDynamicMenuItems(userPermissions: Set<string>): MenuItem[] {
  return getVisibleApplications(userPermissions)
    .filter((app) => app.placement === "sidebar")
    .map((app) => ({
      code: app.code,
      title: app.title,
      url: app.route,
      icon: ICON_MAP[app.icon] ?? LayoutDashboard,
      type: app.type,
      placement: app.placement,
      navigationGroup: app.navigationGroup,
      children: app.children,
    }));
}
