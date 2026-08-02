import { NavigationGroupDefinition } from "@/types/rbac";

/**
 * NAVIGATION GROUP REGISTRY
 *
 * Defines the ordered sections of the admin sidebar.
 * Groups are pure data — adding a new section requires only a new entry here.
 *
 * The sidebar renders only groups that have at least one permission-visible
 * application assigned to them, so empty groups are never shown.
 *
 * To add a new sidebar section: add one entry below. Nothing else changes.
 */
export const NAVIGATION_GROUPS: NavigationGroupDefinition[] = [
  { code: "executive",      title: "Executive",      priority: 0  },
  { code: "commerce",       title: "Commerce",       priority: 10 },
  { code: "operations",     title: "Operations",     priority: 20 },
  { code: "creative",       title: "Creative",       priority: 30 },
  { code: "finance",        title: "Finance",        priority: 40 },
  { code: "analytics",      title: "Analytics",      priority: 50 },
  { code: "administration", title: "Administration", priority: 60 },
  { code: "utilities",      title: "Utilities",      priority: 70 },
];
