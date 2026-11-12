import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-forgiven-connection-id, x-forgiven-signature, x-forgiven-timestamp",
};

const ERP_MAX_REPLAY_WINDOW_MS = 300_000; // 5 minutes

/**
 * Derives HMAC key according to ERP specification.
 */
async function deriveHmacKey(secret: string): Promise<string> {
  if (secret.startsWith("whsec_")) {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return secret;
}

/**
 * Computes HMAC-SHA256 signature for comparison.
 */
async function computeSignature(secret: string, timestamp: number, payload: unknown): Promise<string> {
  const keyString = await deriveHmacKey(secret);
  const encoder = new TextEncoder();
  const message = `${timestamp}.${JSON.stringify(payload)}`;

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(keyString),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const ERP_WEBHOOK_SECRET =
      Deno.env.get("FORGIVEN_ERP_WEBHOOK_SECRET") || "whsec_forgiven_commerce_erp_dev_secret_2026";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { connectionId, eventId, eventType, timestamp, signature, payload } = body;

    // 1. Mandatory Field Validation
    if (!eventId || !eventType || !timestamp || !signature || !payload) {
      return new Response(
        JSON.stringify({
          error: "Missing required ERP envelope fields (eventId, eventType, timestamp, signature, payload)",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Replay Protection: 300-second window
    const now = Date.now();
    const delta = Math.abs(now - timestamp);
    if (delta > ERP_MAX_REPLAY_WINDOW_MS) {
      console.warn(`[ERP Inbound Listener] Replay window exceeded: ${delta}ms > ${ERP_MAX_REPLAY_WINDOW_MS}ms for event ${eventId}`);
      return new Response(
        JSON.stringify({
          error: `Replay window exceeded: timestamp delta (${delta}ms) exceeds 300,000ms`,
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Cryptographic Signature Verification
    const expectedSignature = await computeSignature(ERP_WEBHOOK_SECRET, timestamp, payload);

    if (expectedSignature.length !== signature.length) {
      return new Response(JSON.stringify({ error: "Invalid HMAC signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let mismatch = 0;
    for (let i = 0; i < expectedSignature.length; i++) {
      mismatch |= expectedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    if (mismatch !== 0) {
      console.warn(`[ERP Inbound Listener] Signature mismatch for event ${eventId}`);
      return new Response(JSON.stringify({ error: "Invalid HMAC signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[ERP Inbound Listener] Verified signature for ${eventType} (Event ID: ${eventId})`);

    // 4. Idempotency Check via public.erp_sync_logs
    const { data: existingLog } = await supabase
      .from("erp_sync_logs")
      .select("id, status")
      .eq("event_id", eventId)
      .maybeSingle();

    if (existingLog && (existingLog.status === "delivered" || existingLog.status === "processed")) {
      console.log(`[ERP Inbound Listener] Event ${eventId} was already processed. Returning idempotent success.`);
      return new Response(
        JSON.stringify({
          success: true,
          isDuplicate: true,
          eventId,
          message: "Event already processed (idempotent ingestion)",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Inbound Business Logic Execution
    let actionSummary = "No database mutation required";

    if (eventType === "erp.inventory.updated" || eventType === "erp.stock.adjusted") {
      const productId = (payload.product_id as string) || (payload.entity_id as string);
      const sku = payload.sku as string | undefined;
      const newStock = typeof payload.stock_quantity === "number" ? payload.stock_quantity : undefined;
      const delta = typeof payload.delta === "number" ? payload.delta : undefined;

      let targetProduct = null;
      if (productId) {
        const { data } = await supabase.from("products").select("id, stock_quantity, name").eq("id", productId).maybeSingle();
        targetProduct = data;
      }

      if (!targetProduct && sku) {
        const { data } = await supabase.from("products").select("id, stock_quantity, name").contains("metadata", { sku }).maybeSingle();
        targetProduct = data;
      }

      if (targetProduct) {
        let finalStock = targetProduct.stock_quantity || 0;
        if (newStock !== undefined) {
          finalStock = Math.max(0, newStock);
        } else if (delta !== undefined) {
          finalStock = Math.max(0, finalStock + delta);
        }

        const stockStatus =
          finalStock <= 0 ? "out_of_stock" : finalStock <= 5 ? "low_stock" : "in_stock";

        await supabase
          .from("products")
          .update({
            stock_quantity: finalStock,
            stock_status: stockStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", targetProduct.id);

        actionSummary = `Updated product ${targetProduct.id} (${targetProduct.name}) stock to ${finalStock} (${stockStatus})`;
        console.log(`[ERP Inbound Listener] ${actionSummary}`);
      } else {
        actionSummary = `Target product not found for id=${productId || "none"}, sku=${sku || "none"}`;
        console.warn(`[ERP Inbound Listener] ${actionSummary}`);
      }
    } else if (eventType === "erp.catalog.price_updated" || eventType === "erp.product.updated") {
      const productId = (payload.product_id as string) || (payload.entity_id as string);
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

      if (typeof payload.price === "number") updates.price = payload.price;
      if (typeof payload.vendor_cost === "number") updates.vendor_cost = payload.vendor_cost;

      if (productId && (updates.price !== undefined || updates.vendor_cost !== undefined)) {
        await supabase.from("products").update(updates).eq("id", productId);
        actionSummary = `Updated product ${productId} pricing: price=${updates.price}, vendor_cost=${updates.vendor_cost}`;
        console.log(`[ERP Inbound Listener] ${actionSummary}`);
      }
    } else if (eventType === "erp.sale.completed") {
      actionSummary = `Logged retail sale event from ERP for POS reference ${payload.receipt_number || payload.sale_id || "N/A"}`;
      console.log(`[ERP Inbound Listener] ${actionSummary}`);
    }

    const latencyMs = Date.now() - startTime;

    // 6. Record Inbound Delivery in erp_sync_logs
    await supabase.from("erp_sync_logs").upsert(
      {
        event_id: eventId,
        event_type: eventType,
        payload: body,
        status: "processed",
        http_status: 200,
        response_body: actionSummary,
        attempts: 1,
        direction: "inbound",
        latency_ms: latencyMs,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id" }
    );

    return new Response(
      JSON.stringify({
        success: true,
        isDuplicate: false,
        eventId,
        eventType,
        action: actionSummary,
        processedAt: new Date().toISOString(),
        latencyMs,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[ERP Inbound Listener] Unhandled error:", errorMsg);
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

