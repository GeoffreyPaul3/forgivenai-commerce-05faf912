import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
const MESSAGING_SERVICE_SID = Deno.env.get("MESSAGING_SERVICE_SID") || "";

const TEMPLATES = {
  GENERAL_RESPONSE: "HX3f4272c07d1cacefdba31d2105e4a673",
  REENGAGEMENT: "HX39a275e1cb9bb272e0a2ad0f8bebbf3b",
  ORDER_CONFIRMATION: "HX5666afd4161a3eea9cb78e1343ae5107",
  ORDER_STATUS: "HX7f92e1e88e48643c35d41e78b21dbadf",
  SUPPORT_FOLLOWUP: "HX9d273c5d75f7e5d73402f090afd5f99c",
  ORDER_TRACKING: "HX1931643177fbfd2fe579809f4a99060b",
};

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

const QWEN_API_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";
const QWEN_MODEL = "qwen-plus";

async function callAI(apiKey: string, systemPrompt: string, history: any[], userMessage: string): Promise<string> {
  const res = await fetch(QWEN_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: QWEN_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`Qwen AI error ${res.status}:`, errText);
    throw new Error(`AI error: ${res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "Sorry, I couldn't process that.";
}

async function validateTwilioRequest(req: Request, bodyText: string): Promise<boolean> {
  const bypass = Deno.env.get("BYPASS_TWILIO_AUTH") === "true";
  if (bypass) {
    console.warn("⚠️ BYPASSING TWILIO AUTHENTICATION (BYPASS_TWILIO_AUTH=true)");
    return true;
  }

  const signature = req.headers.get("x-twilio-signature");
  if (!signature) {
    console.error("Missing X-Twilio-Signature header");
    return false;
  }

  const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!twilioAuthToken) {
    console.error("TWILIO_AUTH_TOKEN not configured in environment");
    return false;
  }

  // Supabase Edge Functions often report internal URLs or HTTP instead of HTTPS.
  // We need to reconstruct the public URL exactly as Twilio sees it.
  const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
  const forwardedHost = req.headers.get("x-forwarded-host") || new URL(req.url).host;
  
  const urlObj = new URL(req.url);
  const publicUrl = `${forwardedProto}://${forwardedHost}/functions/v1/whatsapp-webhook${urlObj.search}`;

  const params = new URLSearchParams(bodyText);
  // Twilio sorts params by alphabetical order of keys
  const data = Array.from(params.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .reduce((acc, [key, val]) => acc + key + val, publicUrl);

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(twilioAuthToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  
  const hmac = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const digest = btoa(String.fromCharCode(...new Uint8Array(hmac)));

  const matched = digest === signature;
  if (!matched) {
    console.error("❌ Twilio Signature Mismatch!");
    console.log("Details for troubleshooting:");
    console.log("- Public URL used for signing:", publicUrl);
    console.log("- Parameters signed:", Array.from(params.keys()).join(", "));
    console.log("- Received Signature:", signature);
    console.log("- Calculated Signature:", digest);
    console.warn("TIP: Ensure your TWILIO_AUTH_TOKEN in Supabase matches the account sending the message.");
  }

  return matched;
}

async function sendWhatsApp(to: string, body: string, mediaUrl?: string, templateSid?: string) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !MESSAGING_SERVICE_SID) {
    throw new Error("Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, MESSAGING_SERVICE_SID)");
  }

  // Use the smart message sender for reliability
  return await sendSmartMessageWithRetry(
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    MESSAGING_SERVICE_SID,
    to,
    body,
    { templateSid, mediaUrl }
  );
}

// Split long messages, send normally with exponential backoff retries, fallback to template if completely failing
async function sendSmartMessageWithRetry(
  accountSid: string, 
  authToken: string, 
  messagingServiceSid: string, 
  to: string, 
  body: string, 
  options?: { templateSid?: string, templateVars?: Record<string, string>, mediaUrl?: string }
) {
  const chunkSize = 1000;
  const chunks = [];
  
  if (body.length > chunkSize) {
    const paragraphs = body.split('\n\n');
    let currentChunk = "";
    
    for (const p of paragraphs) {
      if ((currentChunk.length + p.length) > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = p + "\n\n";
      } else {
        currentChunk += (currentChunk ? "\n\n" : "") + p;
      }
    }
    if (currentChunk.trim().length > 0) chunks.push(currentChunk.trim());
  } else {
    chunks.push(body);
  }

  const results = [];
  for (const chunk of chunks) {
    let attempts = 0;
    const maxAttempts = 3;
    let success = false;

    while (attempts < maxAttempts && !success) {
      attempts++;
      try {
        const res = await sendTwilioMessage(accountSid, authToken, messagingServiceSid, to, chunk, options?.mediaUrl);
        results.push(res);
        success = true;
      } catch (error: any) {
        console.warn(`Twilio attempt ${attempts} failed for ${to}: ${error.message}`);
        
        if (attempts >= maxAttempts) {
          try {
            console.log(`Max retries reached. Falling back to template message for ${to}`);
            const finalTemplateSid = options?.templateSid || TEMPLATES.GENERAL_RESPONSE;
            const vars = options?.templateVars || { "1": "We have an important update for you! Please reply to this message to continue." };
            const res = await sendTwilioTemplateMessage(accountSid, authToken, messagingServiceSid, to, finalTemplateSid, vars);
            results.push(res);
            success = true;
          } catch (templateError: any) {
            console.error(`CRITICAL: Template fallback also failed for ${to}:`, templateError.message);
            throw templateError;
          }
        } else {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 500));
        }
      }
    }
  }
  return results;
}

