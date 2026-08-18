/**
 * Enterprise Creative OS — Prompt Builder v4.2
 *
 * SOLE RESPONSIBILITY: Convert a SceneComposition into the final deterministic AI prompt.
 * No other file in this codebase constructs AI prompts.
 *
 * STUDIO CONTRACT:
 *   The FSC Signature Studio (src/assets/studio.jpeg) is the canonical, immutable
 *   visual identity of Forgiven Shopping Centre. The AI does NOT invent a studio —
 *   it REPRODUCES the one in studio.jpeg, exactly, every single time.
 *
 *   Scene types only add foreground/seasonal overlays. They never change the
 *   permanent studio architecture.
 */

import { SceneComposition } from "./composition.engine.ts";
import { resolveDecorator } from "./scene.decorators.ts";

export interface PromptBuilderExtras {
  referenceAnalysis?: {
    dominantColor: string;
    undertones?: string;
    material: string;
    finish: string;
    hardwareColor?: string;
    brandingNotes?: string;
  };
  campaign?: { name: string; theme?: string };
  failureDirective?: string;
  isVideo?: boolean;
}

// ════════════════════════════════════════════════════════════════════════════
//  FSC SIGNATURE STUDIO — CANONICAL REPRODUCTION BRIEF
//
//  Direct observation of studio.jpeg (100% visual fidelity contract).
// ════════════════════════════════════════════════════════════════════════════
export const FSC_STUDIO_CANONICAL = `
STUDIO REPRODUCTION DIRECTIVE — FSC FLAGSHIP STUDIO (NON-NEGOTIABLE):

You MUST reproduce the exact physical interior shown below. This is NOT a creative brief. This is a technical reproduction order. Do NOT invent a new room. Do NOT simplify. Reproduce every element listed here exactly.

══ ELEMENT 1: BACK WALL ══
Full-width smooth pristine white plaster wall (#FFFFFF), floor-to-ceiling. No texture variation. No patterns. Pure crisp white.

══ ELEMENT 2: THE ARCH (most distinctive feature — MUST BE PRESENT) ══
A large, wide architectural arch centered on the back wall. The arch has a smooth, clean semicircular top.
  MAGENTA LED TRIM: The entire inner edge of the arch (both sides and the curved top) has a BRIGHT PINK-MAGENTA (#B0208D) glowing LED strip inset. This creates a vivid magenta halo/glow on the white wall around the arch opening. This glowing magenta arch trim is the most distinctive visual signature of this studio — it MUST be visible and accurate.
  The wall SURFACE inside the arch opening is the same smooth pristine white plaster as the back wall (#FFFFFF). The arch interior is NOT dark, NOT shadowed — it is a brightly lit, white-coloured recess.

══ ELEMENT 3: OFFICIAL FSC LOGO (PRESERVE FROM STUDIO MASTER) ══
The studio master reference image (studio.jpeg) already contains the official Forgiven Shopping Centre wall-mounted logo inside the central arch.
  PRESERVE EXISTING LOGO: Preserve that exact wall logo from studio.jpeg as ONE physical architectural element.
  SINGLE INSTANCE: EXACTLY ONE logo exists inside the central arch.
  NO RECREATION: Do NOT generate, redraw, reconstruct, reinterpret, duplicate, repeat, mirror, stack, overlay, or add another logo.
  NO SECOND WORDMARK: Do NOT render duplicate text fragments, extra "Forgiven" wordmarks, or secondary shopping bag icons.

══ ELEMENT 4: LEFT SIDE (camera-left) ══
Far-left edge: a full-height section of deep charcoal/near-black fluted vertical wood panels (#1A1A1A). These panels have crisp vertical grooves running their full height.
In front of these panels: a tall cylindrical planter made of polished GOLD/BRASS metal (~60cm tall). Inside the planter: a lush dark-green tropical plant with large broad leaves (Monstera/Bird of Paradise). The plant is healthy, full, and large.
On the fluted panel, behind/above the planter: a slender vertical TUBE SCONCE light, casting a warm amber glow (3000K) downward.

══ ELEMENT 5: RIGHT SIDE (camera-right) ══
Far-right edge: a full-height section of deep charcoal/near-black fluted vertical wood panels (#1A1A1A), matching the left side.
Set INTO these panels: a RECESSED OPEN SHELF UNIT with three shelves, illuminated from behind with warm amber backlighting. Shelves hold luxury objects: top shelf — a small pink/dried floral arrangement; middle shelf — stacked white books + a small gold object; bottom shelf — a brass/gold ring sculpture and small vase.
On the fluted panel: a slender vertical TUBE SCONCE light, matching the left side sconce.

══ ELEMENT 6: FLOOR ══
Continuous large-format POLISHED WHITE MARBLE tiles covering the entire studio floor. Pure pristine white tone (#FFFFFF) with subtle light grey natural veining. High-gloss surface with soft reflections of the studio lights and the arch magenta LED visible as a faint pink reflection on the marble.

══ ELEMENT 7: FOREGROUND PODIUM ══
At frame centre, in the foreground, directly in front of the arch: a LOW, WIDE circular disc pedestal made of smooth matte white stone. Dimensions: approximately 55cm diameter, only 15–18cm tall. It is a flat, low platform — NOT a tall column or display stand. The podium sits on the marble floor at the very base of the arch.

Luminous commercial studio lighting (5000K daylight-calibrated white key lighting). Soft overhead key light. Warm amber sconces on both fluted panel sides. The magenta LED arch trim (#B0208D) casts a pink-magenta glow onto the surrounding pristine white wall. Gentle specular reflections on the white marble floor and brass planter surface.
`.trim();

