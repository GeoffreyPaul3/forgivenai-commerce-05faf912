import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, Sparkles, CheckCircle2, Loader2, ArrowRight, Star } from "lucide-react";
import { OnboardingState } from "../hooks/useOnboardingState";

interface Phase5AIInterviewProps {
  onNext: () => void;
  state: OnboardingState;
  update: (s: Partial<OnboardingState>) => void;
}

interface Message {
  id: string;
  sender: "ai" | "user" | "evaluation";
  text: string;
  scenarioIdx?: number;
}

interface ScoreBreakdown {
  communication: number;
  productKnowledge: number;
  objectionHandling: number;
  professionalism: number;
  confidence: number;
}

// ── Scenarios ─────────────────────────────────────────────────────────────────

const SCENARIOS = [
  {
    id: "price",
    title: "Price Objection",
    prompt:
      "I found this same dress for MWK 12,000 cheaper on another page. Why should I buy from you?",
    keywords: {
      objectionHandling: ["quality", "warranty", "guarantee", "authentic", "genuine", "trust", "certified", "original", "secure", "safe"],
      productKnowledge: ["product", "material", "brand", "stock", "delivery", "available", "option", "description", "fabric"],
      communication: ["understand", "great", "absolutely", "appreciate", "help", "happy", "sure", "of course", "definitely", "thank"],
      professionalism: ["sir", "madam", "please", "respect", "apology", "kindly", "assure"],
      confidence: ["best", "recommend", "excellent", "perfect", "ideal", "top", "superior"],
    },
  },
  {
    id: "delivery",
    title: "Delivery Expectation",
    prompt:
      "I live in Karonga and I need this TV for a party this weekend. Can you get it to me by Friday?",
    keywords: {
      objectionHandling: ["honest", "realistic", "3 days", "5 days", "within", "possible", "arrange", "courier", "express"],
      productKnowledge: ["delivery", "shipping", "logistics", "transport", "Karonga", "north", "location", "area"],
      communication: ["understand", "great", "definitely", "help", "check", "confirm", "look into", "see what"],
      professionalism: ["apology", "unfortunately", "cannot promise", "let me check", "I will", "I can"],
      confidence: ["arrange", "best effort", "explore", "alternative", "option"],
    },
  },
  {
    id: "warranty",
    title: "Product Guarantee",
    prompt:
      "What happens if the blender I buy breaks after two weeks? Will I lose my money?",
    keywords: {
      objectionHandling: ["warranty", "guarantee", "return", "replace", "exchange", "7 days", "30 days", "policy", "cover"],
      productKnowledge: ["brand", "manufacturer", "defect", "quality", "tested", "original"],
      communication: ["assure", "understand", "worry", "protect", "safe", "relax"],
      professionalism: ["I can assure", "our policy", "officially", "please note"],
      confidence: ["absolutely", "definitely", "guaranteed", "100%", "no risk"],
    },
  },
];

// ── Scoring engine ────────────────────────────────────────────────────────────

function scoreResponse(text: string, keywords: Record<string, string[]>): ScoreBreakdown {
  const lower = text.toLowerCase();
  const score = (kws: string[]) => {
    const hits = kws.filter(k => lower.includes(k)).length;
    const rawScore = Math.min(20, 8 + hits * 4 + (text.length > 80 ? 3 : 0) + (text.length > 160 ? 2 : 0));
    return rawScore;
  };
  return {
    communication: score(keywords.communication),
    productKnowledge: score(keywords.productKnowledge),
    objectionHandling: score(keywords.objectionHandling),
    professionalism: score(keywords.professionalism),
    confidence: score(keywords.confidence),
  };
}

function totalScore(b: ScoreBreakdown) {
  return b.communication + b.productKnowledge + b.objectionHandling + b.professionalism + b.confidence;
}

function scoreLabel(score: number): string {
  if (score >= 85) return "Outstanding";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Good";
  if (score >= 40) return "Developing";
  return "Needs Work";
}

