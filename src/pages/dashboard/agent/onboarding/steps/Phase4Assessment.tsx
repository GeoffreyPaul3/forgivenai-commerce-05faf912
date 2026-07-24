import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Check, X, ArrowRight, ShieldCheck, Timer } from "lucide-react";
import { OnboardingState } from "../hooks/useOnboardingState";

interface Phase4AssessmentProps {
  state: OnboardingState;
  update: (s: Partial<OnboardingState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const QUESTIONS = [
  {
    id: "q1",
    text: "A customer wants to buy a pair of sneakers but complains the price is too high. What is the best response?",
    options: [
      "Tell them the price is fixed and they can look elsewhere.",
      "Offer a 20% discount immediately to secure the sale.",
      "Highlight the premium quality and durability, and offer a small 5% discount if they buy today.",
      "Ask them how much they want to pay and accept it."
    ],
    correctIdx: 2
  },
  {
    id: "q2",
    text: "What is your gross margin if a product costs MWK 10,000 from the supplier and you sell it for MWK 15,000 (assuming 0 operations cost)?",
    options: [
      "33.3%",
      "50.0%",
      "25.0%",
      "5,000%"
    ],
    correctIdx: 0
  },
  {
    id: "q3",
    text: "When arranging delivery for a client in Lilongwe, what should you verify first?",
    options: [
      "Their exact location/landmark and phone number.",
      "If they want to buy a second item.",
      "Their bank account details.",
      "Nothing, just send the package."
    ],
    correctIdx: 0
  }
];

export default function Phase4Assessment({ state, update, onNext, onBack }: Phase4AssessmentProps) {
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAns, setSelectedAns] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  
  // Local state to track answers before finalizing
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const handleSelect = (idx: number) => {
    setSelectedAns(idx);
  };

  const handleNextQ = () => {
    if (selectedAns === null) return;
    
    setAnswers(prev => ({ ...prev, [QUESTIONS[currentQ].id]: selectedAns }));
    
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(c => c + 1);
      setSelectedAns(null);
    } else {
      finishAssessment();
    }
  };

  const finishAssessment = () => {
    setIsSubmitting(true);
    
    // Calculate score
    let correct = 0;
    const finalAnswers = { ...answers, [QUESTIONS[currentQ].id]: selectedAns };
    
    QUESTIONS.forEach(q => {
      if (finalAnswers[q.id] === q.correctIdx) correct++;
    });
    
    const score = Math.round((correct / QUESTIONS.length) * 100);
    
    setTimeout(() => {
      update({
        assessmentScore: score,
        assessmentAttempts: state.assessmentAttempts + 1
      });
      setIsSubmitting(false);
      setShowResult(true);
    }, 1500); // Fake delay for tension
  };

  if (showResult || state.assessmentScore !== null) {
    const score = state.assessmentScore || 0;
    const passed = score >= 70;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto text-center space-y-8 py-10"
      >
        <div className={`w-32 h-32 mx-auto rounded-[2rem] flex items-center justify-center shadow-2xl ${
          passed ? "bg-emerald-500 shadow-emerald-500/40" : "bg-red-500 shadow-red-500/40"
        }`}>
          {passed ? <ShieldCheck className="w-16 h-16 text-white" /> : <X className="w-16 h-16 text-white" />}
        </div>
        
        <div className="space-y-4">
          <h2 className="text-4xl font-heading font-black">
            {passed ? "Assessment Passed!" : "Assessment Failed"}
          </h2>
          <p className="text-lg text-muted-foreground font-body">
            You scored <span className={`font-black ${passed ? "text-emerald-500" : "text-red-500"}`}>{score}%</span>.
            {passed ? " Excellent work. You are ready for certification." : " You need 70% to pass. Please review the training modules and try again."}
          </p>
        </div>

        <div className="pt-8">
          {passed ? (
            <Button onClick={onNext} className="h-14 px-10 rounded-full text-lg font-heading font-black bg-primary text-white shadow-xl shadow-primary/30 hover:scale-105 transition-all">
              Proceed to Certification <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          ) : (
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={onBack} className="h-14 px-8 rounded-full font-heading font-bold">
                Review Training
              </Button>
              <Button onClick={() => {
                setShowResult(false);
                setCurrentQ(0);
                setSelectedAns(null);
                setAnswers({});
                update({ assessmentScore: null });
              }} className="h-14 px-8 rounded-full font-heading font-black bg-foreground text-background">
                Try Again
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  const q = QUESTIONS[currentQ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-3xl mx-auto space-y-8"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-heading font-black">Final Assessment</h2>
          <p className="text-muted-foreground text-sm">Question {currentQ + 1} of {QUESTIONS.length}</p>
        </div>
        <div className="px-4 py-2 bg-muted/30 rounded-xl flex items-center gap-2 border border-border/50">
          <Timer className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-bold text-muted-foreground font-mono">No Time Limit</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
        <motion.div 
          className="h-full bg-primary"
          initial={{ width: `${(currentQ / QUESTIONS.length) * 100}%` }}
          animate={{ width: `${((currentQ + 1) / QUESTIONS.length) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-6 bg-card p-8 rounded-[2rem] border border-border shadow-sm"
        >
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-1">
              <BrainCircuit className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-xl font-body font-medium leading-relaxed">{q.text}</h3>
          </div>

          <div className="space-y-3 pt-4">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                  selectedAns === i 
                    ? "border-primary bg-primary/5 shadow-md" 
                    : "border-border hover:border-primary/40 hover:bg-muted/10"
                }`}
              >
                <span className={`font-medium ${selectedAns === i ? "text-primary font-bold" : "text-foreground"}`}>
                  {opt}
                </span>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  selectedAns === i ? "border-primary bg-primary" : "border-muted-foreground/30 group-hover:border-primary/40"
                }`}>
                  {selectedAns === i && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-end pt-4">
        <Button 
          onClick={handleNextQ}
          disabled={selectedAns === null || isSubmitting}
          className={`h-14 px-10 rounded-full font-heading font-black transition-all ${
            selectedAns !== null ? "bg-primary text-white shadow-xl shadow-primary/20 hover:scale-105" : "bg-muted text-muted-foreground"
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">Analyzing <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: "linear", duration: 1 }}><BrainCircuit className="w-5 h-5" /></motion.div></span>
          ) : currentQ === QUESTIONS.length - 1 ? (
            "Submit Assessment"
          ) : (
            <>Next Question <ArrowRight className="ml-2 w-5 h-5" /></>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
