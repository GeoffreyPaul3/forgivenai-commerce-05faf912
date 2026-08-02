import { KnowledgeGraphNode, KnowledgeGraphEdge, AssetId } from "../types/types";

export class CreativeKnowledgeGraph {
  private nodes: Map<AssetId, KnowledgeGraphNode> = new Map();
  private edges: KnowledgeGraphEdge[] = [];

  constructor() {
    this.seedDefaultGraph();
  }

  private seedDefaultGraph() {
    // Seed Nodes
    const defaultNodes: KnowledgeGraphNode[] = [
      { id: "ENV_FLAGSHIP_ARCH_001", type: "ENVIRONMENT", label: "FSC Signature Studio" },
      { id: "ENV_LUXURY_WHITE_002", type: "ENVIRONMENT", label: "Luxury White Cyclorama" },
      { id: "ENV_PRODUCT_LAB_007", type: "ENVIRONMENT", label: "FSC Product Lab" },
      { id: "COMP_HERO_PORTRAIT_001", type: "COMPOSITION", label: "Hero Off-Center Portrait" },
      { id: "COMP_LUXURY_CLOSEUP_004", type: "COMPOSITION", label: "Macro Close-Up" },
      { id: "STYLE_LUXURY_EDITORIAL_001", type: "STYLE", label: "Luxury Editorial" },
      { id: "STYLE_APPLE_MINIMAL_002", type: "STYLE", label: "Commercial Minimal" },
      { id: "CAT_JEWELRY", type: "CATEGORY", label: "Jewelry" },
      { id: "CAT_FASHION", type: "CATEGORY", label: "Fashion" },
      { id: "CAT_FOOTWEAR", type: "CATEGORY", label: "Footwear" },
      { id: "CAT_ELECTRONICS", type: "CATEGORY", label: "Electronics" },
      { id: "CHAN_INSTAGRAM_ADS", type: "CHANNEL", label: "Instagram Ads" },
      { id: "CHAN_TIKTOK_REELS", type: "CHANNEL", label: "TikTok / Reels" }
    ];

    defaultNodes.forEach(n => this.nodes.set(n.id, n));

    // Seed Edges
    this.edges = [
      { fromId: "STYLE_LUXURY_EDITORIAL_001", toId: "COMP_HERO_PORTRAIT_001", relation: "WORKS_WITH", weight: 0.95 },
      { fromId: "COMP_HERO_PORTRAIT_001", toId: "ENV_FLAGSHIP_ARCH_001", relation: "USES", weight: 0.98 },
      { fromId: "COMP_LUXURY_CLOSEUP_004", toId: "CAT_JEWELRY", relation: "RECOMMENDED_FOR", weight: 0.99 },
      { fromId: "STYLE_LUXURY_EDITORIAL_001", toId: "CHAN_INSTAGRAM_ADS", relation: "PERFORMS_BEST_FOR", weight: 0.94 },
      { fromId: "STYLE_APPLE_MINIMAL_002", toId: "CAT_ELECTRONICS", relation: "RECOMMENDED_FOR", weight: 0.97 },
      { fromId: "COMP_LUXURY_CLOSEUP_004", toId: "ENV_OUTDOOR_TERRACE_004", relation: "INCOMPATIBLE_WITH", weight: 1.0 }
    ];
  }

  public getRelatedAssets(assetId: AssetId, relation: KnowledgeGraphEdge["relation"]): AssetId[] {
    return this.edges
      .filter(e => e.fromId === assetId && e.relation === relation)
      .map(e => e.toId);
  }

  public isCompatible(assetA: AssetId, assetB: AssetId): boolean {
    const incompatible = this.edges.some(
      e => ((e.fromId === assetA && e.toId === assetB) || (e.fromId === assetB && e.toId === assetA)) &&
           e.relation === "INCOMPATIBLE_WITH"
    );
    return !incompatible;
  }
}

export const globalCreativeGraph = new CreativeKnowledgeGraph();
