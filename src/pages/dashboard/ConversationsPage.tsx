import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Phone, Clock } from "lucide-react";

const ConversationsPage = () => {
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("conversations").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["messages", selectedConvo],
    enabled: !!selectedConvo,
    queryFn: async () => {
      const { data, error } = await supabase.from("messages").select("*").eq("conversation_id", selectedConvo!).order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">Conversations</h2>
        <p className="text-muted-foreground text-sm font-body">Customer interactions via WhatsApp & Web</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[500px]">
        {/* Conversation List */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-3 border-b border-border">
            <h3 className="font-heading text-sm font-semibold">All Conversations</h3>
          </div>
          <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
            {isLoading ? (
              [1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse bg-muted" />)
            ) : conversations?.length ? (
              conversations.map(c => (
                <div
                  key={c.id}
                  className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${selectedConvo === c.id ? "bg-muted" : ""}`}
                  onClick={() => setSelectedConvo(c.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Phone className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold font-body">{c.customer_name || c.customer_phone || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{c.channel} • {c.status}</p>
                      </div>
                    </div>
                    {c.last_message_at && (
                      <span className="text-xs text-muted-foreground">{new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-muted-foreground text-sm">
                <MessageSquare className="w-6 h-6 mx-auto mb-2" />
                No conversations yet. Connect WhatsApp to start receiving messages.
              </div>
            )}
          </div>
        </div>

        {/* Message Thread */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden flex flex-col">
          {selectedConvo ? (
            <>
              <div className="p-3 border-b border-border">
                <h3 className="font-heading text-sm font-semibold">
                  {conversations?.find(c => c.id === selectedConvo)?.customer_name || "Conversation"}
                </h3>
              </div>
              <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[420px]">
                {messages?.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === "customer" ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[70%] px-3 py-2 rounded-xl text-sm ${
                      msg.role === "customer" ? "bg-muted text-foreground" : msg.role === "ai" ? "bg-primary text-primary-foreground" : "bg-gold/20 text-foreground"
                    }`}>
                      <p className="font-body">{msg.content}</p>
                      <p className="text-[10px] opacity-60 mt-1">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
                {(!messages || messages.length === 0) && (
                  <p className="text-center text-muted-foreground text-sm py-8">No messages in this conversation</p>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm font-body">
              <div className="text-center">
                <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                Select a conversation to view messages
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationsPage;
