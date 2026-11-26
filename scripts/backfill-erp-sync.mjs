/**
 * Backfills existing Commerce OS products, customers, and orders to Forgiven Enterprise ERP
 * via the deployed `erp-sync-webhook` Edge Function.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... node --env-file=.env scripts/backfill-erp-sync.mjs
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable.");
  process.exit(1);
}

async function fetchAll(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&order=created_at.asc`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${table}: HTTP ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function dispatchEvent(eventType, payload, eventId) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/erp-sync-webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ eventId, eventType, payload }),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

function mapOrderEventType(status) {
  switch ((status || "").toLowerCase()) {
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
      return "commerce.order.created";
  }
}

async function main() {
  let succeeded = 0;
  let failed = 0;

  // 1. Products
  const products = await fetchAll("products");
  console.log(`\n📦 Found ${products.length} product(s) to sync to ERP...`);
  for (const p of products) {
    const meta = p.metadata && typeof p.metadata === "object" ? p.metadata : {};
    const sku = (meta.sku || meta.vendor_sku || "").trim();
    const statusStr = (p.status || "").toLowerCase();
    const payload = {
      entity_type: "product",
      entity_id: p.id,
      product_id: p.id,
      ...(sku ? { sku } : {}),
      selling_price: p.price,
      cost_price: p.vendor_cost ?? p.landed_cost ?? 0,
      is_active: statusStr !== "archived" && statusStr !== "draft",
      ...p,
    };

    const eventId = `backfill-product-${p.id}`;
    const result = await dispatchEvent("commerce.product.created", payload, eventId);
    if (result.ok && result.json?.success) {
      succeeded++;
      console.log(
        `  ✅ Product "${p.name}" (SKU: ${sku || "auto"}, stock: ${p.stock_quantity ?? 0}) -> ERP HTTP ${result.json.httpStatus}${result.json.isDuplicate ? " [duplicate ack]" : ""}`
      );
    } else {
      failed++;
      console.error(`  ❌ Product "${p.name}" (${p.id}) failed:`, JSON.stringify(result));
    }
  }

  // 2. Customers
  const customers = await fetchAll("customers");
  console.log(`\n👤 Found ${customers.length} customer(s) to sync to ERP...`);
  for (const c of customers) {
    const payload = {
      entity_type: "customer",
      entity_id: c.id,
      customer_id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      location: c.location,
      first_agent_id: c.first_agent_id,
      customer_status: c.customer_status,
      created_at: c.created_at,
    };
    const eventId = `backfill-customer-${c.id}`;
    const result = await dispatchEvent("commerce.customer.created", payload, eventId);
    if (result.ok && result.json?.success) {
      succeeded++;
      console.log(`  ✅ Customer "${c.name || c.phone}" -> synced`);
    } else {
      failed++;
      console.error(`  ❌ Customer ${c.id} failed:`, JSON.stringify(result));
    }
  }

  // 3. Orders
  const orders = await fetchAll("orders");
  console.log(`\n🛒 Found ${orders.length} order(s) to sync to ERP...`);
  for (const o of orders) {
    const eventType = mapOrderEventType(o.status);
    const payload = {
      entity_type: "order",
      entity_id: o.id,
      order_id: o.id,
      ...o,
    };
    const eventId = `backfill-order-${o.id}-${eventType}`;
    const result = await dispatchEvent(eventType, payload, eventId);
    if (result.ok && result.json?.success) {
      succeeded++;
      console.log(`  ✅ Order ${o.id} (${eventType}) -> synced`);
    } else {
      failed++;
      console.error(`  ❌ Order ${o.id} failed:`, JSON.stringify(result));
    }
  }

  console.log(`\n🏁 Backfill complete: ${succeeded} synced, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
