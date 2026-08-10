/**
 * Enterprise Creative OS — Product Rules Registry
 * 
 * Category-driven rules governing how products are placed, framed, and lit in the studio.
 * The AI does NOT decide camera or lighting for a product category — the registry does.
 */

import { StudioZone } from "./studio.zones.ts";

export interface ProductRule {
  categoryName: string;
  productZone: StudioZone;
  subjectZone: StudioZone | null;
  cameraProfileId: string;
  lightingProfileId: string;
  depthOfField: "shallow" | "medium" | "deep";
  allowsModel: boolean;
  compositionRules: string[];
}

export const ProductRuleRegistry: Record<string, ProductRule> = {
  apparel: {
    categoryName: "apparel",
    productZone: StudioZone.SUBJECT,
    subjectZone: StudioZone.SUBJECT,
    cameraProfileId: "waist_level_85mm",
    lightingProfileId: "editorial_octabox",
    depthOfField: "medium",
    allowsModel: true,
    compositionRules: [
      "FULL BODY SHOT: Must be a full-length head-to-toe shot showing complete outfit including legs and shoes.",
      "Model positioned in Left or Right Safe Zone, arch wall visible and unobstructed.",
      "Garment tailored perfectly to model with physical fabric drape."
    ]
  },
  clothing: {
    categoryName: "clothing",
    productZone: StudioZone.SUBJECT,
    subjectZone: StudioZone.SUBJECT,
    cameraProfileId: "waist_level_85mm",
    lightingProfileId: "editorial_octabox",
    depthOfField: "medium",
    allowsModel: true,
    compositionRules: [
      "FULL BODY SHOT: Must be a full-length head-to-toe shot showing complete outfit including legs and shoes.",
      "Model positioned in Left or Right Safe Zone, arch wall visible and unobstructed.",
      "Garment tailored perfectly to model with physical fabric drape."
    ]
  },
  jewelry: {
    categoryName: "jewelry",
    productZone: StudioZone.PODIUM,
    subjectZone: null,
    cameraProfileId: "macro_90mm",
    lightingProfileId: "hard_rim_macro",
    depthOfField: "shallow",
    allowsModel: false,
    compositionRules: [
      "Product placed centrally on polished cream travertine podium.",
      "Razor-sharp focus on metal brilliance, gemstone facets, and fine details.",
      "Shallow depth of field isolations with creamy studio background bokeh."
    ]
  },
  shoes: {
    categoryName: "shoes",
    productZone: StudioZone.PODIUM,
    subjectZone: null,
    cameraProfileId: "luxury_low_angle",
    lightingProfileId: "commercial_warm",
    depthOfField: "medium",
    allowsModel: false,
    compositionRules: [
      "Hero footwear placement on travertine pedestal surface.",
      "Low-angle camera (0.5m height) emphasizing silhouette, sole curvature, and material grain.",
      "Specular marble floor reflection in foreground."
    ]
  },
  footwear: {
    categoryName: "footwear",
    productZone: StudioZone.PODIUM,
    subjectZone: null,
    cameraProfileId: "luxury_low_angle",
    lightingProfileId: "commercial_warm",
    depthOfField: "medium",
    allowsModel: false,
    compositionRules: [
      "Hero footwear placement on travertine pedestal surface.",
      "Low-angle camera (0.5m height) emphasizing silhouette, sole curvature, and material grain.",
      "Specular marble floor reflection in foreground."
    ]
  },
  bags: {
    categoryName: "bags",
    productZone: StudioZone.PODIUM,
    subjectZone: null,
    cameraProfileId: "eye_level",
    lightingProfileId: "commercial_warm",
    depthOfField: "medium",
    allowsModel: false,
    compositionRules: [
      "Bag displayed upright on cream travertine pedestal.",
      "Clear presentation of hardware, leather grain texture, straps, and buckles.",
      "Eye-level 85mm prime lens perspective."
    ]
  },
  handbags: {
    categoryName: "handbags",
    productZone: StudioZone.PODIUM,
    subjectZone: null,
    cameraProfileId: "eye_level",
    lightingProfileId: "commercial_warm",
    depthOfField: "medium",
    allowsModel: false,
    compositionRules: [
      "Bag displayed upright on cream travertine pedestal.",
      "Clear presentation of hardware, leather grain texture, straps, and buckles.",
      "Eye-level 85mm prime lens perspective."
    ]
  },
  electronics: {
    categoryName: "electronics",
    productZone: StudioZone.PODIUM,
    subjectZone: null,
    cameraProfileId: "45_degree_50mm",
    lightingProfileId: "d50_neutral_precision",
    depthOfField: "deep",
    allowsModel: false,
    compositionRules: [
      "Device positioned at 45-degree angle on clean pedestal.",
      "D50 color precision lighting for true-to-life metallic and glass finishes.",
      "Zero screen glare, crisp bevel edge visibility."
    ]
  },
  cosmetics: {
    categoryName: "cosmetics",
    productZone: StudioZone.PODIUM,
    subjectZone: null,
    cameraProfileId: "macro_90mm",
    lightingProfileId: "commercial_warm",
    depthOfField: "shallow",
    allowsModel: false,
    compositionRules: [
      "Hero packaging arrangement on cream travertine stone.",
      "Soft directional key light highlighting bottle transparency and cap shine.",
      "Macro lens shallow depth of field."
    ]
  }
};

/**
 * Resolves a ProductRule for a given category string.
 * Defaults to 'apparel' if category is unmapped or contains clothing keywords.
 */
export function resolveProductRule(category: string = "apparel"): ProductRule {
  const norm = (category || "apparel").toLowerCase();
  for (const [key, rule] of Object.entries(ProductRuleRegistry)) {
    if (norm.includes(key)) return rule;
  }
  return ProductRuleRegistry["apparel"];
}
