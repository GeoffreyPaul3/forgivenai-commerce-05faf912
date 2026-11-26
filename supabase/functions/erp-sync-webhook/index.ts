import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-forgiven-connection-id, x-forgiven-signature, x-forgiven-timestamp, x-forgiven-event-id, x-forgiven-event-type",
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapOrderStatusToEventType(opType: string | undefined, status: unknown): string {
  if (opType === "INSERT") return "commerce.order.created";
  const normalized = typeof status === "string" ? status.toLowerCase() : "";
  switch (normalized) {
    case "paid":
      return "commerce.order.paid";
    case "confirmed":
      return "commerce.order.confirmed";
    case "shipped":
    case "in_transit":
    case "parcel_created":
      return "commerce.order.shipped";
    case "delivered":
      return "commerce.order.delivered";
    case "refunded":
    case "returned":
      return "commerce.order.refunded";
    case "cancelled":
    case "rejected":
      return "commerce.order.cancelled";
    default:
      return "commerce.order.updated";
  }
}

function classifyProductTrigger(
  opType: string | undefined,
  record: Record<string, unknown>,
  oldRecord?: Record<string, unknown>
): { eventType: string; entityType: string } {
  if (opType === "INSERT") {
    return { eventType: "commerce.product.created", entityType: "product" };
  }

  if (oldRecord && typeof oldRecord === "object") {
    const catalogKeys = [
      "name",
      "description",
      "category",
      "subcategory",
      "price",
      "vendor_cost",
      "landed_cost",
      "status",
      "metadata",
      "inventory_mode",
    ];
    const catalogChanged = catalogKeys.some(
      (k) => JSON.stringify(record[k] ?? null) !== JSON.stringify(oldRecord[k] ?? null)
    );
    if (!catalogChanged && (record.stock_quantity !== oldRecord.stock_quantity || record.stock_status !== oldRecord.stock_status)) {
      return { eventType: "commerce.inventory.updated", entityType: "inventory" };
    }
  }

  return { eventType: "commerce.product.updated", entityType: "product" };
}

function buildProductPayload(
  record: Record<string, unknown>,
  entityType: string,
  oldRecord?: Record<string, unknown>
): Record<string, unknown> {
  const meta =
    typeof record.metadata === "object" && record.metadata !== null
      ? (record.metadata as Record<string, unknown>)
      : {};
  const sku =
    (typeof record.sku === "string" ? record.sku.trim() : "") ||
    (typeof meta.sku === "string" ? meta.sku.trim() : "") ||
    (typeof meta.vendor_sku === "string" ? meta.vendor_sku.trim() : "");
  const statusStr = typeof record.status === "string" ? record.status.toLowerCase() : "";

  return {
    entity_type: entityType,
    entity_id: record.id,
    product_id: record.id,
    ...(sku ? { sku } : {}),
    selling_price: record.price,
    cost_price: record.vendor_cost ?? record.landed_cost ?? 0,
    is_active: statusStr !== "archived" && statusStr !== "draft",
    ...(oldRecord && typeof oldRecord.stock_quantity === "number" && typeof record.stock_quantity === "number"
      ? {
          previous_stock_quantity: oldRecord.stock_quantity,
          delta: record.stock_quantity - oldRecord.stock_quantity,
        }
      : {}),
    ...record,
  };
}

/**
 * Resolves metadata.sku from public.products for order line items missing a SKU
 * so ERP matches canonical SKUs instead of creating fallback product codes.
 */
