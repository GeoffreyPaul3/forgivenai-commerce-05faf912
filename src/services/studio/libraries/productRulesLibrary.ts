import { ProductCategoryRule } from "../types/types";

export const ProductRulesLibrary: Record<string, ProductCategoryRule> = {
  PRULE_JEWELRY_001: {
    id: "PRULE_JEWELRY_001",
    version: "3.0.0",
    category: "Jewelry",
    preferredLens: "HASSELBLAD_90MM",
    preferredLighting: "PRODUCT_NEUTRAL",
    preferredComposition: "COMP_LUXURY_CLOSEUP_004",
    materialPairing: ["CALACATTA_MARBLE", "BRUSHED_BRASS", "OBSIDIAN_BLACK"],
    mandatoryShots: ["SHOT_MACRO_004", "SHOT_HERO_001"]
  },
  PRULE_FOOTWEAR_002: {
    id: "PRULE_FOOTWEAR_002",
    version: "3.0.0",
    category: "Footwear",
    preferredLens: "SONY_85MM_GM",
    preferredLighting: "COMMERCIAL_WARM",
    preferredComposition: "COMP_HERO_PORTRAIT_001",
    materialPairing: ["WHITE_CYCLORAMA", "CREAM_PLASTER"],
    mandatoryShots: ["SHOT_HERO_001", "SHOT_SIDE_003"]
  },
  PRULE_ELECTRONICS_003: {
    id: "PRULE_ELECTRONICS_003",
    version: "3.0.0",
    category: "Electronics",
    preferredLens: "CANON_50MM_RF",
    preferredLighting: "DAYLIGHT_STROBE",
    preferredComposition: "COMP_PRODUCT_HERO_002",
    materialPairing: ["WHITE_CYCLORAMA", "FLUTED_WOOD"],
    mandatoryShots: ["SHOT_HERO_001", "SHOT_TOP_DOWN_005"]
  },
  PRULE_FASHION_004: {
    id: "PRULE_FASHION_004",
    version: "3.0.0",
    category: "Fashion",
    preferredLens: "SONY_85MM_GM",
    preferredLighting: "COMMERCIAL_WARM",
    preferredComposition: "COMP_EDITORIAL_003",
    materialPairing: ["WHITE_CYCLORAMA", "CALACATTA_MARBLE", "CREAM_PLASTER"],
    mandatoryShots: ["SHOT_HERO_001", "SHOT_LOOKBOOK_002"]
  }
};
