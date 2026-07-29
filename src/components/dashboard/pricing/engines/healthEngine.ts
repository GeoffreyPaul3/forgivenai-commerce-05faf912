import { MarginResult, HealthResult } from './types';

export function computeHealth(margins: MarginResult, targetMarginPct: number): HealthResult {
  let score = 0;

  // Margin component (40 points)
  if (margins.netMarginPct >= targetMarginPct) score += 40;
  else if (margins.netMarginPct > 0) score += (margins.netMarginPct / targetMarginPct) * 40;

  // ROI component (40 points)
  if (margins.roi >= 30) score += 40;
  else if (margins.roi > 0) score += (margins.roi / 30) * 40;
  
  // Cost ratio component (20 points)
  if (margins.costRatio < 70) score += 20;
  else if (margins.costRatio < 100) score += ((100 - margins.costRatio) / 30) * 20;

  score = Math.min(100, Math.max(0, Math.round(score)));

  let tier: HealthResult['tier'] = 'Unprofitable';
  let color = 'text-red-500';

  if (score >= 95) {
    tier = 'Excellent';
    color = 'text-emerald-500';
  } else if (score >= 80) {
    tier = 'Healthy';
    color = 'text-green-500';
  } else if (score >= 60) {
    tier = 'Needs Review';
    color = 'text-amber-500';
  }

  return { score, tier, color };
}
