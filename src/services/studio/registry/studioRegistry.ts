import { BrandRegistry } from "./brandRegistry";
import { StudioTokens } from "../tokens/tokens";
import { EnvironmentLibrary } from "../libraries/environmentLibrary";
import { CompositionLibrary } from "../libraries/compositionLibrary";
import { StylePackLibrary } from "../libraries/stylePackLibrary";
import { ProductRulesLibrary } from "../libraries/productRulesLibrary";
import { BrandingLibrary } from "../libraries/brandingLibrary";
import { ShotLibrary } from "../libraries/shotLibrary";
import { SceneBlueprints } from "../blueprints/sceneBlueprints";
import { SceneVariants } from "../blueprints/sceneVariants";
import { CampaignPlaybookLibrary } from "../playbooks/campaignPlaybookLibrary";
import { globalCreativeGraph } from "../graph/creativeKnowledgeGraph";
import { globalCreativeMemory } from "../memory/creativeMemoryEngine";

export class StudioRegistry {
  public static readonly Brands = BrandRegistry;
  public static readonly Tokens = StudioTokens;
  public static readonly Environments = EnvironmentLibrary;
  public static readonly Compositions = CompositionLibrary;
  public static readonly StylePacks = StylePackLibrary;
  public static readonly ProductRules = ProductRulesLibrary;
  public static readonly BrandingProfiles = BrandingLibrary;
  public static readonly Shots = ShotLibrary;
  public static readonly Blueprints = SceneBlueprints;
  public static readonly Variants = SceneVariants;
  public static readonly Playbooks = CampaignPlaybookLibrary;
  public static readonly Graph = globalCreativeGraph;
  public static readonly Memory = globalCreativeMemory;
}