// ════════════════════════════════════════════════════════════════════════════
//  NEGATIVE DIRECTIVES — enforced on every generation
// ════════════════════════════════════════════════════════════════════════════
const STUDIO_NEGATIVE = `
ABSOLUTE PROHIBITIONS — ZERO TOLERANCE:
✗ NO DUPLICATE LOGOS. NO SECOND LOGO. NO ADDITIONAL BRAND MARKS. NO REPEATED WORDMARK. NO OVERLAPPING LOGOS. NO STACKED LOGOS. NO EXTRA F SYMBOLS. NO EXTRA SHOPPING BAG ICONS. NO ADDITIONAL WALL SIGNAGE. NO GENERATED FORGIVEN LOGO. NO RECONSTRUCTED FORGIVEN LOGO. NO SECOND BRAND SIGN.
✗ NO CROPPED LEGS. NO CUT-OFF FEET. NO THIGH-LEVEL CROP. NO KNEE-LEVEL CROP. The model MUST be shown full-length head-to-toe with feet and shoes resting on the marble floor.
✗ NO WRONG GARMENT SILHOUETTE. If the product reference is a SKIRT, SKIRT SUIT, or DRESS — DO NOT generate trousers, pants, or jeans.
✗ DO NOT generate two models, twin models, or duplicate figures — EXACTLY ONE SINGLE HUMAN MODEL in the frame.
✗ DO NOT render random acronyms, text fragments, or gibberish on the wall.
✗ DO NOT generate wrinkled, creased, rumpled, or saggy clothing — the garment MUST be 100% freshly ironed, pressed, tailored, and pristine.
✗ DO NOT generate a plain tan/beige arch with no LED trim — the arch MUST have the magenta LED glow (#B0208D).
✗ DO NOT generate a tall rectangular display board, banner stand, or signage pillar in the centre — the ONLY centrepiece is the LOW CIRCULAR WHITE PODIUM.
✗ DO NOT generate a plain, minimal, or simplified studio — ALL elements (fluted panels, brass planter, shelf unit, white marble floor, magenta LED arch, white podium) MUST be present.
✗ DO NOT render any LV, Louis Vuitton monogram, or third-party logo inside the shopping bag on the wall — the bag face MUST show only a clean white capital letter "F".
✗ DO NOT place the model in the center of the frame blocking the logo or podium.
✗ DO NOT obscure, cover, or block the 3D Forgiven logo on the wall or the central arch.
✗ NO logo redesign, NO fake logo, NO altered logo, NO missing Shopping Centre text, NO distorted shopping bag, NO duplicate logo, NO floating 2D watermark overlays.
✗ NO plain grey backdrop, NO paper roll background.
✗ NO alternative room — no hotel lobby, office, bedroom, outdoor location, bare warehouse.
✗ NO harsh bright neon tubes outlining the arch — use soft, warm magenta LED cove lighting.
✗ NO oversized, cartoonish, or neon glowing logos on the wall.
✗ NO recoloured garments. The product colour and exact garment type (skirt vs pants vs dress) from the reference image is law!
✗ DO NOT generate trousers or pants when the reference product is a skirt or 2-piece skirt suit!
✗ DO NOT crop the model at knees, thighs, or ankles — full-length head-to-toe framing with feet and shoes visible on the marble floor is MANDATORY!
✗ NO mannequins. Real human models only.
✗ NOT a 3D render. NOT CGI. NOT illustration. NOT painting. REAL PHOTOGRAPH.
`.trim();

