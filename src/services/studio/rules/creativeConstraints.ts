import { AssetId } from "../types/types";

export interface CreativeConstraintRule {
  assetId: AssetId;
  incompatibleAssetIds: AssetId[];
  reason: string;
}

export const CreativeConstraintsRules: CreativeConstraintRule[] = [
  {
    assetId: "PRULE_JEWELRY_001",
    incompatibleAssetIds: ["ENV_OUTDOOR_TERRACE_004", "COMP_EDITORIAL_003"],
    reason: "Jewelry requires controlled studio macro environments; uncontrolled outdoor wind/lighting causes visual distortion."
  },
  {
    assetId: "ENV_LUXURY_WHITE_002",
    incompatibleAssetIds: ["VAR_GOLDEN_HOUR_006", "VAR_EVENING_002"],
    reason: "White Cyclorama is strictly daylight 5600K calibrated; warm tungsten or golden hour invalidates color accuracy."
  },
  {
    assetId: "BRAND_BACKLIT_MAGENTA_003",
    incompatibleAssetIds: ["ENV_LUXURY_WHITE_002"],
    reason: "Backlit neon magenta logo requires dark fluted background, not a seamless white cyclorama sweep."
  }
];

export function validateCreativeConstraints(selectedAssetIds: AssetId[]): { valid: boolean; conflicts: string[] } {
  const conflicts: string[] = [];

  for (const rule of CreativeConstraintsRules) {
    if (selectedAssetIds.includes(rule.assetId)) {
      for (const incId of rule.incompatibleAssetIds) {
        if (selectedAssetIds.includes(incId)) {
          conflicts.push(`Constraint Conflict: Asset ${rule.assetId} is incompatible with ${incId}. Reason: ${rule.reason}`);
        }
      }
    }
  }

  return {
    valid: conflicts.length === 0,
    conflicts
  };
}
