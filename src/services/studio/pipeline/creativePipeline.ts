import { CompiledSceneComposition, AssetId } from "../types/types";
import { getBrandDNA } from "../registry/brandRegistry";
import { StudioTokens } from "../tokens/tokens";
import { EnvironmentLibrary } from "../libraries/environmentLibrary";
import { CompositionLibrary } from "../libraries/compositionLibrary";
import { StylePackLibrary } from "../libraries/stylePackLibrary";
import { ProductRulesLibrary } from "../libraries/productRulesLibrary";
import { BrandingLibrary } from "../libraries/brandingLibrary";
import { ShotLibrary } from "../libraries/shotLibrary";
import { SceneBlueprints } from "../blueprints/sceneBlueprints";
import { SceneVariants } from "../blueprints/sceneVariants";
import { performCreativeQA } from "../qa/creativeQA";
import { globalCreativeMemory } from "../memory/creativeMemoryEngine";

export interface PipelineRequest {
  brandId?: string;
  sceneTypeId: string;
  variantId?: string;
  productCategory?: string;
  channel?: string;
  contextualPrompt?: string;
}

export class CreativePipeline {
  public static execute(request: PipelineRequest): CompiledSceneComposition {
    // Stage 1: Request Initialization
    const brand = getBrandDNA(request.brandId || "BRAND_FSC_001");

    // Stage 2: Intent Analysis
    const category = request.productCategory || "Fashion";

    // Stage 3: Product Rules Resolution
    const pruleKey = Object.keys(ProductRulesLibrary).find(
      k => ProductRulesLibrary[k].category.toLowerCase() === category.toLowerCase()
    ) || "PRULE_FASHION_004";
    const productRule = ProductRulesLibrary[pruleKey];

    // Stage 4 & 5: Blueprint Selection
    const blueprint = SceneBlueprints[request.sceneTypeId] || SceneBlueprints["fsc_signature"];

    // Stage 6: Variant Selection
    const variant = request.variantId ? SceneVariants[request.variantId] : undefined;

    // Stage 7: Composition Assembly
    const environment = EnvironmentLibrary[blueprint.environmentId] || EnvironmentLibrary["ENV_FLAGSHIP_ARCH_001"];
    const composition = CompositionLibrary[blueprint.compositionId] || CompositionLibrary["COMP_HERO_PORTRAIT_001"];
    const stylePack = StylePackLibrary[blueprint.defaultStylePackId] || StylePackLibrary["STYLE_LUXURY_EDITORIAL_001"];
    const branding = BrandingLibrary[blueprint.defaultBrandingId] || BrandingLibrary["BRAND_MOUNTED_3D_001"];

    const shots = blueprint.mandatoryShotIds.map(id => ShotLibrary[id] || ShotLibrary["SHOT_HERO_001"]);

    // Fetch memory CTR score
    const ctr = globalCreativeMemory.getExpectedCTR(blueprint.id, request.channel || "Instagram Ads");

    // Stage 8 & 9: Creative QA & Quality Scoring
    const assetIds = [blueprint.id, environment.id, composition.id, stylePack.id, branding.id];
    if (variant) assetIds.push(variant.id);

    const qaResult = performCreativeQA({
      assetIds,
      hasPhysicalLogo: true,
      colorHex: brand.primaryColorHex,
      ctr
    });

    // Stage 10: Prompt Compilation (Deterministic Assembly - 95%)
    const promptParts = [
      `${brand.architectureHeritage.toUpperCase()}:`,
      environment.architecturePrompt,
      composition.framingRule,
      composition.depthPrompt,
      branding.mountingDescription,
      stylePack.gradingDescription,
      variant ? `VARIANT DIRECTIVE: ${variant.environmentalNotes}` : "",
      request.contextualPrompt ? `CONTEXTUAL ADAPTATION (5%): ${request.contextualPrompt}` : ""
    ].filter(Boolean);

    const assembledPrompt = promptParts.join(" ");
    const negativePrompt = StudioTokens.negativePromptLibrary.join(", ");

    // Stage 11 & 12: Hash & Metadata Return
    const deterministicHash = `HASH_${blueprint.id}_${variant?.id || "BASE"}_${Date.now()}`;

    return {
      compositionId: `COMP_EXEC_${Date.now()}`,
      brand,
      blueprint,
      variant,
      environment,
      composition,
      stylePack,
      productRule,
      branding,
      tokens: StudioTokens,
      shots,
      qaResult,
      assembledPrompt,
      negativePrompt,
      metadata: {
        engineVersion: "3.0.0",
        assembledAt: new Date().toISOString(),
        deterministicHash
      }
    };
  }
}