async function enrichOrderItemsWithSkus(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, unknown>
): Promise<void> {
  if (!Array.isArray(payload.items) || payload.items.length === 0) return;

  const missingProductIds = Array.from(
    new Set(
      payload.items
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
        .filter((item) => !item.sku && typeof item.product_id === "string" && item.product_id.length > 0)
        .map((item) => item.product_id as string)
    )
  );

  if (missingProductIds.length === 0) return;

  const { data: products } = await supabase
    .from("products")
    .select("id, metadata")
    .in("id", missingProductIds);

  if (!products || products.length === 0) return;

  const skuById = new Map<string, string>();
  for (const prod of products) {
    const meta = (prod.metadata ?? {}) as Record<string, unknown>;
    const sku =
      (typeof meta.sku === "string" ? meta.sku.trim() : "") ||
      (typeof meta.vendor_sku === "string" ? meta.vendor_sku.trim() : "");
    if (sku) skuById.set(prod.id, sku);
  }

  if (skuById.size === 0) return;

  payload.items = payload.items.map((rawItem) => {
    if (!rawItem || typeof rawItem !== "object") return rawItem;
    const item = rawItem as Record<string, unknown>;
    if (item.sku || typeof item.product_id !== "string") return item;
    const resolvedSku = skuById.get(item.product_id);
    return resolvedSku ? { ...item, sku: resolvedSku } : item;
  });
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
    const ERP_BASE_URL = (
      Deno.env.get("FORGIVEN_ERP_BASE_URL") || new URL(ERP_WEBHOOK_URL).origin
    ).replace(/\/$/, "");
    const ERP_FALLBACK_URL = `${ERP_BASE_URL}/api/webhooks/commerce`;
    const ERP_CONNECTION_ID = Deno.env.get("FORGIVEN_ERP_CONNECTION_ID") ?? "";
    const ERP_WEBHOOK_SECRET = Deno.env.get("FORGIVEN_ERP_WEBHOOK_SECRET") ?? "";

    if (!ERP_CONNECTION_ID || !ERP_WEBHOOK_SECRET) {
      console.error("[ERP Outbound Dispatcher] Missing required env vars: FORGIVEN_ERP_CONNECTION_ID or FORGIVEN_ERP_WEBHOOK_SECRET");
      return new Response(JSON.stringify({ error: "ERP credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));

    let eventType: string = body.eventType || body.event_type || "commerce.event";
    let payload: Record<string, unknown> =
      body.payload && typeof body.payload === "object" ? { ...body.payload } : {};

    // Support database webhook trigger shape: { type: 'INSERT'|'UPDATE', table, record, old_record }
    if (!body.payload && body.record && typeof body.record === "object") {
      const record = body.record as Record<string, unknown>;
      const oldRecord =
        body.old_record && typeof body.old_record === "object"
          ? (body.old_record as Record<string, unknown>)
          : undefined;

      if (body.table === "orders" || record.total !== undefined) {
        eventType = mapOrderStatusToEventType(body.type, record.status);
        payload = {
          entity_type: "order",
          entity_id: record.id,
          order_id: record.id,
          ...record,
        };
      } else if (body.table === "customers" || (record.phone && record.customer_status)) {
        eventType = "commerce.customer.created";
        payload = {
          entity_type: "customer",
          entity_id: record.id,
          customer_id: record.id,
          ...record,
        };
      } else if (
        body.table === "products" ||
        record.stock_quantity !== undefined ||
        (record.name !== undefined && record.price !== undefined)
      ) {
        const classified = classifyProductTrigger(body.type, record, oldRecord);
        eventType = classified.eventType;
        payload = buildProductPayload(record, classified.entityType, oldRecord);
      } else {
        payload = {
          entity_type: "custom",
          entity_id: record.id || crypto.randomUUID(),
          ...record,
        };
      }
    }

    if (!payload.entity_type) {
      payload.entity_type = eventType.split(".")[1] || "entity";
    }
    if (!payload.entity_id) {
      payload.entity_id =
        (payload.id as string) ||
        (payload.product_id as string) ||
        (payload.order_id as string) ||
        crypto.randomUUID();
    }

    if (eventType.startsWith("commerce.order.")) {
      await enrichOrderItemsWithSkus(supabase, payload);
    }

    const eventId = (body.eventId as string) || crypto.randomUUID();
    const timestamp = typeof body.timestamp === "number" ? body.timestamp : Date.now();
    const signature = await computeSignature(ERP_WEBHOOK_SECRET, timestamp, payload);

    const envelope = {
      connectionId: ERP_CONNECTION_ID,
      eventId,
      eventType,
      timestamp,
      signature,
      payload,
    };

    console.log(`[ERP Outbound Dispatcher] Preparing ${eventType} (Event ID: ${eventId}) -> ${ERP_WEBHOOK_URL}`);

    const MAX_ATTEMPTS = 3;
    let attempt = 0;
    let delivered = false;
    let isDuplicate = false;
    let httpStatus = 0;
    let responseBody = "";
    let lastError: Error | null = null;

    while (attempt < MAX_ATTEMPTS && !delivered) {
      attempt++;
      const targetUrl =
        attempt === MAX_ATTEMPTS && ERP_FALLBACK_URL !== ERP_WEBHOOK_URL
          ? ERP_FALLBACK_URL
          : ERP_WEBHOOK_URL;

      try {
        console.log(`[ERP Outbound Dispatcher] Delivery attempt ${attempt}/${MAX_ATTEMPTS} -> ${targetUrl}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Forgiven-Connection-Id": ERP_CONNECTION_ID,
            "X-Forgiven-Signature": signature,
            "X-Forgiven-Timestamp": timestamp.toString(),
            "X-Forgiven-Event-Id": eventId,
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
            // Non-JSON 2xx response
          }
          console.log(`[ERP Outbound Dispatcher] Event ${eventId} delivered (HTTP ${httpStatus}).`);
          break;
        } else {
          console.warn(`[ERP Outbound Dispatcher] Attempt ${attempt} returned HTTP ${httpStatus}: ${responseBody.slice(0, 200)}`);
          if (httpStatus >= 400 && httpStatus < 500) {
            break;
          }
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error(`[ERP Outbound Dispatcher] Attempt ${attempt} network exception: ${lastError.message}`);
      }

      if (!delivered && attempt < MAX_ATTEMPTS) {
        const backoffMs = Math.min(1000 * 2 ** (attempt - 1), 10000);
        console.log(`[ERP Outbound Dispatcher] Backing off for ${backoffMs}ms before retry...`);
        await sleep(backoffMs);
      }
    }

    const latencyMs = Date.now() - startTime;
    const finalStatus = delivered ? "delivered" : "failed";

    try {
      await supabase.from("erp_sync_logs").upsert(
        {
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
          updated_at: new Date().toISOString(),
        },
        { onConflict: "event_id" }
      );
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
