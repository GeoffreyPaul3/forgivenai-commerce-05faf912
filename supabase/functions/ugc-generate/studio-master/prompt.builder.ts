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

You MUST reproduce the exact physical interior shown below. This is NOT a creative brief. This is a technical reproduction order. Do NOT invent a new room. Do NOT simplify. Reproduce every element listed here exactly.

══ ELEMENT 1: BACK WALL ══
Full-width smooth cream/ivory plaster wall (#F2EBD9), floor-to-ceiling. No texture variation. No patterns. Pure warm cream.

══ ELEMENT 2: THE ARCH (most distinctive feature — MUST BE PRESENT) ══
A large, wide architectural arch centered on the back wall. The arch has a smooth, clean semicircular top.
  MAGENTA LED TRIM: The entire inner edge of the arch (both sides and the curved top) has a BRIGHT PINK-MAGENTA (#B0208D) glowing LED strip inset. This creates a vivid magenta halo/glow on the cream wall around the arch opening. This glowing magenta arch trim is the most distinctive visual signature of this studio — it MUST be visible and accurate.
  The wall SURFACE inside the arch opening is the same smooth warm cream plaster as the back wall (#F2EBD9). The arch interior is NOT dark, NOT shadowed — it is a brightly lit, cream-coloured recess.

══ ELEMENT 3: FSC LOGO (on the cream wall inside the arch) ══
Centered horizontally in the upper section of the arch, approximately 55–70% up the arch height.
  LOGO BAG ICON (top element): One LARGE magenta (#8B1B68) shopping bag, front and centre. Bold solid white capital letter "F" on its face — NO other text or logo on the bag. Behind-left: a smaller royal blue bag peeking out. Behind-right: a smaller lime-green bag peeking out. All bags have visible handles and volume.
  LOGO WORDMARK (below the bag icon): "Forgiven" in bold, rounded, dark plum-magenta sans-serif lettering. Directly below: "Shopping Centre" in smaller refined lettering.
  The logo is a physically mounted 3D wall sign with ~2cm depth, subtle drop shadow, warm specular highlights. NOT a flat 2D graphic.

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

══ LIGHTING ══
Warm, luminous studio lighting (3000K–3200K). Soft overhead key light. Warm amber sconces on both fluted panel sides. The magenta LED arch trim (#B0208D) casts a pink-magenta glow onto the surrounding cream wall. Gentle specular reflections on the marble floor and brass planter surface.
`.trim();

// ════════════════════════════════════════════════════════════════════════════
//  NEGATIVE DIRECTIVES — enforced on every generation
// ════════════════════════════════════════════════════════════════════════════
const STUDIO_NEGATIVE = `
ABSOLUTE PROHIBITIONS — ZERO TOLERANCE:
✗ DO NOT generate a plain tan/beige arch with no LED trim — the arch MUST have the magenta LED glow (#B0208D).
✗ DO NOT generate a tall rectangular display board, banner stand, or signage pillar in the centre — the ONLY centrepiece is the LOW CIRCULAR CREAM PODIUM.
✗ DO NOT generate a plain, minimal, or simplified studio — ALL elements (fluted panels, brass planter, shelf unit, marble floor, magenta LED arch, podium) MUST be present.
✗ DO NOT render any LV, Louis Vuitton monogram, or third-party logo inside the shopping bag on the wall — the bag face MUST show only a clean white capital letter "F".
✗ DO NOT place the model in the center of the frame blocking the logo or podium.
✗ DO NOT obscure, cover, or block the 3D Forgiven logo on the wall or the central arch.
✗ NO plain white background, NO plain grey backdrop, NO seamless paper roll.
✗ NO alternative room — no hotel lobby, office, bedroom, outdoor location, bare warehouse.
✗ NO harsh bright neon tubes outlining the arch — use soft, warm magenta LED cove lighting.
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

  // ── FRAME LAYOUT CONTRACT ──────────────────────────────────────────────────
  // This is the single most important rule. It controls spatial composition.
  const frameLayoutContract = `
FRAME LAYOUT CONTRACT — ABSOLUTE NON-NEGOTIABLE:
This is a SPLIT-FRAME composition. The frame has two distinct zones:
  LEFT/RIGHT ZONE (foreground): The HUMAN MODEL occupies this zone, standing beside and slightly in front of the central podium. The model is at either 30–38% frame width (left side) OR 62–70% frame width (right side). NEVER at 50% (dead centre).
  CENTRE ZONE (background): The arch, back wall, cream podium, and 3D Forgiven logo occupy this zone as the unblocked background.

CRITICAL POSITIONING RULES:
✗ The model MUST NOT stand inside the arch opening or directly in front of the logo.
✗ The model MUST NOT be centred at 50% frame width — that position belongs to the arch and logo.
✗ The model MUST NOT block or overlap the cream circular podium that sits at frame centre.
✓ The model stands OFF-CENTRE, beside the podium (not on it, not behind it).
✓ The model's body faces slightly inward toward the podium — elegant editorial stance.
✓ The model is FULL-BODY visible: head to toe including shoes, occupying 65%–75% of frame height.
✓ Direct 3200K warm key light on the model. Zero dark shadows obscuring the model or garment.
`.trim();

  // ── LOGO LOCK ─────────────────────────────────────────────────────────────
  // Explicit 3D architectural wall sign spec — prevents AI from rendering a flat 2D logo.
  const logoLock = `
FORGIVEN SHOPPING CENTRE WALL LOGO — 3D ARCHITECTURAL SIGNAGE (LOCKED):
The official FSC logo is a PHYSICALLY MOUNTED 3D WALL SIGN embedded in the cream plaster wall inside the arch. It has real physical depth (~2cm extrusion from the wall surface), casts a subtle shadow, and catches warm specular highlights. It is NEVER a flat 2D graphic, NEVER a cartoon illustration, NEVER a digital watermark.

The logo is composed of TWO separate 3D elements stacked vertically, mounted ABOVE the podium at roughly 55–70% of the arch height:

ELEMENT 1 — THE BAG ICON (top):
  • One LARGE magenta shopping bag (#8B1B68), front and centre. On its face: a crisp, solid, bold WHITE CAPITAL LETTER "F" — NOTHING ELSE on the bag face.
  • Behind and to the left of the large bag: a smaller royal blue bag peeking out.
  • Behind and to the right of the large bag: a smaller lime-green bag peeking out.
  • All three bags are 3D physical objects with volume, handles, and depth.

ELEMENT 2 — THE WORDMARK (directly below the bag icon, NO horizontal gap):
  • Line 1: "Forgiven" — bold, rounded sans-serif, dark plum/magenta (#8B1B68), 3D extruded lettering.
  • Line 2: "Shopping Centre" — smaller, refined, same dark lettering, centred beneath "Forgiven".
  • The wordmark is STACKED VERTICALLY, NOT side-by-side with the bags.

The entire logo lockup is centred horizontally in the arch and is NOT oversized (occupies ~20–25% of arch height).
`.trim();

  return [
    logoLock,          // ← FIRST: logo is priority #1 — must appear on the wall
    frameLayoutContract,
    `BACKGROUND ENVIRONMENT — FSC SIGNATURE STUDIO (REPRODUCE EXACTLY):`,
    FSC_STUDIO_CANONICAL,
    STUDIO_NEGATIVE,
  ].join("\n\n");
}

