import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Package, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export function AgentNotifications() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: notifications = [], refetch } = useQuery({
    queryKey: ["agent-notifications", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      // Fetch recent orders attributed to this agent
      const { data: orders } = await supabase
        .from("orders")
        .select("id, status, total, agent_commission_total, created_at, updated_at, customer_name")
        .eq("agent_id", session!.user.id)
        .order("created_at", { ascending: false })
        .limit(20);
        
      if (!orders) return [];

      // Transform orders into actionable notifications
      const notifs: any[] = [];
      orders.forEach(order => {
        // New order notification
        notifs.push({
          id: `new-${order.id}`,
          type: 'new_order',
          title: 'New Referral Order!',
          message: `${order.customer_name || 'A customer'} just placed an order. Potential commission: MWK ${(order.agent_commission_total || 0).toLocaleString()}`,
          created_at: order.created_at,
          icon: Package,
          color: "text-blue-500",
          bgColor: "bg-blue-500/10",
        });

        // Status update notification if not pending
        if (order.status && order.status !== 'pending') {
          notifs.push({
            id: `status-${order.id}`,
            type: 'status_update',
            title: `Order ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}`,
            message: `Order for ${order.customer_name || 'customer'} is now ${order.status}.`,
            created_at: order.updated_at,
            icon: order.status === 'delivered' ? CheckCircle2 : Clock,
            color: order.status === 'delivered' ? "text-green-500" : "text-amber-500",
            bgColor: order.status === 'delivered' ? "bg-green-500/10" : "bg-amber-500/10",
          });
        }
      });
      
      // Sort all compiled notifications by date descending
      return notifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 20);
    }
  });

  useEffect(() => {
    if (!session?.user?.id) return;
    
    // Subscribe to realtime changes on orders table for this agent
    const channel = supabase
      .channel('agent_orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `agent_id=eq.${session.user.id}`
        },
        () => {
          // Refetch and bump badge counter
          refetch();
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, refetch]);
  
  // When opened, clear unread badge
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="mr-2 h-9 w-9 rounded-full relative">
          <Bell className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 border-2 border-background text-[9px] font-bold text-white shadow-sm"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 rounded-2xl shadow-xl border-border/50 bg-background/95 backdrop-blur-xl">
        <div className="flex items-center justify-between p-4 border-b border-border/50 bg-muted/20">
          <h3 className="font-heading font-semibold text-sm">Notifications</h3>
          {notifications.length > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">
              {notifications.length} recent
            </span>
          )}
        </div>
        
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <Bell className="w-5 h-5 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-foreground">You're all caught up</p>
              <p className="text-xs text-muted-foreground mt-1">No new notifications right now.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              <AnimatePresence initial={false}>
                {notifications.map((notif, index) => {
                  const Icon = notif.icon;
                  return (
                    <motion.div 
                      key={notif.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="group flex gap-4 p-4 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${notif.bgColor} ${notif.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-semibold leading-none">{notif.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{notif.message}</p>
                        <p className="text-xs text-muted-foreground/80 font-medium">
                          {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
        <div className="p-3 border-t border-border/50 bg-muted/10">
          <Button variant="outline" className="w-full text-xs font-semibold rounded-xl h-9" onClick={() => setIsOpen(false)}>
            Mark all as read
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
