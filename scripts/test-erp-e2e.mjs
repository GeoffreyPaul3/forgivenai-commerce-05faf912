/**
 * ERP Integration End-to-End Live Test
 * Tests the full outbound + inbound pipeline against the live Supabase project.
 * Run: node scripts/test-erp-e2e.mjs
 */
import { createHmac, createHash } from "node:crypto";

const SUPABASE_URL = "https://prweavmmpmoutdcsrseh.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByd2Vhdm1tcG1vdXRkY3Nyc2VoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzOTMwNDksImV4cCI6MjEwOTk2OTA0OX0.PBRb5bHvH19FrSjw_S1KUFLySODM94QHaF1ppBiP7SE";
const SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByd2Vhdm1tcG1vdXRkY3Nyc2VoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDM5MzA0OSwiZXhwIjoyMTA5OTY5MDQ5fQ.pYAFeC-7Folt3Dn9ZVR0gTWRTuRyQPxBQ1F9PPeXbhc";

// --- Crypto helpers (mirror of erpSignature.ts logic) ---
const WEBHOOK_SECRET = "whsec_e0a51c7126807b292906ca4b6c90ae70014a6180d821382b";
const CONNECTION_ID = "fsc_cb66ba75_9434a40fca1d87cb0e9d336813ad310f9dccc897cf2c4d86";

function deriveKey(secret) {
  if (secret.startsWith("whsec_")) {
    return createHash("sha256").update(secret).digest("hex");
  }
  return secret;
}

function sign(timestamp, payload, secret) {
  const key = deriveKey(secret);
  const message = `${timestamp}.${JSON.stringify(payload)}`;
  return createHmac("sha256", key).update(message).digest("hex");
}

function buildEnvelope(eventType, payload) {
  const eventId = crypto.randomUUID();
  const timestamp = Date.now();
  const signature = sign(timestamp, payload, WEBHOOK_SECRET);
  return { connectionId: CONNECTION_ID, eventId, eventType, timestamp, signature, payload };
}

// --- Helpers ---
async function callFunction(fnName, body, useServiceKey = false) {
  const url = `${SUPABASE_URL}/functions/v1/${fnName}`;
  const start = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${useServiceKey ? SERVICE_KEY : ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const latency = Date.now() - start;
  let json;
  try { json = await res.json(); } catch { json = { raw: await res.text() }; }
  return { status: res.status, latency, json };
}

async function queryLogs(eventId) {
  const url = `${SUPABASE_URL}/rest/v1/erp_sync_logs?event_id=eq.${eventId}&select=*`;
  const res = await fetch(url, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });
  return res.json();
}

// --- Test runner ---
let passed = 0;
let failed = 0;

function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

// ============================================================
// TEST 1: Inbound listener — stale timestamp (expect 401)
// ============================================================
console.log("\n🧪 Test 1: Inbound — stale timestamp replay attack (expect 401)");
{
  const payload = { entity_type: "inventory", entity_id: crypto.randomUUID(), sku: "TEST-001", new_quantity: 50, old_quantity: 55 };
  const staleTimestamp = Date.now() - 400_000; // 400 seconds ago
  const signature = sign(staleTimestamp, payload, WEBHOOK_SECRET);
  const envelope = {
    connectionId: CONNECTION_ID, eventId: crypto.randomUUID(),
    eventType: "erp.inventory.updated", timestamp: staleTimestamp, signature, payload,
  };
  const { status, json } = await callFunction("erp-inbound-listener", envelope);
  assert("HTTP 401 returned", status === 401, `Got ${status}: ${JSON.stringify(json)}`);
  assert("Replay window error message", json?.error?.includes("Replay") || json?.error?.includes("replay") || json?.message?.includes("replay"), JSON.stringify(json));
}

// ============================================================
// TEST 2: Inbound listener — invalid signature (expect 401)
// ============================================================
console.log("\n🧪 Test 2: Inbound — tampered payload / wrong signature (expect 401)");
{
  const payload = { entity_type: "inventory", entity_id: crypto.randomUUID(), sku: "TEST-002", new_quantity: 50, old_quantity: 55 };
  const timestamp = Date.now();
  const envelope = {
    connectionId: CONNECTION_ID, eventId: crypto.randomUUID(),
    eventType: "erp.inventory.updated", timestamp,
    signature: "deadbeefdeadbeefdeadbeefdeadbeef", // wrong sig
    payload,
  };
  const { status, json } = await callFunction("erp-inbound-listener", envelope);
  assert("HTTP 401 returned", status === 401, `Got ${status}: ${JSON.stringify(json)}`);
  assert("HMAC error message", json?.error?.includes("HMAC") || json?.error?.includes("signature") || json?.error?.includes("Invalid"), JSON.stringify(json));
}

// ============================================================
// TEST 3: Inbound listener — valid inventory update (expect 200)
// ============================================================
console.log("\n🧪 Test 3: Inbound — valid erp.inventory.updated (expect 200)");
let inboundEventId;
{
  const payload = {
    entity_type: "inventory",
    entity_id: "00000000-0000-0000-0000-000000000001", // safe test entity (may not exist in products)
    sku: "TEST-E2E-001",
    new_quantity: 42,
    old_quantity: 50,
    source: "pos_retail",
    location: "main_warehouse",
  };
  const envelope = buildEnvelope("erp.inventory.updated", payload);
  inboundEventId = envelope.eventId;
  const { status, latency, json } = await callFunction("erp-inbound-listener", envelope);
  console.log(`  Response: HTTP ${status} (${latency}ms) — ${JSON.stringify(json)}`);
  assert("HTTP 200 returned", status === 200, `Got ${status}`);
  assert("success: true in body", json?.success === true, JSON.stringify(json));
  assert("latencyMs present", typeof json?.latencyMs === "number", JSON.stringify(json));
}

