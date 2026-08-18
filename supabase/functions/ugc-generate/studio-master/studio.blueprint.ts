/**
 * Enterprise Creative OS — Studio Blueprint
 * 
 * The FlagshipStudioBlueprint owns EVERYTHING about the physical studio space.
 * It is the single source of truth for architectural descriptions, camera profiles,
 * lighting profiles, safe subject regions, brand rules, and governance directives.
 */

import { StudioZone, LOCKED_ZONES, ZoneDefinition } from "./studio.zones.ts";

export interface CameraProfile {
  id: string;
  name: string;
  height_mm: number;
  focalLength_mm: number;
  promptDescription: string;
}

export interface LightingProfile {
  id: string;
  name: string;
  keyLight: string;
  fillLight: string;
  rimLight: string;
  ambientKelvin: number;
  promptDescription: string;
}

export interface SafeRegion {
  id: string;
  name: string;
  xRange: string;
  yRange: string;
  note: string;
}

export interface BrandRule {
  id: string;
  rule: string;
  isMandatory: boolean;
}

export interface FlagshipStudioBlueprint {
  id: string;
  version: number;
  referenceImageUrl: string;
  
  zones: Record<StudioZone, ZoneDefinition>;
  lockedZones: StudioZone[];
  
  cameraProfiles: Record<string, CameraProfile>;
  lightingProfiles: Record<string, LightingProfile>;
  
  safeSubjectRegions: SafeRegion[];
  brandVisibilityRules: BrandRule[];
  
  decoratorSlots: StudioZone[];
  negativeRules: string[];
  
  compiledArchitecturalDescription(): string;
  compiledLightingDescription(): string;
  compiledBrandingDescription(): string;
  compiledGovernanceDirective(): string;
}

export const FSC_FLAGSHIP_STUDIO_URL = "https://wzncegnkhybtmybqftbv.supabase.co/storage/v1/object/public/ugc-assets/brand/fsc-flagship-studio.jpeg";

/**
 * The official Forgiven Shopping Centre brand logo (forgiven.png).
 * Uploaded to Supabase Storage for use as an image reference in generations
 * where a slot is available (non-VTON product-only shots).
 *
 * Official Logo Anatomy (Immutable Brand Asset):
 *  - Primary magenta (#A72087) shopping bag body, curved handle, crisp white "F" on face
 *  - Behind-left: secondary royal blue (#1A3E92) shopping bag shape
 *  - Behind-right: lime-green accent shopping bag shape
 *  - Below cluster: "Forgiven" in bold rounded sans-serif, primary magenta (#A72087)
 *  - Below that: "Shopping Centre" in smaller lighter-weight same colour, wider tracking
 */
export const FSC_LOGO_URL = "https://wzncegnkhybtmybqftbv.supabase.co/storage/v1/object/public/ugc-assets/brand/fsc-logo.png";

export const SINGLE_LOGO_RULE = {
  id: "FSC_OFFICIAL_WALL_LOGO_001",
  status: "IMMUTABLE",
  source: "STUDIO_MASTER_REFERENCE",
  maxPhysicalInstances: 1,
  requiredPhysicalInstances: 1,
  physicalLocation: "CENTER_OF_ARCH_INTERIOR_WALL",
  behavior: "PRESERVE_EXISTING",
  generationAllowed: false,
  duplicationAllowed: false,
  relocationAllowed: false,
  redesignAllowed: false,
};

export class FSCFlagshipBlueprintV1 implements FlagshipStudioBlueprint {
  id = "FSC_FLAGSHIP_STUDIO_V1";
  version = 1;
  referenceImageUrl = FSC_FLAGSHIP_STUDIO_URL;

