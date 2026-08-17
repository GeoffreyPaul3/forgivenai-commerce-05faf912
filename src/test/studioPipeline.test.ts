import { describe, it, expect } from "vitest";
import { CreativePipeline } from "../services/studio/pipeline/creativePipeline";
import { EnvironmentLibrary } from "../services/studio/libraries/environmentLibrary";
import { StudioTokens } from "../services/studio/tokens/tokens";

describe("Studio White Color Adaptation", () => {
  it("should compile FSC Signature Studio with pristine white arch, white wall plaster, and white Calacatta marble floor", () => {
    const composition = CreativePipeline.execute({
      sceneTypeId: "fsc_signature",
      productCategory: "Fashion"
    });

    expect(composition.environment.architecturePrompt).toContain("pristine white arch");
    expect(composition.environment.architecturePrompt).toContain("seamless white plaster wall");
    expect(composition.environment.architecturePrompt).toContain("white Calacatta marble floor");
    expect(composition.environment.architecturePrompt).toContain("white circular podium");
    expect(composition.assembledPrompt).toContain("pristine white arch");
  });

  it("should configure studio tokens for pure white plaster and marble floor finish", () => {
    expect(StudioTokens.colors.CREAM_TRAVERTINE.hex).toBe("#FFFFFF");
    expect(StudioTokens.colors.CALACATTA_CREAM.hex).toBe("#FFFFFF");
    expect(StudioTokens.materials.TRAVERTINE.finish).toContain("white circular podium");
    expect(StudioTokens.materials.CREAM_PLASTER.finish).toContain("pristine white plaster wall");
  });
});
