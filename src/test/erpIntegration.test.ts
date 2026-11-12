import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import {
  deriveHmacKey,
  computeErpSignature,
  verifyErpSignature,
  createErpEventEnvelope,
  ERP_MAX_REPLAY_WINDOW_MS,
  type ErpPayload,
} from '../utils/erpSignature';

describe('Forgiven Enterprise ERP Integration — Cryptographic Signature Engine', () => {
  const WHSEC_SECRET = 'whsec_9a7d3b2c1f0e485a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a';
  const RAW_SECRET = 'super_secret_raw_passphrase_xyz789';
  const CONNECTION_ID = 'conn_fsc_commerce_001_uuid';

  it('correctly derives HMAC key for whsec_ prefixed secrets via SHA-256 hex digest', async () => {
    const derivedKey = await deriveHmacKey(WHSEC_SECRET);
    const expectedKey = crypto.createHash('sha256').update(WHSEC_SECRET).digest('hex');
    expect(derivedKey).toBe(expectedKey);
    expect(derivedKey).toHaveLength(64);
  });

  it('preserves raw secrets verbatim when not starting with whsec_', async () => {
    const derivedKey = await deriveHmacKey(RAW_SECRET);
    expect(derivedKey).toBe(RAW_SECRET);
  });

  it('computes exact HMAC-SHA256 signature matching Node crypto reference implementation', async () => {
    const timestamp = 1731450000000;
    const payload: ErpPayload = {
      entity_type: 'order',
      entity_id: '8f0c3d9a-1b2c-4d5e-9f0a-1b2c3d4e5f6a',
      total: 45000,
      currency: 'MWK',
      status: 'paid',
    };

    // Calculate with erpSignature utility
    const signature = await computeErpSignature(WHSEC_SECRET, timestamp, payload);

    // Calculate with Node reference
    const expectedKey = crypto.createHash('sha256').update(WHSEC_SECRET).digest('hex');
    const message = `${timestamp}.${JSON.stringify(payload)}`;
    const expectedSignature = crypto.createHmac('sha256', expectedKey).update(message).digest('hex');

    expect(signature).toBe(expectedSignature);
    expect(signature).toMatch(/^[0-9a-f]{64}$/);
  });

  it('successfully verifies a valid ERP event signature within the replay window', async () => {
    const timestamp = Date.now();
    const payload: ErpPayload = {
      entity_type: 'customer',
      entity_id: 'cust-12345',
      name: 'Grace Banda',
      phone: '+265991234567',
    };

    const signature = await computeErpSignature(WHSEC_SECRET, timestamp, payload);
    const verification = await verifyErpSignature(WHSEC_SECRET, timestamp, payload, signature);

    expect(verification.valid).toBe(true);
    expect(verification.reason).toBeUndefined();
  });

  it('rejects events outside the 300-second replay window (stale events)', async () => {
    const staleTimestamp = Date.now() - 301_000; // 301 seconds ago
    const payload: ErpPayload = {
      entity_type: 'inventory',
      entity_id: 'prod-999',
      stock_quantity: 15,
    };

    const signature = await computeErpSignature(WHSEC_SECRET, staleTimestamp, payload);
    const verification = await verifyErpSignature(WHSEC_SECRET, staleTimestamp, payload, signature);

    expect(verification.valid).toBe(false);
    expect(verification.reason).toContain('Replay window exceeded');
  });

  it('rejects events with future timestamps exceeding the 300-second replay window', async () => {
    const futureTimestamp = Date.now() + 305_000; // 305 seconds in future
    const payload: ErpPayload = {
      entity_type: 'inventory',
      entity_id: 'prod-999',
    };

    const signature = await computeErpSignature(WHSEC_SECRET, futureTimestamp, payload);
    const verification = await verifyErpSignature(WHSEC_SECRET, futureTimestamp, payload, signature);

    expect(verification.valid).toBe(false);
    expect(verification.reason).toContain('Replay window exceeded');
  });

  it('rejects events with tampered payloads', async () => {
    const timestamp = Date.now();
    const originalPayload: ErpPayload = {
      entity_type: 'order',
      entity_id: 'order-100',
      total: 50000,
    };

    const signature = await computeErpSignature(WHSEC_SECRET, timestamp, originalPayload);

    // Tamper total from 50000 to 1000
    const tamperedPayload: ErpPayload = {
      entity_type: 'order',
      entity_id: 'order-100',
      total: 1000,
    };

    const verification = await verifyErpSignature(WHSEC_SECRET, timestamp, tamperedPayload, signature);
    expect(verification.valid).toBe(false);
    expect(verification.reason).toBe('Signature mismatch');
  });

  it('rejects events signed with an incorrect secret', async () => {
    const timestamp = Date.now();
    const payload: ErpPayload = { entity_type: 'product', entity_id: 'prod-001' };

    const signature = await computeErpSignature('whsec_wrong_key', timestamp, payload);
    const verification = await verifyErpSignature(WHSEC_SECRET, timestamp, payload, signature);

    expect(verification.valid).toBe(false);
    expect(verification.reason).toBe('Signature mismatch');
  });

  it('creates a full ERP event envelope adhering to the schema', async () => {
    const payload: ErpPayload = {
      entity_type: 'order',
      entity_id: 'ord-uuid-555',
      status: 'confirmed',
    };

    const envelope = await createErpEventEnvelope({
      connectionId: CONNECTION_ID,
      secret: WHSEC_SECRET,
      eventType: 'commerce.order.created',
      payload,
    });

    expect(envelope.connectionId).toBe(CONNECTION_ID);
    expect(envelope.eventType).toBe('commerce.order.created');
    expect(typeof envelope.eventId).toBe('string');
    expect(envelope.eventId.length).toBeGreaterThan(10);
    expect(typeof envelope.timestamp).toBe('number');
    expect(Math.abs(Date.now() - envelope.timestamp)).toBeLessThan(1000);
    expect(envelope.signature).toHaveLength(64);
    expect(envelope.payload).toEqual(payload);

    // Verify envelope signature independently
    const verification = await verifyErpSignature(
      WHSEC_SECRET,
      envelope.timestamp,
      envelope.payload,
      envelope.signature
    );
    expect(verification.valid).toBe(true);
  });
});

