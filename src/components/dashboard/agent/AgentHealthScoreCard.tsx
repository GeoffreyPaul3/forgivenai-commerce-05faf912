import { motion } from "framer-motion";
import { useAgentHealthScore } from "@/hooks/useAgentHealthScore";
import { Lightbulb, Activity } from "lucide-react";

interface AgentHealthScoreCardProps {
  profileCompletion: number;
  isCertified: boolean;
  trainingModulesCompleted: number;
  totalTrainingModules: number;
  recentOrderCount: number;
  commissionEarned: number;
}

export default function AgentHealthScoreCard(props: AgentHealthScoreCardProps) {
  const health = useAgentHealthScore({
    ...props,
    totalSales: 0,
  });

  const ARC_LEN = Math.PI * 45;

  const breakdownItems = [
    { label: "Profile", score: health.breakdown.profile, max: 20 },
    { label: "Certified", score: health.breakdown.certification, max: 20 },
    { label: "Training", score: health.breakdown.training, max: 20 },
    { label: "Activity", score: health.breakdown.activity, max: 15 },
    { label: "Earnings", score: health.breakdown.earnings, max: 15 },
    { label: "Consistency", score: health.breakdown.consistency, max: 10 },
  ];

  return (
    <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Agent Health Score</p>
      </div>

      {/* Gauge + label */}
      <div className="flex items-center gap-6">
        <div className="relative w-28 h-16 shrink-0">
          <svg viewBox="0 0 100 56" className="w-full h-full overflow-visible">
            <path d="M 5 52 A 45 45 0 0 1 95 52" fill="none" stroke="#e5e7eb" strokeWidth="8" strokeLinecap="round" />
            <motion.path
              d="M 5 52 A 45 45 0 0 1 95 52"
              fill="none"
              stroke={health.color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={ARC_LEN}
              initial={{ strokeDashoffset: ARC_LEN }}
              animate={{ strokeDashoffset: ARC_LEN * (1 - health.total / 100) }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
            <text x="50" y="50" textAnchor="middle" fontSize="14" fontWeight="900" fill={health.color}>
              {health.total}
            </text>
          </svg>
        </div>
        <div>
          <p className={`text-2xl font-heading font-black ${health.textColor}`}>{health.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Out of 100 points</p>
        </div>
      </div>

      {/* Breakdown bars */}
      <div className="space-y-2.5">
        {breakdownItems.map(item => (
          <div key={item.label} className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="font-bold text-muted-foreground">{item.label}</span>
              <span className="font-black text-foreground">{item.score}/{item.max}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: health.color }}
                initial={{ width: 0 }}
                animate={{ width: `${(item.score / item.max) * 100}%` }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Tips */}
      {health.tips.length > 0 && (
        <div className="space-y-2 border-t border-border/40 pt-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5" /> Improvement Tips
          </p>
          {health.tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/50 mt-1.5 shrink-0" />
              {tip}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