// ════════════════════════════════════════════════════════════════════════════
//  PRODUCT IDENTITY LOCK — highest priority on every generation
// ════════════════════════════════════════════════════════════════════════════
const PRODUCT_LOCK = `
PRODUCT IDENTITY LOCK — IMMUTABLE LAW:
You are a commercial photographer, not a designer. Your job is to PHOTOGRAPH the product
exactly as it appears in the reference image. You may not change anything about it.

MANDATORY:
✓ EXACT colour — if reference shows copper satin, output is copper satin. No substitution.
✓ EXACT silhouette — neckline, hem length, sleeve length, waistline. Match every mm.
✓ EXACT construction — every seam, button, zipper, strap, embroidery, label.
✓ EXACT material — satin looks like satin (sheen, drape). Denim looks like denim (texture).
✓ EXACT hardware — metal tone, clasp design, zip pull, buckle shape.
✓ IMPECCABLY IRONED & PERFECTLY FITTED — even if the vendor product reference has wrinkles or creases, the generated garment on the model MUST be 100% freshly pressed, professionally ironed, crisp, tailored, and perfectly fitted with smooth pristine fabric. ZERO wrinkles, ZERO creases.
`.trim();

// ════════════════════════════════════════════════════════════════════════════
//  SCENE DECORATOR → human-readable overlay text
// ════════════════════════════════════════════════════════════════════════════
function renderDecoratorOverlay(sc: SceneComposition): string | null {
  const lines: string[] = [];

  for (const [zone, items] of Object.entries(sc.decorator.targetZones)) {
    if (!items || (items as string[]).length === 0) continue;
    const itemList = (items as string[]).join(", ");

    switch (zone) {
      case "FLOOR_FOREGROUND":
        lines.push(`On the studio floor in the foreground: ${itemList}.`);
        break;
      case "WALL_LEFT":
        lines.push(`On the left fluted panel or left area: ${itemList}.`);
        break;
      case "WALL_RIGHT":
        lines.push(`On the right fluted panel or shelf area: ${itemList}.`);
        break;
      case "ARCH":
        lines.push(`Inside or around the arch area: ${itemList}.`);
        break;
      case "AMBIENT":
        lines.push(`Ambient atmosphere additions: ${itemList}.`);
        break;
      default:
        lines.push(`Additional props (${zone}): ${itemList}.`);
    }
  }

  if (lines.length === 0) return null;

  return [
    `SCENE OVERLAY — ${sc.decorator.name.toUpperCase()} (additions only, studio structure unchanged):`,
    ...lines,
    `NOTE: These additions layer onto the permanent studio. The arch, logo, podium, panels, planter, and shelves remain exactly as in the canonical studio description above.`
  ].join("\n");
}

// ════════════════════════════════════════════════════════════════════════════
//  MODEL POSITIONING & HERO FRAMING RULES — FSC LOOKBOOK STANDARD
// ════════════════════════════════════════════════════════════════════════════
function renderPositioning(sc: SceneComposition): string {
  const { allowsModel, compositionRules } = sc.productRule;

  if (!allowsModel) {
    return [
      `SHOT TYPE: Product-only hero shot. NO human model in frame.`,
      `PRODUCT PLACEMENT: The hero product is displayed prominently on the white circular podium at frame centre.`,
      `CAMERA: ${sc.cameraProfile.promptDescription}`,
    ].join("\n");
  }

  return [
    `SHOT TYPE: Full-body editorial fashion photograph. FULL LENGTH — head to toe including shoes.`,
    `CRITICAL MODEL FRAMING & POSITIONING (FSC LOOKBOOK HERO STANDARD):`,
    `  • EXACTLY ONE SINGLE HUMAN MODEL: Standing in the frame (65%-75% height). DO NOT generate two models. DO NOT generate twin figures.`,
    `  • MODEL POSITION (BESIDE PODIUM): The model stands proudly beside the central podium at 65% frame width on the right (NOT pushed into the far corner or hidden behind plants).`,
    `  • PERFECT LIGHTING ON MODEL: Daylight-calibrated commercial white key light directly illuminating the model and garment. Vibrant, crisp detail, natural skin tones, zero dark corner shadows on the model.`,
    `  • UNBLOCKED BACKGROUND BRANDING: Because the model stands beside the podium at 65% width, the central arch, white podium, and 3D Forgiven wall logo remain 100% visible and unblocked in the background centre.`,
    compositionRules.length > 0 ? `  • Additional rules: ${compositionRules.join(" ")}` : ``,
    `CAMERA: ${sc.cameraProfile.promptDescription}`,
  ].filter(Boolean).join("\n");
}

