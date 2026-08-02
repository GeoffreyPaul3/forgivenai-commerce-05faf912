import { CompositionProfile } from "../types/types";

export const CompositionLibrary: Record<string, CompositionProfile> = {
  COMP_HERO_PORTRAIT_001: {
    id: "COMP_HERO_PORTRAIT_001",
    version: "3.0.0",
    name: "Hero Off-Center Portrait",
    framingRule: "Model/product positioned strictly OFF-CENTER (LEFT or RIGHT). Signature arch center and 3D brand logo remain 100% unblocked.",
    ruleOfThirds: true,
    offCenterBias: "RIGHT",
    depthPrompt: "Foreground product/model -> Midground architectural arch -> Background illuminated wall."
  },
  COMP_PRODUCT_HERO_002: {
    id: "COMP_PRODUCT_HERO_002",
    version: "3.0.0",
    name: "Commercial Product Hero",
    framingRule: "Product centered on travertine pedestal, seams and textures critically sharp.",
    ruleOfThirds: false,
    offCenterBias: "CENTER",
    depthPrompt: "Pedestal foreground contact shadow -> Clean sweep background."
  },
  COMP_EDITORIAL_003: {
    id: "COMP_EDITORIAL_003",
    version: "3.0.0",
    name: "High Fashion Editorial",
    framingRule: "Dynamic rule of thirds framing with natural interaction with physical architecture.",
    ruleOfThirds: true,
    offCenterBias: "DYNAMIC",
    depthPrompt: "Layered visual depth with foreground architectural shadow accents."
  },
  COMP_LUXURY_CLOSEUP_004: {
    id: "COMP_LUXURY_CLOSEUP_004",
    version: "3.0.0",
    name: "Luxury Close-Up Texture Macro",
    framingRule: "Tight macro framing focusing on material grain, metallic hardware, and stitching.",
    ruleOfThirds: true,
    offCenterBias: "CENTER",
    depthPrompt: "Razor-thin depth of field with buttery background bokeh."
  }
};
