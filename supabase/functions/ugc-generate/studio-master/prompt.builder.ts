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

You are reproducing the EXACT physical studio environment shown in the reference image (studio.jpeg).
Do not design a new studio. Do not reinterpret. Reproduce what is there.

── BACK WALL & ARCH ──
Smooth warm cream/ivory plaster wall, full width and floor-to-ceiling.
In the centre of this wall is a large architectural arch with a smooth semicircular top.
  • The inner edge of the arch features recessed architectural cove lighting — a subtle, warm indirect LED strip that casts a soft, gentle ambient glow and faint warm magenta wash onto the cream plaster wall. (It is subtle architectural backlight, NOT a harsh bright neon tube).
  • The wall INSIDE the arch is smooth cream plaster.
  • Mounted on that inner cream wall, centered horizontally in the upper-middle section of the arch, is the official 3D FORGIVEN SHOPPING CENTRE ARCHITECTURAL LOGO EMBLEM:
    – The logo is sized elegantly and proportionally (occupies ~20-25% of the arch height, not oversized).
    – At top: The FSC shopping bag mark — a rich deep plum/magenta (#8B1B68) shopping bag with a crisp white capital letter "F" on its front face. Peeking out subtly behind its left side is a smaller royal blue bag shape, and behind its right side a smaller lime-green bag shape.
    – Directly below the bag: The wordmark "Forgiven" in clean, 3D-extruded dark plum/magenta (#8B1B68) lettering with elegant rounded sans-serif strokes.
    – Directly below "Forgiven": The subtitle "Shopping Centre" in smaller, refined dark lettering.
    – The logo is a physically mounted 3D wall sign with real depth (≈2cm extrusion), sharp architectural edges, soft specular highlights, and natural drop shadows onto the cream plaster wall behind it. It is NOT glowing neon, NOT a cartoon graphic, NOT a 2D watermark.

── LEFT SIDE (camera-left) ──
A full-height vertical wall section of dark charcoal fluted wood panels at the far-left edge.
In front of this panel stands a tall cylindrical planter made of polished brass/gold metal (~60cm height).
Inside the planter is a lush green tropical plant with large, full leaves (Bird of Paradise / Monstera).
Mounted on the fluted panel behind the plant: a slender vertical tube sconce light emitting a warm amber ambient glow (3000K).

── RIGHT SIDE (camera-right) ──
A full-height vertical wall section of dark charcoal fluted wood panels at the far-right edge.
Set into this fluted panel is a recessed vertical display shelf unit with three open shelves, subtly illuminated with warm backlighting. The shelves hold small luxury decorative objects (a slender white vase, stacked cream books, a brass ring sculpture).
Mounted on the fluted panel adjacent to the shelves: a slender vertical tube sconce light emitting a warm amber ambient glow (3000K).

── FLOOR ──
Continuous large-format polished tiles in warm cream/ivory marble across the entire studio floor plane. High-gloss surface finish with soft, warm specular reflections of the studio lighting.

── FOREGROUND PODIUM ──
At the centre of the frame in the foreground, directly in front of the arch: a low circular cylindrical display pedestal (~55cm diameter, ~16cm height) made of smooth matte cream stone. The podium is always present and centered.

── LIGHTING & ATMOSPHERE ──
Warm, luminous, high-end luxury retail studio lighting (3000K-3200K). Soft directional key light from above, warm ambient fill, gentle specular highlights on the marble floor and brass planter. Premium commercial fashion photography aesthetic (Louis Vuitton / Dior flagship boutique feel).
`.trim();

// ════════════════════════════════════════════════════════════════════════════
//  NEGATIVE DIRECTIVES — enforced on every generation
// ════════════════════════════════════════════════════════════════════════════
const STUDIO_NEGATIVE = `
ABSOLUTE PROHIBITIONS — ZERO TOLERANCE:
✗ DO NOT place the model in the center of the frame blocking the logo or podium.
✗ DO NOT obscure, cover, or block the 3D Forgiven logo on the wall or the central arch.
✗ NO plain white background, NO plain grey backdrop, NO seamless paper roll.
✗ NO alternative room — no hotel lobby, office, bedroom, outdoor location.
✗ NO harsh glowing pink neon tubes outlining the arch. Use soft recessed architectural lighting.
✗ NO oversized, cartoonish, or neon glowing logos on the wall.
✗ NO floating 2D watermark overlays or digital logo stamps in post-processing.
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
    `  • PROMINENT HERO MODEL SCALE: The model is tall, prominent, and clearly focused, occupying 65%–75% of the total frame height.`,
    `  • MODEL POSITION (BESIDE PODIUM): The model stands proudly beside the central podium — at 35% frame width on the left OR 65% frame width on the right (NOT pushed into the far corner or hidden behind plants).`,
    `  • PERFECT LIGHTING ON MODEL: Warm, luminous 3200K key light directly illuminating the model and garment. Vibrant, crisp detail, natural skin tones, zero dark corner shadows on the model.`,
    `  • UNBLOCKED BACKGROUND BRANDING: Because the model stands beside the podium (at 35% or 65% width), the central arch, cream podium, and 3D Forgiven wall logo remain 100% visible and unblocked in the background centre.`,
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
    `HERO MODEL COMPOSITION: Prominent model (65%-75% height) standing beside the central podium (at 35% or 65% width) in bright warm studio key light. Central arch, 3D Forgiven wall logo, and cream podium remain 100% unblocked in the background centre. ` +
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

// ════════════════════════════════════════════════════════════════════════════
//  VTON STUDIO BLOCK — injected into the VTON wanPrompt as the FIRST block
// ════════════════════════════════════════════════════════════════════════════
export function buildVTONStudioBlock(sceneType: string): string {
  const positioningDirective = `
CRITICAL MODEL FRAMING & POSITIONING DIRECTIVE (FSC LOOKBOOK HERO STANDARD):
• PROMINENT HERO MODEL SCALE: The model is tall, prominent, and clearly focused, occupying 65%–75% of the frame height.
• MODEL POSITION: The model stands proudly beside the central podium — at 35% frame width on the left OR 65% frame width on the right (NOT pushed into the far corner or hidden behind plants).
• PERFECT LIGHTING ON MODEL: Warm, bright 3200K key light directly illuminating the model and garment. Vibrant, crisp detail, natural skin tones, zero dark corner shadows on the model.
• UNBLOCKED BACKGROUND BRANDING: Central arch, cream podium, and 3D Forgiven Shopping Centre logo on the back wall MUST remain 100% visible and unblocked in the background centre.
`.trim();

  return [
    positioningDirective,
    `BACKGROUND ENVIRONMENT — FSC SIGNATURE STUDIO (REPRODUCE EXACTLY):`,
    FSC_STUDIO_CANONICAL,
    STUDIO_NEGATIVE,
  ].join("\n\n");
}
