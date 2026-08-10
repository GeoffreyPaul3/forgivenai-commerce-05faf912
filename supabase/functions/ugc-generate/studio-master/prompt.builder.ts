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
Full-width smooth cream/ivory plaster wall (#F2EBD9), floor-to-ceiling. No texture variation. No patterns. Pure warm cream.

══ ELEMENT 2: THE ARCH (most distinctive feature — MUST BE PRESENT) ══
A large, wide architectural arch centered on the back wall. The arch has a smooth, clean semicircular top.
  MAGENTA LED TRIM: The entire inner edge of the arch (both sides and the curved top) has a BRIGHT PINK-MAGENTA (#B0208D) glowing LED strip inset. This creates a vivid magenta halo/glow on the cream wall around the arch opening. This glowing magenta arch trim is the most distinctive visual signature of this studio — it MUST be visible and accurate.
  The wall SURFACE inside the arch opening is the same smooth warm cream plaster as the back wall (#F2EBD9). The arch interior is NOT dark, NOT shadowed — it is a brightly lit, cream-coloured recess.

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
Set INTO these panels: a RECESSED OPEN SHELF UNIT with three shelves, illuminated from behind with warm amber backlighting. Shelves hold luxury objects: top shelf — a small pink/dried floral arrangement; middle shelf — stacked cream books + a small gold object; bottom shelf — a brass/gold ring sculpture and small vase.
On the fluted panel: a slender vertical TUBE SCONCE light, matching the left side sconce.

══ ELEMENT 6: FLOOR ══
Continuous large-format POLISHED CREAM MARBLE tiles covering the entire studio floor. Warm cream/ivory tone (#F0E8D0). High-gloss surface with soft warm reflections of the studio lights and the arch magenta LED visible as a faint pink reflection on the marble.

══ ELEMENT 7: FOREGROUND PODIUM ══
At frame centre, in the foreground, directly in front of the arch: a LOW, WIDE circular disc pedestal made of smooth matte cream stone. Dimensions: approximately 55cm diameter, only 15–18cm tall. It is a flat, low platform — NOT a tall column or display stand. The podium sits on the marble floor at the very base of the arch.

Warm, luminous studio lighting (3000K–3200K). Soft overhead key light. Warm amber sconces on both fluted panel sides. The magenta LED arch trim (#B0208D) casts a pink-magenta glow onto the surrounding cream wall. Gentle specular reflections on the marble floor and brass planter surface.
`.trim();

// ════════════════════════════════════════════════════════════════════════════
//  NEGATIVE DIRECTIVES — enforced on every generation
// ════════════════════════════════════════════════════════════════════════════
const STUDIO_NEGATIVE = `
ABSOLUTE PROHIBITIONS — ZERO TOLERANCE:
✗ NO DUPLICATE LOGOS. NO SECOND LOGO. NO ADDITIONAL BRAND MARKS. NO REPEATED WORDMARK. NO OVERLAPPING LOGOS. NO STACKED LOGOS. NO EXTRA F SYMBOLS. NO EXTRA SHOPPING BAG ICONS. NO ADDITIONAL WALL SIGNAGE. NO GENERATED FORGIVEN LOGO. NO RECONSTRUCTED FORGIVEN LOGO. NO SECOND BRAND SIGN.
✗ DO NOT generate two models, twin models, or duplicate figures — EXACTLY ONE SINGLE HUMAN MODEL in the frame.
✗ DO NOT render random acronyms, text fragments, or gibberish on the wall.
✗ DO NOT generate wrinkled, creased, rumpled, or saggy clothing — the garment MUST be 100% freshly ironed, pressed, tailored, and pristine.
✗ DO NOT generate a plain tan/beige arch with no LED trim — the arch MUST have the magenta LED glow (#B0208D).
✗ DO NOT generate a tall rectangular display board, banner stand, or signage pillar in the centre — the ONLY centrepiece is the LOW CIRCULAR CREAM PODIUM.
✗ DO NOT generate a plain, minimal, or simplified studio — ALL elements (fluted panels, brass planter, shelf unit, marble floor, magenta LED arch, podium) MUST be present.
✗ DO NOT render any LV, Louis Vuitton monogram, or third-party logo inside the shopping bag on the wall — the bag face MUST show only a clean white capital letter "F".
✗ DO NOT place the model in the center of the frame blocking the logo or podium.
✗ DO NOT obscure, cover, or block the 3D Forgiven logo on the wall or the central arch.
✗ NO logo redesign, NO fake logo, NO altered logo, NO missing Shopping Centre text, NO distorted shopping bag, NO duplicate logo, NO floating 2D watermark overlays.
✗ NO plain white background, NO plain grey backdrop, NO seamless paper roll.
✗ NO alternative room — no hotel lobby, office, bedroom, outdoor location, bare warehouse.
✗ NO harsh bright neon tubes outlining the arch — use soft, warm magenta LED cove lighting.
✗ NO oversized, cartoonish, or neon glowing logos on the wall.
✗ NO recoloured garments. The product colour from the reference image is law.
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
      `PRODUCT PLACEMENT: The hero product is displayed prominently on the cream circular podium at frame centre.`,
      `CAMERA: ${sc.cameraProfile.promptDescription}`,
    ].join("\n");
  }

  return [
    `SHOT TYPE: Full-body editorial fashion photograph. FULL LENGTH — head to toe including shoes.`,
    `CRITICAL MODEL FRAMING & POSITIONING (FSC LOOKBOOK HERO STANDARD):`,
    `  • EXACTLY ONE SINGLE HUMAN MODEL: Standing in the frame (65%-75% height). DO NOT generate two models. DO NOT generate twin figures.`,
    `  • MODEL POSITION (BESIDE PODIUM): The model stands proudly beside the central podium at 65% frame width on the right (NOT pushed into the far corner or hidden behind plants).`,
    `  • PERFECT LIGHTING ON MODEL: Warm, luminous 3200K key light directly illuminating the model and garment. Vibrant, crisp detail, natural skin tones, zero dark corner shadows on the model.`,
    `  • UNBLOCKED BACKGROUND BRANDING: Because the model stands beside the podium at 65% width, the central arch, cream podium, and 3D Forgiven wall logo remain 100% visible and unblocked in the background centre.`,
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
    `HERO MODEL COMPOSITION: Prominent model (65%-75% height) standing beside the central podium at 65% width in bright warm studio key light. Central arch, 3D Forgiven wall logo, and cream podium remain 100% unblocked in the background centre. ` +
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
    `This generation uses the "${dec.name}" theme. Add the following thematic decorations and props into the studio environment (the permanent FSC studio arch, cream wall, 3D Forgiven logo, and cream podium MUST remain intact as the base structure):`,
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

  // ── FRAME LAYOUT CONTRACT ──────────────────────────────────────────────────
  const frameLayoutContract = `
HERO MODEL SPATIAL PLACEMENT CONTRACT:
• EXACTLY ONE SINGLE HUMAN MODEL standing in the frame (occupying 65%-75% height). DO NOT generate two models. DO NOT generate twin figures.
• POSITION: The model stands OFF-CENTRE on the RIGHT side of the podium (65% frame width), standing beside the low cream circular podium.
• The central arch and low cream circular podium remain visible and unblocked in the background centre.
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

