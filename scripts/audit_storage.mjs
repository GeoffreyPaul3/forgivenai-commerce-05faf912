/**
 * FORGIVEN AI COMMERCE — Storage Incident Asset Audit Utility
 *
 * READ-ONLY administrative utility to audit Supabase Storage objects,
 * compare them against database references, and classify assets
 * following strict production safety and protection rules.
 *
 * Usage:
 *   node scripts/audit_storage.mjs [--output=json|csv|summary] [--save-report]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Read .env safely without printing secrets
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
const TOKEN = env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = env.VITE_SUPABASE_PROJECT_ID || 'prweavmmpmoutdcsrseh';

if (!TOKEN) {
  console.error('Error: SUPABASE_ACCESS_TOKEN is required in .env for audit script.');
  process.exit(1);
}

// Execute query via Supabase Management API
async function executeQuery(sql) {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Database query failed (${res.status}): ${errText}`);
  }
  return await res.json();
}

async function runAudit() {
  console.log(`[Audit] Connecting to Supabase Project: ${PROJECT_REF}...`);

  // 1. Fetch all storage objects
  console.log('[Audit] Fetching storage objects metadata...');
  const objects = await executeQuery(`
    SELECT 
      id,
      bucket_id,
      name,
      owner,
      created_at,
      updated_at,
      last_accessed_at,
      metadata,
      (metadata->>'size')::bigint AS size_bytes,
      (metadata->>'mimetype') AS mimetype,
      (metadata->>'eTag') AS etag
    FROM storage.objects
    ORDER BY bucket_id, name;
  `);

  console.log(`[Audit] Total storage objects found: ${objects.length}`);

  // 2. Fetch database tables
  console.log('[Audit] Indexing database references across products, content, orders, profiles, influencers, ugc_cache...');
  const [products, content, orders, profiles, influencers, ugcCache, ugcProjects, ugcFrames] = await Promise.all([
    executeQuery('SELECT id, name, status, images, is_composite, decomposition_data, variant_images, product_dna, metadata FROM public.products;'),
    executeQuery('SELECT id, product_id, type, title, body, media_url, status, metadata, created_at FROM public.content;'),
    executeQuery('SELECT id, status, delivery_proof_url, items FROM public.orders;'),
    executeQuery('SELECT id, full_name, avatar_url, role, status FROM public.profiles;'),
    executeQuery('SELECT id, name, avatar_url, metadata, identity_fingerprint FROM public.influencers;'),
    executeQuery('SELECT cache_key, image_url, metadata, created_at FROM public.ugc_cache;'),
    executeQuery('SELECT id, product_id, avatar_url, video_url, voice_url, storyboard, metadata, status FROM public.ugc_projects;'),
    executeQuery('SELECT id, project_id, image_url, metadata FROM public.ugc_frames;')
  ]);

  // Build references registry
  const references = [];

  // Index Products
  const activeProductIds = new Set();
  const productSourceImages = new Map(); // productId -> images
  for (const p of products) {
    if (p.status === 'active') activeProductIds.add(p.id);
    const pImages = Array.isArray(p.images) ? p.images : [];
    productSourceImages.set(p.id, pImages);

    for (const img of pImages) {
      if (typeof img === 'string') {
        references.push({
          table: 'products',
          id: p.id,
          name: p.name,
          column: 'images',
          status: p.status,
          url: img,
          isPublishedOrActive: p.status === 'active'
        });
      }
    }

    if (p.variant_images && typeof p.variant_images === 'object') {
      for (const [varName, varUrl] of Object.entries(p.variant_images)) {
        if (typeof varUrl === 'string') {
          references.push({
            table: 'products',
            id: p.id,
            name: p.name,
            column: `variant_images[${varName}]`,
            status: p.status,
            url: varUrl,
            isPublishedOrActive: p.status === 'active'
          });
        }
      }
    }

    if (p.decomposition_data && typeof p.decomposition_data === 'object') {
      const vars = p.decomposition_data.variants;
      if (Array.isArray(vars)) {
        for (const v of vars) {
          if (v && v.url) {
            references.push({
              table: 'products',
              id: p.id,
              name: p.name,
              column: 'decomposition_data.variants.url',
              status: p.status,
              url: v.url,
              isPublishedOrActive: p.status === 'active'
            });
          }
        }
      }
    }
  }

  // Index Content
  for (const c of content) {
    if (c.media_url) {
      references.push({
        table: 'content',
        id: c.id,
        productId: c.product_id,
        type: c.type,
        title: c.title,
        column: 'media_url',
        status: c.status,
        url: c.media_url,
        isPublishedOrActive: c.status === 'published'
      });
    }
    if (c.metadata && typeof c.metadata === 'object') {
      const metaStr = JSON.stringify(c.metadata);
      references.push({
        table: 'content',
        id: c.id,
        productId: c.product_id,
        type: c.type,
        title: c.title,
        column: 'metadata',
        status: c.status,
        rawText: metaStr,
        isPublishedOrActive: c.status === 'published'
      });
    }
  }

  // Index Orders
  for (const o of orders) {
    if (o.delivery_proof_url) {
      references.push({
        table: 'orders',
        id: o.id,
        column: 'delivery_proof_url',
        status: o.status,
        url: o.delivery_proof_url,
        isPublishedOrActive: true
      });
    }
  }

  // Index Profiles
  const profileIdSet = new Set(profiles.map(pr => pr.id));
  for (const pr of profiles) {
    if (pr.avatar_url) {
      references.push({
        table: 'profiles',
        id: pr.id,
        name: pr.full_name,
        column: 'avatar_url',
        status: pr.status,
        url: pr.avatar_url,
        isPublishedOrActive: true
      });
    }
  }

  // Index Influencers
  for (const inf of influencers) {
    if (inf.avatar_url) {
      references.push({
        table: 'influencers',
        id: inf.id,
        name: inf.name,
        column: 'avatar_url',
        url: inf.avatar_url,
        isPublishedOrActive: true
      });
    }
  }

  // Index UGC Cache
  for (const uc of ugcCache) {
    if (uc.image_url) {
      references.push({
        table: 'ugc_cache',
        key: uc.cache_key,
        column: 'image_url',
        url: uc.image_url,
        isPublishedOrActive: false
      });
    }
    if (uc.metadata && typeof uc.metadata === 'object') {
      references.push({
        table: 'ugc_cache',
        key: uc.cache_key,
        column: 'metadata',
        rawText: JSON.stringify(uc.metadata),
        isPublishedOrActive: false
      });
    }
  }

  // Index UGC Projects and Frames
  for (const proj of ugcProjects) {
    if (proj.avatar_url) references.push({ table: 'ugc_projects', id: proj.id, column: 'avatar_url', url: proj.avatar_url, isPublishedOrActive: proj.status !== 'archived' });
    if (proj.video_url) references.push({ table: 'ugc_projects', id: proj.id, column: 'video_url', url: proj.video_url, isPublishedOrActive: proj.status !== 'archived' });
    if (proj.voice_url) references.push({ table: 'ugc_projects', id: proj.id, column: 'voice_url', url: proj.voice_url, isPublishedOrActive: proj.status !== 'archived' });
  }

  for (const fr of ugcFrames) {
    if (fr.image_url) references.push({ table: 'ugc_frames', id: fr.id, column: 'image_url', url: fr.image_url, isPublishedOrActive: true });
  }

  console.log(`[Audit] Total reference targets indexed: ${references.length}`);

  // Known permanent brand assets
  const KNOWN_BRAND_ASSETS = new Set([
    'brand/fsc-flagship-studio.jpeg',
    'brand/fsc-logo.png',
    'frames/.emptyFolderPlaceholder'
  ]);

  // 3. Classify each storage object
  const auditResults = [];
  const categorySummary = {};

  for (const obj of objects) {
    const bucket = obj.bucket_id;
    const pathParts = obj.name.split('/');
    const category = pathParts[0];
    const fileName = pathParts.slice(1).join('/');
    const sizeBytes = Number(obj.size_bytes || 0);

    const fullObjectPath = `${bucket}/${obj.name}`;

    // Find all matching references
    const matchedRefs = [];
    for (const ref of references) {
      if (ref.url) {
        if (ref.url.includes(obj.name) || ref.url.endsWith(obj.name) || (fileName && ref.url.includes(fileName))) {
          matchedRefs.push(ref);
        }
      } else if (ref.rawText) {
        if (ref.rawText.includes(obj.name) || (fileName && ref.rawText.includes(fileName))) {
          matchedRefs.push(ref);
        }
      }
    }

    let status = 'UNCLASSIFIED';
    let safetyReason = '';
    let regenerable = false;
    let confidence = 'HIGH';

    // Apply strict classification and protection rules

    // RULE 1: Known static brand assets
    if (bucket === 'ugc-assets' && KNOWN_BRAND_ASSETS.has(obj.name)) {
      status = 'PROTECTED';
      safetyReason = 'Official brand flagship studio master or watermark logo';
    }
    // RULE 2: User avatars in avatars bucket
    else if (bucket === 'avatars') {
      const userFolder = pathParts[0];
      if (profileIdSet.has(userFolder)) {
        status = 'PROTECTED';
        safetyReason = `User avatar belonging to active profile ID: ${userFolder}`;
      } else {
        status = 'PROTECTED'; // Protection rule: all user avatars protected by default
        safetyReason = 'User avatar bucket object (protected by default)';
      }
    }
    // RULE 3: Original user uploads
    else if (bucket === 'ugc-assets' && category === 'uploads') {
      status = 'PROTECTED';
      safetyReason = 'Original user/creator source photo upload (protected by default)';
    }
    // RULE 4: Delivery proofs
    else if (bucket === 'delivery-proofs') {
      status = 'PROTECTED';
      safetyReason = 'Order fulfillment delivery proof asset';
    }
    // RULE 5: Check if referenced by published/active records
    else if (matchedRefs.length > 0) {
      const hasPublished = matchedRefs.some(r => r.isPublishedOrActive);
      const sources = matchedRefs.map(r => `${r.table}.${r.column}`).join(', ');

      if (hasPublished) {
        status = 'PROTECTED';
        safetyReason = `Referenced by active/published record (${sources})`;
      } else {
        status = 'REFERENCED';
        safetyReason = `Referenced by database records (${sources})`;
      }
    }
    // RULE 6: Vendor product images in vendor-products bucket
    else if (bucket === 'vendor-products') {
      // Not directly matched in products table
      status = 'PROTECTED';
      safetyReason = 'Vendor product image (protected by default under catalog preservation rule)';
    }
    // RULE 7: Final generated/composited outputs
    else if (bucket === 'ugc-assets' && (category === 'composited' || category === 'campaigns')) {
      if (matchedRefs.length > 0) {
        status = 'PROTECTED';
        safetyReason = 'Final generated campaign/composited visual referenced in database';
      } else {
        status = 'PROTECTED';
        safetyReason = 'Final generated visual output (protected by default)';
      }
    }
    // RULE 8: Avatars in ugc-assets (AI-generated influencer portraits)
    else if (bucket === 'ugc-assets' && category === 'avatars') {
      if (matchedRefs.length > 0) {
        status = 'PROTECTED';
        safetyReason = 'AI persona avatar portrait referenced in database';
      } else {
        status = 'UNCLASSIFIED';
        safetyReason = 'Unreferenced AI avatar portrait; preserved pending confirmation';
      }
    }
    // RULE 9: Intermediate VTON frames (master_frames) & baseline portraits
    else if (bucket === 'ugc-assets' && (category === 'master_frames' || category === 'baselines')) {
      if (matchedRefs.length > 0) {
        status = 'REFERENCED';
        safetyReason = `Intermediate VTON asset referenced in: ${matchedRefs.map(r => r.table).join(', ')}`;
      } else {
        status = 'POTENTIAL_ORPHAN';
        safetyReason = `Intermediate VTON ${category} not referenced by any content, project, or cache entry`;
        regenerable = true;
        confidence = 'MEDIUM';
      }
    }
    // RULE 10: Decomposed garment variant crops
    else if (bucket === 'ugc-assets' && category === 'decomposed') {
      if (matchedRefs.length > 0) {
        status = 'REFERENCED';
        safetyReason = `Decomposed crop referenced in: ${matchedRefs.map(r => r.table).join(', ')}`;
      } else {
        status = 'CONFIRMED_ORPHAN';
        safetyReason = 'Decomposed crop not referenced by any product, content, or cache record; regenerable from source image';
        regenerable = true;
        confidence = 'HIGH';
      }
    }
    // RULE 11: Fallback
    else {
      status = 'UNCLASSIFIED';
      safetyReason = 'Unclassified storage asset; preserved by default';
    }

    const auditItem = {
      id: obj.id,
      bucket,
      name: obj.name,
      category,
      path: fullObjectPath,
      sizeBytes,
      sizeMB: (sizeBytes / (1024 * 1024)).toFixed(3),
      createdAt: obj.created_at,
      status,
      safetyReason,
      referencesCount: matchedRefs.length,
      matchedReferences: matchedRefs.map(r => ({ table: r.table, column: r.column, id: r.id || r.key })),
      regenerable,
      confidence
    };

    auditResults.push(auditItem);

    // Summary statistics
    const groupKey = `${bucket}/${category}`;
    if (!categorySummary[groupKey]) {
      categorySummary[groupKey] = {
        bucket,
        category,
        totalFiles: 0,
        totalBytes: 0,
        statusCounts: {},
      };
    }
    const sum = categorySummary[groupKey];
    sum.totalFiles++;
    sum.totalBytes += sizeBytes;
    sum.statusCounts[status] = (sum.statusCounts[status] || 0) + 1;
  }

  // Calculate totals by status
  const statusTotals = {};
  let totalBytes = 0;
  for (const item of auditResults) {
    totalBytes += item.sizeBytes;
    if (!statusTotals[item.status]) {
      statusTotals[item.status] = { count: 0, bytes: 0 };
    }
    statusTotals[item.status].count++;
    statusTotals[item.status].bytes += item.sizeBytes;
  }

  // Print Human-readable summary
  console.log('\n============================================================');
  console.log('       FORGIVEN AI COMMERCE — STORAGE ASSET AUDIT REPORT    ');
  console.log('============================================================\n');

  console.log(`Total Objects Audited: ${auditResults.length}`);
  console.log(`Total Stored Size:     ${(totalBytes / 1024 / 1024).toFixed(2)} MB (${totalBytes.toLocaleString()} bytes)\n`);

  console.log('--- STATUS BREAKDOWN ---');
  for (const [st, val] of Object.entries(statusTotals)) {
    const mb = (val.bytes / 1024 / 1024).toFixed(2);
    const pct = ((val.bytes / totalBytes) * 100).toFixed(1);
    console.log(`  ${st.padEnd(22)} : ${String(val.count).padStart(5)} files | ${mb.padStart(8)} MB (${pct}%)`);
  }

  console.log('\n--- CATEGORY BREAKDOWN ---');
  for (const [grp, data] of Object.entries(categorySummary)) {
    const mb = (data.totalBytes / 1024 / 1024).toFixed(2);
    const statusStr = Object.entries(data.statusCounts).map(([k, v]) => `${k}:${v}`).join(', ');
    console.log(`  ${grp.padEnd(30)} : ${String(data.totalFiles).padStart(4)} files | ${mb.padStart(7)} MB | [${statusStr}]`);
  }

  // Write machine-readable JSON report
  const reportPath = path.join(ROOT_DIR, 'scripts', 'storage_audit_report.json');
  const summaryReport = {
    timestamp: new Date().toISOString(),
    projectRef: PROJECT_REF,
    totalFiles: auditResults.length,
    totalBytes,
    totalMB: Number((totalBytes / 1024 / 1024).toFixed(2)),
    statusTotals: Object.fromEntries(
      Object.entries(statusTotals).map(([k, v]) => [k, { count: v.count, mb: Number((v.bytes / 1024 / 1024).toFixed(2)), bytes: v.bytes }])
    ),
    categorySummary,
    objects: auditResults
  };

  fs.writeFileSync(reportPath, JSON.stringify(summaryReport, null, 2), 'utf8');
  console.log(`\n[Audit] Machine-readable report saved to: ${reportPath}`);

  // Also write CSV report for convenience
  const csvPath = path.join(ROOT_DIR, 'scripts', 'storage_audit_report.csv');
  const csvHeaders = 'bucket,name,category,size_bytes,size_mb,created_at,status,safety_reason,regenerable,confidence\n';
  const csvRows = auditResults.map(r => 
    `"${r.bucket}","${r.name}","${r.category}",${r.sizeBytes},${r.sizeMB},"${r.createdAt}","${r.status}","${r.safetyReason.replace(/"/g, '""')}",${r.regenerable},"${r.confidence}"`
  ).join('\n');
  fs.writeFileSync(csvPath, csvHeaders + csvRows, 'utf8');
  console.log(`[Audit] CSV report saved to: ${csvPath}\n`);

  return summaryReport;
}

runAudit().catch(err => {
  console.error('[Audit] Fatal error:', err);
  process.exit(1);
});