  zones: Record<StudioZone, ZoneDefinition> = {
    [StudioZone.ARCH]: {
      id: StudioZone.ARCH,
      name: "Central Architectural Arch",
      isLocked: true,
      baseDescription: "Signature architectural 1.8m radius pristine white plaster arch centered in the room with an integrated glowing neon magenta (#B0208D) LED perimeter strip running along the inner arch contour.",
      spatialAnchor: "Center background wall"
    },
    [StudioZone.LOGO]: {
      id: StudioZone.LOGO,
      name: "FSC 3D Brand Logo",
      isLocked: true,
      baseDescription: "SINGLE IMMUTABLE OFFICIAL WALL LOGO (PRESERVED FROM STUDIO MASTER): The official Forgiven Shopping Centre logo physically exists inside studio.jpeg on the rear wall inside the central arch. Preserve that exact single wall logo. AI generation of additional or duplicate logos is strictly FORBIDDEN.",
      spatialAnchor: "Center of architectural arch wall"
    },
    [StudioZone.PODIUM]: {
      id: StudioZone.PODIUM,
      name: "White Display Podium",
      isLocked: true,
      baseDescription: "Low circular white stone display pedestal/podium (40cm height × 50cm diameter) centered directly in front of the central arch.",
      spatialAnchor: "Center foreground floor"
    },
    [StudioZone.LED_STRIP]: {
      id: StudioZone.LED_STRIP,
      name: "Magenta LED Perimeter Strip",
      isLocked: true,
      baseDescription: "Vivid 25mm glowing magenta (#B0208D) LED accent light tracing the inner curve of the arch.",
      spatialAnchor: "Arch perimeter recessed channel"
    },
    [StudioZone.FLOOR]: {
      id: StudioZone.FLOOR,
      name: "Calacatta Marble Floor",
      isLocked: true,
      baseDescription: "High-gloss polished white Calacatta marble floor reflecting the studio lighting and magenta LED arch.",
      spatialAnchor: "Entire studio floor plane"
    },
    [StudioZone.LEFT_DECOR]: {
      id: StudioZone.LEFT_DECOR,
      name: "Left Decorative Bay",
      isLocked: false,
      baseDescription: "Dark black vertical fluted wooden slat paneling on camera-left wall with a tall brass planter holding green monstera/palm leaves and a vertical glowing tube sconce light.",
      spatialAnchor: "Floor camera-left"
    },
    [StudioZone.RIGHT_DECOR]: {
      id: StudioZone.RIGHT_DECOR,
      name: "Right Decorative Bay",
      isLocked: false,
      baseDescription: "Dark black vertical fluted wooden slat paneling on camera-right wall with a soft white backlit recessed display shelf holding luxury vessels/perfumes and a vertical glowing tube sconce light.",
      spatialAnchor: "Wall camera-right"
    },
    [StudioZone.BACKGROUND]: {
      id: StudioZone.BACKGROUND,
      name: "Studio Background Wall",
      isLocked: false,
      baseDescription: "Pristine white plaster arch wall flanked by dark black fluted wooden side panels with soft white glowing brass sconce lights.",
      spatialAnchor: "Rear perimeter wall"
    },
    [StudioZone.FOREGROUND]: {
      id: StudioZone.FOREGROUND,
      name: "Foreground Plane",
      isLocked: false,
      baseDescription: "High-gloss polished white Calacatta marble floor with soft specular reflections.",
      spatialAnchor: "Immediate camera foreground"
    },
    [StudioZone.SUBJECT]: {
      id: StudioZone.SUBJECT,
      name: "Model / Creator Safe Zone",
      isLocked: false,
      baseDescription: "STRICT POSITIONING: Model stands or sits strictly on the CAMERA-LEFT (Left Safe Zone) or CAMERA-RIGHT (Right Safe Zone) side of the podium. The model NEVER stands in the exact center of the arch.",
      spatialAnchor: "Midground camera left or right"
    },
    [StudioZone.PRODUCT]: {
      id: StudioZone.PRODUCT,
      name: "Product Hero Zone",
      isLocked: false,
      baseDescription: "Worn by model or displayed on white pedestal with FSC packaging.",
      spatialAnchor: "Center podium or model body"
    },
    [StudioZone.LIGHTING]: {
      id: StudioZone.LIGHTING,
      name: "Studio Commercial Lighting",
      isLocked: false,
      baseDescription: "Premium daylight-calibrated commercial white studio lighting (5000K-5600K), soft key light from 45 degrees, neutral ambient white glow.",
      spatialAnchor: "Overhead and perimeter rigs"
    },
    [StudioZone.CAMERA]: {
      id: StudioZone.CAMERA,
      name: "Flagship Camera Setup",
      isLocked: false,
      baseDescription: "Eye-level or waist-level 85mm prime lens vertical framing.",
      spatialAnchor: "Direct front camera position"
    }
  };

  lockedZones = LOCKED_ZONES;

  cameraProfiles: Record<string, CameraProfile> = {
    eye_level: {
      id: "eye_level",
      name: "Eye-Level Portrait (85mm)",
      height_mm: 1650,
      focalLength_mm: 85,
      promptDescription: "85mm prime lens fashion portrait shot from eye-level (1.65m height), sharp subject isolation, natural luxury studio perspective."
    },
    waist_level_85mm: {
      id: "waist_level_85mm",
      name: "Full Body Fashion (85mm)",
      height_mm: 1100,
      focalLength_mm: 85,
      promptDescription: "50mm/85mm full-length editorial fashion photograph, vertical 9:16 aspect ratio, complete head-to-toe framing showing the model from top of head down to shoes resting on the marble floor with zero leg cropping."
    },
    macro_90mm: {
      id: "macro_90mm",
      name: "Product Macro (90mm)",
      height_mm: 500,
      focalLength_mm: 90,
      promptDescription: "90mm macro close-up product display on central travertine podium, razor-sharp product detail."
    },
    luxury_low_angle: {
      id: "luxury_low_angle",
      name: "Hero Low Angle (90mm)",
      height_mm: 500,
      focalLength_mm: 90,
      promptDescription: "Low-angle hero perspective shot from 0.5m height, 90mm lens, imposing luxury feel."
    },
    "45_degree_50mm": {
      id: "45_degree_50mm",
      name: "Commercial Product Angle (50mm)",
      height_mm: 1200,
      focalLength_mm: 50,
      promptDescription: "50mm lens shot at 45-degree angle to product on white stone pedestal."
    }
  };

