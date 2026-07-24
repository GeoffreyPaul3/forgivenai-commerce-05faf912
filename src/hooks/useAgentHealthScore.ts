import { useMemo } from "react";

interface AgentHealthFactors {
  profileCompletion: number;     // 0–100
  isCertified: boolean;
  trainingModulesCompleted: number;
  totalTrainingModules: number;
  recentOrderCount: number;      // last 30 days
  totalSales: number;            // MWK
  commissionEarned: number;      // MWK
}

export interface AgentHealthScore {
  total: number;          // 0–100
  label: "Inactive" | "At Risk" | "Active" | "Strong" | "Elite";
  color: string;
  textColor: string;
  breakdown: {
    profile: number;
    certification: number;
    training: number;
    activity: number;
    earnings: number;
    consistency: number;
  };
  tips: string[];
}

export function useAgentHealthScore(factors: AgentHealthFactors): AgentHealthScore {
  return useMemo(() => {
    // Profile completeness (0–20)
    const profile = Math.round((factors.profileCompletion / 100) * 20);

    // Certification (0–20)
    const certification = factors.isCertified ? 20 : 0;

    // Training completion (0–20)
    const trainingRatio = factors.totalTrainingModules > 0
      ? factors.trainingModulesCompleted / factors.totalTrainingModules
      : 0;
    const training = Math.round(trainingRatio * 20);

    // Recent activity — orders in last 30 days (0–15)
    const activity = Math.min(15, Math.round((factors.recentOrderCount / 10) * 15));

    // Earnings-based score (0–15)
    const earningsScore = Math.min(15, Math.round((factors.commissionEarned / 100000) * 15));

    // Sales consistency (orders > 0 = 10 pts, else 0)
    const consistency = factors.recentOrderCount > 0 ? 10 : 0;

    const total = Math.min(100, profile + certification + training + activity + earningsScore + consistency);

    const label: AgentHealthScore["label"] =
      total >= 85 ? "Elite" :
      total >= 70 ? "Strong" :
      total >= 50 ? "Active" :
      total >= 30 ? "At Risk" :
      "Inactive";

    const color =
      total >= 85 ? "#10b981" :
      total >= 70 ? "#3b82f6" :
      total >= 50 ? "#f59e0b" :
      total >= 30 ? "#f97316" :
      "#ef4444";

    const textColor =
      total >= 85 ? "text-emerald-600" :
      total >= 70 ? "text-blue-600" :
      total >= 50 ? "text-amber-600" :
      total >= 30 ? "text-orange-600" :
      "text-red-600";

    const tips: string[] = [];
    if (profile < 20) tips.push("Complete your profile to unlock payout features");
    if (!factors.isCertified) tips.push("Complete your certification to start selling");
    if (training < 20) tips.push("Finish more training modules to boost your skills");
    if (factors.recentOrderCount === 0) tips.push("Share products today — your first sale is closer than you think");
    if (factors.commissionEarned === 0) tips.push("Earn your first commission by converting a lead into a sale");

    return {
      total,
      label,
      color,
      textColor,
      breakdown: {
        profile,
        certification,
        training,
        activity,
        earnings: earningsScore,
        consistency,
      },
      tips: tips.slice(0, 3),
    };
  }, [factors]);
}
