import { EnvironmentProfile } from "../types/types";

export const EnvironmentLibrary: Record<string, EnvironmentProfile> = {
  ENV_FLAGSHIP_ARCH_001: {
    id: "ENV_FLAGSHIP_ARCH_001",
    version: "3.0.0",
    name: "Flagship FSC Signature Studio",
    architecturePrompt: "Modern African luxury retail architecture (Forgiven Shopping Centre, Lilongwe, Malawi). Signature pristine white arch (1.8m radius, 3.2m height) on seamless white plaster wall outlined by glowing integrated magenta LED strip (#B0208D). Flanked by vertical black fluted architectural panels (#111111) with warm vertical sconces. Low seamless white circular podium on polished white Calacatta marble floor.",
    keyMaterials: ["WHITE_CYCLORAMA", "CREAM_PLASTER", "CALACATTA_MARBLE", "FLUTED_WOOD", "BRUSHED_BRASS"]
  },
  ENV_LUXURY_WHITE_002: {
    id: "ENV_LUXURY_WHITE_002",
    version: "3.0.0",
    name: "Luxury White Cyclorama Studio",
    architecturePrompt: "Professional fashion lookbook studio. Seamless curved white cyclorama sweep background transitioning smoothly into freshly painted matte white floor with soft reflections.",
    keyMaterials: ["WHITE_CYCLORAMA"]
  },
  ENV_LIFESTYLE_RESIDENCE_003: {
    id: "ENV_LIFESTYLE_RESIDENCE_003",
    version: "3.0.0",
    name: "FSC Lifestyle Showroom Residence",
    architecturePrompt: "Modern African luxury apartment interior. Warm cream limewash plaster walls, honed travertine marble floor in herringbone pattern, floor-to-ceiling windows with white sheer linen curtains diffusing natural morning sunlight. Bouclé sofa, dark wood side table, raffia accent rug.",
    keyMaterials: ["CREAM_PLASTER", "TRAVERTINE", "BRUSHED_BRASS"]
  },
  ENV_OUTDOOR_TERRACE_004: {
    id: "ENV_OUTDOOR_TERRACE_004",
    version: "3.0.0",
    name: "FSC Outdoor Courtyard Terrace",
    architecturePrompt: "Rough-honed cream travertine pavers, textured dry-stack limestone boundary wall with tropical African plants (Birds of Paradise, Elephant Ears). Mature shade tree casting dappled shadows against deep African blue sky.",
    keyMaterials: ["TRAVERTINE", "CREAM_PLASTER"]
  },
  ENV_CHRISTMAS_PAVILION_005: {
    id: "ENV_CHRISTMAS_PAVILION_005",
    version: "3.0.0",
    name: "FSC Christmas Pavilion",
    architecturePrompt: "Signature studio arch, magenta LED strip, black fluted panels decorated for luxury holiday season with twin tall Christmas trees, deep green velvet accents, gold baubles, burgundy ribbons, and fairy light bokeh.",
    keyMaterials: ["TRAVERTINE", "FLUTED_WOOD", "BRUSHED_BRASS"]
  },
  ENV_BLACK_FRIDAY_ARENA_006: {
    id: "ENV_BLACK_FRIDAY_ARENA_006",
    version: "3.0.0",
    name: "FSC Black Friday Arena",
    architecturePrompt: "High-contrast matte black fluted architectural wall panels (#111111), intensified magenta LED strip (#B0208D), polished obsidian-black marble floor with mirror reflections.",
    keyMaterials: ["FLUTED_WOOD", "CALACATTA_MARBLE"]
  },
  ENV_PRODUCT_LAB_007: {
    id: "ENV_PRODUCT_LAB_007",
    version: "3.0.0",
    name: "FSC Commercial Product Lab",
    architecturePrompt: "Seamless sweep of pristine white studio plaster (#FFFFFF) with a solid smooth white circular stone pedestal (40cm high, 50cm diameter).",
    keyMaterials: ["CREAM_PLASTER", "WHITE_CYCLORAMA"]
  }
};
