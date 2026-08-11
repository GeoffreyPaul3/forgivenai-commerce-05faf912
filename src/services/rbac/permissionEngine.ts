import { supabase } from "@/integrations/supabase/client";
import { StaffPosition, Permission } from "@/types/rbac";

export interface UserPermissionContext {
  userId: string;
  positions: StaffPosition[];
  permissions: Set<string>;
  isAdmin: boolean;
}

let cachedContext: UserPermissionContext | null = null;
let cachePromise: Promise<UserPermissionContext> | null = null;

export async function fetchUserPermissionContext(forceRefresh = false): Promise<UserPermissionContext> {
  if (cachedContext && !forceRefresh) {
    return cachedContext;
  }

  if (cachePromise && !forceRefresh) {
    return cachePromise;
  }

  cachePromise = (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const emptyContext: UserPermissionContext = {
        userId: "",
        positions: [],
        permissions: new Set(),
        isAdmin: false,
      };
      cachedContext = emptyContext;
      return emptyContext;
    }

    // Check user profile role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = profile?.role === "admin";

    // Fetch user positions
    const { data: userPosData } = await supabase
      .from("user_positions")
      .select("position_id, staff_positions(*)")
      .eq("user_id", user.id);

    let positions: StaffPosition[] = (userPosData || [])
      .map((up: any) => up.staff_positions)
      .filter(Boolean);

    const permissionSet = new Set<string>();

    if (positions.length > 0) {
      const positionIds = positions.map((p) => p.id);
      const { data: posPerms } = await supabase
        .from("position_permissions")
        .select("permissions(*)")
        .in("position_id", positionIds);

      (posPerms || []).forEach((pp: any) => {
        if (pp.permissions?.code) {
          permissionSet.add(pp.permissions.code);
        }
      });
    }

    // Unassigned Admin Policy: If user is admin but has NO assigned positions, default to Restricted / Unassigned access.
    // Full authority (Managing Director) is only granted when explicitly assigned via Staff Positions Management.
    if (isAdmin && positions.length === 0) {
      positions = [
        {
          id: "unassigned-admin-id",
          code: "unassigned",
          name: "Unassigned Admin",
          description: "Pending position assignment. Access restricted to baseline navigation.",
        },
      ];
      // Do NOT grant all.manage or full permissions. Permission set remains restricted.
    }


    const context: UserPermissionContext = {
      userId: user.id,
      positions,
      permissions: permissionSet,
      isAdmin,
    };

    cachedContext = context;
    cachePromise = null;
    return context;
  })();

  return cachePromise;
}

export function clearPermissionCache() {
  cachedContext = null;
  cachePromise = null;
}

export function hasPermission(permissionCode: string, context?: UserPermissionContext | null): boolean {
  const ctx = context || cachedContext;
  if (!ctx) return true; // Fail safe default for fast render before fetch
  if (ctx.permissions.has("all.manage")) return true;
  return ctx.permissions.has(permissionCode);
}

export function canViewTreasury(context?: UserPermissionContext | null): boolean {
  return hasPermission("treasury.view", context);
}

export function canApprovePricing(context?: UserPermissionContext | null): boolean {
  return hasPermission("pricing.override", context) || hasPermission("pricing.configure", context);
}

export function canReleaseBonus(context?: UserPermissionContext | null): boolean {
  return hasPermission("payments.approve", context);
}

export function canConfigurePlatform(context?: UserPermissionContext | null): boolean {
  return hasPermission("all.manage", context) || hasPermission("staff.manage", context);
}

export function canOverrideFundTransfer(context?: UserPermissionContext | null): boolean {
  return hasPermission("treasury.override", context);
}
