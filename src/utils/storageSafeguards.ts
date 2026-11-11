/**
 * FORGIVEN AI COMMERCE — Storage Safety & Prevention Utilities
 *
 * Implements strict safeguards for Supabase Storage operations:
 * - Path traversal and bucket boundary validation.
 * - Comprehensive protection rules for user uploads, brand assets, avatars, vendor catalogue, and published campaigns.
 * - Deterministic, idempotent storage paths to avoid file explosion during retries.
 * - Safe reference-aware cleanup planner with default dry-run enforcement.
 */

export type StorageAssetStatus =
  | 'PROTECTED'
  | 'REFERENCED'
  | 'CONFIRMED_ORPHAN'
  | 'POTENTIAL_ORPHAN'
  | 'REGENERABLE_CANDIDATE'
  | 'UNCLASSIFIED'
  | 'AUDIT_ERROR';

export interface StorageAsset {
  id?: string;
  bucket: string;
  name: string;
  sizeBytes: number;
  createdAt?: string;
  status?: StorageAssetStatus;
  references?: Array<{ table: string; column: string; isPublished?: boolean }>;
}

export interface CleanupCandidate {
  bucket: string;
  path: string;
  sizeBytes: number;
  status: StorageAssetStatus;
  safetyReason: string;
  regenerable: boolean;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface CleanupPlan {
  isDryRun: boolean;
  authorized: boolean;
  totalCandidates: number;
  totalReclaimBytes: number;
  totalReclaimMB: number;
  candidates: CleanupCandidate[];
}

export interface CleanupOptions {
  dryRun?: boolean;
  explicitApproval?: boolean;
  tier?: 'confirmed' | 'all-candidates';
}

/**
 * Validates that an object path does not attempt path traversal,
 * contains only authorized characters, and stays within the designated bucket/prefix.
 */
export function validateStoragePath(bucket: string, name: string): boolean {
  if (!bucket || typeof bucket !== 'string') return false;
  if (!name || typeof name !== 'string') return false;

  // Reject path traversal and illegal characters
  if (name.includes('..') || name.startsWith('/') || name.startsWith('\\')) {
    return false;
  }

  // Prevent URL encoding exploits or null bytes
  if (name.includes('%2e%2e') || name.includes('\0')) {
    return false;
  }

  // Valid bucket check
  const allowedBuckets = ['ugc-assets', 'vendor-products', 'avatars', 'delivery-proofs'];
  if (!allowedBuckets.includes(bucket)) {
    return false;
  }

  return true;
}

/**
 * Evaluates whether an asset is strictly PROTECTED and must never be deleted.
 */
export function isProtectedAsset(
  bucket: string,
  name: string,
  context?: {
    isPublishedCampaign?: boolean;
    isActiveProject?: boolean;
    isReferencedInDb?: boolean;
    hasActiveDependencies?: boolean;
  }
): boolean {
  if (!validateStoragePath(bucket, name)) {
    return true; // Invalid paths are protected from deletion for safety
  }

  // 1. All user avatars in avatars bucket are protected
  if (bucket === 'avatars') return true;

  // 2. All vendor product images in vendor-products are protected by default (catalogue rule)
  if (bucket === 'vendor-products') return true;

  // 3. All delivery proof documents are protected
  if (bucket === 'delivery-proofs') return true;

  // 4. In ugc-assets:
  if (bucket === 'ugc-assets') {
    // Static brand assets are permanently protected
    if (name.startsWith('brand/') || name === 'brand/fsc-flagship-studio.jpeg' || name === 'brand/fsc-logo.png') {
      return true;
    }

    // Original user photo uploads are protected
    if (name.startsWith('uploads/')) {
      return true;
    }

    // Final composited outputs are protected
    if (name.startsWith('composited/')) {
      return true;
    }

    // Published campaign assets are protected
    if (name.startsWith('campaigns/') && (context?.isPublishedCampaign || context?.isReferencedInDb)) {
      return true;
    }

    // Placeholders are protected
    if (name.endsWith('.emptyFolderPlaceholder')) {
      return true;
    }
  }

  // 5. Any asset referenced by active/published DB records is protected
  if (context?.isPublishedCampaign || context?.isActiveProject || context?.hasActiveDependencies) {
    return true;
  }

  return false;
}

/**
 * Classifies an asset into an explicit audit status based on evidence.
 */
export function classifyStorageAsset(
  bucket: string,
  name: string,
  references: Array<{ table: string; column: string; isPublished?: boolean }> = []
): { status: StorageAssetStatus; safetyReason: string; regenerable: boolean; confidence: 'HIGH' | 'MEDIUM' | 'LOW' } {
  if (!validateStoragePath(bucket, name)) {
    return {
      status: 'AUDIT_ERROR',
      safetyReason: 'Invalid object path or bucket boundary violation',
      regenerable: false,
      confidence: 'HIGH'
    };
  }

  // Check published references first
  const isPublished = references.some(r => r.isPublished);
  const isReferenced = references.length > 0;

  if (isProtectedAsset(bucket, name, { isPublishedCampaign: isPublished, isReferencedInDb: isReferenced })) {
    return {
      status: 'PROTECTED',
      safetyReason: isPublished
        ? 'Referenced by active/published campaign or product record'
        : 'Protected system, catalogue, brand, avatar, or source upload asset',
      regenerable: false,
      confidence: 'HIGH'
    };
  }

  if (isReferenced) {
    return {
      status: 'REFERENCED',
      safetyReason: `Referenced in database (${references.map(r => `${r.table}.${r.column}`).join(', ')})`,
      regenerable: false,
      confidence: 'HIGH'
    };
  }

  // Unreferenced assets in ugc-assets:
  if (bucket === 'ugc-assets') {
    if (name.startsWith('decomposed/')) {
      return {
        status: 'CONFIRMED_ORPHAN',
        safetyReason: 'Ephemeral decomposed variant crop; unreferenced in DB; regenerable on-demand from product source image',
        regenerable: true,
        confidence: 'HIGH'
      };
    }

    if (name.startsWith('baselines/') || name.startsWith('master_frames/')) {
      return {
        status: 'POTENTIAL_ORPHAN',
        safetyReason: 'Intermediate VTON generation scratch frame; unreferenced in DB; video/avatar generation concluded',
        regenerable: true,
        confidence: 'MEDIUM'
      };
    }
  }

  // Default: Preserve anything uncertain
  return {
    status: 'UNCLASSIFIED',
    safetyReason: 'Asset ownership or workflow reference could not be conclusively traced; preserved by default',
    regenerable: false,
    confidence: 'LOW'
  };
}

/**
 * Creates a deterministic, idempotent storage path from a seed key and index.
 * Prevents redundant files when operations are retried.
 */
export function generateDeterministicStoragePath(
  folder: string,
  key: string,
  index: number,
  extension = 'png'
): string {
  const sanitizedFolder = folder.replace(/^\/+|\/+$/g, '');
  const cleanKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanExt = extension.replace(/^\./, '');
  return `${sanitizedFolder}/${cleanKey}_v${index}.${cleanExt}`;
}

/**
 * Safely extracts the internal storage path from a public Supabase Storage URL.
 */
export function extractStoragePathFromUrl(url: string, bucket: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const rawPath = url.slice(idx + marker.length).split('?')[0];
  try {
    const decoded = decodeURIComponent(rawPath);
    return validateStoragePath(bucket, decoded) ? decoded : null;
  } catch {
    return null;
  }
}

/**
 * Plans a safe cleanup proposal following non-negotiable safety rules.
 * Default is DRY RUN. No deletions are performed.
 */
export function planSafeCleanup(
  assets: StorageAsset[],
  options: CleanupOptions = {}
): CleanupPlan {
  const isDryRun = options.dryRun !== false;
  const authorized = options.explicitApproval === true;
  const tier = options.tier || 'confirmed';

  const candidates: CleanupCandidate[] = [];

  for (const asset of assets) {
    const classification = classifyStorageAsset(asset.bucket, asset.name, asset.references || []);

    // NEVER propose PROTECTED, REFERENCED, UNCLASSIFIED, or AUDIT_ERROR
    if (
      classification.status === 'PROTECTED' ||
      classification.status === 'REFERENCED' ||
      classification.status === 'UNCLASSIFIED' ||
      classification.status === 'AUDIT_ERROR'
    ) {
      continue;
    }

    if (tier === 'confirmed' && classification.status === 'CONFIRMED_ORPHAN') {
      candidates.push({
        bucket: asset.bucket,
        path: asset.name,
        sizeBytes: asset.sizeBytes,
        status: classification.status,
        safetyReason: classification.safetyReason,
        regenerable: classification.regenerable,
        confidence: classification.confidence
      });
    } else if (tier === 'all-candidates') {
      if (classification.status === 'CONFIRMED_ORPHAN' || classification.status === 'POTENTIAL_ORPHAN') {
        candidates.push({
          bucket: asset.bucket,
          path: asset.name,
          sizeBytes: asset.sizeBytes,
          status: classification.status,
          safetyReason: classification.safetyReason,
          regenerable: classification.regenerable,
          confidence: classification.confidence
        });
      }
    }
  }

  const totalReclaimBytes = candidates.reduce((sum, c) => sum + c.sizeBytes, 0);

  return {
    isDryRun,
    authorized,
    totalCandidates: candidates.length,
    totalReclaimBytes,
    totalReclaimMB: Number((totalReclaimBytes / (1024 * 1024)).toFixed(2)),
    candidates
  };
}

