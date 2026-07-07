import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
const TWILIO_MESSAGING_SERVICE_SID = Deno.env.get("MESSAGING_SERVICE_SID") || Deno.env.get("TWILIO_MESSAGING_SERVICE_SID") || "";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function sendWhatsApp(to: string, body: string, mediaUrl?: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  
  const formData: Record<string, string> = {
    To: `whatsapp:${to}`,
    MessagingServiceSid: TWILIO_MESSAGING_SERVICE_SID,
    Body: body,
  };

  if (mediaUrl) {
    formData.MediaUrl = mediaUrl;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(formData),
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error("Twilio error:", error);
    throw new Error(`Twilio error: ${error}`);
  }
  
  return response.json();
}

const statusConfig: Record<string, { emoji: string, message: string }> = {
  pending: { emoji: "⏳", message: "We've received your order and it's currently pending review." },
  confirmed: { emoji: "✅", message: "Great news! Your order has been confirmed by our team." },
  paid: { emoji: "💰", message: "Your payment has been successfully processed!" },
  processing: { emoji: "⚙️", message: "We're now busy preparing your items for shipment." },
  shipped: { emoji: "🚚", message: "Exciting news! Your order is on its way to you." },
  delivered: { emoji: "🎁", message: "Your order has been delivered! We hope you love it! ✨" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { record, old_record, type } = await req.json();

    // ── VENDOR NOTIFICATIONS (on INSERT) ──
    if (type === 'INSERT') {
      const items = record.items || [];
      const productIds = items.map((i: any) => i.product_id).filter(Boolean);
      
      if (productIds.length > 0) {
        // Fetch unique vendors for these products
        const { data: products } = await supabase
          .from("products")
          .select("vendor_id, vendors(phone, business_name)")
          .in("id", productIds);
        
        const vendorsToNotify = new Map();
        products?.forEach(p => {
          if (p.vendor_id && p.vendors?.phone) {
            vendorsToNotify.set(p.vendor_id, {
              phone: p.vendors.phone,
              name: p.vendors.business_name,
              items: items.filter((i: any) => i.product_id && products.find(prod => prod.vendor_id === p.vendor_id))
            });
          }
        });

        for (const [vendorId, vendor] of vendorsToNotify.entries()) {
          const itemsText = vendor.items.map((i: any) => `• ${i.name} x${i.quantity}`).join("\n");
          const vendorMessage = `🏪 *New Order Alert: ${vendor.name}*\n\nYou have a new order request!\n\n📝 *Items:*\n${itemsText}\n\n📍 *Status:* Pending your confirmation.\n\nPlease login to your Vendor Portal to accept this order: ${Deno.env.get("PUBLIC_URL") || 'https://forgiven.ai'}/dashboard/vendor-portal`;
          
          console.log(`Notifying vendor ${vendor.name} at ${vendor.phone}`);
          await sendWhatsApp(vendor.phone, vendorMessage);
        }
      }

      // ── AGENT NOTIFICATIONS (on INSERT) ──
      if (record.agent_id) {
        const { data: agent } = await supabase
          .from("agents")
          .select("name, phone")
          .eq("id", record.agent_id)
          .maybeSingle();

        if (agent?.phone) {
          const customerName = record.customer_name || 'A customer';
          const totalFormatted = `MWK ${Number(record.total).toLocaleString()}`;
          const agentMessage = `🚀 *New Referral Sale!*\n\nCongratulations ${agent.name || 'Agent'}! ${customerName} just placed an order using your link.\n\n💰 *Order Total:* ${totalFormatted}\n📈 *Status:* Pending confirmation\n\nYour commission is being tracked! Keep up the great work. ✨`;
          
          console.log(`Notifying agent ${agent.name} at ${agent.phone} about new sale`);
          await sendWhatsApp(agent.phone, agentMessage);
        }
      }
    }

    // ── CUSTOMER NOTIFICATIONS & SMART DELIVERIES (on UPDATE) ──
    if (type === 'UPDATE' && record.status !== old_record.status) {
      const status = record.status;
      const config = statusConfig[status];
      
      // Logistics Orchestrator Automation (Event-Based)
      if (status === 'paid') {
        try {
          const { data: deliveryOrder } = await supabase
            .from('delivery_orders')
            .select('id, courier_providers(code)')
            .eq('order_id', record.id)
            .maybeSingle();

          if (deliveryOrder && deliveryOrder.courier_providers?.code) {
            console.log(`Order ${record.id} paid. Emitting ShipmentRequested to logistics-orchestrator...`);
            
            // Invoke edge function delegating to Orchestrator
            const { data, error } = await supabase.functions.invoke('logistics-orchestrator', {
              body: { 
                action: 'create-shipment', 
                payload: {
                  orderId: record.id,
                  deliveryOrderId: deliveryOrder.id,
                  provider: deliveryOrder.courier_providers.code
                }
              }
            });
            
            if (error) {
              console.error("Logistics Orchestrator shipment creation failed:", error);
            } else {
              console.log("Logistics Orchestrator response:", data);
            }
          }
        } catch (deliverySyncError) {
          console.error("Error triggering Logistics Orchestrator sync:", deliverySyncError);
        }
      }

      // Send WhatsApp Notification
      if (config) {
        const phone = record.customer_phone;
        const name = record.customer_name || 'Customer';
        let itemsList = "";
        let firstProductImage = null;

        if (Array.isArray(record.items)) {
          itemsList = record.items.map((item: any) => `• ${item.name} x${item.quantity}`).join("\n");
          if (record.items.length > 0) {
            const productId = record.items[0].product_id;
            if (productId) {
              const { data: product } = await supabase.from("products").select("images").eq("id", productId).maybeSingle();
              if (product?.images?.length > 0) firstProductImage = product.images[0];
            }
          }
        }

        const totalFormatted = `MWK ${Number(record.total).toLocaleString()}`;
        const address = record.notes || "Not specified";
        const message = `Hi ${name}! ${config.emoji}\n\n${config.message}\n\n📝 *Order Details:*\n${itemsList}\n\n💰 *Total:* ${totalFormatted}\n📍 *Delivery:* ${address}\n📦 *Status:* ${status}\n\nThank you for choosing Forgiven Shopping Centre! 💫`;
        
        console.log(`Sending ${status} update to customer ${phone}`);
        await sendWhatsApp(phone, message, firstProductImage || undefined);

        // ── AGENT NOTIFICATIONS (on UPDATE) ──
        if (record.agent_id) {
          const { data: agent } = await supabase
            .from("agents")
            .select("name, phone")
            .eq("id", record.agent_id)
            .maybeSingle();

          if (agent?.phone) {
            const agentStatusUpdate = `📦 *Referral Order Update*\n\nThe order from ${name} (Referral) has been updated to: *${status.toUpperCase()}* ${config.emoji}\n\nKeep sharing your link to earn more commissions! 🚀`;
            console.log(`Notifying agent ${agent.name} about status update`);
            await sendWhatsApp(agent.phone, agentStatusUpdate);
          }
        }
      }
    }

    // ── PAYOUT NOTIFICATIONS (on UPDATE) ──
    if (type === 'PAYOUT_UPDATE' && record.status === 'paid' && old_record.status !== 'paid') {
      const { data: agent } = await supabase
        .from("agents")
        .select("name, phone")
        .eq("id", record.agent_id)
        .maybeSingle();

      if (agent?.phone) {
        const amountFormatted = `MWK ${Number(record.amount).toLocaleString()}`;
        const payoutMessage = `💰 *Earnings Alert: Paid!* 🎊\n\nHi ${agent.name || 'Agent'}! Your payout of *${amountFormatted}* has been successfully processed and sent to your registered payment method.\n\nThank you for being a valued part of Forgiven Shopping Centre. Keep those referrals coming! 🚀`;
        
        console.log(`Notifying agent ${agent.name} about payout completion`);
        await sendWhatsApp(agent.phone, payoutMessage);
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Order automation error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
