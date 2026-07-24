import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Star, Target, Crown, Award, Flame, BadgeCheck } from "lucide-react";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  condition: (data: AgentData) => boolean;
}

export interface AgentData {
  orderCount: number;
  totalEarnings: number;
  trainingCompleted: number;
  daysActive: number;
  firstSaleDate: string | null;
  profileCompleted: boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_sale",
    title: "First Sale",
    description: "Successfully complete your first customer order",
    icon: Target,
    condition: (data) => data.orderCount > 0,
  },
  {
    id: "top_seller",
    title: "Top Seller",
    description: "Reach 50+ total orders",
    icon: Crown,
    condition: (data) => data.orderCount >= 50,
  },
  {
    id: "product_expert",
    title: "Product Expert",
    description: "Complete 100% of your agent profile setup",
    icon: BadgeCheck,
    condition: (data) => data.profileCompleted,
  },
  {
    id: "training_master",
    title: "Training Master",
    description: "Complete all available training modules",
    icon: Star,
    condition: (data) => data.trainingCompleted >= 5, // Assuming 5 is all for now
  },
  {
    id: "streak_30",
    title: "30-Day Streak",
    description: "Stay active for 30 consecutive days",
    icon: Flame,
    condition: (data) => data.daysActive >= 30,
  },
  {
    id: "million_club",
    title: "Million Kwacha Club",
    description: "Earn over MWK 1,000,000 in total commissions",
    icon: Award,
    condition: (data) => data.totalEarnings >= 1000000,
  },
];

interface AchievementsPanelProps {
  data: AgentData;
}

const storageKey = (userId: string) => `fsc_achievements_${userId}`;

export default function AchievementsPanel({ data }: AchievementsPanelProps) {
  // In a real app, userId should be passed in. We'll use a dummy 'agent_data' key for now.
  const [unlocked, setUnlocked] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey("local"));
      if (stored) setUnlocked(JSON.parse(stored));
    } catch {}
  }, []);

  useEffect(() => {
    // Check for new unlocks
    let newlyUnlocked = false;
    const currentUnlocks = new Set(unlocked);

    ACHIEVEMENTS.forEach(ach => {
      if (!currentUnlocks.has(ach.id) && ach.condition(data)) {
        currentUnlocks.add(ach.id);
        newlyUnlocked = true;
      }
    });

    if (newlyUnlocked) {
      const arr = Array.from(currentUnlocks);
      setUnlocked(arr);
      localStorage.setItem(storageKey("local"), JSON.stringify(arr));
    }
  }, [data, unlocked]);

  return (
    <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="font-heading font-black text-sm">Achievements</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              {unlocked.length} of {ACHIEVEMENTS.length} Unlocked
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {ACHIEVEMENTS.map((ach, i) => {
          const isUnlocked = unlocked.includes(ach.id);
          const Icon = ach.icon;

          return (
            <motion.div
              key={ach.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`relative rounded-2xl p-4 flex flex-col items-center text-center space-y-2 border transition-all ${
                isUnlocked
                  ? "bg-gradient-to-b from-amber-50 to-orange-50/50 border-amber-200 shadow-sm"
                  : "bg-muted/10 border-border/50 opacity-60 grayscale"
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isUnlocked ? "bg-amber-100 text-amber-600" : "bg-muted text-muted-foreground"
              }`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className={`font-heading font-black text-xs ${isUnlocked ? "text-amber-900" : "text-muted-foreground"}`}>
                  {ach.title}
                </p>
                <p className="text-[9px] text-muted-foreground leading-snug mt-1">
                  {ach.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