async function sendTwilioMessage(accountSid: string, authToken: string, messagingServiceSid: string, to: string, body: string, mediaUrl?: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params: Record<string, string> = { 
    To: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`, 
    MessagingServiceSid: messagingServiceSid, 
    Body: body 
  };

  if (mediaUrl) {
    params.MediaUrl = mediaUrl;
  }
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });
  
  if (!response.ok) {
    let errorMessage = await response.text();
    let errorCode = "Unknown";
    try {
      const errorData = JSON.parse(errorMessage);
      errorMessage = errorData.message || errorMessage;
      errorCode = errorData.code || errorCode;
    } catch (e) {
      // Ignored
    }
    throw new Error(`Twilio error [${response.status}]: ${errorMessage} (Code: ${errorCode})`);
  }
  return response.json();
}

async function sendTwilioTemplateMessage(accountSid: string, authToken: string, messagingServiceSid: string, to: string, contentSid: string, contentVariables: Record<string, string>) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params: Record<string, string> = { 
    To: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`, 
    MessagingServiceSid: messagingServiceSid,
    ContentSid: contentSid,
    ContentVariables: JSON.stringify(contentVariables)
  };
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });
  
  if (!response.ok) {
    let errorMessage = await response.text();
    let errorCode = "Unknown";
    try {
      const errorData = JSON.parse(errorMessage);
      errorMessage = errorData.message || errorMessage;
      errorCode = errorData.code || errorCode;
    } catch (e) {
      // Ignored
    }
    throw new Error(`Twilio template error [${response.status}]: ${errorMessage} (Code: ${errorCode})`);
  }
  return response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = getSupabase();
    const contentType = req.headers.get("content-type") || "";
    let bodyText = "";

    // ── Twilio Webhook (incoming WhatsApp message) ──
    if (contentType.includes("application/x-www-form-urlencoded")) {
      bodyText = await req.text();
      
      // Verify signature
      const isValid = await validateTwilioRequest(req, bodyText);
      if (!isValid) {
        console.error("Invalid Twilio signature");
        return new Response("Forbidden", { status: 403 });
      }

      const formData = new URLSearchParams(bodyText);
      const from = formData.get("From") || "";
      const to = formData.get("To") || "";
      const body = formData.get("Body") || "";
      const customerPhone = from.replace("whatsapp:", "");

      // ── Customer Identification ──
      let { data: customer } = await supabase
        .from("customers")
        .select("*")
        .eq("phone", customerPhone)
        .single();
      
      // Referral detection: Scan body for FGV-XXXXXX or AGT-XXXXXX pattern
      const refMatch = body.match(/(?:FGV|AGT)-([A-Z0-9]{4,8})/i);
      const referralCode = refMatch ? refMatch[0].toUpperCase() : null;
      let agentId = null;

      if (referralCode) {
        // Try FGV- prefix first (native), then check agents by code fragment
        const { data: agent } = await supabase
          .from("agents")
          .select("id, referral_code")
          .or(`referral_code.eq.${referralCode},referral_code.ilike.*${refMatch?.[1] ?? ""}*`)
          .single();
        if (agent) {
          agentId = agent.id;
          console.log(`✅ Referral detected: ${referralCode} → agent ${agentId}`);
        } else {
          console.log(`⚠️ Referral code ${referralCode} not matched to any agent`);
        }
      }

      // ── Conversation Handling ──
      // Find or create conversation
      let { data: convo } = await supabase
        .from("conversations")
        .select("*")
        .eq("customer_phone", customerPhone)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!convo) {
        const { data: newConvo } = await supabase
          .from("conversations")
          .insert({ customer_phone: customerPhone, channel: "whatsapp", status: "open", last_message_at: new Date().toISOString(), agent_id: agentId })
          .select()
          .single();
        convo = newConvo;
      } else {
        // Persist agent_id on the conversation if we just detected one (referral code in this message)
        const updatePayload: Record<string, any> = { last_message_at: new Date().toISOString() };
        if (agentId) updatePayload.agent_id = agentId;
        await supabase.from("conversations").update(updatePayload).eq("id", convo.id);
        // Fall back to the stored agent_id if the current message has no referral code
        if (!agentId && convo.agent_id) agentId = convo.agent_id;
        // Ultimate fallback: check if the customer already has a first_agent_id assigned
        if (!agentId && customer?.first_agent_id) {
          agentId = customer.first_agent_id;
          console.log(`[DEBUG] No code/convo agent found. Falling back to customer's first_agent_id: ${agentId}`);
        }
      }

      if (!convo) return new Response("<Response></Response>", { headers: { ...corsHeaders, "Content-Type": "text/xml" } });

      // Store customer message
      await supabase.from("messages").insert({ conversation_id: convo.id, role: "customer", content: body });

      // Get products for AI context
      const { data: products } = await supabase.from("products").select("id, name, category, price, currency, description, images, sizes, colors").eq("status", "active").limit(100);
      const productList = products?.map(p => {
        let details = `- ${p.name} (${p.category}) — ${p.currency} ${p.price}`;
        if (p.sizes && p.sizes.length > 0) details += ` | Sizes: ${p.sizes.join(", ")}`;
        if (p.colors && p.colors.length > 0) details += ` | Colours: ${p.colors.join(", ")}`;
        return details;
      }).join("\n") || "No products available";

      // Get conversation history (latest 15 messages, ordered chronologically)
      const { data: rawHistory } = await supabase.from("messages").select("role, content").eq("conversation_id", convo.id).order("created_at", { ascending: false }).limit(15);
      const historyData = (rawHistory ?? []).reverse();
      const history = historyData.map(m => ({
        role: m.role === "customer" ? "user" : "assistant",
        content: m.content,
      }));

      // ── YES Confirmation Intercept ──
      // If the customer is confirming an order, bypass the AI entirely.
      // Parse the order directly from the last bot summary message or use the saved pending_order.
      const isConfirmation = /^\s*(yes|yeah|yep|yup|sure|confirm|ok|okay|y)\s*[.!]?\s*$/i.test(body.trim());

      if (isConfirmation) {
        console.log(`[DEBUG] YES confirmation detected from ${customerPhone}`);
        
        let orderData = convo.pending_order;
        
        // Fallback: If no pending_order, try parsing the MOST RECENT summary message
        if (!orderData) {
          const reversedHistory = [...(historyData ?? [])].reverse();
          const summaryMsg = reversedHistory.find(m =>
            m.role === "ai" &&
            (m.content.includes("Reply **YES**") || m.content.includes("Reply YES") || m.content.toLowerCase().includes("reply yes"))
          );

          if (summaryMsg) {
            const c = summaryMsg.content;
            // Flexible regex to handle different AI formatting
            const productMatch  = c.match(/\*Product:\*\s*(.+)/) || c.match(/\*\*([^*]+)\*\*/);
            const quantityMatch = c.match(/\*Quantity:\*\s*(\d+)/);
            const sizeMatch     = c.match(/\*Size:\*\s*(.+)/);
            const colorMatch    = c.match(/\*Colour:\*\s*(.+)/);
            const priceMatch    = c.match(/\*(?:Price|Total):\*\s*MWK\s*([\d,]+)/) || c.match(/MWK\s*([\d,.]+)/);
            const nameMatch     = c.match(/\*Name:\*\s*(.+)/);
            const emailMatch    = c.match(/\*Email:\*\s*(.+)/);
            const addressMatch  = c.match(/\*Address:\*\s*(.+)/);
            const phoneMatch    = c.match(/\*Phone:\*\s*(.+)/);
            const courierMatch  = c.match(/\*Courier:\*\s*(.+)/);

            if (productMatch && priceMatch) {
              orderData = {
                product_name: productMatch[1].trim(),
                quantity: parseInt(quantityMatch?.[1] || "1"),
                size: sizeMatch?.[1]?.trim() || null,
                color: colorMatch?.[1]?.trim() || null,
                price: parseInt(priceMatch[1].replace(/,/g, "")),
                customer_name: nameMatch?.[1]?.trim() || customer?.name || "Guest",
                customer_email: emailMatch?.[1]?.trim() || customer?.email || "",
                address: addressMatch?.[1]?.trim() || "",
                phone: phoneMatch?.[1]?.trim() || customerPhone,
                courier: courierMatch?.[1]?.trim() || "Unspecified"
              };
              console.log(`✅ Parsed order from message history: ${orderData.product_name}`);
            }
          }
        }

        if (orderData) {
          try {
            const productName   = orderData.product_name || "";
            const quantity      = orderData.quantity || 1;
            const price         = orderData.price || 0;
            const custName      = orderData.customer_name || customer?.name || "Guest";
            const custEmail     = orderData.customer_email || customer?.email || "";
            const custAddress   = orderData.address || "";
            const custPhone     = orderData.phone || customerPhone;
            const custCourier   = orderData.courier || "Unspecified";

            if (productName && price > 0) {
              console.log(`⚡ Processing order for ${productName} — MWK ${price}`);

              const product = products?.find(p =>
                p.name.toLowerCase() === productName.toLowerCase() ||
                p.name.toLowerCase().includes(productName.toLowerCase())
              );

              // Update customer/convo details
              if (custName && custName !== "Guest") {
                await supabase.from("conversations").update({ customer_name: custName, pending_order: null }).eq("id", convo.id);
                await supabase.from("customers").update({ name: custName }).eq("phone", customerPhone);
              } else {
                await supabase.from("conversations").update({ pending_order: null }).eq("id", convo.id);
              }

              // Create order
              const isFirstOrder = customer ? (customer.total_orders === 0) : true;
              const { data: newOrder, error: orderError } = await supabase.from("orders").insert({
                customer_phone: customerPhone,
                customer_name:  custName,
                customer_email: custEmail,
                items: [{ 
                  product_id: product?.id || null, 
                  name: productName, 
                  quantity, 
                  price,
                  size: orderData.size,
                  color: orderData.color
                }] as any,
                total: price * quantity,
                channel: "whatsapp",
                agent_id: agentId,
                is_first_order: isFirstOrder,
                notes: `Delivery Address: ${custAddress} | Contact: ${custPhone} | Courier: ${custCourier}`,
                courier_name: custCourier,
                status: "pending",
              }).select().single();

              if (orderError || !newOrder) throw new Error(`Order creation failed: ${orderError?.message}`);
              console.log(`✅ Order created (YES intercept): ${newOrder.id}`);

              // Invoke create-payment
              const SUPABASE_URL_INT = Deno.env.get("SUPABASE_URL")!;
              const SUPABASE_SERVICE_ROLE_KEY_INT = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

              const payRes = await fetch(`${SUPABASE_URL_INT}/functions/v1/create-payment`, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY_INT}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  action:      "create_payment",
                  order_id:    newOrder.id,
                  amount:      newOrder.total,
                  currency:    "MWK",
                  email:       custEmail,
                  first_name:  custName,
                  title:       `Forgiven: ${productName}`,
                }),
              });

              const payData = await payRes.json();
              
              if (payData.success && payData.checkout_url) {
                const linkMsg = `✅ Order confirmed, ${custName.split(" ")[0]}! 🎉\n\n💳 Here is your secure payment link:\n${payData.checkout_url}\n\nYou can pay via Airtel Money, Mpamba, or Card.\nWe'll start processing your *${productName}* as soon as payment is confirmed! 🚀✨`;
                await sendWhatsApp(from, linkMsg, undefined, TEMPLATES.ORDER_CONFIRMATION);
                await supabase.from("messages").insert({ conversation_id: convo.id, role: "ai", content: `Payment link sent: ${payData.checkout_url}` });
                console.log(`✅ Payment link sent (YES intercept) to ${from}: ${payData.checkout_url}`);
              } else {
                const errDetail = payData.error || JSON.stringify(payData);
                console.error("❌ PayChangu failed (YES intercept):", errDetail);
                await sendWhatsApp(from, `⚠️ We're having a brief issue generating your payment link. Our team will send it to you within a few minutes. Sorry for the inconvenience! 🙏`, undefined, TEMPLATES.SUPPORT_FOLLOWUP);
                await supabase.from("messages").insert({ conversation_id: convo.id, role: "ai", content: `Payment link generation failed: ${errDetail}` });
              }

              return new Response("<Response></Response>", { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
            }
          } catch (interceptErr) {
            console.error("YES intercept failed, falling through to AI:", interceptErr);
          }
        }
      }

      // ── AI Context Building ──
      const customerStatus = customer?.customer_status || "new";
      const customerName = customer?.name || "Guest";
      
      // Fetch latest order for context
      const { data: latestOrder } = await supabase
        .from("orders")
        .select("status, items, total, created_at")
        .eq("customer_phone", customerPhone)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const latestOrderSummary = latestOrder 
        ? `Latest Order Status: ${latestOrder.status} | Total: MWK ${latestOrder.total} | Date: ${new Date(latestOrder.created_at).toLocaleDateString()}`
        : "No previous orders found.";

      const orderHistorySummary = customer 
        ? `Customer: ${customerName} | Status: ${customerStatus} | Total Orders: ${customer.total_orders} | Total Spent: MWK ${customer.total_spent}\n${latestOrderSummary}`
        : "New Customer - First Interaction";

      const QWEN_API_KEY = Deno.env.get("QWEN_API_KEY");
      if (!QWEN_API_KEY) {
        console.error("QWEN_API_KEY not configured");
        return new Response("<Response></Response>", { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      const systemPrompt = `You are the AI sales assistant for Forgiven Shopping Centre, Malawi's premium fashion & lifestyle brand.
Your goal is to provide a world-class shopping experience, guiding customers toward the perfect purchase, AND to answer questions about our Sales Agent programme.

STYLE RULES:
- Be friendly, helpful, professional, and elegant.
- Use emojis naturally to feel warm but premium.
- Keep responses concise and natural for WhatsApp.
- Always mention prices in MWK.

CUSTOMER CONTEXT:
${orderHistorySummary}
${customerStatus === 'returning' || customerStatus === 'high_value' 
  ? `Welcome them back as a valued customer. Acknowledge their loyalty.` 
  : `This is a new customer. Be inviting and showcase the best of Forgiven.`}

ACCURACY & MEMORY:
- Pay extreme attention to the customer's delivery details.
- Once details are shared, DO NOT ask for them again.
- Ensure the delivery address is precise (e.g., Area, City).

⚠️ CRITICAL PAYMENT LINK RULES — READ CAREFULLY:
- You NEVER generate, create, invent, or guess payment links.
- PayChangu payment links are ONLY generated by our secure backend system after the customer confirms their order.
- If a customer asks where their payment link is, say: "Your payment link is being securely generated. Please hold on for just a moment — it will be sent to you right away! 🔐"
- NEVER say something like "Here is your payment link: https://..." unless our system has provided you the actual link.
- NEVER fabricate URLs. Fake links destroy customer trust.

==============================================================
🤝 AGENT PROGRAMME — FULL KNOWLEDGE BASE
==============================================================
If anyone asks about becoming an agent, how it works, commissions, how to sign up, or anything related to the sales agent programme, use this knowledge to answer clearly and enthusiastically.

SIGN-UP LINK: https://agents.forgivensc.com
(Share this link when someone expresses interest in joining as an agent.)

WHAT IS THE AGENT PROGRAMME?
Forgiven Shopping Centre has a commission-based Sales Agent Programme where independent partners earn money by promoting and selling our products on social media and WhatsApp.

HOW IT WORKS:
- Agents promote Forgiven SC products using official images and captions.
- When a customer buys through an agent's referral, the agent earns 10% commission.
- Agents NEVER handle money directly — all payments go to Forgiven SC accounts.
- Agents must collect Proof of Payment (POP) and submit order details to Admin.

COMMISSION DETAILS (TIER-BASED SYSTEM):
Commission is NOT a flat rate — it grows with your monthly delivered sales:
- Tier 1: MWK 0 – 200,000/month = 8% commission
- Tier 2: MWK 200,000 – 500,000/month = 10% commission
- Tier 3: MWK 500,000 – 1,000,000/month = 12% commission
- Tier 4: MWK 1,000,000+/month = 15% commission
All new agents start at Tier 1 (8%). Tiers are calculated monthly on delivered sales.
- Example at Tier 1: Item sells for MWK 40,000 → agent earns MWK 3,200 (8%).
- Example at Tier 4: Item sells for MWK 40,000 → agent earns MWK 6,000 (15%).
- Commissions are recorded after the order is DELIVERED or picked up.
- Payout: Every Friday (bank transfer only — no cash, no mobile money to agents).

WHAT AGENTS CAN DO:
- Promote and sell Forgiven SC products
- Share official product photos and captions
- Use their referral link to track attributed sales
- Check their earnings, referrals, and orders in the Agent Portal

WHAT AGENTS CANNOT DO:
- Receive money directly from customers (strict rule)
- Change prices or offer unauthorised discounts
- Create their own promotional materials without approval
- Speak negatively about Forgiven SC or other agents

REQUIREMENTS TO JOIN:
- Own a smartphone
- Be able to read and speak both English and Chichewa
- Be motivated and able to commit time to making sales

OFFICIAL PLATFORMS:
- Main Shop: https://www.forgivensc.com
- Agent Portal: https://agents.forgivensc.com
- Vendor Portal: https://vendors.forgivensc.com

SUPPORT CONTACTS:
- WhatsApp: +265 997 128 899
- Direct Calls: +265 981 199 702
- Location: Lilongwe, Area 5, Karson House, Office #18
- Social Media: Instagram, Facebook & TikTok — "Forgiven Shopping Centre"

AGENT RESPONSE STYLE:
When someone asks about becoming an agent, respond enthusiastically, give them a brief overview, and end by sharing the sign-up link:
"👉 Sign up here to get started: https://agents.forgivensc.com"

If they want to know more (commissions, rules, how it works), answer from the knowledge above before directing them to sign up.
==============================================================

ORDER CAPTURE PROCESS:
1. Understand the customer's needs and recommend products from the catalog.
2. If they want to order, you MUST collect the following details BEFORE confirming:
   - Full Name
   - Email Address
   - Delivery Address (e.g., Kanjedza, Blantyre or Area 47, Lilongwe)
   - Preferred Contact Number
   - Preferred Courier Service (e.g., CTS, Smart Deliveries, Speed, etc.)
   - Size (if the product has size options)
   - Colour (if the product has colour options)
3. When you have all details and are ready to show the order summary, you MUST include this hidden machine-readable block FIRST (it will be stripped before sending to the customer — do NOT mention it):
###PENDING_ORDER###
{"product_name":"exact product name","quantity":1,"price":25000,"size":"XL","color":"Blue","customer_name":"Full Name","customer_email":"email@example.com","address":"Delivery Address","phone":"Contact Number","courier":"Preferred Courier"}
###END_PENDING_ORDER###

   Then present the human-readable summary:
   *Product:* X
   *Quantity:* X
   *Size:* X (only if applicable)
   *Colour:* X (only if applicable)
   *Total:* MWK X
   *Name:* X
   *Email:* X
   *Address:* X
   *Phone:* X
   *Courier:* X
   Ask: "Reply **YES** to confirm your order details and generate your secure payment link."

4. CRITICAL: ONLY AFTER the customer replies with "YES" or explicit confirmation of the summary, respond with EXACTLY this JSON block:
###ORDER_JSON###
{"product_name":"exact product name","quantity":1,"price":25000,"size":"XL","color":"Blue","customer_name":"Name","customer_email":"email@example.com","address":"Delivery Address","phone":"Contact Number","courier":"Preferred Courier"}
###END_ORDER_JSON###

Followed by ONLY: "Perfect! I'm generating your PayChangu secure payment link right now... 🚀"
DO NOT add any payment URL after this message. The actual link will be sent separately by our system.

MEDIA CAPABILITIES:
- You are integrated with a selective image delivery system.
- To send a product photo, you MUST wrap the EXACT product name in double curly braces: {{Product Name}}.
- ONLY trigger an image when:
  a) The customer specifically asks for a photo or image.
  b) The customer selects a single product and expresses interest.
- NEVER use these tags when listing multiple options or during general browsing.
- Inform the customer: "I'm sending you the image of {{Product Name}} now..."

AVAILABLE PRODUCTS:
${productList}`;

      let aiResponse: string;
      try {
        aiResponse = await callAI(QWEN_API_KEY, systemPrompt, history, body);
      } catch (aiErr) {
        console.error("AI call failed, sending fallback:", aiErr);
        await sendWhatsApp(from, "Thank you for your message! 😊 Our team will get back to you shortly.", undefined, TEMPLATES.SUPPORT_FOLLOWUP);
        await supabase.from("messages").insert({ conversation_id: convo.id, role: "ai", content: "Thank you for your message! Our team will get back to you shortly." });
        return new Response("<Response></Response>", { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      // ── Phase 1: Detect ###PENDING_ORDER### (shown when AI presents order summary) ──
      // This saves order data BEFORE the customer confirms, so we have a reliable fallback.
      const pendingOrderMatch = aiResponse.match(/###PENDING_ORDER###\s*([\s\S]*?)\s*###END_PENDING_ORDER###/);
      if (pendingOrderMatch) {
        try {
          const pendingOrderData = JSON.parse(pendingOrderMatch[1].trim());
          await supabase.from("conversations").update({ pending_order: pendingOrderData }).eq("id", convo.id);
          console.log("✅ Saved pending order to conversation:", JSON.stringify(pendingOrderData));
        } catch (e) {
          console.error("Failed to parse ###PENDING_ORDER### block:", e);
        }
        // Strip hidden block before sending to customer
        aiResponse = aiResponse.replace(/###PENDING_ORDER###[\s\S]*?###END_PENDING_ORDER###\n?/, "").trim();
      }

      // ── Phase 2: Detect ###ORDER_JSON### (AI confirmation of YES) ──
      const orderJsonMatch = aiResponse.match(/###ORDER_JSON###\s*([\s\S]*?)\s*###END_ORDER_JSON###/);

      // ── Helper: create order + send payment link ──
      const processOrderAndSendPayment = async (orderData: any, cleanText: string) => {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const product = products?.find(p => p.name.toLowerCase() === orderData.product_name.toLowerCase());

        // Update customer name
        if (orderData.customer_name) {
          await supabase.from("conversations").update({ customer_name: orderData.customer_name, pending_order: null }).eq("id", convo.id);
          await supabase.from("customers").update({ name: orderData.customer_name }).eq("phone", customerPhone);
        } else {
          await supabase.from("conversations").update({ pending_order: null }).eq("id", convo.id);
        }

        // Send the "generating" confirmation text to customer first
        await sendWhatsApp(from, cleanText, undefined, TEMPLATES.ORDER_CONFIRMATION);
        await supabase.from("messages").insert({ conversation_id: convo.id, role: "ai", content: cleanText });

        // Create order record
        const isFirstOrder = customer ? (customer.total_orders === 0) : true;
        const { data: newOrder, error: orderError } = await supabase.from("orders").insert({
          customer_phone: customerPhone,
          customer_name: orderData.customer_name,
          customer_email: orderData.customer_email,
          items: [{ 
            product_id: product?.id || null, 
            name: orderData.product_name, 
            quantity: orderData.quantity, 
            price: orderData.price,
            size: orderData.size,
            color: orderData.color
          }] as any,
          total: orderData.price * orderData.quantity,
          channel: "whatsapp",
          agent_id: agentId,
          is_first_order: isFirstOrder,
          notes: `Delivery Address: ${orderData.address} | Contact: ${orderData.phone} | Courier: ${orderData.courier || 'Unspecified'}`,
          courier_name: orderData.courier || 'Unspecified',
          status: "pending",
        }).select().single();

        if (orderError) {
          console.error("Failed to create order:", orderError);
          throw new Error(`Order creation failed: ${orderError.message}`);
        }

        if (!newOrder) throw new Error("Order creation returned no data");

        console.log(`✅ Order created: ${newOrder.id} for ${orderData.product_name} — MWK ${newOrder.total}`);

        // Invoke create-payment
        const payRes = await fetch(`${SUPABASE_URL}/functions/v1/create-payment`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "create_payment",
            order_id: newOrder.id,
            amount: newOrder.total,
            currency: "MWK",
            email: orderData.customer_email,
            first_name: orderData.customer_name,
            title: `Forgiven: ${orderData.product_name}`,
          }),
        });

        const payData = await payRes.json();
        console.log("PayChangu response:", JSON.stringify(payData));

        if (payData.success && payData.checkout_url) {
          await sendWhatsApp(
            from,
            `💳 Here is your secure payment link:\n${payData.checkout_url}\n\nYou can pay via Airtel Money, Mpamba, or Card. We'll start processing your order as soon as payment is confirmed! ✨`,
            undefined,
            TEMPLATES.ORDER_CONFIRMATION
          );
          await supabase.from("messages").insert({ conversation_id: convo.id, role: "ai", content: `Payment link sent: ${payData.checkout_url}` });
          console.log(`✅ Payment link sent to ${from}: ${payData.checkout_url}`);
        } else {
          const errDetail = payData.error || JSON.stringify(payData);
          console.error("❌ PayChangu did not return checkout_url:", errDetail);
          await sendWhatsApp(
            from,
            `⚠️ We had a brief issue generating your payment link. Our support team has been notified and will send it to you within a few minutes. Sorry for the inconvenience! 🙏`,
            undefined,
            TEMPLATES.SUPPORT_FOLLOWUP
          );
          await supabase.from("messages").insert({ conversation_id: convo.id, role: "ai", content: `Payment link generation failed. Error: ${errDetail}` });
        }
      };

      if (orderJsonMatch) {
        // ── AI correctly output the ORDER_JSON block ──
        try {
          const cleanText = aiResponse.replace(/###ORDER_JSON###[\s\S]*?###END_ORDER_JSON###/, "").trim();
          const orderData = JSON.parse(orderJsonMatch[1].trim());
          await processOrderAndSendPayment(orderData, cleanText);
        } catch (e) {
          console.error("Order processing error (from ORDER_JSON):", e);
          await sendWhatsApp(from, aiResponse.replace(/###ORDER_JSON###[\s\S]*?###END_ORDER_JSON###/, "").trim(), undefined, TEMPLATES.GENERAL_RESPONSE);
        }
      } else if (
        // ── Fallback: AI said "generating" but forgot the JSON block ──
        // Use the pending_order stored when the summary was shown
        (aiResponse.includes("generating your PayChangu") || aiResponse.includes("generating your secure payment")) &&
        convo.pending_order
      ) {
        console.log("⚡ Fallback triggered: AI omitted ORDER_JSON block. Using stored pending_order.");
        try {
          const orderData = convo.pending_order;
          const cleanText = aiResponse.trim();
          await processOrderAndSendPayment(orderData, cleanText);
        } catch (e) {
          console.error("Order processing error (from pending_order fallback):", e);
          await sendWhatsApp(from, aiResponse, undefined, TEMPLATES.GENERAL_RESPONSE);
          await supabase.from("messages").insert({ conversation_id: convo.id, role: "ai", content: aiResponse });
        }
      } else {
        // ── Normal conversational response ──
        await sendWhatsApp(from, aiResponse, undefined, TEMPLATES.GENERAL_RESPONSE);
        await supabase.from("messages").insert({ conversation_id: convo.id, role: "ai", content: aiResponse });
      }

      return new Response("<Response></Response>", { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
    }

    // ── API calls from dashboard ──
    const jsonBody = await req.json();
    const { action } = jsonBody;

    if (action === "send-message") {
      const { conversationId, phone, message, mediaUrl } = jsonBody;
      if (!phone || !message) throw { status: 400, message: "Phone and message required" };

      await sendWhatsApp(phone, message, mediaUrl, TEMPLATES.GENERAL_RESPONSE);

      if (conversationId) {
        await supabase.from("messages").insert({ conversation_id: conversationId, role: "admin", content: message });
        await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw { status: 400, message: `Unknown action: ${action}` };
  } catch (e: unknown) {
    console.error("WhatsApp webhook error:", e);
    const err = e as { status?: number; message?: string };
    return new Response(
      JSON.stringify({ error: err?.message || "Unknown error" }),
      { status: err?.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
