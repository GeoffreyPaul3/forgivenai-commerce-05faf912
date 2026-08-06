/**
 * Enterprise Creative OS — Studio Registry
 * 
 * Multi-brand registry mapping brand IDs to their active flagship studio blueprint.
 * FSC is brand 0. Future brands (e.g. Nike, Apple) slot in without touching existing code.
 */

import { FlagshipStudioBlueprint, FSCFlagshipBlueprintV1 } from "./studio.blueprint.ts";

export interface BrandEntry {
  brandId: string;
  brandName: string;
  activeFlagshipVersion: string;
  studios: Record<string, FlagshipStudioBlueprint>;
}

const FSC_BLUEPRINT_V1 = new FSCFlagshipBlueprintV1();

export const BrandStudioRegistry: Record<string, BrandEntry> = {
  FSC: {
    brandId: "FSC",
    brandName: "Forgiven Shopping Centre",
    activeFlagshipVersion: "FSC_FLAGSHIP_STUDIO_V1",
    studios: {
      "FSC_FLAGSHIP_STUDIO_V1": FSC_BLUEPRINT_V1,
    }
  }
};

/**
 * Resolves the active FlagshipStudioBlueprint for a given brandId.
 * Defaults to FSC Flagship V1 if brandId is unknown or omitted.
 */
export function resolveBlueprint(brandId: string = "FSC"): FlagshipStudioBlueprint {
  const brand = BrandStudioRegistry[brandId?.toUpperCase()] || BrandStudioRegistry["FSC"];
  const activeVersion = brand.activeFlagshipVersion;
  return brand.studios[activeVersion] || FSC_BLUEPRINT_V1;
}
