import { motion } from "framer-motion";
import { Check, Target, Rocket, DollarSign, Users, Award } from "lucide-react";
import { AgentData } from "./AchievementsPanel";

interface SuccessJourneyProps {
  certifiedAt: string | null;
  data: AgentData;
}

export default function SuccessJourney({ certifiedAt, data }: SuccessJourneyProps) {
  // If not certified, don't show the journey
  if (!certifiedAt) return null;

  const daysSinceCertification = Math.floor(
    (Date.now() - new Date(certifiedAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  const MILESTONES = [
    {
      id: "certified",
      label: "Certified",
      icon: Award,
      completed: true, // If they are here, they are certified
      target: 0,
      current: 1,
    },
    {
      id: "first_sale",
      label: "First Sale",
      icon: Rocket,
      completed: data.orderCount > 0,
      target: 1,
      current: Math.min(1, data.orderCount),
    },
    {
      id: "first_100k",
      label: "MWK 100k Commission",
      icon: DollarSign,
      completed: data.totalEarnings >= 100000,
      target: 100000,
      current: Math.min(100000, data.totalEarnings),
    },
    {
      id: "10_orders",
      label: "10 Orders",
      icon: Target,
      completed: data.orderCount >= 10,
      target: 10,
      current: Math.min(10, data.orderCount),
    },
    {
      id: "top_seller",
      label: "Top Seller (50+)",
      icon: Users,
      completed: data.orderCount >= 50,
      target: 50,
      current: Math.min(50, data.orderCount),
    },
  ];

  return (
    <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm space-y-6 overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-black text-sm">Success Journey</h3>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
            Day {daysSinceCertification}
          </p>
        </div>
      </div>

      <div className="relative">
        {/* Background track */}
        <div className="absolute top-5 left-6 right-6 h-1 bg-muted/30 rounded-full" />
        
        {/* Progress track */}
        <div className="absolute top-5 left-6 h-1 bg-emerald-500 rounded-full transition-all duration-1000 ease-out" 
             style={{ width: `calc(${Math.max(0, (MILESTONES.filter(m => m.completed).length - 1) / (MILESTONES.length - 1)) * 100}% - 48px)` }} />

        <div className="relative flex justify-between">
          {MILESTONES.map((m, i) => {
            const Icon = m.icon;
            const isCompleted = m.completed;
            const isNext = !isCompleted && (i === 0 || MILESTONES[i - 1].completed);

            return (
              <div key={m.id} className="flex flex-col items-center gap-3 z-10 w-20">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isCompleted
                      ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20"
                      : isNext
                      ? "bg-card border-emerald-500 text-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.1)]"
                      : "bg-muted/50 border-transparent text-muted-foreground"
                  }`}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                </motion.div>
                
                <div className="text-center">
                  <p className={`text-[10px] font-black leading-tight ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                    {m.label}
                  </p>
                  {!isCompleted && m.target > 1 && (
                    <p className="text-[9px] text-muted-foreground mt-0.5 font-bold">
                      {m.current >= 1000 ? `${(m.current/1000).toFixed(0)}k` : m.current} / {m.target >= 1000 ? `${(m.target/1000).toFixed(0)}k` : m.target}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
