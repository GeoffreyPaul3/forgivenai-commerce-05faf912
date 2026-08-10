// Enterprise Creative Operating System V3.0 — Core Type System

export type AssetId = string;

export interface BrandDNA {
  id: AssetId; // e.g. "BRAND_FSC_001"
  name: string;
  tagline: string;
  primaryColorHex: string;
  secondaryColorHex: string;
  accentColorHex: string;
  logoDescription: string;
  logoAsset?: string;
  logoPath?: string;
  logoUsage?: string;
  architectureHeritage: string;
  qualityStandard: string;
  prohibitedElements: string[];
}

export interface StudioTokensSpec {
  colors: Record<string, { hex: string; role: string }>;
  lightingTemperatures: Record<string, { kelvin: number; description: string }>;
  lensProfiles: Record<string, { focalLength: string; aperture: string; dofDescription: string }>;
  cameraHeights: Record<string, { heightCm: number; angle: string }>;
  subjectDistances: Record<string, { distanceMeters: number; viewType: string }>;
  materials: Record<string, { finish: string; reflectionType: string }>;
  shadowDensities: Record<string, { density: number; softness: string }>;
  negativePromptLibrary: string[];
}

export interface EnvironmentProfile {
  id: AssetId; // e.g. "ENV_FLAGSHIP_ARCH_001"
  version: string;
  name: string;
  architecturePrompt: string;
  keyMaterials: string[];
  inheritedFrom?: AssetId;
}

export interface CompositionProfile {
  id: AssetId; // e.g. "COMP_HERO_PORTRAIT_001"
  version: string;
  name: string;
  framingRule: string;
  ruleOfThirds: boolean;
  offCenterBias: "LEFT" | "RIGHT" | "CENTER" | "DYNAMIC";
  depthPrompt: string;
}

export interface StylePackProfile {
  id: AssetId; // e.g. "STYLE_LUXURY_EDITORIAL_001"
  version: string;
  name: string;
  gradingDescription: string;
  contrastProfile: string;
  moodKeywords: string[];
  cameraBehavior: string;
}

export interface ProductCategoryRule {
  id: AssetId; // e.g. "PRULE_JEWELRY_001"
  version: string;
  category: string;
  preferredLens: string;
  preferredLighting: string;
  preferredComposition: string;
  materialPairing: string[];
  mandatoryShots: string[];
}

export interface BrandingPlacementProfile {
  id: AssetId; // e.g. "BRAND_MOUNTED_3D_001"
  version: string;
  name: string;
  mountingType: "3D_WALL_MOUNT" | "BRASS_PLAQUE" | "PEDESTAL_PLATE" | "BACKLIT_ACRYLIC" | "SANDBLASTED_STONE" | "PACKAGING_TAG";
  mountingDescription: string;
}

export interface ShotDefinition {
  id: AssetId; // e.g. "SHOT_HERO_001"
  name: string;
  type: string;
  cameraDistance: string;
  angle: string;
  purpose: string;
}

export interface SceneBlueprint {
  id: AssetId; // e.g. "fsc_signature"
  version: string;
  name: string;
  brandId: AssetId;
  environmentId: AssetId;
  compositionId: AssetId;
  defaultStylePackId: AssetId;
  defaultBrandingId: AssetId;
  allowedVariantIds: AssetId[];
  mandatoryShotIds: AssetId[];
  createdBy: string;
  approvedBy: string;
  approvalDate: string;
  usageCount: number;
  performanceScore: number;
  deprecated: boolean;
  replacementSceneId?: AssetId;
}

export interface SceneVariant {
  id: AssetId; // e.g. "VAR_MORNING_001"
  name: string;
  baseBlueprintId: AssetId;
  lightingOverrideId?: AssetId;
  stylePackOverrideId?: AssetId;
  environmentalNotes: string;
}

export interface KnowledgeGraphNode {
  id: AssetId;
  type: "ENVIRONMENT" | "COMPOSITION" | "CAMERA" | "LIGHTING" | "STYLE" | "CATEGORY" | "CHANNEL";
  label: string;
}

export interface KnowledgeGraphEdge {
  fromId: AssetId;
  toId: AssetId;
  relation: "WORKS_WITH" | "USES" | "RECOMMENDED_FOR" | "PERFORMS_BEST_FOR" | "INCOMPATIBLE_WITH";
  weight: number;
}

export interface PerformanceTelemetry {
  compositionId: AssetId;
  blueprintId: AssetId;
  variantId?: AssetId;
  channel: string;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cvr: number;
  watchTimeSeconds: number;
}

export interface QualityScoreBreakdown {
  brandConsistency: number; // Max 25
  lightingHarmony: number;  // Max 20
  compositionalBalance: number; // Max 20
  productVisibility: number; // Max 15
  luxuryIndex: number;      // Max 10
  conversionScore: number;  // Max 10
  totalScore: number;       // Max 100
  passed: boolean;          // True if totalScore >= 90
}

export interface CreativeQAResult {
  valid: boolean;
  scoreBreakdown: QualityScoreBreakdown;
  warnings: string[];
  criticalErrors: string[];
}

export interface CampaignPlaybook {
  id: AssetId; // e.g. "PLAYBOOK_FULL_LAUNCH_001"
  name: string;
  description: string;
  shotSequence: {
    shotId: AssetId;
    compositionId: AssetId;
    aspectRatio: "1:1" | "9:16" | "16:9" | "4:5";
    channel: string;
  }[];
}

export interface CompiledSceneComposition {
  compositionId: string;
  brand: BrandDNA;
  blueprint: SceneBlueprint;
  variant?: SceneVariant;
  environment: EnvironmentProfile;
  composition: CompositionProfile;
  stylePack: StylePackProfile;
  productRule?: ProductCategoryRule;
  branding: BrandingPlacementProfile;
  tokens: StudioTokensSpec;
  shots: ShotDefinition[];
  qaResult: CreativeQAResult;
  assembledPrompt: string;
  negativePrompt: string;
  metadata: {
    engineVersion: string;
    assembledAt: string;
    deterministicHash: string;
  };
}