// ════════════════════════════════════════════════════════════════════════════
//  MAIN EXPORT — buildPromptFromComposition
// ════════════════════════════════════════════════════════════════════════════
export function buildPromptFromComposition(
  sc: SceneComposition,
  extras: PromptBuilderExtras = {}
): string {
  const blocks: string[] = [];

  // Header with explicit composition rule upfront
  blocks.push(
    `Photorealistic professional fashion editorial photograph for Forgiven Shopping Centre (FSC) flagship studio shoot. ` +
    `HERO MODEL COMPOSITION: Prominent model (65%-75% height) standing beside the central podium at 65% width in bright studio key light. Central arch, 3D Forgiven wall logo, and white podium remain 100% unblocked in the background centre. ` +
    `Output must be indistinguishable from a real medium-format fashion photography shot.`
  );

  // [1] STUDIO — always first, maximum conditioning weight
  blocks.push(FSC_STUDIO_CANONICAL);

  // [2] PRODUCT LOCK
  blocks.push(PRODUCT_LOCK);

  // [3] COMPOSITION & POSITIONING
  blocks.push(renderPositioning(sc));

  // [4] SCENE OVERLAY (seasonal / campaign)
  const overlay = renderDecoratorOverlay(sc);
  if (overlay) blocks.push(overlay);

  // [5] PRODUCT REFERENCE INTELLIGENCE
  if (extras.referenceAnalysis) {
    const r = extras.referenceAnalysis;
    blocks.push([
      `PRODUCT REFERENCE ANALYSIS (extracted from reference image — treat as ground truth):`,
      `  Exact colour: ${r.dominantColor}${r.undertones ? ` with ${r.undertones} undertones` : ``}.`,
      `  Material: ${r.material}. Finish: ${r.finish}.`,
      r.hardwareColor ? `  Hardware colour: ${r.hardwareColor}.` : ``,
      r.brandingNotes ? `  Branding details on product: ${r.brandingNotes}.` : ``,
      `  CRITICAL: The above colour is absolute law. Reproduce it exactly. Do not drift.`,
    ].filter(Boolean).join("\n"));
  }

  // [6] CAMPAIGN CONSISTENCY
  if (extras.campaign?.name) {
    blocks.push([
      `CAMPAIGN BRIEF — ${extras.campaign.name}:`,
      extras.campaign.theme ? `Theme: ${extras.campaign.theme}.` : ``,
      `All images in this campaign share the same studio, colour grade, and lighting. ` +
      `They must feel like a single continuous photoshoot with a consistent visual identity.`,
    ].filter(Boolean).join("\n"));
  }

  // [7] FAILURE CORRECTION
  if (extras.failureDirective) {
    blocks.push(`CORRECTION DIRECTIVE — FIX THIS SPECIFICALLY:\n${extras.failureDirective}`);
  }

  // [8] VIDEO (if applicable)
  if (extras.isVideo) {
    blocks.push(
      `VIDEO MOTION: Subtle natural human motion — gentle weight shift, fabric moves with ` +
      `realistic physics. Studio architecture is completely STATIC (arch, logo, podium, ` +
      `floor, panels do not move). Camera is stable.`
    );
  }

  // [9] ABSOLUTE NEGATIVES — always last, reinforces everything above
  blocks.push(STUDIO_NEGATIVE);

  return blocks.filter(Boolean).join("\n\n");
}

/**
 * Renders scene-specific decorator additions (e.g. Christmas tree for Christmas Studio,
 * gold ribbons for Black Friday, etc.) on top of the canonical studio.
 */
function renderVTONSceneDecorator(sceneType: string): string | null {
  const dec = resolveDecorator(sceneType);
  if (!dec || dec.id === "fsc_signature" || dec.id === "studio") {
    return null; // FSC Signature Studio is default — pure flagship studio, zero decorator additions
  }

  const zoneAdditions: string[] = [];
  for (const [zone, items] of Object.entries(dec.targetZones)) {
    if (items && items.length > 0) {
      zoneAdditions.push(`  • ${zone.toUpperCase()}: ${items.join(", ")}`);
    }
  }

  if (zoneAdditions.length === 0 && !dec.lightingModifier) return null;

  const lines = [
    `══ SCENE THEME DECORATIONS — ${dec.name.toUpperCase()} ══`,
    `This generation uses the "${dec.name}" theme. Add the following thematic decorations and props into the studio environment (the permanent FSC studio arch, white wall, 3D Forgiven logo, and white podium MUST remain intact as the base structure):`,
    ...zoneAdditions,
  ];

  if (dec.lightingModifier) {
    lines.push(`  • SCENE LIGHTING ATMOSPHERE: ${dec.lightingModifier}`);
  }

  if (dec.forbiddenContent && dec.forbiddenContent.length > 0) {
    lines.push(`  • SCENE PROHIBITIONS: Avoid ${dec.forbiddenContent.join(", ")}`);
  }

  return lines.join("\n");
}

