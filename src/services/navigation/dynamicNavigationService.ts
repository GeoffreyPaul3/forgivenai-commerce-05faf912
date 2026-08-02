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
  LucideIcon,
} from "lucide-react";
import { getVisibleWorkspaces } from "@/services/registries/workspaceRegistry";

export interface MenuItem {
  title: string;
  url: string;
  icon: LucideIcon;
  category?: string;
}

const ICON_MAP: Record<string, LucideIcon> = {
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
};

export function getDynamicMenuItems(userPermissions: Set<string>): MenuItem[] {
  const items: MenuItem[] = [
    { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
  ];

  const visibleWorkspaces = getVisibleWorkspaces(userPermissions);

  visibleWorkspaces.forEach((ws) => {
    const mainNode = ws.navigationNodes[0];
    if (mainNode) {
      items.push({
        title: ws.title,
        url: mainNode.url,
        icon: ICON_MAP[ws.icon] || LayoutDashboard,
      });
    }
  });

  // Base Admin Modules based on permission
  if (userPermissions.has("all.manage") || userPermissions.has("products.view")) {
    items.push({ title: "Products", url: "/dashboard/products", icon: ShoppingBag });
  }
  if (userPermissions.has("all.manage") || userPermissions.has("orders.view")) {
    items.push({ title: "Orders", url: "/dashboard/orders", icon: CreditCard });
  }
  if (userPermissions.has("all.manage") || userPermissions.has("customers.view")) {
    items.push({ title: "Customers", url: "/dashboard/customers", icon: Users });
  }
  if (userPermissions.has("all.manage") || userPermissions.has("logistics.view")) {
    items.push({ title: "Courier Operations", url: "/dashboard/courier", icon: Truck });
  }
  if (userPermissions.has("all.manage") || userPermissions.has("vendors.view")) {
    items.push({ title: "Vendors", url: "/dashboard/vendors", icon: Store });
  }
  if (userPermissions.has("all.manage") || userPermissions.has("staff.manage")) {
    items.push({ title: "Staff & RBAC", url: "/dashboard/settings?tab=rbac", icon: ShieldCheck });
  }
  if (userPermissions.has("all.manage") || userPermissions.has("finance.view")) {
    items.push({ title: "Profit Intel", url: "/dashboard/profit-intel", icon: BarChart3 });
  }

  items.push({ title: "AI Assistant", url: "/dashboard/assistant", icon: Bot });
  items.push({ title: "Settings", url: "/dashboard/settings", icon: Settings });

  return items;
}
