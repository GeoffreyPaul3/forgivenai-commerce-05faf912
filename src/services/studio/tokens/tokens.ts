import { StudioTokensSpec } from "../types/types";

export const StudioTokens: StudioTokensSpec = {
  colors: {
    FSC_MAGENTA: { hex: "#B0208D", role: "Primary Brand LED Accent & Architectural Logo" },
    CREAM_TRAVERTINE: { hex: "#F5F0EA", role: "Flagship Plaster & Pedestal Finish" },
    OBSIDIAN_BLACK: { hex: "#111111", role: "Fluted Architectural Wall Panels & Arena Floor" },
    BRUSHED_GOLD: { hex: "#D4AF37", role: "Hardware, Sconces, & Metallic Details" },
    CALACATTA_CREAM: { hex: "#FAF8F5", role: "Polished Marble Floor with Natural Veining" }
  },
  lightingTemperatures: {
    WARM_TUNGSTEN: { kelvin: 2700, description: "Festive Holiday & Cozy Practical Accent Fill" },
    COMMERCIAL_WARM: { kelvin: 3200, description: "Flagship Retail Warm Key (3000K-3500K)" },
    GOLDEN_HOUR: { kelvin: 3800, description: "Outdoor Courtyard Low-Angle Sunlight" },
    HIGH_CONTRAST_SPOT: { kelvin: 4000, description: "Arena Overhead Kicker & High Power Spotlight" },
    PRODUCT_NEUTRAL: { kelvin: 5000, description: "D50 Color Standard Precision Product Key" },
    DAYLIGHT_STROBE: { kelvin: 5600, description: "E-Commerce Cyclorama Clean Daylight Fill" }
  },
  lensProfiles: {
    SONY_85MM_GM: { focalLength: "85mm", aperture: "f/1.4", dofDescription: "Creamy portraits & product background separation" },
    CANON_50MM_RF: { focalLength: "50mm", aperture: "f/1.2", dofDescription: "Color-calibrated true-to-life editorial sweep" },
    HASSELBLAD_90MM: { focalLength: "90mm", aperture: "f/3.2", dofDescription: "100MP extreme detail macro & texture resolution" }
  },
  cameraHeights: {
    EYE_LEVEL: { heightCm: 160, angle: "0° parallel eye level" },
    LOW_ANGLE: { heightCm: 80, angle: "15° upward hero stance" },
    HIGH_ANGLE: { heightCm: 220, angle: "30° downward commercial angle" },
    TOP_DOWN: { heightCm: 300, angle: "90° perpendicular flat lay" }
  },
  subjectDistances: {
    CLOSEUP_MACRO: { distanceMeters: 0.6, viewType: "Extreme Texture Detail" },
    HERO_PRODUCT: { distanceMeters: 1.5, viewType: "Mid-Shot Product Hero Focus" },
    FULL_LOOKBOOK: { distanceMeters: 3.5, viewType: "Full Architectural & Model Frame" }
  },
  materials: {
    TRAVERTINE: { finish: "Honed natural travertine stone with porous texture", reflectionType: "Diffused Matte" },
    CREAM_PLASTER: { finish: "Micro-textured cream limestone plaster wall", reflectionType: "Soft Velvet Matte" },
    CALACATTA_MARBLE: { finish: "Polished cream marble with soft natural veining", reflectionType: "High Gloss Specular" },
    WHITE_CYCLORAMA: { finish: "Seamless smooth white studio sweep", reflectionType: "Clean Diffused Sweep" },
    FLUTED_WOOD: { finish: "Matte black fluted wooden wall panels (#111111)", reflectionType: "Ribbed Shadow Grid" },
    BRUSHED_BRASS: { finish: "Satin metallic brushed gold accent brass", reflectionType: "Metallic Metallic Glow" }
  },
  shadowDensities: {
    SOFT_COMMERCIAL: { density: 0.25, softness: "Feathered soft contact shadow only" },
    DRAMATIC_KICKER: { density: 0.75, softness: "Sharp high-contrast architectural shadow" },
    NATURAL_SUNLIGHT: { density: 0.45, softness: "Dappled leaf & window frame shadow cast" }
  },
  negativePromptLibrary: [
    "cheap tinsel", "tacky decorations", "blue/purple lights", "cold temperature", "cluttered floor",
    "plastic trees", "grey background", "dirty walls", "visible floor joins", "yellow tint",
    "blown-out highlights", "warm color cast", "Instagram filter", "visible grain", "cluttered rooms",
    "worn furniture", "cheap apartment", "harsh flash", "cold blue light", "plastic surfaces",
    "IKEA generic furniture", "concrete city streets", "European garden", "resort palms", "overcast sky",
    "fake plastic plants", "oversaturated sky", "CGI render", "3D render", "artificial skin",
    "wax texture", "extra fingers", "hyper-real uncanny valley"
  ]
};