// ════════════════════════════════════════════════════════════════════════════
//  VTON STUDIO BLOCK — injected into the VTON wanPrompt
// ════════════════════════════════════════════════════════════════════════════
export function buildVTONStudioBlock(sceneType: string): string {

  // ── SINGLE IMMUTABLE BRAND LOGO LOCK (PRESERVE EXISTING) ─────────────────
  const logoLock = `
BRAND GOVERNANCE — IMMUTABLE STUDIO BRANDING:
The studio master reference image (studio.jpeg) already contains the official Forgiven Shopping Centre wall-mounted logo.
PRESERVE THAT EXISTING LOGO EXACTLY AS SHOWN IN THE STUDIO MASTER REFERENCE.
It is a single physical architectural element of the studio.
• PRESERVE EXISTING LOGO: Preserve the single official wall logo from studio.jpeg.
• DO NOT generate, redraw, reconstruct, reinterpret, duplicate, repeat, mirror, stack, overlay, move, resize, or add another Forgiven Shopping Centre logo.
• EXACTLY ONE LOGO: There must be EXACTLY ONE physical Forgiven Shopping Centre logo on the studio wall.
• NO SECOND SIGNAGE: Do NOT create additional wordmarks, shopping-bag logos, F symbols, or brand signage.
• IMMUTABLE WALL ASSET: The existing wall logo is part of the immutable studio architecture.
`.trim();

  // ── FRAME LAYOUT & FULL-LENGTH FRAMING CONTRACT ───────────────────────────
  const frameLayoutContract = `
HERO MODEL SPATIAL PLACEMENT & FULL-LENGTH FRAMING CONTRACT:
• EXACTLY ONE SINGLE HUMAN MODEL standing in the frame (occupying 65%-75% height). DO NOT generate two models. DO NOT generate twin figures.
• FULL-LENGTH HEAD-TO-TOE FRAMING MANDATE: Camera MUST capture the model's ENTIRE HEIGHT from top of head down to ankles, feet, and shoes standing on the marble floor. ZERO CROPPING at thighs, knees, or ankles.
• POSITION: The model stands OFF-CENTRE on the RIGHT side of the podium (65% frame width), standing beside the low white circular podium.
• The central arch and low white circular podium remain visible and unblocked in the background centre.
`.trim();

  const sceneOverlay = renderVTONSceneDecorator(sceneType);

  return [
    logoLock,
    frameLayoutContract,
    `BACKGROUND ENVIRONMENT — FSC SIGNATURE STUDIO (REPRODUCE EXACTLY):`,
    FSC_STUDIO_CANONICAL,
    sceneOverlay,
    STUDIO_NEGATIVE,
  ].filter(Boolean).join("\n\n");
}


// ════════════════════════════════════════════════════════════════════════════
//  PRODUCT STUDIO MODE — Prompt Builder (ADDITIVE — nothing above is changed)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Absolute negative directives for product-only (no-model) compositions.
 * Applied in ADDITION to the existing STUDIO_NEGATIVE.
 */
export const PRODUCT_STUDIO_NEGATIVE = `
PRODUCT STUDIO MODE — ABSOLUTE PROHIBITIONS:
✗ NO HUMAN MODEL. NO PERSON. NO INDIVIDUAL. NO SUBJECT.
✗ NO HANDS. NO FINGERS. NO WRISTS. NO ARMS. NO LEGS. NO FEET. NO TORSO. NO HEAD. NO FACE.
✗ NO MANNEQUIN BODY. NO DRESS FORM BODY. NO GHOST MANNEQUIN.
✗ NO PERSON WEARING THE PRODUCT.
✗ NO PERSON HOLDING THE PRODUCT.
✗ NO PERSON CARRYING THE PRODUCT.
✗ NO HUMAN LIMBS INTERACTING WITH THE PRODUCT IN ANY WAY.
✗ DO NOT RECOLOR THE PRODUCT. The product must retain its exact reference image color.
✗ DO NOT SHIFT THE HUE. DO NOT CHANGE SATURATION. DO NOT DESATURATE.
✗ DO NOT REDESIGN THE PRODUCT. DO NOT SIMPLIFY. DO NOT ALTER PROPORTIONS.
✗ DO NOT SUBSTITUTE THE PRODUCT WITH A SIMILAR BUT DIFFERENT PRODUCT.
✗ DO NOT CHANGE MATERIALS. DO NOT CHANGE HARDWARE. DO NOT INVENT NEW HARDWARE. DO NOT REMOVE EXISTING HARDWARE.
✗ DO NOT DUPLICATE THE PRODUCT unless the composition explicitly requires a pair (e.g. shoes).
✗ DO NOT MERGE MULTIPLE PRODUCTS INTO A SINGLE SHAPE.
✗ DO NOT PLACE THE PRODUCT FLOATING IN MID-AIR — it must rest on a physical surface.
✗ DO NOT GENERATE A GENERIC WHITE OR GREY STUDIO BACKDROP.
`.trim();

