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
      "Product placed centrally on polished white pedestal.",
      "Razor-sharp focus on metal brilliance, gemstone facets, and fine details.",
      "Shallow depth of field isolations with smooth studio background bokeh."
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
      "Hero footwear placement on white pedestal surface.",
      "Low-angle camera (0.5m height) emphasizing silhouette, sole curvature, and material grain.",
      "Specular white marble floor reflection in foreground."
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
      "Hero footwear placement on white pedestal surface.",
      "Low-angle camera (0.5m height) emphasizing silhouette, sole curvature, and material grain.",
      "Specular white marble floor reflection in foreground."
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
      "Bag displayed upright on white stone pedestal.",
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
      "Bag displayed upright on white stone pedestal.",
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
      "Device positioned at 45-degree angle on clean white pedestal.",
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
      "Hero packaging arrangement on white stone pedestal.",
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

// ════════════════════════════════════════════════════════════════════════════
//  PRODUCT STUDIO MODE — Category Classifiers
//
//  These are ADDITIVE. No existing code above is touched.
//  isProductStudioCategory() returns true for non-wearable physical products.
//  isLifestyleComposition() returns true when an explicit lifestyle/model
//  composition has been requested, overriding the product-only default.
// ════════════════════════════════════════════════════════════════════════════

/**
 * Non-wearable physical product categories that trigger Product Studio Mode.
 * Apparel and clothing keywords are intentionally excluded so they continue
 * through the existing VTON / fashion pipeline unchanged.
 */
export const PRODUCT_STUDIO_CATEGORIES = new Set([
  "handbag", "bag", "purse", "tote", "clutch", "satchel",
  "shoes", "shoe", "heels", "heel", "sneakers", "sneaker",
  "footwear", "boots", "boot", "loafer", "sandal", "sandals",
  "watch", "watches", "timepiece",
  "jewelry", "jewellery", "necklace", "ring", "rings",
  "earring", "earrings", "bracelet", "bangle", "pendant",
  "brooch", "cufflinks",
  "perfume", "fragrance", "cologne", "eau de parfum", "eau de toilette",
  "cosmetics", "cosmetic", "beauty", "skincare", "makeup", "lipstick",
  "bottle", "packaging", "box", "pouch",
  "accessory", "accessories", "sunglasses", "belt", "scarf", "hat",
  "wallet", "cardholder", "keychain",
  "electronics", "gadget", "candle", "homeware",
]);

/**
 * Returns true when the product category is a non-wearable physical product
 * that should be rendered with Product Studio Mode (product = hero, no model).
 */
export function isProductStudioCategory(category: string = ""): boolean {
  const norm = (category || "").toLowerCase().trim();
  if (!norm) return false;

  // Explicit fashion/wearable keywords always bypass Product Studio Mode
  const wearableKeywords = [
    "apparel", "clothing", "garment", "fashion", "dress", "suit",
    "shirt", "blouse", "top", "trousers", "pants", "skirt", "shorts",
    "jacket", "coat", "hoodie", "sweater", "jumper", "vest", "lingerie",
    "swimwear", "sportswear", "activewear", "uniform",
  ];
  if (wearableKeywords.some(w => norm.includes(w))) return false;

  // Check against the product studio category set
  for (const keyword of PRODUCT_STUDIO_CATEGORIES) {
    if (norm.includes(keyword)) return true;
  }
  return false;
}

/**
 * Composition names that explicitly request a lifestyle / model composition.
 * When one of these is active, the existing VTON pipeline is used even for
 * non-wearable products (e.g. a handbag lifestyle shot with a model).
 */
export const LIFESTYLE_COMPOSITIONS = new Set([
  "product_lifestyle",
  "lifestyle",
  "luxury handbag with packaging",
  "product with model & arch",
  "product_with_model_and_arch",
  "product with model and arch",
  "model",
  "vton",
  "fashion",
]);

/**
 * Returns true when an explicit lifestyle / model composition has been
 * requested, which overrides the product-only default for non-wearables.
 */
export function isLifestyleComposition(composition: string = ""): boolean {
  const norm = (composition || "").toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (!norm) return false;
  for (const key of LIFESTYLE_COMPOSITIONS) {
    const normKey = key.replace(/[\s-]+/g, "_");
    if (norm.includes(normKey)) return true;
  }
  return false;
}

