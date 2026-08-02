import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEnterpriseRBAC } from "@/hooks/useEnterpriseRBAC";
import { ExecutiveWorkspace } from "@/pages/dashboard/workspaces/ExecutiveWorkspace";
import { FinanceWorkspace } from "@/pages/dashboard/workspaces/FinanceWorkspace";
import { OperationsWorkspace } from "@/pages/dashboard/workspaces/OperationsWorkspace";
import { FulfillmentWorkspace } from "@/pages/dashboard/workspaces/FulfillmentWorkspace";
import { BusinessDevelopmentWorkspace } from "@/pages/dashboard/workspaces/BusinessDevelopmentWorkspace";
import { ShieldCheck, BarChart3, Package, Truck, Store, Layers } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const WORKSPACE_COMPONENTS: Record<string, React.FC> = {
  executive_workspace: ExecutiveWorkspace,
  finance_workspace: FinanceWorkspace,
  operations_workspace: OperationsWorkspace,
  fulfillment_workspace: FulfillmentWorkspace,
  biz_dev_workspace: BusinessDevelopmentWorkspace,
};

const WORKSPACE_ICONS: Record<string, any> = {
  executive_workspace: ShieldCheck,
  finance_workspace: BarChart3,
  operations_workspace: Package,
  fulfillment_workspace: Truck,
  biz_dev_workspace: Store,
};

const ROUTE_TO_WORKSPACE_CODE: Record<string, string> = {
  "/dashboard/workspace/executive": "executive_workspace",
  "/dashboard/workspace/finance": "finance_workspace",
  "/dashboard/workspace/operations": "operations_workspace",
  "/dashboard/workspace/fulfillment": "fulfillment_workspace",
  "/dashboard/workspace/bizdev": "biz_dev_workspace",
};

export const EnterpriseAdminPortal: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { visibleWorkspaces, positions, isLoading } = useEnterpriseRBAC();

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-8">
        <div className="text-center space-y-2 font-body text-sm text-muted-foreground">
          <Layers className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p>Composing Enterprise Admin Portal...</p>
        </div>
      </div>
    );
  }

  // Determine active workspace code based on current URL path
  const currentPath = location.pathname;
  const matchedCode = ROUTE_TO_WORKSPACE_CODE[currentPath];
  
  const currentTab = visibleWorkspaces.some((w) => w.code === matchedCode)
    ? matchedCode
    : visibleWorkspaces[0]?.code || "executive_workspace";

  const handleTabChange = (code: string) => {
    const ws = visibleWorkspaces.find((w) => w.code === code);
    if (ws && ws.navigationNodes[0]?.url) {
      navigate(ws.navigationNodes[0].url);
    }
  };

  const primaryPositionName = positions[0]?.name || "Managing Director";

  return (
    <div className="space-y-6">
      {/* Enterprise Workspace Navigation Bar */}
      {visibleWorkspaces.length > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-body font-semibold">Active Position:</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
              {primaryPositionName}
            </span>
          </div>

          <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full sm:w-auto">
            <TabsList className="bg-muted/60 p-1 flex-wrap h-auto">
              {visibleWorkspaces.map((ws) => {
                const Icon = WORKSPACE_ICONS[ws.code] || ShieldCheck;
                return (
                  <TabsTrigger
                    key={ws.code}
                    value={ws.code}
                    className="text-xs font-semibold gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{ws.title}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Render Selected Dynamic Workspace */}
      <div>
        {visibleWorkspaces.map((ws) => {
          const Component = WORKSPACE_COMPONENTS[ws.code] || ExecutiveWorkspace;
          if (ws.code !== currentTab) return null;
          return <Component key={ws.code} />;
        })}
      </div>
    </div>
  );
};

export default EnterpriseAdminPortal;