// ============================================================
// TEST 4: Inbound listener — idempotency (same eventId, expect 200 isDuplicate)
// ============================================================
console.log("\n🧪 Test 4: Inbound — idempotency (same eventId, expect isDuplicate: true)");
{
  if (!inboundEventId) {
    console.log("  ⏭️  Skipped — test 3 did not succeed");
  } else {
    const payload = {
      entity_type: "inventory",
      entity_id: "00000000-0000-0000-0000-000000000001",
      sku: "TEST-E2E-001",
      new_quantity: 42,
      old_quantity: 50,
      source: "pos_retail",
    };
    const timestamp = Date.now();
    const signature = sign(timestamp, payload, WEBHOOK_SECRET);
    const envelope = {
      connectionId: CONNECTION_ID,
      eventId: inboundEventId, // SAME eventId
      eventType: "erp.inventory.updated",
      timestamp, signature, payload,
    };
    const { status, json } = await callFunction("erp-inbound-listener", envelope);
    console.log(`  Response: HTTP ${status} — ${JSON.stringify(json)}`);
    assert("HTTP 200 returned", status === 200, `Got ${status}`);
    assert("isDuplicate: true", json?.isDuplicate === true, JSON.stringify(json));
  }
}

// ============================================================
// TEST 5: Inbound listener — price update (expect 200)
// ============================================================
console.log("\n🧪 Test 5: Inbound — valid erp.catalog.price_updated (expect 200)");
let priceEventId;
{
  const payload = {
    entity_type: "product",
    entity_id: "00000000-0000-0000-0000-000000000002",
    sku: "TEST-PRICE-001",
    new_price: 29.99,
    old_price: 24.99,
    vendor_cost: 15.00,
    currency: "MWK",
  };
  const envelope = buildEnvelope("erp.catalog.price_updated", payload);
  priceEventId = envelope.eventId;
  const { status, latency, json } = await callFunction("erp-inbound-listener", envelope);
  console.log(`  Response: HTTP ${status} (${latency}ms) — ${JSON.stringify(json)}`);
  assert("HTTP 200 returned", status === 200, `Got ${status}`);
  assert("success: true in body", json?.success === true, JSON.stringify(json));
}

// ============================================================
// TEST 6: Outbound function — dispatch a commerce event (expect delivery attempt logged)
// ============================================================
console.log("\n🧪 Test 6: Outbound — dispatch commerce.order.created event");
let outboundEventId;
{
  const eventPayload = {
    eventType: "commerce.order.created",
    payload: {
      entity_type: "order",
      entity_id: crypto.randomUUID(),
      customer_id: crypto.randomUUID(),
      total_amount: 15000,
      currency: "MWK",
      items_count: 2,
      channel: "web",
    },
  };
  const { status, latency, json } = await callFunction("erp-sync-webhook", eventPayload, true);
  console.log(`  Response: HTTP ${status} (${latency}ms) — ${JSON.stringify(json).slice(0, 160)}...`);
  outboundEventId = json?.eventId;
  assert("Response status is 200 (if ERP alive) or 502 (if ERP upstream returns error)", status === 200 || status === 502, `Got ${status}`);
  assert("eventId present in response", typeof json?.eventId === "string", JSON.stringify(json));
  assert("attempts tracked", typeof json?.attempts === "number", JSON.stringify(json));
  assert("httpStatus captured from upstream ERP", typeof json?.httpStatus === "number", JSON.stringify(json));
}

// ============================================================
// TEST 7: Verify erp_sync_logs entries in DB
// ============================================================
console.log("\n🧪 Test 7: Verify erp_sync_logs entries in Supabase DB");
{
  // Check inbound event log
  if (inboundEventId) {
    const logs = await queryLogs(inboundEventId);
    assert(
      `erp_sync_logs row exists for inbound event`,
      Array.isArray(logs) && logs.length > 0,
      `Found: ${JSON.stringify(logs)}`
    );
    if (logs?.length > 0) {
      const row = logs[0];
      assert("direction = 'inbound'", row.direction === "inbound", JSON.stringify(row));
      assert("status = 'processed' or 'duplicate'", row.status === "processed" || row.status === "duplicate", row.status);
    }
  }

  // Check price update log
  if (priceEventId) {
    const logs = await queryLogs(priceEventId);
    assert(
      `erp_sync_logs row exists for price event`,
      Array.isArray(logs) && logs.length > 0,
      `Found: ${JSON.stringify(logs)}`
    );
  }

  // Check outbound event log
  if (outboundEventId) {
    const logs = await queryLogs(outboundEventId);
    assert(
      `erp_sync_logs row exists for outbound event`,
      Array.isArray(logs) && logs.length > 0,
      `Found: ${JSON.stringify(logs)}`
    );
    if (logs?.length > 0) {
      const row = logs[0];
      assert("direction = 'outbound'", row.direction === "outbound", JSON.stringify(row));
    }
  }
}

// ============================================================
// SUMMARY
// ============================================================
console.log(`\n${"=".repeat(55)}`);
console.log(`ERP E2E Results: ${passed} passed, ${failed} failed`);
console.log("=".repeat(55));
if (failed === 0) {
  console.log("🎉 All tests passed — ERP integration is live and healthy!");
} else {
  console.log("⚠️  Some tests failed — review output above.");
  process.exit(1);
}

