import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Phone, Send, Loader2, Bot, User, Clock, Search, RefreshCw, ShieldCheck } from "lucide-react";

const ConversationsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      return data;
    }
  });

  const isAdmin = !isProfileLoading && profile?.role === "admin";

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations", profile?.role],
    // Wait until profile is fully loaded AND confirmed as admin before running
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("conversations").select("*").order("last_message_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });

  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ["messages", selectedConvo],
    enabled: !!selectedConvo,
    queryFn: async () => {
      const { data, error } = await supabase.from("messages").select("*").eq("conversation_id", selectedConvo!).order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredConvos = conversations?.filter(c => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return [c.customer_name, c.customer_phone].filter(Boolean).join(" ").toLowerCase().includes(term);
  });

  const selectedConvoData = conversations?.find(c => c.id === selectedConvo);

  const sendReply = async () => {
    if (!replyText.trim() || !selectedConvoData?.customer_phone || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("whatsapp-webhook", {
        body: { action: "send-message", conversationId: selectedConvo, phone: selectedConvoData.customer_phone, message: replyText },
      });
      if (error) throw error;
      setReplyText("");
      refetchMessages();
      toast({ title: "Message sent!" });
    } catch (err: any) {
      toast({ title: "Failed to send", description: err?.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const roleColors: Record<string, string> = {
    customer: "bg-muted text-foreground",
    ai: "bg-primary text-primary-foreground",
    agent: "bg-gold/20 text-foreground",
  };

  const roleIcons: Record<string, React.ReactNode> = {
    customer: <User className="w-3 h-3" />,
    ai: <Bot className="w-3 h-3" />,
    agent: <User className="w-3 h-3" />,
  };

  const formatConvoDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
    const startOf7DaysAgo = new Date(startOfToday.getTime() - 6 * 86400000);

    const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (date >= startOfToday) {
      return { primary: timeStr, secondary: "Today" };
    } else if (date >= startOfYesterday) {
      return { primary: "Yesterday", secondary: timeStr };
    } else if (date >= startOf7DaysAgo) {
      return {
        primary: date.toLocaleDateString([], { weekday: "short" }),
        secondary: timeStr,
      };
    } else {
      return {
        primary: date.toLocaleDateString([], { day: "2-digit", month: "short" }),
        secondary: timeStr,
      };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Conversations</h2>
          <p className="text-muted-foreground text-sm font-body">WhatsApp & Web — AI-powered customer support</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => queryClient.invalidateQueries({ queryKey: ["conversations"] })}>
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: "calc(100vh - 12rem)" }}>
        {/* Conversation List */}
        <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border space-y-2">
            <h3 className="font-heading text-sm font-semibold">All Conversations</h3>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-8 h-8 text-xs" />
            </div>
          </div>
          <div className="flex-1 divide-y divide-border overflow-y-auto">
            {isProfileLoading ? (
              // Profile is still loading — never show lock screen prematurely
              [1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse bg-muted" />)
            ) : !isAdmin ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                <ShieldCheck className="w-6 h-6 mx-auto mb-2 opacity-40" />
                Access restricted to administrators.
              </div>
            ) : isLoading ? (
              [1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse bg-muted" />)
            ) : filteredConvos?.length ? (
              filteredConvos.map(c => (
                <div
                  key={c.id}
                  className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${selectedConvo === c.id ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
                  onClick={() => setSelectedConvo(c.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${c.status === "open" ? "bg-emerald-500/10" : "bg-muted"}`}>
                        <Phone className={`w-4 h-4 ${c.status === "open" ? "text-emerald-600" : "text-muted-foreground"}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold font-heading truncate">{c.customer_name || c.customer_phone || "Unknown"}</p>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="text-[9px] px-1 py-0">{c.channel}</Badge>
                          <Badge variant={c.status === "open" ? "default" : "secondary"} className="text-[9px] px-1 py-0">{c.status}</Badge>
                        </div>
                      </div>
                    </div>
                    {c.last_message_at && (() => {
                      const { primary, secondary } = formatConvoDate(c.last_message_at);
                      return (
                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                          <span className="text-[10px] font-semibold text-muted-foreground">{primary}</span>
                          <span className="text-[9px] text-muted-foreground/70">{secondary}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-muted-foreground text-sm">
                <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-40" />
                No conversations yet. Connect WhatsApp to start.
              </div>
            )}
          </div>
        </div>

        {/* Message Thread */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden flex flex-col">
          {selectedConvo ? (
            <>
              <div className="p-3 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-sm font-semibold">
                    {selectedConvoData?.customer_name || selectedConvoData?.customer_phone || "Conversation"}
                  </h3>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {selectedConvoData?.last_message_at ? new Date(selectedConvoData.last_message_at).toLocaleString() : "No messages"}
                  </p>
                </div>
                <Badge variant={selectedConvoData?.status === "open" ? "default" : "secondary"}>{selectedConvoData?.status}</Badge>
              </div>

              <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                {messages?.map(msg => (
                  <div key={msg.id} className={`flex gap-2 ${msg.role === "customer" ? "justify-start" : "justify-end"}`}>
                    {msg.role === "customer" && (
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">{roleIcons[msg.role]}</div>
                    )}
                    <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${roleColors[msg.role] || "bg-muted"} ${msg.role === "customer" ? "rounded-bl-sm" : "rounded-br-sm"}`}>
                      <p className="font-body whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-[9px] opacity-50 mt-1 flex items-center gap-1">
                        {msg.role === "ai" && <Bot className="w-2.5 h-2.5" />}
                        {msg.role === "agent" && <User className="w-2.5 h-2.5" />}
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {msg.role !== "customer" && (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === "ai" ? "bg-primary/10" : "bg-gold/10"}`}>{roleIcons[msg.role]}</div>
                    )}
                  </div>
                ))}
                {(!messages || messages.length === 0) && (
                  <p className="text-center text-muted-foreground text-sm py-8 font-body">No messages yet</p>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply box */}
              <div className="p-3 border-t border-border">
                <div className="flex gap-2">
                  <Input
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendReply()}
                    placeholder="Type a reply via WhatsApp..."
                    disabled={sending}
                    className="flex-1"
                  />
                  <Button onClick={sendReply} disabled={sending || !replyText.trim()} className="gap-2">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm font-body">
              <div className="text-center">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-heading font-semibold mb-1">Select a conversation</p>
                <p className="text-xs">View messages and reply via WhatsApp</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationsPage;