/** Composition-specific product placement directives. */
function getProductCompositionDirective(compositionType: string, _category: string): string {
  const ct = (compositionType || "PRODUCT_HERO_PODIUM").toUpperCase().trim();

  if (ct.includes("PAIR")) {
    return [
      `COMPOSITION — PRODUCT PAIR DISPLAY:`,
      `Arrange the product as an elegantly spaced pair displayed side-by-side on or beside the podium.`,
      `Each piece must be clearly individual and physically separate. Maintain realistic scale and perspective.`,
      `Left piece slightly angled, right piece mirror-angled. Both rest on the podium surface.`,
      `NO FEET. NO LEGS. NO MODEL. The pair is displayed as a standalone product composition.`,
    ].join("\n");
  }
  if (ct.includes("MACRO") || ct.includes("DETAIL")) {
    return [
      `COMPOSITION — PRODUCT MACRO DETAIL SHOT:`,
      `Extreme close-up emphasising material texture, surface craftsmanship, stitching, hardware, and finish.`,
      `Fill 70–80% of the frame with the product hero detail. Shallow depth of field (f/2.8).`,
      `Studio background (arch, podium edge) softly visible in the far background bokeh.`,
    ].join("\n");
  }
  if (ct.includes("MULTI")) {
    return [
      `COMPOSITION — MULTI-PRODUCT DISPLAY:`,
      `Arrange all supplied products in a deliberate premium still-life composition.`,
      `Products must be INDIVIDUALLY IDENTIFIABLE — do NOT merge them into a single shape.`,
      `Use spatial hierarchy: PRIMARY product at centre-foreground, secondary products flanking.`,
      `Maintain realistic physical scale. NO HUMAN. NO MODEL.`,
    ].join("\n");
  }
  if (ct.includes("PACKAGING")) {
    return [
      `COMPOSITION — PRODUCT + PACKAGING DISPLAY:`,
      `Arrange the hero product alongside its supplied packaging (box, bag, or case).`,
      `Primary product is placed upright and centre-prominent on the podium.`,
      `Preserve ALL typography, logos, and color of the packaging exactly as in the reference.`,
      `Do NOT hallucinate or alter brand text on the packaging. NO PERSON. NO HANDS.`,
    ].join("\n");
  }
  if (ct.includes("THREE_QUARTER") || ct.includes("THREE-QUARTER")) {
    return [
      `COMPOSITION — PRODUCT THREE-QUARTER VIEW:`,
      `Position the product at a premium three-quarter camera angle (approximately 30°–45° off-centre).`,
      `The product occupies 60%–70% of the frame. Studio architecture clearly visible behind it.`,
      `Product rests naturally on the white podium surface.`,
    ].join("\n");
  }
  // Default: PRODUCT_HERO_PODIUM
  return [
    `COMPOSITION — PRODUCT HERO PODIUM:`,
    `A single hero product is positioned centrally on the white circular stone podium at frame centre.`,
    `Product occupies 55%–65% of the frame height. Premium eye-level camera angle.`,
    `The product is placed in a natural, physically believable resting position.`,
    `The signature FSC arch and wall logo remain fully visible and unobstructed in the background.`,
    `Warm, directional 3200K studio key light — crisp texture, realistic contact shadows.`,
  ].join("\n");
}

