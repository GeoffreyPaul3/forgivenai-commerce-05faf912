import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useOnboardingState } from "./hooks/useOnboardingState";
import { supabase } from "@/integrations/supabase/client";

import Phase1Welcome from "./steps/Phase1Welcome";
import Phase2ProfileSetup from "./steps/Phase2ProfileSetup";
import Phase3Training from "./steps/Phase3Training";
import Phase4Assessment from "./steps/Phase4Assessment";
import Phase5AIInterview from "./steps/Phase5AIInterview";
import Phase6Certification from "./steps/Phase6Certification";

interface AgentOnboardingGateProps {
  children: React.ReactNode;
}

export default function AgentOnboardingGate({ children }: AgentOnboardingGateProps) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id);
    });
  }, []);
  
  const { state, update, advancePhase, retreatPhase, addXp, completeCertification } = useOnboardingState(userId || "guest");

  // Wait for user to load
  if (!userId) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  // If certified, just render the dashboard normally
  if (state.certified) {
    return <>{children}</>;
  }

  // Define top progress bar mapping
  const phaseTitles = [
    "Welcome",
    "Profile",
    "Academy",
    "Assessment",
    "AI Roleplay",
    "Certification"
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Onboarding Header/Progress */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-black">
              {state.phase}
            </div>
            <div className="hidden md:block">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Agent Success Journey
              </p>
              <p className="font-heading font-black text-sm leading-tight">
                {phaseTitles[state.phase - 1]}
              </p>
            </div>
          </div>

          {/* Minimal dots progress */}
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5, 6].map(p => (
              <div 
                key={p} 
                className={`h-2 rounded-full transition-all ${
                  p === state.phase ? "w-8 bg-primary" :
                  p < state.phase ? "w-2 bg-primary/40" :
                  "w-2 bg-muted"
                }`} 
              />
            ))}
          </div>

          <div className="text-right hidden md:block">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              XP Earned
            </p>
            <p className="font-heading font-black text-sm leading-tight text-amber-500">
              {state.totalXp} XP
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <AnimatePresence mode="wait">
          {state.phase === 1 && (
            <Phase1Welcome key="p1" onNext={advancePhase} />
          )}
          {state.phase === 2 && (
            <Phase2ProfileSetup key="p2" state={state} update={update} onNext={advancePhase} onBack={retreatPhase} />
          )}
          {state.phase === 3 && (
            <Phase3Training key="p3" state={state} update={update} onNext={advancePhase} onBack={retreatPhase} addXp={addXp} />
          )}
          {state.phase === 4 && (
            <Phase4Assessment key="p4" state={state} update={update} onNext={advancePhase} onBack={retreatPhase} />
          )}
          {state.phase === 5 && (
            <Phase5AIInterview key="p5" onNext={advancePhase} state={state} update={update} />
          )}
          {state.phase === 6 && (
            <Phase6Certification key="p6" state={state} onFinish={completeCertification} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
