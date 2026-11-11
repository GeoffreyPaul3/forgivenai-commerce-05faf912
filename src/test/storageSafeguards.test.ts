import { describe, it, expect, vi } from 'vitest';
import {
  validateStoragePath,
  isProtectedAsset,
  classifyStorageAsset,
  generateDeterministicStoragePath,
  extractStoragePathFromUrl,
  planSafeCleanup,
  type StorageAsset,
} from '../utils/storageSafeguards';

describe('Storage Safeguards & Prevention System', () => {
  describe('validateStoragePath', () => {
    it('allows valid object paths in authorized buckets', () => {
      expect(validateStoragePath('ugc-assets', 'decomposed/crop_1.png')).toBe(true);
      expect(validateStoragePath('ugc-assets', 'brand/fsc-logo.png')).toBe(true);
      expect(validateStoragePath('vendor-products', 'product_images/123.jpg')).toBe(true);
      expect(validateStoragePath('avatars', 'user-id/avatar.png')).toBe(true);
    });

    it('rejects path traversal attempts and bucket escapes', () => {
      expect(validateStoragePath('ugc-assets', '../private/secret.key')).toBe(false);
      expect(validateStoragePath('ugc-assets', 'decomposed/../../etc/passwd')).toBe(false);
      expect(validateStoragePath('ugc-assets', '/decomposed/crop.png')).toBe(false);
      expect(validateStoragePath('ugc-assets', '\\decomposed\\crop.png')).toBe(false);
      expect(validateStoragePath('ugc-assets', 'decomposed/%2e%2e/test')).toBe(false);
    });

    it('rejects unauthorized or unknown buckets', () => {
      expect(validateStoragePath('system-internal', 'file.txt')).toBe(false);
      expect(validateStoragePath('auth-tokens', 'key.json')).toBe(false);
      expect(validateStoragePath('', 'file.txt')).toBe(false);
    });
  });

  describe('isProtectedAsset', () => {
    it('protects all user avatars in avatars bucket by default', () => {
      expect(isProtectedAsset('avatars', 'b2667454-26b1/avatar.png')).toBe(true);
      expect(isProtectedAsset('avatars', 'random-user/avatar.jpg')).toBe(true);
    });

    it('protects official brand assets and logos', () => {
      expect(isProtectedAsset('ugc-assets', 'brand/fsc-flagship-studio.jpeg')).toBe(true);
      expect(isProtectedAsset('ugc-assets', 'brand/fsc-logo.png')).toBe(true);
    });

    it('protects original user uploads by default', () => {
      expect(isProtectedAsset('ugc-assets', 'uploads/creator-selfie.jpg')).toBe(true);
      expect(isProtectedAsset('ugc-assets', 'uploads/raw-garment.png')).toBe(true);
    });

    it('protects vendor product images under catalogue preservation rules', () => {
      expect(isProtectedAsset('vendor-products', 'product_images/prod_123.png')).toBe(true);
    });

    it('protects final composited visual outputs', () => {
      expect(isProtectedAsset('ugc-assets', 'composited/final_output.mp4')).toBe(true);
    });

    it('protects published campaign assets', () => {
      expect(isProtectedAsset('ugc-assets', 'campaigns/campaign_shot.png', { isPublishedCampaign: true })).toBe(true);
    });

    it('protects any asset with active database dependencies', () => {
      expect(isProtectedAsset('ugc-assets', 'decomposed/custom.png', { hasActiveDependencies: true })).toBe(true);
    });

    it('does not protect unreferenced intermediate scratch files if not protected by category', () => {
      expect(isProtectedAsset('ugc-assets', 'decomposed/crop_orphan.png')).toBe(false);
      expect(isProtectedAsset('ugc-assets', 'baselines/model_scratch.png')).toBe(false);
      expect(isProtectedAsset('ugc-assets', 'master_frames/vton_frame.png')).toBe(false);
    });
  });

  describe('classifyStorageAsset', () => {
    it('classifies assets referenced by active records as PROTECTED or REFERENCED', () => {
      const activeRef = [{ table: 'content', column: 'media_url', isPublished: true }];
      const res = classifyStorageAsset('ugc-assets', 'campaigns/camp_1.png', activeRef);
      expect(res.status).toBe('PROTECTED');
      expect(res.safetyReason).toContain('active/published campaign');

      const draftRef = [{ table: 'products', column: 'images', isPublished: false }];
      const resDraft = classifyStorageAsset('vendor-products', 'product_images/p1.png', draftRef);
      expect(resDraft.status).toBe('PROTECTED'); // vendor products are protected
    });

    it('classifies unreferenced decomposed crops as CONFIRMED_ORPHAN with regenerable flag', () => {
      const res = classifyStorageAsset('ugc-assets', 'decomposed/temp_crop_123.png', []);
      expect(res.status).toBe('CONFIRMED_ORPHAN');
      expect(res.regenerable).toBe(true);
      expect(res.confidence).toBe('HIGH');
    });

    it('classifies unreferenced scratch frames as POTENTIAL_ORPHAN with regenerable flag', () => {
      const resBaseline = classifyStorageAsset('ugc-assets', 'baselines/model_123.png', []);
      expect(resBaseline.status).toBe('POTENTIAL_ORPHAN');
      expect(resBaseline.regenerable).toBe(true);

      const resMaster = classifyStorageAsset('ugc-assets', 'master_frames/frame_123.png', []);
      expect(resMaster.status).toBe('POTENTIAL_ORPHAN');
      expect(resMaster.regenerable).toBe(true);
    });

    it('classifies uncertain assets as UNCLASSIFIED and preserves them', () => {
      const res = classifyStorageAsset('ugc-assets', 'unknown_folder/custom_file.bin', []);
      expect(res.status).toBe('UNCLASSIFIED');
      expect(res.safetyReason).toContain('preserved by default');
      expect(res.regenerable).toBe(false);
    });

    it('returns AUDIT_ERROR for invalid paths', () => {
      const res = classifyStorageAsset('ugc-assets', '../etc/passwd', []);
      expect(res.status).toBe('AUDIT_ERROR');
    });
  });

  describe('generateDeterministicStoragePath', () => {
    it('produces deterministic and idempotent filenames for the same key and index', () => {
      const path1 = generateDeterministicStoragePath('decomposed', 'prod123_hashABC', 1, 'png');
      const path2 = generateDeterministicStoragePath('decomposed', 'prod123_hashABC', 1, 'png');
      expect(path1).toBe('decomposed/prod123_hashABC_v1.png');
      expect(path1).toBe(path2);
    });

    it('sanitizes special characters in keys to prevent filesystem or URL issues', () => {
      const path = generateDeterministicStoragePath('decomposed', 'invalid/key:with?chars', 2, '.png');
      expect(path).toBe('decomposed/invalid_key_with_chars_v2.png');
    });
  });

  describe('extractStoragePathFromUrl', () => {
    it('correctly extracts relative storage paths from Supabase public URLs', () => {
      const url = 'https://wzncegnkhybtmybqftbv.supabase.co/storage/v1/object/public/vendor-products/product_images/photo1.jpg';
      const extracted = extractStoragePathFromUrl(url, 'vendor-products');
      expect(extracted).toBe('product_images/photo1.jpg');
    });

    it('returns null for mismatched buckets or invalid URLs', () => {
      const url = 'https://wzncegnkhybtmybqftbv.supabase.co/storage/v1/object/public/ugc-assets/decomposed/crop.png';
      expect(extractStoragePathFromUrl(url, 'vendor-products')).toBe(null);
      expect(extractStoragePathFromUrl('https://example.com/not-supabase.png', 'ugc-assets')).toBe(null);
    });
  });

  describe('planSafeCleanup', () => {
    const mockAssets: StorageAsset[] = [
      // 1. Referenced in active content (Must be protected)
      {
        bucket: 'ugc-assets',
        name: 'campaigns/published_shot.png',
        sizeBytes: 2_000_000,
        references: [{ table: 'content', column: 'media_url', isPublished: true }]
      },
      // 2. Brand asset (Must be protected)
      {
        bucket: 'ugc-assets',
        name: 'brand/fsc-logo.png',
        sizeBytes: 150_000,
        references: []
      },
      // 3. User upload (Must be protected)
      {
        bucket: 'ugc-assets',
        name: 'uploads/selfie.jpg',
        sizeBytes: 1_200_000,
        references: []
      },
      // 4. Vendor catalogue image (Must be protected)
      {
        bucket: 'vendor-products',
        name: 'product_images/shoe.jpg',
        sizeBytes: 500_000,
        references: []
      },
      // 5. User avatar (Must be protected)
      {
        bucket: 'avatars',
        name: 'user_123/avatar.png',
        sizeBytes: 300_000,
        references: []
      },
      // 6. Confirmed orphan decomposed crop (Eligible for cleanup)
      {
        bucket: 'ugc-assets',
        name: 'decomposed/orphan_crop_1.png',
        sizeBytes: 800_000,
        references: []
      },
      // 7. Intermediate baseline scratch (Eligible for all-candidates tier)
      {
        bucket: 'ugc-assets',
        name: 'baselines/scratch_model.png',
        sizeBytes: 1_500_000,
        references: []
      },
      // 8. Uncertain / Unclassified (Must be preserved)
      {
        bucket: 'ugc-assets',
        name: 'unknown_dir/mystery.dat',
        sizeBytes: 400_000,
        references: []
      }
    ];

    it('defaults to dry-run mode and performs zero deletions', () => {
      const plan = planSafeCleanup(mockAssets);
      expect(plan.isDryRun).toBe(true);
      expect(plan.authorized).toBe(false);
    });

    it('never proposes protected assets, user uploads, brand assets, avatars, or vendor images', () => {
      const plan = planSafeCleanup(mockAssets, { tier: 'all-candidates' });
      const candidatePaths = plan.candidates.map(c => c.path);

      expect(candidatePaths).not.toContain('campaigns/published_shot.png');
      expect(candidatePaths).not.toContain('brand/fsc-logo.png');
      expect(candidatePaths).not.toContain('uploads/selfie.jpg');
      expect(candidatePaths).not.toContain('product_images/shoe.jpg');
      expect(candidatePaths).not.toContain('user_123/avatar.png');
      expect(candidatePaths).not.toContain('unknown_dir/mystery.dat');
    });

    it('includes only confirmed orphans when tier=confirmed', () => {
      const plan = planSafeCleanup(mockAssets, { tier: 'confirmed' });
      expect(plan.totalCandidates).toBe(1);
      expect(plan.candidates[0].path).toBe('decomposed/orphan_crop_1.png');
      expect(plan.candidates[0].status).toBe('CONFIRMED_ORPHAN');
      expect(plan.candidates[0].regenerable).toBe(true);
    });

    it('includes intermediate scratch frames only when tier=all-candidates', () => {
      const plan = planSafeCleanup(mockAssets, { tier: 'all-candidates' });
      expect(plan.totalCandidates).toBe(2);
      const paths = plan.candidates.map(c => c.path);
      expect(paths).toContain('decomposed/orphan_crop_1.png');
      expect(paths).toContain('baselines/scratch_model.png');
    });

    it('requires explicit authorization flag to mark plan as authorized', () => {
      const unauthorizedPlan = planSafeCleanup(mockAssets, { dryRun: false });
      expect(unauthorizedPlan.authorized).toBe(false);

      const authorizedPlan = planSafeCleanup(mockAssets, { dryRun: false, explicitApproval: true });
      expect(authorizedPlan.authorized).toBe(true);
    });
  });
});

