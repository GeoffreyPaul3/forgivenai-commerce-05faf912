import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Zap, Target, BookOpen, TrendingUp, RefreshCw } from "lucide-react";

interface Mission {
  id: string;
  title: string;
  description: string;
  target: number;
  xpReward: number;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
}

const DAILY_MISSIONS: Mission[] = [
  {
    id: "share_products",
    title: "Share 5 Products",
    description: "Send product links to potential customers via WhatsApp or social media",
    target: 5,
    xpReward: 50,
    icon: Target,
    color: "text-primary",
    bg: "bg-primary/5",
    border: "border-primary/20",
  },
  {
    id: "contact_customers",
    title: "Contact 10 Customers",
    description: "Reach out to 10 leads or existing customers today",
    target: 10,
    xpReward: 75,
    icon: TrendingUp,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  {
    id: "training_lesson",
    title: "Complete 1 Training Lesson",
    description: "Visit the Training Hub and complete any module",
    target: 1,
    xpReward: 40,
    icon: BookOpen,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
  {
    id: "daily_earnings",
    title: "Earn MWK 15,000 Today",
    description: "Generate commissions through confirmed orders",
    target: 1,
    xpReward: 100,
    icon: Zap,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
];

interface DailyProgress {
  date: string;
  progress: Record<string, number>;
  completed: Record<string, boolean>;
  totalXpEarned: number;
}

const storageKey = (userId: string) => `fsc_daily_missions_${userId}`;

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function loadProgress(userId: string): DailyProgress {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { date: getToday(), progress: {}, completed: {}, totalXpEarned: 0 };
    const parsed: DailyProgress = JSON.parse(raw);
    // Reset if it's a new day
    if (parsed.date !== getToday()) {
      return { date: getToday(), progress: {}, completed: {}, totalXpEarned: 0 };
    }
    return parsed;
  } catch {
    return { date: getToday(), progress: {}, completed: {}, totalXpEarned: 0 };
  }
}

function saveProgress(userId: string, data: DailyProgress) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(data));
  } catch {}
}

interface DailyMissionsProps {
  userId: string;
}

export default function DailyMissions({ userId }: DailyMissionsProps) {
  const [data, setData] = useState<DailyProgress>(() => loadProgress(userId));

  useEffect(() => {
    saveProgress(userId, data);
  }, [data, userId]);

  const updateProgress = (missionId: string, mission: Mission) => {
    setData(prev => {
      const current = prev.progress[missionId] || 0;
      if (prev.completed[missionId]) return prev;
      const next = Math.min(mission.target, current + 1);
      const justCompleted = next >= mission.target && !prev.completed[missionId];
      return {
        ...prev,
        progress: { ...prev.progress, [missionId]: next },
        completed: { ...prev.completed, [missionId]: justCompleted || prev.completed[missionId] },
        totalXpEarned: prev.totalXpEarned + (justCompleted ? mission.xpReward : 0),
      };
    });
  };

  const completedCount = DAILY_MISSIONS.filter(m => data.completed[m.id]).length;
  const totalXpAvailable = DAILY_MISSIONS.reduce((sum, m) => sum + m.xpReward, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-heading font-black text-base">Daily Missions</h3>
          </div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5 ml-9">
            {completedCount}/{DAILY_MISSIONS.length} complete · {data.totalXpEarned}/{totalXpAvailable} XP earned
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground/50" />
          <span className="text-[10px] font-bold text-muted-foreground/50">Resets daily</span>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${(completedCount / DAILY_MISSIONS.length) * 100}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      {/* Missions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {DAILY_MISSIONS.map((mission, i) => {
          const progress = data.progress[mission.id] || 0;
          const completed = data.completed[mission.id] || false;
          const pct = Math.min(100, (progress / mission.target) * 100);
          const Icon = mission.icon;

          return (
            <motion.div
              key={mission.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`relative rounded-2xl border p-4 space-y-3 transition-all ${mission.border} ${mission.bg} ${
                completed ? "opacity-80" : "hover:shadow-sm cursor-pointer"
              }`}
              onClick={() => !completed && updateProgress(mission.id, mission)}
            >
              {completed && (
                <div className="absolute top-3 right-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
              )}
              {!completed && (
                <div className="absolute top-3 right-3">
                  <Circle className="w-5 h-5 text-muted-foreground/30" />
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl ${mission.bg} border ${mission.border} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4.5 h-4.5 ${mission.color}`} />
                </div>
                <div className="min-w-0 flex-1 pr-6">
                  <p className={`font-heading font-black text-sm leading-tight ${completed ? "line-through text-muted-foreground" : ""}`}>
                    {mission.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{mission.description}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px]">
                  <span className="font-bold text-muted-foreground">{progress} / {mission.target}</span>
                  <span className={`font-black ${mission.color}`}>+{mission.xpReward} XP</span>
                </div>
                <div className="h-1.5 rounded-full bg-black/10 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      completed ? "bg-emerald-500" :
                      mission.color.replace("text-", "bg-").replace("/60", "").replace("/600", "-500")
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {!completed && (
                <p className="text-[9px] font-bold text-muted-foreground/60 text-center">
                  Tap to log progress
                </p>
              )}
            </motion.div>
          );
        })}
      </div>

      {completedCount === DAILY_MISSIONS.length && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-heading font-black text-emerald-800">All missions complete! 🎉</p>
            <p className="text-xs text-emerald-700/70">You've earned {data.totalXpEarned} XP today. Come back tomorrow for new missions.</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
