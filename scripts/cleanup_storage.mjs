/**
 * FORGIVEN AI COMMERCE — Storage Incident Safe Cleanup Proposal & Utility
 *
 * PRODUCTION SAFETY RULES ENFORCED:
 * 1. Default mode is DRY-RUN. ZERO deletions occur without explicit CLI authorization.
 * 2. Never deletes using SQL. Only uses official Supabase Storage API (storage.from().remove()).
 * 3. Never deletes protected assets: brand assets, user avatars, vendor product images,
 *    original user uploads, final composited outputs, active campaigns, or any referenced asset.
 * 4. Only targets verified candidates from the reference audit.
 * 5. Requires explicit flag: --execute-with-explicit-approval
 * 6. Rechecks current database references and protected-asset rules immediately before deletion.
 * 7. Fails safely on missing/stale reports, unknown references, or Storage API errors.
 * 8. Live execution strictly restricted to Tier 1 (confirmed orphans); Tier 2 & unclassified are blocked.
 *
 * Usage:
 *   # Dry-run inspection (default):
 *   node scripts/cleanup_storage.mjs --dry-run
 *
 *   # Dry-run for specific candidate tier:
 *   node scripts/cleanup_storage.mjs --tier=confirmed --dry-run
 *
 *   # Dry-run for all candidates:
 *   node scripts/cleanup_storage.mjs --tier=all-candidates --dry-run
 *
 *   # Execution (requires explicit approval flag and non-restricted environment):
 *   node scripts/cleanup_storage.mjs --tier=confirmed --execute-with-explicit-approval
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Load env safely without exposing secrets
function loadEnv() {
  const envPath = path.join(ROOT_DIR, '.env');
  if (!fs.existsSync(envPath)) throw new Error('.env file not found');
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const TOKEN = env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = env.VITE_SUPABASE_PROJECT_ID || 'prweavmmpmoutdcsrseh';

// Parse CLI args
const args = process.argv.slice(2);
const isExplicitExecution = args.includes('--execute-with-explicit-approval');
const isDryRun = !isExplicitExecution || args.includes('--dry-run');
const tierArg = args.find(a => a.startsWith('--tier='))?.split('=')[1] || 'confirmed';

/**
 * Validates that an object path does not attempt path traversal,
 * contains only authorized characters, and stays strictly within designated bucket/prefixes.
 */
export function validateCandidatePath(bucket, name) {
  if (!bucket || typeof bucket !== 'string') return false;
  if (!name || typeof name !== 'string') return false;

  // Reject path traversal, illegal characters, and directory endings
  if (
    name.includes('..') ||
    name.startsWith('/') ||
    name.startsWith('\\') ||
    name.endsWith('/') ||
    name.includes('%2e%2e') ||
    name.includes('\0')
  ) {
    return false;
  }

  // Allowed cleanup buckets only
  if (bucket !== 'ugc-assets') return false;

  // Must have a folder and filename with an extension
  const parts = name.split('/');
  if (parts.length !== 2) return false;
  const [folder, file] = parts;
  if (!file || !file.includes('.')) return false;

  // Only allowed disposable prefixes
  const allowedPrefixes = ['decomposed/', 'baselines/', 'master_frames/'];
  return allowedPrefixes.some(p => name.startsWith(p));
}

/**
 * Re-queries live database immediately before proposal or deletion.
 * Ensures zero race conditions or stale references.
 */
