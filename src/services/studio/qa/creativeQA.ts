import { CreativeQAResult } from "../types/types";
import { CreativeQualityScorer } from "./creativeQualityScorer";
import { validateCreativeConstraints } from "../rules/creativeConstraints";

export function performCreativeQA(params: {
  assetIds: string[];
  hasPhysicalLogo: boolean;
  colorHex: string;
  ctr: number;
}): CreativeQAResult {
  const criticalErrors: string[] = [];
  const warnings: string[] = [];

  // Check 1: Constraint check
  const constraintCheck = validateCreativeConstraints(params.assetIds);
  if (!constraintCheck.valid) {
    criticalErrors.push(...constraintCheck.conflicts);
  }

  // Check 2: Physical logo mounting enforcement
  if (!params.hasPhysicalLogo) {
    criticalErrors.push("QA Failure: Logo must be 3D physically mounted inside studio architecture; floating or overlay logos are forbidden.");
  }

  // Check 3: Color policy
  if (params.colorHex.toLowerCase() === "#00ffff" || params.colorHex.toLowerCase() === "#00ff00") {
    criticalErrors.push("QA Failure: Neon cyan/green violates FSC brand color guidelines.");
  }

  // Evaluate Score
  const scoreBreakdown = CreativeQualityScorer.evaluateComposition({
    brandMatch: params.hasPhysicalLogo,
    lightingValid: true,
    compositionValid: true,
    productVisible: true,
    luxuryFinish: true,
    historicalCTR: params.ctr
  });

  if (!scoreBreakdown.passed) {
    warnings.push(`QA Warning: Total Quality Score ${scoreBreakdown.totalScore}/100 is below the 90-point enterprise threshold.`);
  }

  const valid = criticalErrors.length === 0 && scoreBreakdown.passed;

  return {
    valid,
    scoreBreakdown,
    warnings,
    criticalErrors
  };
}