  lightingProfiles: Record<string, LightingProfile> = {
    commercial_warm: {
      id: "commercial_warm",
      name: "Commercial Clean White Studio (5500K)",
      keyLight: "Large softbox overhead at 45 degrees",
      fillLight: "Diffuse white bounce board",
      rimLight: "Glowing magenta arch LED strip",
      ambientKelvin: 5500,
      promptDescription: "Premium luxury studio lighting: 5500K daylight key light, neutral ambient fill, pure crisp white studio background wall (#FFFFFF), glowing magenta arch LED accent, specular white marble floor reflection."
    },
    editorial_octabox: {
      id: "editorial_octabox",
      name: "Editorial Fashion Octabox",
      keyLight: "Deep 150cm octabox key light",
      fillLight: "Silver reflector fill",
      rimLight: "Focused spot rim",
      ambientKelvin: 5500,
      promptDescription: "Editorial fashion lighting: 5500K daylight key light, crisp catchlights in eyes, pure white studio background wall, neutral color balance, high-end commercial fashion feel."
    },
    hard_rim_macro: {
      id: "hard_rim_macro",
      name: "Macro Jewel/Hard Rim",
      keyLight: "Dual cross-polarized spot lights",
      fillLight: "Black card negative fill",
      rimLight: "Sharp metallic specular rim",
      ambientKelvin: 5000,
      promptDescription: "High-end product macro lighting: neutral daylight spots, crisp specular highlights on hardware."
    },
    d50_neutral_precision: {
      id: "d50_neutral_precision",
      name: "D50 Color Precision",
      keyLight: "Calibrated D50 daylight diffusers",
      fillLight: "Uniform ambient field",
      rimLight: "Subtle back edge",
      ambientKelvin: 5000,
      promptDescription: "5000K D50 color-calibrated commercial lighting, perfect true-to-life color rendering."
    }
  };

  safeSubjectRegions: SafeRegion[] = [
    {
      id: "left_of_center",
      name: "Left Safe Zone",
      xRange: "15% - 40%",
      yRange: "0% - 100%",
      note: "Model stands or sits strictly to the left of the podium, arch wall visible and unobstructed behind model"
    },
    {
      id: "right_of_center",
      name: "Right Safe Zone",
      xRange: "60% - 85%",
      yRange: "0% - 100%",
      note: "Model stands or sits strictly to the right of the podium, arch wall visible and unobstructed behind model"
    }
  ];

  brandVisibilityRules: BrandRule[] = [
    { id: "single_logo_rule", rule: "EXACTLY ONE physical Forgiven Shopping Centre logo exists on the arch wall. Do NOT generate, duplicate, repeat, overlay, or add another logo.", isMandatory: true },
    { id: "arch_geometry", rule: "Central architectural arch with magenta LED outline must match flagship FSC studio sheet exactly.", isMandatory: true },
    { id: "podium_center", rule: "White pedestal must remain centered on floor plane in front of arch.", isMandatory: true }
  ];

  decoratorSlots: StudioZone[] = [
    StudioZone.LEFT_DECOR,
    StudioZone.RIGHT_DECOR,
    StudioZone.BACKGROUND,
    StudioZone.FOREGROUND,
    StudioZone.LIGHTING
  ];

  negativeRules = [
    "DO NOT redesign, move, remove, recreate, recolor, or alter: central arch with magenta LED, official Forgiven Shopping Centre logo, white podium, white Calacatta marble floor, dark fluted side panels.",
    "DO NOT position model in exact center of the arch.",
    "DO NOT omit the signature arch or generate a plain gray/white seamless backdrop.",
    "NO DUPLICATE LOGOS. NO SECOND LOGO. NO ADDITIONAL BRAND MARKS. NO REPEATED WORDMARK. NO OVERLAPPING LOGOS. NO STACKED LOGOS. NO EXTRA F SYMBOLS. NO EXTRA SHOPPING BAG ICONS. NO ADDITIONAL WALL SIGNAGE. NO GENERATED FORGIVEN LOGO. NO RECONSTRUCTED FORGIVEN LOGO. NO SECOND BRAND SIGN."
  ];

  compiledArchitecturalDescription(): string {
    return [
      this.zones[StudioZone.ARCH].baseDescription,
      this.zones[StudioZone.LOGO].baseDescription,
      this.zones[StudioZone.PODIUM].baseDescription,
      this.zones[StudioZone.FLOOR].baseDescription,
      this.zones[StudioZone.BACKGROUND].baseDescription
    ].join(" ");
  }

  compiledLightingDescription(): string {
    return this.lightingProfiles.commercial_warm.promptDescription;
  }

  compiledBrandingDescription(): string {
    return "BRAND GOVERNANCE: " + this.brandVisibilityRules.map(r => r.rule).join(" ");
  }

  compiledGovernanceDirective(): string {
    return "GOVERNANCE NEGATIVE DIRECTIVE: " + this.negativeRules.join(" ");
  }
}
