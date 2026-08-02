import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchUserPermissionContext,
  clearPermissionCache,
  hasPermission,
  canViewTreasury,
  canApprovePricing,
  canReleaseBonus,
  canConfigurePlatform,
  canOverrideFundTransfer,
} from "@/services/rbac/permissionEngine";
import { getVisibleWorkspaces } from "@/services/registries/workspaceRegistry";
import { getDynamicMenuItems } from "@/services/navigation/dynamicNavigationService";

export function useEnterpriseRBAC() {
  const queryClient = useQueryClient();

  const { data: context, isLoading, refetch } = useQuery({
    queryKey: ["enterprise-rbac-context"],
    queryFn: async () => {
      return await fetchUserPermissionContext();
    },
    staleTime: 5 * 60 * 1000,
  });

  const permissions = context?.permissions ?? new Set<string>();
  const positions = context?.positions ?? [];
  const isAdmin = context?.isAdmin ?? false;

  const refreshPermissions = async () => {
    clearPermissionCache();
    await queryClient.invalidateQueries({ queryKey: ["enterprise-rbac-context"] });
    return refetch();
  };

  const visibleWorkspaces = getVisibleWorkspaces(permissions);
  const dynamicMenuItems = getDynamicMenuItems(permissions);

  return {
    isLoading,
    context,
    positions,
    permissions,
    isAdmin,
    visibleWorkspaces,
    dynamicMenuItems,
    hasPermission: (code: string) => hasPermission(code, context),
    canViewTreasury: () => canViewTreasury(context),
    canApprovePricing: () => canApprovePricing(context),
    canReleaseBonus: () => canReleaseBonus(context),
    canConfigurePlatform: () => canConfigurePlatform(context),
    canOverrideFundTransfer: () => canOverrideFundTransfer(context),
    refreshPermissions,
  };
}
