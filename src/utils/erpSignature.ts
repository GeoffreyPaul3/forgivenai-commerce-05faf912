/**
 * FORGIVEN ENTERPRISE ERP INTEGRATION BRIDGE — Cryptographic Signature Utility
 *
 * Implements HMAC-SHA256 signature derivation and replay protection adhering
 * strictly to Forgiven Enterprise ERP Integrations & API Gateway specification:
 * - 300-second (5-minute) replay protection window
 * - Key derivation: if secret starts with 'whsec_', derive HMAC key via SHA-256 hex digest
 * - Message format: `${timestamp}.${JSON.stringify(payload)}`
 * - Output: lowercase hex HMAC-SHA256 signature
 */

export type ErpEntityType = 'order' | 'customer' | 'product' | 'inventory';

export interface ErpPayload {
  entity_type: ErpEntityType | string;
  entity_id: string;
  [key: string]: unknown;
}

export interface ErpEventEnvelope<T = ErpPayload> {
  connectionId: string;
  eventId: string;
  eventType: string;
  timestamp: number;
  signature: string;
  payload: T;
}

export const ERP_MAX_REPLAY_WINDOW_MS = 300_000; // 5 minutes

/**
 * Derives the HMAC key according to ERP security specification:
 * If secret starts with 'whsec_', compute its SHA-256 hash in hex;
 * otherwise, use the secret string directly.
 */
export async function deriveHmacKey(secret: string): Promise<string> {
  if (!secret || typeof secret !== 'string') {
    throw new Error('Secret must be a non-empty string');
  }

  if (secret.startsWith('whsec_')) {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  return secret;
}

/**
 * Computes the HMAC-SHA256 signature for the given timestamp and payload.
 * Message string is `${timestamp}.${JSON.stringify(payload)}`.
 */
export async function computeErpSignature(
  secret: string,
  timestamp: number,
  payload: unknown
): Promise<string> {
  if (typeof timestamp !== 'number' || isNaN(timestamp)) {
    throw new Error('Timestamp must be a valid epoch number');
  }

  const keyString = await deriveHmacKey(secret);
  const encoder = new TextEncoder();
  const message = `${timestamp}.${JSON.stringify(payload)}`;

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(keyString),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifies an inbound ERP HMAC signature with replay protection.
 */
export async function verifyErpSignature(
  secret: string,
  timestamp: number,
  payload: unknown,
  providedSignature: string,
  maxWindowMs = ERP_MAX_REPLAY_WINDOW_MS
): Promise<{ valid: boolean; reason?: string }> {
  if (!secret) {
    return { valid: false, reason: 'Missing shared secret' };
  }

  if (!providedSignature) {
    return { valid: false, reason: 'Missing signature' };
  }

  // 1. Replay Window Protection
  const now = Date.now();
  const delta = Math.abs(now - timestamp);
  if (delta > maxWindowMs) {
    return {
      valid: false,
      reason: `Replay window exceeded: timestamp delta (${delta}ms) is greater than ${maxWindowMs}ms`,
    };
  }

  // 2. Compute Expected Signature
  try {
    const expectedSignature = await computeErpSignature(secret, timestamp, payload);

    // Constant-time comparison
    if (expectedSignature.length !== providedSignature.length) {
      return { valid: false, reason: 'Signature mismatch' };
    }

    let mismatch = 0;
    for (let i = 0; i < expectedSignature.length; i++) {
      mismatch |= expectedSignature.charCodeAt(i) ^ providedSignature.charCodeAt(i);
    }

    if (mismatch !== 0) {
      return { valid: false, reason: 'Signature mismatch' };
    }

    return { valid: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { valid: false, reason: `Signature computation error: ${msg}` };
  }
}

/**
 * Constructs a fully signed ERP event envelope ready for dispatch.
 */
export async function createErpEventEnvelope<T extends ErpPayload = ErpPayload>(params: {
  connectionId: string;
  secret: string;
  eventType: string;
  payload: T;
  eventId?: string;
  timestamp?: number;
}): Promise<ErpEventEnvelope<T>> {
  const {
    connectionId,
    secret,
    eventType,
    payload,
    eventId = crypto.randomUUID(),
    timestamp = Date.now(),
  } = params;

  if (!connectionId) throw new Error('Missing connectionId');
  if (!eventType) throw new Error('Missing eventType');
  if (!payload) throw new Error('Missing payload');

  const signature = await computeErpSignature(secret, timestamp, payload);

  return {
    connectionId,
    eventId,
    eventType,
    timestamp,
    signature,
    payload,
  };
}

