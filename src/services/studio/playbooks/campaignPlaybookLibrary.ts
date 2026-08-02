import { CampaignPlaybook } from "../types/types";

export const CampaignPlaybookLibrary: Record<string, CampaignPlaybook> = {
  PLAYBOOK_FULL_LAUNCH_001: {
    id: "PLAYBOOK_FULL_LAUNCH_001",
    name: "Full Flagship Product Launch Playbook",
    description: "Generates a cohesive 5-asset campaign suite covering Hero Key Visual, Detail Shot, Macro Texture, Lifestyle Hold, and Social Reel",
    shotSequence: [
      { shotId: "SHOT_HERO_001", compositionId: "COMP_HERO_PORTRAIT_001", aspectRatio: "1:1", channel: "E-Commerce Main" },
      { shotId: "SHOT_SIDE_003", compositionId: "COMP_PRODUCT_HERO_002", aspectRatio: "4:5", channel: "Instagram Feed" },
      { shotId: "SHOT_MACRO_004", compositionId: "COMP_LUXURY_CLOSEUP_004", aspectRatio: "1:1", channel: "Product Detail Gallery" },
      { shotId: "SHOT_LOOKBOOK_002", compositionId: "COMP_EDITORIAL_003", aspectRatio: "9:16", channel: "Instagram Story / Reels" },
      { shotId: "SHOT_TOP_DOWN_005", compositionId: "COMP_PRODUCT_HERO_002", aspectRatio: "16:9", channel: "Web Hero Banner" }
    ]
  }
};
