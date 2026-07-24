import { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Award, CheckCircle, ChevronRight, Share2, Sparkles, Download } from "lucide-react";
import { OnboardingState } from "../hooks/useOnboardingState";
import { useSalesReadinessScore } from "../hooks/useSalesReadinessScore";
import confetti from "canvas-confetti";

interface Phase6CertificationProps {
  state: OnboardingState;
  onFinish: () => void;
}

export default function Phase6Certification({ state, onFinish }: Phase6CertificationProps) {
  const readiness = useSalesReadinessScore(state);

  useEffect(() => {
    // Fire confetti on load
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#10b981", "#3b82f6", "#f59e0b"]
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#10b981", "#3b82f6", "#f59e0b"]
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl mx-auto space-y-8 pb-10"
    >
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
          className="w-32 h-32 mx-auto rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 flex items-center justify-center shadow-2xl shadow-amber-500/30 border-4 border-white"
        >
          <Award className="w-16 h-16 text-amber-700" />
        </motion.div>
        
        <h1 className="text-4xl md:text-5xl font-heading font-black tracking-tight pt-4">
          Congratulations, {state.profileData.fullName?.split(" ")[0] || "Partner"}!
        </h1>
        <p className="text-lg text-muted-foreground font-body max-w-2xl mx-auto">
          You are officially a Certified FSC Sales Partner. Your dashboard is now unlocked and you are ready to start selling.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
        {/* Certificate Card */}
        <div className="p-8 rounded-[2rem] bg-card border border-border shadow-sm flex flex-col items-center text-center space-y-6 relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10 w-full space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Official Certificate</p>
            <h3 className="text-2xl font-heading font-black">Tier 1 Sales Agent</h3>
            <p className="text-sm text-muted-foreground">Issued {new Date().toLocaleDateString()}</p>
          </div>

          <div className="relative z-10 w-full bg-muted/20 rounded-2xl p-6 border border-border/50">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Starting Rate</span>
              <span className="font-heading font-black text-xl text-primary">8% Commission</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Current Level</span>
              <span className="font-heading font-black text-xl text-foreground">L1</span>
            </div>
          </div>

          <div className="flex gap-4 w-full relative z-10">
            <Button variant="outline" className="flex-1 rounded-xl">
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
            <Button variant="outline" className="flex-1 rounded-xl text-primary border-primary/20 hover:bg-primary/5">
              <Share2 className="w-4 h-4 mr-2" /> Share
            </Button>
          </div>
        </div>

        {/* Readiness Score Breakdown */}
        <div className="p-8 rounded-[2rem] bg-card border border-border shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Performance Metric</p>
              <h3 className="text-xl font-heading font-black">Sales Readiness Score</h3>
            </div>
            <div className="text-right">
              <span className="text-3xl font-heading font-black text-emerald-500">{readiness.totalScore}%</span>
              <p className="text-[10px] font-bold text-emerald-700/70">{readiness.readinessLabel}</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { label: "Profile Completeness", score: readiness.breakdown.profileScore, max: 25 },
              { label: "Training Modules", score: readiness.breakdown.trainingScore, max: 25 },
              { label: "AI Interview / Quizzes", score: readiness.breakdown.quizScore, max: 20 },
              { label: "Final Assessment", score: readiness.breakdown.assessmentScore, max: 20 },
              { label: "Strategy Breadth", score: readiness.breakdown.breadthScore, max: 10 },
            ].map(item => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-muted-foreground">{item.label}</span>
                  <span className="font-black text-foreground">{item.score} / {item.max}</span>
                </div>
                <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full" 
                    style={{ width: `${(item.score / item.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-8 flex justify-center">
        <Button 
          onClick={onFinish}
          className="h-16 px-12 rounded-full text-xl font-heading font-black bg-foreground text-background hover:scale-105 transition-all shadow-xl shadow-foreground/20 group"
        >
          Enter Agent Dashboard <ChevronRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </motion.div>
  );
}
