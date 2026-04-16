import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
const TWILIO_WHATSAPP_NUMBER = Deno.env.get("TWILIO_WHATSAPP_NUMBER") || "";

async function sendWhatsApp(to: string, body: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: `whatsapp:${to}`,
      From: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
      Body: body,
    }),
  });
  return response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { record, old_record, type } = await req.json();

    // Only handle updates where status changes to 'delivered'
    if (type === 'UPDATE' && record.status === 'delivered' && old_record.status !== 'delivered') {
      const phone = record.customer_phone;
      const name = record.customer_name || 'Customer';
      
      const message = `Hello ${name}! 👋 Your order from Forgiven Shopping Centre has been delivered! ✨\n\nWe hope you love your purchase. If you have a moment, we'd love to hear your feedback. 👗\n\nYou can always view our latest collection directly here on WhatsApp. Just say "Hi" to see what's new!`;
      
      console.log(`Sending delivery follow-up to ${phone}`);
      await sendWhatsApp(phone, message);

      // Add logic for retention or marking as follow-up sent if needed
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Order automation error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
