/**
 * @deprecated capabilityRegistry.ts has been superseded by applicationRegistry.ts.
 *
 * The Enterprise Application Registry is the single source of truth for all
 * platform capabilities. Import from there instead:
 *
 *   import { APPLICATION_REGISTRY, getVisibleApplications }
 *     from "@/services/registries/applicationRegistry";
 *
 * This file exists only to avoid breaking any residual imports.
 */
export {
  APPLICATION_REGISTRY,
  getVisibleApplications,
} from "@/services/registries/applicationRegistry";

export type { ApplicationDefinition } from "@/types/rbac";
