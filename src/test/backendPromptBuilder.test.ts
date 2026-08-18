import { describe, it, expect } from "vitest";
import { FSC_STUDIO_CANONICAL, buildVTONStudioBlock } from "../../supabase/functions/ugc-generate/studio-master/prompt.builder";

describe("UGC Edge Function White Studio Prompts", () => {
  it("should contain pristine white plaster wall and white Calacatta marble floor in FSC_STUDIO_CANONICAL", () => {
    expect(FSC_STUDIO_CANONICAL).toContain("pristine white plaster wall");
    expect(FSC_STUDIO_CANONICAL).toContain("POLISHED WHITE MARBLE tiles");
    expect(FSC_STUDIO_CANONICAL).toContain("smooth matte white stone");
    expect(FSC_STUDIO_CANONICAL).not.toContain("#F2EBD9");
    expect(FSC_STUDIO_CANONICAL).not.toContain("cream/ivory plaster wall");
  });

  it("should build VTON studio block with white circular podium and marble floor", () => {
    const vtonBlock = buildVTONStudioBlock("studio");
    expect(vtonBlock).toContain("white circular podium");
    expect(vtonBlock).toContain("pristine white plaster wall");
  });
});
