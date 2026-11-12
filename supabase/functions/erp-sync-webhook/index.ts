import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-forgiven-connection-id, x-forgiven-signature, x-forgiven-timestamp",
};

/**
 * Derives HMAC key according to ERP specification:
 * If secret starts with 'whsec_', compute SHA-256 in hex;
 * otherwise, use secret string directly.
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
 * Computes HMAC-SHA256 signature formatted as lowercase hexadecimal.
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

/**
 * Sleep helper for exponential backoff retries.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const ERP_WEBHOOK_URL =
      Deno.env.get("FORGIVEN_ERP_WEBHOOK_URL") || "https://forgiven-erp.vercel.app/api/v1/webhook";
    const ERP_CONNECTION_ID =
      Deno.env.get("FORGIVEN_ERP_CONNECTION_ID") || "fsc_cb66ba75_9434a40fca1d87cb0e9d336813ad310f9dccc897cf2c4d86";
    const ERP_WEBHOOK_SECRET =
      Deno.env.get("FORGIVEN_ERP_WEBHOOK_SECRET") || "whsec_e0a51c7126807b292906ca4b6c90ae70014a6180d821382b";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse incoming request body
    const body = await req.json().catch(() => ({}));

    // Normalize eventType and payload from either pg_net trigger or direct invocation
    let eventType: string =
      body.eventType || body.event_type || "commerce.event";
    let payload: Record<string, unknown> = body.payload || {};

    // Support database trigger shape: { type: 'INSERT', record: { ... }, old_record: { ... } }
    if (!body.payload && body.record) {
      const record = body.record;
      if (body.table === "orders" || record.total !== undefined) {
        eventType =
          body.type === "INSERT"
            ? "commerce.order.created"
            : record.status === "paid"
            ? "commerce.order.paid"
            : record.status === "cancelled"
            ? "commerce.order.cancelled"
            : "commerce.order.updated";
        payload = {
          entity_type: "order",
          entity_id: record.id,
          ...record,
        };
      } else if (body.table === "customers" || (record.phone && record.customer_status)) {
        eventType = "commerce.customer.created";
        payload = {
          entity_type: "customer",
          entity_id: record.id,
          ...record,
        };
      } else if (body.table === "products" || record.stock_quantity !== undefined) {
        eventType = "commerce.inventory.updated";
        payload = {
          entity_type: "inventory",
          entity_id: record.id,
          ...record,
        };
      } else {
        payload = {
          entity_type: "custom",
          entity_id: record.id || crypto.randomUUID(),
          ...record,
        };
      }
    }

    // Ensure entity_type and entity_id exist in payload
    if (!payload.entity_type) {
      payload.entity_type = eventType.split(".")[1] || "entity";
    }
    if (!payload.entity_id) {
      payload.entity_id = (payload.id as string) || (payload.order_id as string) || crypto.randomUUID();
    }

    const eventId = (body.eventId as string) || crypto.randomUUID();
    const timestamp = typeof body.timestamp === "number" ? body.timestamp : Date.now();

    // Compute HMAC-SHA256 signature
    const signature = await computeSignature(ERP_WEBHOOK_SECRET, timestamp, payload);

    // Build standard ERP envelope
    const envelope = {
      connectionId: ERP_CONNECTION_ID,
      eventId,
      eventType,
      timestamp,
      signature,
      payload,
    };

    console.log(`[ERP Outbound Dispatcher] Preparing ${eventType} (Event ID: ${eventId}) -> ${ERP_WEBHOOK_URL}`);

    // Dispatch HTTP POST with exponential backoff (up to 3 retries)
    const MAX_ATTEMPTS = 3;
    let attempt = 0;
    let delivered = false;
    let isDuplicate = false;
    let httpStatus = 0;
    let responseBody = "";
    let lastError: Error | null = null;

    while (attempt < MAX_ATTEMPTS && !delivered) {
      attempt++;
      try {
        console.log(`[ERP Outbound Dispatcher] Delivery attempt ${attempt}/${MAX_ATTEMPTS}...`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(ERP_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Forgiven-Connection-Id": ERP_CONNECTION_ID,
            "X-Forgiven-Signature": signature,
            "X-Forgiven-Timestamp": timestamp.toString(),
            "X-Forgiven-Event-Type": eventType,
            "User-Agent": "Forgiven-Commerce-OS/1.0",
          },
          body: JSON.stringify(envelope),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        httpStatus = response.status;
        responseBody = await response.text();

        if (response.ok) {
          delivered = true;
          try {
            const parsed = JSON.parse(responseBody);
            if (parsed.isDuplicate === true) {
              isDuplicate = true;
              console.log(`[ERP Outbound Dispatcher] ERP reported event ${eventId} is already ingested (idempotent duplicate).`);
            }
          } catch (_) {
            // response was not JSON, but status was 2xx
          }
          console.log(`[ERP Outbound Dispatcher] ✅ Event ${eventId} delivered successfully (HTTP ${httpStatus}).`);
          break;
        } else {
          console.warn(`[ERP Outbound Dispatcher] Attempt ${attempt} returned HTTP ${httpStatus}: ${responseBody.slice(0, 200)}`);
          // If ERP rejects with 4xx client error (e.g. signature error or bad request), retrying won't help
          if (httpStatus >= 400 && httpStatus < 500) {
            break;
          }
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error(`[ERP Outbound Dispatcher] Attempt ${attempt} network exception: ${lastError.message}`);
      }

      if (!delivered && attempt < MAX_ATTEMPTS) {
        const backoffMs = attempt * 1000; // 1s, 2s
        console.log(`[ERP Outbound Dispatcher] Backing off for ${backoffMs}ms before retry...`);
        await sleep(backoffMs);
      }
    }

    const latencyMs = Date.now() - startTime;
    const finalStatus = delivered ? "delivered" : "failed";

    // Log to public.erp_sync_logs
    try {
      await supabase.from("erp_sync_logs").insert({
        event_id: eventId,
        event_type: eventType,
        payload: envelope,
        status: finalStatus,
        http_status: httpStatus || 0,
        response_body: responseBody.slice(0, 2000),
        attempts: attempt,
        direction: "outbound",
        latency_ms: latencyMs,
        error_message: delivered ? null : (lastError?.message || `HTTP ${httpStatus}`),
      });
    } catch (logErr) {
      console.error("[ERP Outbound Dispatcher] Failed to write to erp_sync_logs:", logErr);
    }

    return new Response(
      JSON.stringify({
        success: delivered,
        eventId,
        eventType,
        attempts: attempt,
        httpStatus,
        isDuplicate,
        latencyMs,
        response: responseBody.slice(0, 500),
      }),
      {
        status: delivered ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[ERP Outbound Dispatcher] Unhandled fatal error:", errorMsg);
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

