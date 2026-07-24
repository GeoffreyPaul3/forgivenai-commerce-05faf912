import { motion } from "framer-motion";
import { Brain, TrendingUp, BookOpen, AlertCircle, CheckCircle2 } from "lucide-react";

interface AIPerformanceCoachProps {
  topCategories: string[];       // what the agent sells most
  preferredCategories: string[]; // from onboarding profile
  recentOrderCount: number;
  trainingModulesCompleted: number;
  totalTrainingModules: number;
  commissionEarned: number;
  isCertified: boolean;
}

interface CoachInsight {
  type: "opportunity" | "warning" | "success" | "tip";
  message: string;
}

function generateInsights(props: AIPerformanceCoachProps): CoachInsight[] {
  const insights: CoachInsight[] = [];

  const trainingPct = props.totalTrainingModules > 0
    ? (props.trainingModulesCompleted / props.totalTrainingModules) * 100
    : 0;

  // Certification gap
  if (!props.isCertified) {
    insights.push({
      type: "warning",
      message: "Complete your certification to unlock full commission rates and product access.",
    });
  }

  // Training gaps vs preferred categories
  if (trainingPct < 50) {
    insights.push({
      type: "opportunity",
      message: `Only ${Math.round(trainingPct)}% of training complete. Agents who finish training earn 2× more commission in their first month.`,
    });
  }

  // Category mismatch — selling well but not in preferred categories
  if (props.topCategories.length > 0 && props.preferredCategories.length > 0) {
    const uncoveredCategories = props.preferredCategories.filter(
      cat => !props.topCategories.some(tc => tc.toLowerCase().includes(cat.toLowerCase().split(" ")[0]))
    );
    if (uncoveredCategories.length > 0) {
      insights.push({
        type: "tip",
        message: `You're strong in your current categories, but ${uncoveredCategories[0]} products from your profile are untapped. Adding them to your promotion kit could expand your reach.`,
      });
    }
  }

  // Low activity
  if (props.recentOrderCount === 0) {
    insights.push({
      type: "warning",
      message: "No orders in the last 30 days. Try sharing 3 products today — even one share can start a conversation that becomes a sale.",
    });
  } else if (props.recentOrderCount < 5) {
    insights.push({
      type: "opportunity",
      message: `${props.recentOrderCount} orders this month is a great start! Agents who reach 10+ orders per month typically unlock Silver tier within 60 days.`,
    });
  } else {
    insights.push({
      type: "success",
      message: `Strong activity with ${props.recentOrderCount} orders this month! Focus on upselling complementary products to increase your average order value.`,
    });
  }

  // Earnings milestone
  if (props.commissionEarned >= 100000) {
    insights.push({
      type: "success",
      message: `You've crossed MWK ${(props.commissionEarned / 1000).toFixed(0)}k in commission — you're on track for the Million Kwacha Club!`,
    });
  }

  return insights.slice(0, 3);
}

const iconMap = {
  opportunity: TrendingUp,
  warning: AlertCircle,
  success: CheckCircle2,
  tip: BookOpen,
};

const styleMap = {
  opportunity: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", icon: "text-blue-500" },
  warning: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", icon: "text-amber-500" },
  success: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", icon: "text-emerald-500" },
  tip: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-800", icon: "text-purple-500" },
};

export default function AIPerformanceCoach(props: AIPerformanceCoachProps) {
  const insights = generateInsights(props);

  return (
    <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Brain className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-heading font-black text-sm">AI Performance Coach</p>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Personalized Insights</p>
        </div>
      </div>

      {/* Insights */}
      <div className="space-y-3">
        {insights.map((insight, i) => {
          const Icon = iconMap[insight.type];
          const style = styleMap[insight.type];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-2xl border ${style.bg} ${style.border} p-4 flex gap-3`}
            >
              <Icon className={`w-4 h-4 ${style.icon} shrink-0 mt-0.5`} />
              <p className={`text-xs font-medium ${style.text} leading-relaxed`}>{insight.message}</p>
            </motion.div>
          );
        })}
      </div>

      {insights.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">Complete your profile to receive personalized coaching.</p>
        </div>
      )}
    </div>
  );
}
