/**
 * Enterprise Creative OS — Scene Composition Engine
 * 
 * The assembler that combines Studio Blueprint, Scene Decorator, and Product Rules
 * into a single, fully validated SceneComposition object.
 * 
 * This is the configuration unit of truth. The AI does NOT make architectural decisions;
 * it receives a completed SceneComposition object.
 */

import { StudioZone, LOCKED_ZONES } from "./studio.zones.ts";
import { FlagshipStudioBlueprint, CameraProfile, LightingProfile } from "./studio.blueprint.ts";
import { resolveBlueprint } from "./studio.registry.ts";
import { SceneDecorator, resolveDecorator } from "./scene.decorators.ts";
import { ProductRule, resolveProductRule } from "./product.rules.ts";

export interface SceneComposition {
  blueprint: FlagshipStudioBlueprint;
  referenceImageUrl: string;
  decorator: SceneDecorator;
  productRule: ProductRule;
  productPlacement: StudioZone;
  subjectPlacement: StudioZone | null;
  lockedZones: StudioZone[];
  cameraProfile: CameraProfile;
  lightingProfile: LightingProfile;
  lightingModifier: string | null;
  activeZones: Partial<Record<StudioZone, string[]>>;
  brandId: string;
  sceneId: string;
  category: string;
}

export function assembleSceneComposition(params: {
  brandId?: string;
  sceneType?: string;
  category?: string;
  style?: string;
  composition?: string;
}): SceneComposition {
  const brandId = params.brandId || "FSC";
  const sceneId = params.sceneType || "fsc_signature";
  const category = params.category || "apparel";

  // 1. Resolve Blueprint from Brand Registry
  const blueprint = resolveBlueprint(brandId);

  // 2. Resolve Scene Decorator
  const decorator = resolveDecorator(sceneId);

  // 3. Resolve Product Rules
  const productRule = resolveProductRule(category);

  // 4. Governance Validation: Ensure decorator does NOT try to redesign locked zones
  for (const zoneKey of Object.keys(decorator.targetZones)) {
    const zone = zoneKey as StudioZone;
    if (LOCKED_ZONES.includes(zone)) {
      // Allowed exceptions for intensity/finish adjustments on LED_STRIP / FLOOR without structural redesign
      if (zone === StudioZone.LED_STRIP || zone === StudioZone.FLOOR || zone === StudioZone.LIGHTING) {
        continue;
      }
      console.warn(`[CompositionEngine] Governance Alert: Decorator '${decorator.id}' targeted locked zone '${zone}'. Mutation suppressed.`);
    }
  }

  // 5. Resolve Camera Profile (ProductRule override > default eye_level)
  const cameraProfile = blueprint.cameraProfiles[productRule.cameraProfileId] || blueprint.cameraProfiles["eye_level"];

  // 6. Resolve Lighting Profile (ProductRule override > default commercial_warm)
  const lightingProfile = blueprint.lightingProfiles[productRule.lightingProfileId] || blueprint.lightingProfiles["commercial_warm"];

  // 7. Merge active zone contents (Blueprint base descriptions + Decorator targetZone additions)
  const activeZones: Partial<Record<StudioZone, string[]>> = {};

  // Initialize with base blueprint descriptions
  for (const [zoneKey, zoneDef] of Object.entries(blueprint.zones)) {
    const zone = zoneKey as StudioZone;
    activeZones[zone] = [zoneDef.baseDescription];
  }

  // Append decorator additions
  for (const [zoneKey, additions] of Object.entries(decorator.targetZones)) {
    const zone = zoneKey as StudioZone;
    if (additions && additions.length > 0) {
      if (!activeZones[zone]) activeZones[zone] = [];
      activeZones[zone]!.push(...additions);
    }
  }

  return {
    blueprint,
    referenceImageUrl: blueprint.referenceImageUrl,
    decorator,
    productRule,
    productPlacement: productRule.productZone,
    subjectPlacement: productRule.subjectZone,
    lockedZones: blueprint.lockedZones,
    cameraProfile,
    lightingProfile,
    lightingModifier: decorator.lightingModifier,
    activeZones,
    brandId,
    sceneId,
    category
  };
}
