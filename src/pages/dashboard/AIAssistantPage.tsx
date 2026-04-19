import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Bot, Send, Loader2, Sparkles, User } from "lucide-react";
import ReactMarkdown from "react-markdown";

type Message = { role: "user" | "assistant"; content: string };

const quickPrompts = [
  "What products should I restock?",
  "Suggest a marketing campaign for bags",
  "Analyze my product pricing strategy",
  "How can I improve customer engagement?",
  "What trends should I follow this season?",
];

const AIAssistantPage = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    const userMsg: Message = { role: "user", content: msg };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data: products } = await (supabase as any).from("products").select("name, category, price, vendor_cost, status").limit(20);
      const { data: orders } = await (supabase as any).from("orders").select("status, total, gross_margin, base_profit, surplus_profit, surplus_type").limit(20);
      const { data: vendors } = await (supabase as any).from("vendors").select("business_name, category, status, score").limit(10);

      const productSummary = products?.length
        ? `Products: ${products.map(p => `${p.name} (Cost: ${p.vendor_cost}, Price: ${p.price})`).join("; ")}`
        : "No products.";

      const orderSummary = orders?.length
        ? `Recent Profits: ${orders.map(o => `${o.status}: Profit ${o.base_profit}, Surplus ${o.surplus_profit} (${o.surplus_type})`).join("; ")}`
        : "No orders.";
      
      const vendorSummary = vendors?.length
        ? `Vendors: ${vendors.map(v => `${v.business_name} (Score: ${v.score}, Status: ${v.status})`).join("; ")}`
        : "No vendors.";

      const { data, error } = await supabase.functions.invoke("ai-generate", {
        body: {
          type: "chat",
          context: `${msg}\n\nBI CONTEXT:\n${productSummary}\n${orderSummary}\n${vendorSummary}\n\nROLE: You are the Lead BI Advisor for Forgiven Shopping Centre. Analyze margins, vendor performance, and surplus profit sources. Provide actionable, high-level business advice.`,
        },
      });

      if (error) throw error;
      setMessages(prev => [...prev, { role: "assistant", content: data?.content || "Sorry, I couldn't generate a response." }]);
    } catch {
      toast({ title: "Failed to get response", variant: "destructive" });
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h2 className="font-heading text-2xl font-bold text-foreground">AI Business Assistant</h2>
        <p className="text-muted-foreground text-sm font-body">Your AI-powered business advisor for Forgiven Shopping Centre</p>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-xl border border-border bg-card p-4 space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-heading text-lg font-semibold mb-2">Forgiven AI Assistant</h3>
            <p className="text-muted-foreground text-sm font-body max-w-md mb-6">
              I can help with restocking suggestions, marketing campaigns, pricing strategy, and business insights.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {quickPrompts.map(prompt => (
                <Button key={prompt} variant="outline" size="sm" onClick={() => sendMessage(prompt)} className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />{prompt}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-muted text-foreground rounded-bl-md"
            }`}>
              {msg.role === "assistant" ? (
                <div className="prose prose-sm max-w-none font-body prose-headings:font-heading prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-headings:mt-3 prose-headings:mb-1 prose-p:my-1 prose-ul:my-1 prose-ol:my-1">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="font-body whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 mt-1">
                <User className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-body">Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder="Ask about your business..."
          className="flex-1"
          disabled={loading}
        />
        <Button onClick={() => sendMessage()} disabled={loading || !input.trim()} className="gap-2">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default AIAssistantPage;
