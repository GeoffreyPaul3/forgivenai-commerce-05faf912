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

    // Backward compatibility guarantee: If user is admin and has no positions, grant all permissions and assign default Managing Director context
    if (isAdmin && (positions.length === 0 || permissionSet.size === 0)) {
      const { data: allPerms } = await supabase.from("permissions").select("code");
      (allPerms || []).forEach((p: any) => permissionSet.add(p.code));
      permissionSet.add("all.manage");

      if (positions.length === 0) {
        positions = [
          {
            id: "default-md-id",
            code: "managing_director",
            name: "Managing Director",
            description: "Default full executive authority for Admin identity",
          },
        ];
      }
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
