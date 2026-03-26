import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Bot, Send, Loader2, Sparkles } from "lucide-react";

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
      // Get product context for the AI
      const { data: products } = await supabase.from("products").select("name, category, price, currency, status").limit(20);
      const { data: orders } = await supabase.from("orders").select("status, total, channel").limit(20);

      const productSummary = products?.length
        ? `Current products (${products.length}): ${products.map(p => `${p.name} (${p.category}, ${p.currency} ${p.price})`).join("; ")}`
        : "No products in catalog.";

      const orderSummary = orders?.length
        ? `Recent orders (${orders.length}): ${orders.map(o => `${o.status} - ${o.total} via ${o.channel}`).join("; ")}`
        : "No orders yet.";

      const { data, error } = await supabase.functions.invoke("ai-generate", {
        body: {
          type: "chat",
          context: `${msg}\n\nBusiness context:\n${productSummary}\n${orderSummary}`,
        },
      });

      if (error) throw error;

      setMessages(prev => [...prev, { role: "assistant", content: data?.content || "Sorry, I couldn't generate a response." }]);
    } catch (e) {
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
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-muted text-foreground rounded-bl-md"
            }`}>
              <p className="font-body whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-md">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
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