export async function recheckLiveDatabaseReferences(candidates) {
  if (!TOKEN) {
    throw new Error('SUPABASE_ACCESS_TOKEN is required for live reference recheck.');
  }

  const queryUrl = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
  async function execQuery(query) {
    const res = await fetch(queryUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Live database check failed (${res.status}): ${errText}`);
    }
    return await res.json();
  }

  console.log('[Safeguard] Querying live database tables for real-time reference verification...');
  const [products, content, ugcCache, influencers, profiles, orders, ugcProjects, ugcFrames] = await Promise.all([
    execQuery('SELECT id, name, status, images, variant_images, decomposition_data, product_dna FROM public.products;'),
    execQuery('SELECT id, product_id, type, title, media_url, status, metadata FROM public.content;'),
    execQuery('SELECT cache_key, image_url, metadata FROM public.ugc_cache;'),
    execQuery('SELECT id, name, avatar_url, metadata FROM public.influencers;'),
    execQuery('SELECT id, full_name, avatar_url FROM public.profiles;'),
    execQuery('SELECT id, delivery_proof_url FROM public.orders WHERE delivery_proof_url IS NOT NULL;'),
    execQuery('SELECT id, avatar_url, video_url, voice_url FROM public.ugc_projects;'),
    execQuery('SELECT id, image_url FROM public.ugc_frames;')
  ]);

  // Index live references
  const liveReferences = [];

  for (const p of products) {
    const pImages = Array.isArray(p.images) ? p.images : [];
    for (const img of pImages) if (img) liveReferences.push({ table: 'products', column: 'images', val: img });
    if (p.variant_images) liveReferences.push({ table: 'products', column: 'variant_images', val: JSON.stringify(p.variant_images) });
    if (p.decomposition_data) liveReferences.push({ table: 'products', column: 'decomposition_data', val: JSON.stringify(p.decomposition_data) });
  }

  for (const c of content) {
    if (c.media_url) liveReferences.push({ table: 'content', column: 'media_url', val: c.media_url });
    if (c.metadata) liveReferences.push({ table: 'content', column: 'metadata', val: JSON.stringify(c.metadata) });
  }

  for (const uc of ugcCache) {
    if (uc.image_url) liveReferences.push({ table: 'ugc_cache', column: 'image_url', val: uc.image_url });
    if (uc.metadata) liveReferences.push({ table: 'ugc_cache', column: 'metadata', val: JSON.stringify(uc.metadata) });
  }

  for (const inf of influencers) {
    if (inf.avatar_url) liveReferences.push({ table: 'influencers', column: 'avatar_url', val: inf.avatar_url });
  }

  for (const pr of profiles) {
    if (pr.avatar_url) liveReferences.push({ table: 'profiles', column: 'avatar_url', val: pr.avatar_url });
  }

  for (const o of orders) {
    if (o.delivery_proof_url) liveReferences.push({ table: 'orders', column: 'delivery_proof_url', val: o.delivery_proof_url });
  }

  for (const proj of ugcProjects) {
    if (proj.avatar_url) liveReferences.push({ table: 'ugc_projects', column: 'avatar_url', val: proj.avatar_url });
    if (proj.video_url) liveReferences.push({ table: 'ugc_projects', column: 'video_url', val: proj.video_url });
    if (proj.voice_url) liveReferences.push({ table: 'ugc_projects', column: 'voice_url', val: proj.voice_url });
  }

  for (const fr of ugcFrames) {
    if (fr.image_url) liveReferences.push({ table: 'ugc_frames', column: 'image_url', val: fr.image_url });
  }

  console.log(`[Safeguard] Live database indexed: ${liveReferences.length} reference targets.`);

  // Filter candidates against live references
  const verifiedCandidates = [];
  let newlyExcludedCount = 0;

  for (const c of candidates) {
    const fileName = c.name.split('/').slice(1).join('/');
    const fullPath = c.name;

    const matched = liveReferences.find(r => r.val && (r.val.includes(fullPath) || (fileName && r.val.includes(fileName))));
    if (matched) {
      console.warn(`[SAFEGUARD EXCLUSION] Candidate '${c.name}' matched live database record in ${matched.table}.${matched.column}. PRESERVED.`);
      newlyExcludedCount++;
    } else {
      verifiedCandidates.push(c);
    }
  }

  if (newlyExcludedCount > 0) {
    console.warn(`[Safeguard] Excluded ${newlyExcludedCount} candidate(s) that matched live database references.`);
  } else {
    console.log('[Safeguard] Recheck complete: All candidate objects confirmed unreferenced in live database.');
  }

  return verifiedCandidates;
}

/**
 * Filters safe candidates from audit data based on strict tier criteria.
 */
export function filterSafeCandidates(auditObjects, tier = 'confirmed') {
  const candidates = [];

  for (const obj of auditObjects) {
    // 1. Exact path and bucket validation
    if (!validateCandidatePath(obj.bucket, obj.name)) continue;

    // 2. Strict protection check: must NEVER be PROTECTED, REFERENCED, or UNCLASSIFIED
    if (
      obj.status === 'PROTECTED' ||
      obj.status === 'REFERENCED' ||
      obj.status === 'UNCLASSIFIED' ||
      obj.status === 'AUDIT_ERROR'
    ) {
      continue;
    }

    // 3. Tier filtering
    if (tier === 'confirmed') {
      // Group 1: Confirmed orphans in decomposed/ only
      if (obj.status === 'CONFIRMED_ORPHAN' && obj.category === 'decomposed') {
        candidates.push({
          ...obj,
          tier: 'GROUP_1_CONFIRMED_ORPHAN',
          priority: 1,
          expectedSavingsBytes: obj.sizeBytes,
          riskAssessment: 'NONE — Ephemeral cropped variant; source image exists in products; on-demand regenerable by decompose-image.',
        });
      }
    } else if (tier === 'all-candidates') {
      // Group 1
      if (obj.status === 'CONFIRMED_ORPHAN' && obj.category === 'decomposed') {
        candidates.push({
          ...obj,
          tier: 'GROUP_1_CONFIRMED_ORPHAN',
          priority: 1,
          expectedSavingsBytes: obj.sizeBytes,
          riskAssessment: 'NONE — Ephemeral cropped variant; source image exists; on-demand regenerable.',
        });
      }
      // Group 2: Unreferenced intermediate VTON scratch files
      else if (obj.status === 'POTENTIAL_ORPHAN' && (obj.category === 'baselines' || obj.category === 'master_frames')) {
        candidates.push({
          ...obj,
          tier: 'GROUP_2_INTERMEDIATE_SCRATCH',
          priority: 2,
          expectedSavingsBytes: obj.sizeBytes,
          riskAssessment: 'LOW — Intermediate generation scratch frame; video generation already completed; unreferenced in DB.',
        });
      }
    }
  }

  // Sort by priority, then by size descending
  return candidates.sort((a, b) => a.priority - b.priority || b.sizeBytes - a.sizeBytes);
}

async function main() {
  console.log('============================================================');
  console.log('       FORGIVEN AI COMMERCE — STORAGE CLEANUP PLANNER       ');
  console.log('============================================================\n');

  console.log(`Execution Mode: ${isDryRun ? 'DRY-RUN (Safe - No files will be deleted)' : 'LIVE EXECUTION'}`);
  console.log(`Target Tier:    ${tierArg}`);

  // 1. Report existence check
  const reportPath = path.join(ROOT_DIR, 'scripts', 'storage_audit_report.json');
  if (!fs.existsSync(reportPath)) {
    console.error(`[ERROR] Audit report not found at ${reportPath}. Run 'node scripts/audit_storage.mjs' first.`);
    process.exit(1);
  }

  // 2. Report freshness & schema validation
  let auditData;
  try {
    auditData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  } catch (err) {
    console.error(`[ERROR] Audit report is corrupted: ${err.message}`);
    process.exit(1);
  }

  if (!auditData.timestamp || !auditData.objects || !Array.isArray(auditData.objects)) {
    console.error('[ERROR] Audit report missing required metadata or objects array.');
    process.exit(1);
  }

  const reportDate = new Date(auditData.timestamp);
  const now = new Date();
  const ageHours = (now.getTime() - reportDate.getTime()) / (1000 * 60 * 60);

  if (isNaN(ageHours) || ageHours > 48 || ageHours < 0) {
    console.error(`[ERROR] Audit report is stale (${ageHours.toFixed(1)} hours old). Max allowed age is 48 hours.`);
    console.error("Please run 'node scripts/audit_storage.mjs' to generate fresh metadata.");
    process.exit(1);
  }
  console.log(`Audit Report Timestamp: ${auditData.timestamp} (${ageHours.toFixed(1)}h ago) — Fresh.`);

  // 3. Strict Tier Authorization Validation
  if (isExplicitExecution) {
    if (tierArg !== 'confirmed') {
      console.error(`[ERROR] Live execution is strictly restricted to Tier 1 ('--tier=confirmed').`);
      console.error(`Received: '--tier=${tierArg}'. Tier 2 intermediate scratch assets and unclassified assets cannot be deleted.`);
      process.exit(1);
    }
  }

  // 4. Initial Candidate Filtering
  const rawCandidates = filterSafeCandidates(auditData.objects, tierArg);
  console.log(`\nInitial Candidates from Audit: ${rawCandidates.length} objects.`);

  // 5. Mandatory Live Database Recheck immediately before proposal/deletion
  let candidates;
  try {
    candidates = await recheckLiveDatabaseReferences(rawCandidates);
  } catch (recheckErr) {
    console.error(`[FATAL ERROR] Live database reference check failed: ${recheckErr.message}`);
    console.error('Safeguard aborted cleanup to protect data integrity.');
    process.exit(1);
  }

  const totalCandidateBytes = candidates.reduce((s, c) => s + c.sizeBytes, 0);
  const totalCandidateMB = (totalCandidateBytes / 1024 / 1024).toFixed(2);

  console.log(`\nVerified Safe Candidates: ${candidates.length} objects.`);
  console.log(`Potential Storage Reclaim: ${totalCandidateMB} MB (${totalCandidateBytes.toLocaleString()} bytes)\n`);

  // Group candidate breakdown
  const tierSummary = {};
  for (const c of candidates) {
    if (!tierSummary[c.tier]) tierSummary[c.tier] = { count: 0, bytes: 0 };
    tierSummary[c.tier].count++;
    tierSummary[c.tier].bytes += c.sizeBytes;
  }

  console.log('--- CANDIDATE TIER BREAKDOWN ---');
  for (const [t, data] of Object.entries(tierSummary)) {
    console.log(`  ${t}: ${data.count} files | ${(data.bytes / 1024 / 1024).toFixed(2)} MB`);
  }

  console.log('\n--- SAMPLE CLEANUP CANDIDATES (First 10) ---');
  candidates.slice(0, 10).forEach((c, i) => {
    console.log(`  ${i + 1}. [${c.bucket}/${c.name}] (${(c.sizeBytes / 1024).toFixed(1)} KB) - Created: ${c.createdAt}`);
    console.log(`     Reason: ${c.safetyReason}`);
  });

  if (isDryRun) {
    console.log('\n============================================================');
    console.log('[DRY-RUN COMPLETE] Zero files were deleted.');
    console.log('To execute this cleanup once approved and quota is restored:');
    console.log('  node scripts/cleanup_storage.mjs --tier=confirmed --execute-with-explicit-approval');
    console.log('============================================================\n');
    return;
  }

  // 6. Live execution block (Strictly requires explicit approval and tier=confirmed)
  console.log('\n[LIVE EXECUTION] Initiating verified deletion using Supabase Storage API...');

  let storageAuthKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!storageAuthKey && TOKEN) {
    try {
      const keysRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys`, {
        headers: { Authorization: `Bearer ${TOKEN}` }
      });
      if (keysRes.ok) {
        const keys = await keysRes.json();
        storageAuthKey = keys.find(k => k.name === 'service_role')?.api_key || keys.find(k => k.name === 'service_role')?.key;
      }
    } catch (_) {}
  }
  if (!storageAuthKey) {
    storageAuthKey = SUPABASE_KEY;
  }

  const supabase = createClient(SUPABASE_URL, storageAuthKey);

  const BATCH_SIZE = 50;
  let deletedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    const filePaths = batch.map(b => b.name);
    console.log(`Deleting batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(candidates.length / BATCH_SIZE)} (${filePaths.length} objects)...`);

    try {
      const { data, error } = await supabase.storage.from('ugc-assets').remove(filePaths);
      if (error) {
        console.error(`[CRITICAL] Batch deletion stopped due to error:`, error.message);
        if (error.message?.includes('exceed_storage_size_quota') || error?.statusCode === 402 || error?.status === 402) {
          console.error('\n[ROOT CAUSE CONFIRMED] Supabase Storage API gateway is rejecting operations with HTTP 402 (exceed_storage_size_quota).');
          console.error('The project storage service is restricted at the API gateway level.');
        }
        failedCount += filePaths.length;
        console.error('Safeguard triggered: Halting all subsequent batches to prevent cascading failures.');
        break;
      } else {
        deletedCount += (data?.length || filePaths.length);
      }
    } catch (err) {
      console.error(`[CRITICAL] Batch exception: ${err.message}`);
      failedCount += filePaths.length;
      console.error('Safeguard triggered: Halting all subsequent batches.');
      break;
    }
  }

  console.log(`\nCleanup result: Successfully removed ${deletedCount} objects, Failed/Halted: ${failedCount} objects.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error('[FATAL] Script error:', err);
    process.exit(1);
  });
}
