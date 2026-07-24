import { useMemo } from "react";
import { OnboardingState, calcProfileCompletion } from "./useOnboardingState";

export function useSalesReadinessScore(state: OnboardingState) {
  return useMemo(() => {
    // 1. Profile Completeness (25%)
    const profileCompleteness = calcProfileCompletion(
      state.profileData,
      state.preferredCategories,
      state.salesChannels,
      state.estimatedCustomers
    );
    const profileScore = (profileCompleteness / 100) * 25;

    // 2. Training Completion Rate (25%)
    const totalModules = 7; // Fixed number of modules in Phase 4
    const completedModules = Object.values(state.trainingProgress).filter(
      (s) => s === "complete"
    ).length;
    const trainingScore = (completedModules / totalModules) * 25;

    // 3. Average Quiz Score (20%)
    const quizScores = Object.values(state.quizScores);
    const avgQuizScore =
      quizScores.length > 0
        ? quizScores.reduce((sum, score) => sum + score, 0) / quizScores.length
        : 0;
    const quizComponentScore = (avgQuizScore / 100) * 20;

    // 4. Assessment Score (20%)
    const assessmentScore = state.assessmentScore || 0;
    const assessmentComponentScore = (assessmentScore / 100) * 20;

    // 5. Category/Channel Breadth (10%)
    // Reward agents who select multiple channels/categories (up to 3 max for scoring)
    const categoryBreadth = Math.min(state.preferredCategories.length, 3) / 3;
    const channelBreadth = Math.min(state.salesChannels.length, 3) / 3;
    const breadthScore = ((categoryBreadth + channelBreadth) / 2) * 10;

    const totalScore = Math.round(
      profileScore +
        trainingScore +
        quizComponentScore +
        assessmentComponentScore +
        breadthScore
    );

    const clampedScore = Math.min(100, Math.max(0, totalScore));

    let readinessLabel = "Needs Work";
    if (clampedScore >= 90) readinessLabel = "Excellent";
    else if (clampedScore >= 75) readinessLabel = "Good";
    else if (clampedScore >= 50) readinessLabel = "Average";

    return {
      totalScore: clampedScore,
      readinessLabel,
      breakdown: {
        profileScore: Math.round(profileScore),
        trainingScore: Math.round(trainingScore),
        quizScore: Math.round(quizComponentScore),
        assessmentScore: Math.round(assessmentComponentScore),
        breadthScore: Math.round(breadthScore),
      },
    };
  }, [state]);
}