/** Category-specific product placement notes. */
function getProductCategoryHint(category: string): string {
  const cat = (category || "").toLowerCase();

  if (cat.includes("handbag") || cat.includes("bag") || cat.includes("purse") || cat.includes("tote")) {
    return `HANDBAG PLACEMENT:\n• Display the bag upright in a natural resting position on the podium.\n• Preserve: leather color, quilting, chain strap, top handles, hardware clasps, stitching.\n• NO person. NO hand holding the bag. NO body wearing the bag.`;
  }
  if (cat.includes("shoe") || cat.includes("heel") || cat.includes("sneaker") || cat.includes("footwear") || cat.includes("boot") || cat.includes("sandal")) {
    return `SHOE / FOOTWEAR PLACEMENT:\n• Display the pair in an elegant angled arrangement on the podium.\n• Preserve: exact color, material, sole design, toe shape, heel geometry, hardware, branding.\n• ABSOLUTELY NO FEET. NO LEGS. NO MODEL.`;
  }
  if (cat.includes("watch") || cat.includes("timepiece")) {
    return `WATCH PLACEMENT:\n• Display the watch inside an open luxury watch box on the podium, OR laid flat on a premium surface.\n• Preserve: dial design, indices, hands, bezel, crown, bracelet/strap.\n• NO wrist. NO arm. NO person.`;
  }
  if (cat.includes("jewelry") || cat.includes("jewellery") || cat.includes("necklace") || cat.includes("ring") || cat.includes("earring") || cat.includes("bracelet") || cat.includes("pendant")) {
    return `JEWELRY PLACEMENT:\n• Display on a premium jewelry stand, velvet tray, or marble podium surface.\n• Necklaces: elegant drape on a bust stand — NO human neck. Rings: on a ring stand — NO human finger.\n• Preserve: metal color, gemstones, setting design, chain link structure.`;
  }
  if (cat.includes("perfume") || cat.includes("fragrance") || cat.includes("cologne")) {
    return `PERFUME PLACEMENT:\n• Display the bottle upright on the podium. Packaging placed naturally beside it when supplied.\n• Preserve: exact bottle silhouette, glass colour, label placement, cap shape.\n• NO person. NO hand holding the bottle.`;
  }
  if (cat.includes("cosmetic") || cat.includes("beauty") || cat.includes("makeup") || cat.includes("skincare")) {
    return `COSMETICS PLACEMENT:\n• Arrange beauty products on the podium in an elegant hero composition.\n• Preserve: exact product colors, packaging design, typography, logos.\n• NO person. NO hand.`;
  }
  return `PRODUCT PLACEMENT:\n• Display the product prominently on the white circular studio podium.\n• Preserve all visual details from the reference image exactly.\n• NO person. NO model.`;
}

/**
 * Builds the deterministic prompt for Product Studio Mode generations.
 *
 * Call this instead of buildPromptFromComposition() when the product is a
 * non-wearable item (handbag, shoes, jewelry, perfume, watch, cosmetics, etc.).
 */
