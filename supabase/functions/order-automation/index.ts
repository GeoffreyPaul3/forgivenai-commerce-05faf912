import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
const TWILIO_WHATSAPP_NUMBER = Deno.env.get("TWILIO_WHATSAPP_NUMBER") || "";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function sendWhatsApp(to: string, body: string, mediaUrl?: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  
  const formData: Record<string, string> = {
    To: `whatsapp:${to}`,
    From: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
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

    // Only process updates where status has changed
    if (type === 'UPDATE' && record.status !== old_record.status) {
      const status = record.status;
      const config = statusConfig[status];
      
      // If we don't have a config for this status, skip
      if (!config) return new Response(JSON.stringify({ skipped: true, reason: 'unsupported status' }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const phone = record.customer_phone;
      const name = record.customer_name || 'Customer';
      
      // 1. Format Order Details
      let itemsList = "";
      let firstProductImage = null;

      if (Array.isArray(record.items)) {
        itemsList = record.items.map((item: any) => `• ${item.name} x${item.quantity}`).join("\n");
        
        // Try to fetch image for the first product if not provided in item record
        if (record.items.length > 0) {
          const firstItem = record.items[0];
          const productId = firstItem.product_id;
          
          if (productId) {
            const { data: product } = await supabase
              .from("products")
              .select("images")
              .eq("id", productId)
              .maybeSingle();
            
            if (product?.images && product.images.length > 0) {
              firstProductImage = product.images[0];
            }
          }
        }
      }

      const totalFormatted = `MWK ${Number(record.total).toLocaleString()}`;
      const address = record.notes || "Not specified";
      
      const message = `Hi ${name}! ${config.emoji}\n\n${config.message}\n\n📝 *Order Details:*\n${itemsList}\n\n💰 *Total:* ${totalFormatted}\n📍 *Delivery:* ${address}\n📦 *Status:* ${status}\n\nThank you for choosing Forgiven Shopping Centre! 💫`;
      
      console.log(`Sending ${status} update to ${phone}`);
      await sendWhatsApp(phone, message, firstProductImage || undefined);
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Order automation error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