function aiFeedback(s: ScoreBreakdown, scenario: typeof SCENARIOS[0]): string {
  const total = totalScore(s);
  const weakest = Object.entries(s).sort((a, b) => a[1] - b[1])[0][0];
  const tips: Record<string, string> = {
    communication: "Try to empathize with the customer before jumping to facts. Use phrases like 'I completely understand your concern'.",
    productKnowledge: `Show more product-specific knowledge — mention ${scenario.id === "warranty" ? "the warranty terms or brand quality" : "product details, materials, or availability"}.`,
    objectionHandling: "Address the objection directly before pivoting. Acknowledge their concern, then reframe.",
    professionalism: "Maintain a respectful, formal tone even under pressure.",
    confidence: "Your response lacked conviction. Use confident phrases like 'I highly recommend' or 'You can trust us'.",
  };
  if (total >= 85) return "Excellent performance! You handled this scenario like a seasoned sales professional. Your customer would feel secure and valued.";
  if (total >= 70) return `Strong response! ${tips[weakest]} Keep it up.`;
  if (total >= 55) return `Good start! ${tips[weakest]} Aim to be more detailed in your responses.`;
  return `This scenario needs more work. ${tips[weakest]} Practice handling this type of objection with more empathy and product knowledge.`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Phase5AIInterview({ onNext, state, update }: Phase5AIInterviewProps) {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      sender: "ai",
      text: "Hi! I'm Grace, your FSC AI Sales Coach. I'll simulate 3 real customer scenarios. Respond naturally — I'll evaluate your communication, product knowledge, objection handling, professionalism, and confidence.\n\nReady? Here's your first customer:",
    },
    {
      id: "s0",
      sender: "ai",
      text: SCENARIOS[0].prompt,
      scenarioIdx: 0,
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [scenarioScores, setScenarioScores] = useState<ScoreBreakdown[]>([]);
  const [complete, setComplete] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim() || isTyping) return;
    const userText = input.trim();
    setInput("");
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: "user", text: userText }]);
    setIsTyping(true);

    setTimeout(() => {
      const scenario = SCENARIOS[scenarioIdx];
      const breakdown = scoreResponse(userText, scenario.keywords);
      const newScores = [...scenarioScores, breakdown];
      setScenarioScores(newScores);

      // Evaluation message
      const total = totalScore(breakdown);
      setMessages(prev => [
        ...prev,
        {
          id: `eval-${scenarioIdx}`,
          sender: "evaluation",
          text: JSON.stringify({ breakdown, total, feedback: aiFeedback(breakdown, scenario) }),
          scenarioIdx,
        },
      ]);

      const nextIdx = scenarioIdx + 1;
      setIsTyping(false);

      if (nextIdx < SCENARIOS.length) {
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            {
              id: `s${nextIdx}`,
              sender: "ai",
              text: `Great! Scenario ${nextIdx + 1} of ${SCENARIOS.length}: ${SCENARIOS[nextIdx].prompt}`,
              scenarioIdx: nextIdx,
            },
          ]);
          setScenarioIdx(nextIdx);
        }, 600);
      } else {
        // All scenarios done — compute overall score
        const avgTotal = Math.round(newScores.reduce((sum, s) => sum + totalScore(s), 0) / newScores.length);
        update({ salesReadinessScore: avgTotal });
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            {
              id: "finale",
              sender: "ai",
              text: `Roleplay complete! Your overall score is ${avgTotal}/100 — ${scoreLabel(avgTotal)}. Your profile has been updated and you're ready for certification. Well done, ${state.profileData.fullName?.split(" ")[0] || "Partner"}!`,
            },
          ]);
          setComplete(true);
        }, 600);
      }
    }, 1800);
  };

  // Aggregate display
  const overallAvg = scenarioScores.length > 0
    ? Math.round(scenarioScores.reduce((sum, s) => sum + totalScore(s), 0) / scenarioScores.length)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-3xl mx-auto space-y-4 pb-10"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-heading font-black">AI Sales Roleplay</h2>
        <p className="text-muted-foreground text-sm font-body max-w-xl mx-auto">
          3 real customer scenarios. Grace evaluates your responses across 5 dimensions.
        </p>
      </div>

      {/* Scenario Progress */}
      <div className="flex gap-2 justify-center">
        {SCENARIOS.map((s, i) => (
          <div
            key={s.id}
            className={`h-2 rounded-full transition-all ${
              i < scenarioScores.length ? "w-16 bg-emerald-500" :
              i === scenarioIdx ? "w-16 bg-primary" :
              "w-8 bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Chat Window */}
      <div className="bg-card border border-border shadow-sm rounded-3xl overflow-hidden flex flex-col h-[520px]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/50 bg-primary/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white relative">
              <Bot className="w-5 h-5" />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
            </div>
            <div>
              <p className="font-heading font-black text-sm">Grace</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">FSC AI Coach</p>
            </div>
          </div>
          {overallAvg !== null && (
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
              <Star className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
              <span className="text-xs font-black text-emerald-700">{overallAvg}/100</span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-muted/10">
          <AnimatePresence>
            {messages.map((m) => {
              if (m.sender === "evaluation") {
                const data = JSON.parse(m.text) as { breakdown: ScoreBreakdown; total: number; feedback: string };
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary">Grace's Evaluation</p>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                        data.total >= 85 ? "bg-emerald-100 text-emerald-700" :
                        data.total >= 70 ? "bg-blue-100 text-blue-700" :
                        data.total >= 55 ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      }`}>{data.total}/100 — {scoreLabel(data.total)}</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {Object.entries(data.breakdown).map(([dim, score]) => (
                        <div key={dim} className="text-center">
                          <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden mb-1">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${(score / 20) * 100}%` }} />
                          </div>
                          <p className="text-[8px] font-bold uppercase text-muted-foreground leading-tight">{dim.replace(/([A-Z])/g, " $1").trim()}</p>
                          <p className="text-[9px] font-black text-foreground">{score}/20</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-foreground/80 leading-relaxed border-t border-border/40 pt-2">{data.feedback}</p>
                  </motion.div>
                );
              }
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex gap-3 ${m.sender === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    m.sender === "ai" ? "bg-primary text-white" : "bg-muted-foreground/20 text-muted-foreground"
                  }`}>
                    {m.sender === "ai" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  <div className={`p-4 rounded-2xl max-w-[80%] text-sm font-medium leading-relaxed whitespace-pre-line ${
                    m.sender === "ai"
                      ? "bg-white border border-border shadow-sm rounded-tl-none text-foreground"
                      : "bg-primary text-white shadow-md rounded-tr-none"
                  }`}>
                    {m.text}
                  </div>
                </motion.div>
              );
            })}
            {isTyping && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-4 rounded-2xl bg-white border border-border shadow-sm rounded-tl-none flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-primary/80 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border/50 bg-card">
          {complete ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-between p-2"
            >
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-bold text-sm">Roleplay complete! Score: {overallAvg}/100</span>
              </div>
              <Button onClick={onNext} className="rounded-full font-heading font-black">
                View Certification <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </motion.div>
          ) : (
            <form
              onSubmit={e => { e.preventDefault(); handleSend(); }}
              className="flex items-end gap-2 relative"
            >
              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type your response to the customer..."
                className="rounded-2xl pl-4 pr-4 bg-muted/30 border-transparent focus-visible:ring-primary focus-visible:bg-card resize-none min-h-[52px] max-h-[120px]"
                disabled={isTyping}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isTyping}
                className="w-12 h-12 rounded-2xl bg-primary hover:bg-primary/90 shrink-0"
              >
                {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 justify-center">
        {["Communication", "Product Knowledge", "Objection Handling", "Professionalism", "Confidence"].map(dim => (
          <span key={dim} className="text-[10px] font-bold bg-muted/30 text-muted-foreground px-2 py-1 rounded-lg border border-border/40">
            {dim} /20
          </span>
        ))}
      </div>
    </motion.div>
  );
}