export function buildProductStudioPrompt(params: {
  compositionType?: string;
  category?: string;
  productName?: string;
  productDescription?: string;
  sceneType?: string;
  referenceAnalysis?: {
    dominantColor: string;
    undertones?: string;
    material: string;
    finish: string;
    hardwareColor?: string;
    brandingNotes?: string;
    shape?: string;
    distinctiveDetails?: string;
  };
  campaign?: { name: string; theme?: string };
  failureDirective?: string;
}): string {
  const {
    compositionType = "PRODUCT_HERO_PODIUM",
    category = "product",
    productName = "product",
    productDescription = "",
    referenceAnalysis,
    campaign,
    failureDirective,
  } = params;

  const blocks: string[] = [];

  // [1] Preamble + STUDIO MASTER
  blocks.push(
    `Photorealistic premium commercial product photograph for Forgiven Shopping Centre (FSC). ` +
    `PRODUCT STUDIO MODE: The product is the sole visual hero. No human model. ` +
    `Output must be indistinguishable from a real medium-format product photography campaign shot.`
  );
  blocks.push(FSC_STUDIO_CANONICAL);

  // [2] Brand / Logo Governance
  blocks.push(
    `BRAND GOVERNANCE — IMMUTABLE STUDIO BRANDING:\n` +
    `The studio master reference already contains the official Forgiven Shopping Centre wall-mounted logo.\n` +
    `• EXACTLY ONE logo. Do NOT generate, redraw, reconstruct, duplicate, stack, or add a second logo.\n` +
    `• DO NOT generate random brand text, distorted letters, or approximate wordmarks on the wall.`
  );

  // [3] Product Identity Lock
  blocks.push(
    `PRODUCT IDENTITY LOCK — IMMUTABLE LAW:\n` +
    `You are a commercial product photographer. Your job is to PHOTOGRAPH the supplied product exactly.\n` +
    `PRODUCT REFERENCE IS THE SINGLE SOURCE OF TRUTH.\n` +
    `• DO NOT reinterpret, redesign, simplify, or reimagine the product.\n` +
    `• DO NOT substitute the product with a different model, variant, or similar-looking product.\n` +
    `• DO NOT merge this product with another product.\n` +
    `• DO NOT duplicate the product unless the composition explicitly requires a pair.\n` +
    `• PRESERVE exact product proportions, silhouette, geometry, hardware, seams, stitching, patterns, and brand markings.\n` +
    `Product: ${productName}${productDescription ? ` — ${productDescription}` : ""}.`
  );

  // [4] Product Color Lock
  blocks.push(
    `PRODUCT COLOR LOCK — ABSOLUTE LAW:\n` +
    `The product's color in the output MUST EXACTLY MATCH the color in the uploaded product reference image.\n` +
    `• Preserve the exact hue, saturation, and lightness of the product's primary color.\n` +
    `• DO NOT recolor the product based on studio lighting temperature.\n` +
    `• DO NOT shift the hue toward any ambient tone.\n` +
    `• The studio lighting may wrap naturally around the product — the product BASE COLOR must remain faithful.\n` +
    (referenceAnalysis ? `Confirmed product color: ${referenceAnalysis.dominantColor}${referenceAnalysis.undertones ? ` (${referenceAnalysis.undertones} undertones)` : ""}.` : "")
  );

  // [5] Material / Texture / Shape Lock
  if (referenceAnalysis) {
    const matLines: string[] = [
      `MATERIAL, TEXTURE & SHAPE LOCK:`,
      `• Material: ${referenceAnalysis.material}. Finish: ${referenceAnalysis.finish}.`,
    ];
    if (referenceAnalysis.hardwareColor) matLines.push(`• Hardware color: ${referenceAnalysis.hardwareColor}.`);
    if (referenceAnalysis.shape) matLines.push(`• Product shape: ${referenceAnalysis.shape}.`);
    if (referenceAnalysis.distinctiveDetails) matLines.push(`• Key details: ${referenceAnalysis.distinctiveDetails}.`);
    if (referenceAnalysis.brandingNotes) matLines.push(`• Product branding/markings: ${referenceAnalysis.brandingNotes}.`);
    blocks.push(matLines.join("\n"));
  }

  // [6] Composition Directive
  blocks.push(getProductCompositionDirective(compositionType, category));

  // [7] Category-Specific Placement
  blocks.push(getProductCategoryHint(category));

  // [8] Camera & Lighting
  blocks.push(
    `CAMERA & LIGHTING:\n` +
    `• Camera: Medium format equivalent, 85mm–90mm prime lens.\n` +
    `• Aperture: f/4–f/8 for product sharpness with natural background separation.\n` +
    `• Lighting: Daylight-calibrated commercial white studio key light. Soft octabox from upper-left.\n` +
    `• Secondary fill: soft reflector on opposite side — eliminates harsh shadows while preserving depth.\n` +
    `• Foreground: gentle contact shadow/reflection on the polished white marble floor.\n` +
    `• The magenta arch LED glow (#B0208D) creates a vivid ambient halo in the background.`
  );

  // [9] Reference Analysis block
  if (referenceAnalysis) {
    const refLines: string[] = [
      `PRODUCT REFERENCE ANALYSIS (ground truth from reference image):`,
      `  Exact colour: ${referenceAnalysis.dominantColor}${referenceAnalysis.undertones ? ` with ${referenceAnalysis.undertones} undertones` : ""}.`,
      `  Material: ${referenceAnalysis.material}. Finish: ${referenceAnalysis.finish}.`,
    ];
    if (referenceAnalysis.hardwareColor) refLines.push(`  Hardware colour: ${referenceAnalysis.hardwareColor}.`);
    if (referenceAnalysis.brandingNotes) refLines.push(`  Product branding: ${referenceAnalysis.brandingNotes}.`);
    refLines.push(`  CRITICAL: The above is absolute law. Reproduce it exactly. Do not drift from reference.`);
    blocks.push(refLines.join("\n"));
  }

  // Campaign brief (optional)
  if (campaign?.name) {
    blocks.push(
      `CAMPAIGN BRIEF — ${campaign.name}:\n` +
      (campaign.theme ? `Theme: ${campaign.theme}.\n` : "") +
      `All images in this campaign share the same studio, colour grade, and lighting.`
    );
  }

  // Failure correction (retry)
  if (failureDirective) {
    blocks.push(`CORRECTION DIRECTIVE — FIX THIS SPECIFICALLY:\n${failureDirective}`);
  }

  // [10] Product Studio Negative
  blocks.push(PRODUCT_STUDIO_NEGATIVE);

  // [11] Studio Governance Negative (inherited)
  blocks.push(
    `STUDIO GOVERNANCE — ABSOLUTE PROHIBITIONS (inherited):\n` +
    `✗ NO DUPLICATE LOGOS. NO SECOND LOGO. ONE official FSC logo only.\n` +
    `✗ DO NOT redesign the FSC studio. DO NOT replace the arch or white wall.\n` +
    `✗ DO NOT generate random text or acronyms on the wall.\n` +
    `✗ NOT a 3D render. NOT CGI. NOT illustration. REAL PRODUCT PHOTOGRAPH.\n` +
    `✗ DO NOT generate an alternative room or location.`
  );

  blocks.push(`Output: photorealistic luxury commercial product photograph, indistinguishable from a real medium-format camera shot by a world-class product photographer.`);

  return blocks.filter(Boolean).join("\n\n");
}

