import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Sparkles, CheckCircle2, Loader2, ArrowRight } from "lucide-react";

interface Phase5AIInterviewProps {
  onNext: () => void;
}

interface Message {
  id: string;
  sender: "ai" | "user";
  text: string;
}

export default function Phase5AIInterview({ onNext }: Phase5AIInterviewProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      sender: "ai",
      text: "Hi! I'm Grace, your FSC AI Coach. Let's do a quick roleplay. I am a customer who is interested in buying a TV from you, but I'm worried that if it breaks, I'll lose my money. How would you reassure me?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: "user", text: userMsg }]);
    setInput("");
    setIsTyping(true);

    // Simulate AI thinking and responding
    setTimeout(() => {
      setIsTyping(false);
      
      // Very naive logic to just advance the conversation
      if (messages.length === 1) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: "ai",
          text: "That's a great approach! Highlighting the warranty is key. Okay, one more scenario. I'm a customer who wants to buy a dress, but I live in Mzuzu and I want it tomorrow. How do you handle this expectation?"
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: "ai",
          text: "Perfect. Managing delivery expectations honestly is much better than overpromising. You handled both scenarios excellently! I am passing your profile with a recommendation for certification."
        }]);
        setInterviewComplete(true);
      }
    }, 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-3xl mx-auto space-y-6 pb-10"
    >
      <div className="text-center space-y-2 mb-6">
        <h2 className="text-3xl font-heading font-black">AI Coach Roleplay</h2>
        <p className="text-muted-foreground text-sm font-body max-w-xl mx-auto">
          Chat with Grace to practice your sales pitches and objection handling in a safe, simulated environment.
        </p>
      </div>

      <div className="bg-card border border-border shadow-sm rounded-3xl overflow-hidden flex flex-col h-[500px]">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-border/50 bg-primary/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white relative">
              <Bot className="w-5 h-5" />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
            </div>
            <div>
              <p className="font-heading font-black text-sm text-foreground leading-none">Grace</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary mt-1">FSC AI Coach</p>
            </div>
          </div>
          <Sparkles className="w-5 h-5 text-primary/40" />
        </div>

        {/* Chat Body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-muted/10">
          <AnimatePresence>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex gap-3 ${m.sender === "user" ? "flex-row-reverse" : ""}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  m.sender === "ai" ? "bg-primary text-white" : "bg-muted-foreground/20 text-muted-foreground"
                }`}>
                  {m.sender === "ai" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
                <div className={`p-4 rounded-2xl max-w-[80%] ${
                  m.sender === "ai" 
                    ? "bg-white border border-border shadow-sm rounded-tl-none text-foreground" 
                    : "bg-primary text-white shadow-md rounded-tr-none"
                }`}>
                  <p className="text-sm font-medium leading-relaxed">{m.text}</p>
                </div>
              </motion.div>
            ))}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
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

        {/* Chat Input */}
        <div className="p-4 border-t border-border/50 bg-card">
          {interviewComplete ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-between p-2"
            >
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-bold text-sm">Roleplay complete. Great job!</span>
              </div>
              <Button onClick={onNext} className="rounded-full font-heading font-black">
                View Certification <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </motion.div>
          ) : (
            <form 
              onSubmit={e => { e.preventDefault(); handleSend(); }}
              className="flex items-center gap-2 relative"
            >
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type your response to the customer..."
                className="h-12 rounded-full pl-4 pr-12 bg-muted/30 border-transparent focus-visible:ring-primary focus-visible:bg-card"
                disabled={isTyping}
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={!input.trim() || isTyping}
                className="absolute right-1 w-10 h-10 rounded-full bg-primary hover:bg-primary/90"
              >
                {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
              </Button>
            </form>
          )}
        </div>
      </div>
    </motion.div>
  );
}
