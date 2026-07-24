import { motion } from "framer-motion";
import { Users, UserPlus, Target, Award, ArrowRight } from "lucide-react";

interface FunnelData {
  totalSignups: number;
  profileStarted: number;
  profileCompleted: number;
  roleplayCompleted: number;
  certified: number;
}

interface AgentActivationFunnelProps {
  data: FunnelData;
}

export default function AgentActivationFunnel({ data }: AgentActivationFunnelProps) {
  const steps = [
    { label: "Signed Up", count: data.totalSignups, icon: Users },
    { label: "Profile Started", count: data.profileStarted, icon: UserPlus },
    { label: "Profile Completed", count: data.profileCompleted, icon: Target },
    { label: "AI Roleplay Done", count: data.roleplayCompleted, icon: Award },
    { label: "Certified", count: data.certified, icon: Award },
  ];

  const max = Math.max(data.totalSignups, 1);

  return (
    <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="font-heading font-black text-lg">Agent Activation Funnel</h3>
        <p className="text-sm text-muted-foreground font-body">Track agent progress from signup to certification</p>
      </div>

      <div className="space-y-4">
        {steps.map((step, i) => {
          const percentage = Math.round((step.count / max) * 100) || 0;
          const dropoff = i > 0 && steps[i - 1].count > 0 
            ? Math.round(((steps[i - 1].count - step.count) / steps[i - 1].count) * 100) 
            : 0;
          const Icon = step.icon;

          return (
            <div key={step.label} className="relative">
              {i > 0 && dropoff > 0 && (
                <div className="absolute -top-3 right-0 text-[9px] font-bold text-red-500/70">
                  -{dropoff}% dropoff
                </div>
              )}
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-32 shrink-0 flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">{step.label}</span>
                  <span className="font-heading font-black">{step.count}</span>
                </div>
                <div className="flex-1 h-10 bg-muted/30 rounded-xl overflow-hidden flex items-center relative group">
                  <motion.div
                    className="absolute left-0 top-0 bottom-0 bg-primary/20 border-r border-primary/40 rounded-r-xl"
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                  <div className="relative z-10 w-full flex items-center justify-between px-3">
                    <Icon className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-black text-primary">{percentage}%</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
