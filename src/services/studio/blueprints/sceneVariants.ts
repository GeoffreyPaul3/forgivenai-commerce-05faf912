import { SceneVariant } from "../types/types";

export const SceneVariants: Record<string, SceneVariant> = {
  VAR_MORNING_001: {
    id: "VAR_MORNING_001",
    name: "Morning Light Shift",
    baseBlueprintId: "fsc_signature",
    environmentalNotes: "Fresh 5500K natural morning sunlight angle piercing through sheer linen accents into the studio."
  },
  VAR_EVENING_002: {
    id: "VAR_EVENING_002",
    name: "Evening Ambient Glow",
    baseBlueprintId: "fsc_signature",
    environmentalNotes: "Warm 2700K tungsten ambient lighting with intensified neon magenta LED arch reflection."
  },
  VAR_LUXURY_LAUNCH_003: {
    id: "VAR_LUXURY_LAUNCH_003",
    name: "Flagship Luxury Product Launch",
    baseBlueprintId: "fsc_signature",
    environmentalNotes: "Polished brass accent pedestals, wrapped FSC burgundy gift boxes, and crisp spotlight key."
  },
  VAR_MINIMAL_004: {
    id: "VAR_MINIMAL_004",
    name: "Pure Minimal Sweep",
    baseBlueprintId: "luxury_white",
    environmentalNotes: "Zero shadows outside contact footprint, 5000K neutral light balance."
  },
  VAR_EDITORIAL_005: {
    id: "VAR_EDITORIAL_005",
    name: "Vogue High-Fashion Editorial",
    baseBlueprintId: "lifestyle_home",
    environmentalNotes: "Architectural shadow framing with layered depth accents."
  },
  VAR_GOLDEN_HOUR_006: {
    id: "VAR_GOLDEN_HOUR_006",
    name: "African Golden Hour Sunlight",
    baseBlueprintId: "outdoor_fashion",
    environmentalNotes: "Warm 3800K low-angle sunlight with leaf shadow patterns against travertine pavers."
  },
  VAR_FESTIVE_WARMTH_007: {
    id: "VAR_FESTIVE_WARMTH_007",
    name: "Opulent Holiday Warmth",
    baseBlueprintId: "christmas_studio",
    environmentalNotes: "Background fairy light bokeh orbs with hunter green velvet drape accents."
  },
  VAR_HIGH_ENERGY_008: {
    id: "VAR_HIGH_ENERGY_008",
    name: "Promotional High Energy Arena",
    baseBlueprintId: "black_friday_studio",
    environmentalNotes: "High-contrast rim kickers with vivid magenta LED logo illumination."
  }
};
