import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { PlayCircle, CheckCircle2, Lock, ArrowRight, ArrowLeft, Trophy, Star } from "lucide-react";
import { OnboardingState } from "../hooks/useOnboardingState";

interface Phase3TrainingProps {
  state: OnboardingState;
  update: (s: Partial<OnboardingState>) => void;
  onNext: () => void;
  onBack: () => void;
  addXp: (amount: number) => void;
}

const MODULES = [
  { id: "mod1", title: "The Forgiven OS Advantage", type: "video", duration: "3 min", xp: 50 },
  { id: "mod2", title: "How to Find Winning Products", type: "interactive", duration: "5 min", xp: 100 },
  { id: "mod3", title: "Pricing & Margins Explained", type: "video", duration: "4 min", xp: 50 },
  { id: "mod4", title: "Closing Your First Sale", type: "interactive", duration: "8 min", xp: 150 },
  { id: "mod5", title: "Handling Customer Objections", type: "video", duration: "5 min", xp: 50 },
  { id: "mod6", title: "The Delivery Process", type: "interactive", duration: "4 min", xp: 100 },
  { id: "mod7", title: "Scaling to Tier 4", type: "video", duration: "6 min", xp: 100 },
];

export default function Phase3Training({ state, update, onNext, onBack, addXp }: Phase3TrainingProps) {
  
  const handleModuleClick = (modId: string) => {
    // Simulate completing a module instantly for demo purposes
    const prog = { ...state.trainingProgress };
    
    // Only if not already complete
    if (prog[modId] !== "complete") {
      prog[modId] = "complete";
      
      // Auto-unlock the next module
      const currIdx = MODULES.findIndex(m => m.id === modId);
      if (currIdx < MODULES.length - 1) {
        const nextId = MODULES[currIdx + 1].id;
        if (!prog[nextId]) prog[nextId] = "locked";
        // Actually unlock it
        if (prog[nextId] === "locked") prog[nextId] = "watching";
      }

      // Add XP
      const mod = MODULES.find(m => m.id === modId);
      if (mod) addXp(mod.xp);

      update({ trainingProgress: prog });
    }
  };

  // Ensure mod1 is available if progress is empty
  if (Object.keys(state.trainingProgress).length === 0) {
    update({ trainingProgress: { mod1: "watching" } });
  }

  const completedCount = Object.values(state.trainingProgress).filter(s => s === "complete").length;
  const isReady = completedCount === MODULES.length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="max-w-4xl mx-auto space-y-8 pb-10"
    >
      <div className="flex flex-col md:flex-row items-center justify-between bg-card p-8 rounded-[2.5rem] border border-border shadow-sm gap-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-heading font-black">Sales Academy</h2>
          <p className="text-muted-foreground text-sm font-body max-w-xl">
            Complete the interactive training modules to unlock the Final Assessment. Earning XP boosts your starting ranking!
          </p>
        </div>
        
        <div className="bg-amber-100 border border-amber-200 rounded-2xl p-4 flex items-center gap-4 shrink-0 shadow-inner">
          <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700/70">Total XP Earned</p>
            <p className="text-2xl font-heading font-black text-amber-700">{state.totalXp}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((mod, i) => {
          const status = state.trainingProgress[mod.id] || (i === 0 ? "watching" : "locked");
          const isComplete = status === "complete";
          const isLocked = status === "locked";
          const isActive = status === "watching" || status === "practicing";

          return (
            <motion.div
              key={mod.id}
              whileHover={!isLocked ? { scale: 1.02, y: -4 } : {}}
              onClick={() => !isLocked && handleModuleClick(mod.id)}
              className={`relative p-5 rounded-3xl border transition-all cursor-pointer overflow-hidden ${
                isComplete ? "bg-emerald-50 border-emerald-200 shadow-sm" :
                isActive ? "bg-primary/5 border-primary shadow-md" :
                "bg-muted/30 border-border/50 opacity-70 cursor-not-allowed"
              }`}
            >
              {isComplete && (
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 relative top-2 right-2" />
                </div>
              )}
              
              <div className="flex items-start justify-between mb-8">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isComplete ? "bg-emerald-100 text-emerald-600" :
                  isActive ? "bg-primary text-white shadow-lg shadow-primary/30" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {isLocked ? <Lock className="w-4 h-4" /> : <PlayCircle className="w-5 h-5 ml-0.5" />}
                </div>
                <div className="flex items-center gap-1 bg-white/50 px-2 py-1 rounded-lg backdrop-blur-sm">
                  <Star className="w-3 h-3 text-amber-500" />
                  <span className="text-[10px] font-black text-amber-700">+{mod.xp}</span>
                </div>
              </div>

              <div className="space-y-1 relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Module {i + 1}</p>
                <h4 className={`font-heading font-bold leading-tight ${isComplete ? "text-emerald-900" : "text-foreground"}`}>
                  {mod.title}
                </h4>
                <p className="text-xs text-muted-foreground pt-2 font-medium">{mod.duration} • {mod.type}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex justify-between items-center pt-8 border-t border-border/40">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground hover:bg-muted/50 rounded-xl">
          <ArrowLeft className="mr-2 w-4 h-4" /> Back to Profile
        </Button>
        <Button 
          onClick={onNext}
          disabled={!isReady}
          className={`h-12 px-8 rounded-xl font-heading font-black transition-all ${
            isReady ? "bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105" : "bg-muted text-muted-foreground"
          }`}
        >
          {isReady ? "Take Final Assessment" : `${completedCount} / ${MODULES.length} Modules`}
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}
