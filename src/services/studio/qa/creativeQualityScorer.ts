import { QualityScoreBreakdown } from "../types/types";

export class CreativeQualityScorer {
  public static evaluateComposition(params: {
    brandMatch: boolean;
    lightingValid: boolean;
    compositionValid: boolean;
    productVisible: boolean;
    luxuryFinish: boolean;
    historicalCTR: number;
  }): QualityScoreBreakdown {
    const brandConsistency = params.brandMatch ? 25 : 10;
    const lightingHarmony = params.lightingValid ? 20 : 8;
    const compositionalBalance = params.compositionValid ? 20 : 10;
    const productVisibility = params.productVisible ? 15 : 5;
    const luxuryIndex = params.luxuryFinish ? 10 : 4;
    
    // Scale CTR to score out of 10 (e.g. 0.07 CTR = 9.5)
    const conversionScore = Math.min(10, Math.round(params.historicalCTR * 135));

    const totalScore = brandConsistency + lightingHarmony + compositionalBalance + productVisibility + luxuryIndex + conversionScore;

    return {
      brandConsistency,
      lightingHarmony,
      compositionalBalance,
      productVisibility,
      luxuryIndex,
      conversionScore,
      totalScore,
      passed: totalScore >= 90
    };
  }
}
