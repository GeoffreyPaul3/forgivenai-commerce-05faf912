/**
 * Enterprise Creative OS — Scene Decorators
 * 
 * Each scene type is a pure delta decorator that mutates specific allowed zones.
 * Decorators NEVER describe room architecture or structural walls — they only
 * specify seasonal, promotional, or environmental additions to editable zones.
 */

import { StudioZone } from "./studio.zones.ts";

export interface SceneDecorator {
  id: string;
  name: string;
  targetZones: Partial<Record<StudioZone, string[]>>;
  lightingModifier: string | null;
  forbiddenContent: string[];
}

export const SceneDecoratorRegistry: Record<string, SceneDecorator> = {
  fsc_signature: {
    id: "fsc_signature",
    name: "FSC Signature Flagship Studio",
    targetZones: {}, // Pure flagship studio — zero decorator additions
    lightingModifier: null,
    forbiddenContent: []
  },
  studio: {
    id: "studio",
    name: "FSC Studio Environment",
    targetZones: {}, // Alias for flagship studio
    lightingModifier: null,
    forbiddenContent: []
  },
  christmas_studio: {
    id: "christmas_studio",
    name: "FSC Christmas Festive Studio",
    targetZones: {
      [StudioZone.LEFT_DECOR]: [
        "Tall festive Christmas tree with hunter green velvet texture and matte gold baubles",
        "Garland accent along wall base"
      ],
      [StudioZone.RIGHT_DECOR]: [
        "Secondary festive Christmas tree with warm tungsten fairy light bokeh"
      ],
      [StudioZone.FOREGROUND]: [
        "FSC burgundy gift boxes with gold satin ribbons resting on marble floor"
      ],
      [StudioZone.BACKGROUND]: [
        "Soft holiday bokeh orbs in distant background background glow"
      ]
    },
    lightingModifier: "warm_holiday_2700K",
    forbiddenContent: [
      "cheap tinsel",
      "blue LED lights",
      "cold white temperature",
      "cartoon Santa imagery",
      "tacky plastic ornaments"
    ]
  },
  black_friday_studio: {
    id: "black_friday_studio",
    name: "FSC Black Friday High-Contrast Studio",
    targetZones: {
      [StudioZone.LIGHTING]: [
        "Dramatic high-contrast commercial spotlight (4000K) from directly above hero position"
      ],
      [StudioZone.LED_STRIP]: [
        "Intensified vivid magenta LED outline at 100% full brightness saturation"
      ],
      [StudioZone.FLOOR]: [
        "Polished obsidian-black mirror marble floor reflections"
      ],
      [StudioZone.BACKGROUND]: [
        "High-contrast dark moody atmosphere framing central arch"
      ]
    },
    lightingModifier: "dramatic_high_contrast_4000K",
    forbiddenContent: [
      "soft warm cozy lighting",
      "flowers or plants",
      "pastel colors",
      "cluttered discount banners"
    ]
  },
  luxury_white: {
    id: "luxury_white",
    name: "Ultra-Clean High Key Cyclorama Studio",
    targetZones: {
      [StudioZone.BACKGROUND]: [
        "Ultra-clean seamless white high-key cyclorama studio backdrop"
      ],
      [StudioZone.LIGHTING]: [
        "Shadowless diffuse soft key light with subtle ground shadow"
      ]
    },
    lightingModifier: "high_key_clean_5500K",
    forbiddenContent: [
      "dark shadows",
      "heavy textures",
      "warm yellow tint",
      "busy patterns"
    ]
  },
  lifestyle_home: {
    id: "lifestyle_home",
    name: "Opulent Residential Fashion Interior",
    targetZones: {
      [StudioZone.LEFT_DECOR]: [
        "Contemporary Italian velvet armchair in warm beige"
      ],
      [StudioZone.RIGHT_DECOR]: [
        "Sunlit floor-to-ceiling sheer linen curtains with soft morning light"
      ],
      [StudioZone.BACKGROUND]: [
        "Warm oak herringbone hardwood accents and warm neutral plaster"
      ]
    },
    lightingModifier: "golden_hour_lifestyle_3000K",
    forbiddenContent: [
      "cold neon",
      "harsh flash",
      "industrial pipes",
      "messy clutter"
    ]
  },
  outdoor_fashion: {
    id: "outdoor_fashion",
    name: "Parisian Fashion District Exterior",
    targetZones: {
      [StudioZone.BACKGROUND]: [
        "Haussmannian stone architecture facade, elegant boulevard backdrop with warm natural daylight"
      ],
      [StudioZone.FOREGROUND]: [
        "Clean sunlit limestone paving stones"
      ]
    },
    lightingModifier: "natural_daylight_5600K",
    forbiddenContent: [
      "studio spotlights",
      "dark night",
      "crowded background people",
      "traffic cars"
    ]
  },
  minimal_product_studio: {
    id: "minimal_product_studio",
    name: "Minimalist E-Commerce Pedestal Studio",
    targetZones: {
      [StudioZone.FOREGROUND]: [
        "Ultra-clean travertine surface with subtle organic shadow edge"
      ]
    },
    lightingModifier: "soft_diffuse_commercial_4500K",
    forbiddenContent: [
      "props",
      "clutter",
      "models",
      "distracting backgrounds"
    ]
  }
};

/**
 * Resolves a SceneDecorator by scene key.
 * Defaults to 'fsc_signature' (flagship studio with no decorator additions) if scene is unknown.
 */
export function resolveDecorator(sceneId: string = "fsc_signature"): SceneDecorator {
  const normalized = (sceneId || "fsc_signature").toLowerCase().trim();
  return SceneDecoratorRegistry[normalized] || SceneDecoratorRegistry["fsc_signature"];
}
