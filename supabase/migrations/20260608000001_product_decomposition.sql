-- ============================================================
-- Product Decomposition + DNA Profile Schema
-- Objectives 1 & 2: Image decomposition + Product DNA locking
-- ============================================================

-- Add product_dna: structured JSON profile extracted by Qwen VL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'product_dna'
  ) THEN
    ALTER TABLE public.products ADD COLUMN product_dna JSONB DEFAULT NULL;
  END IF;
END $$;

-- Add is_composite: flag for images containing multiple garments/colorways
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'is_composite'
  ) THEN
    ALTER TABLE public.products ADD COLUMN is_composite BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add decomposition_data: stores detected variants from composite image analysis
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'decomposition_data'
  ) THEN
    ALTER TABLE public.products ADD COLUMN decomposition_data JSONB DEFAULT NULL;
    -- Expected structure:
    -- {
    --   "detected_at": "ISO timestamp",
    --   "garment_count": 4,
    --   "variants": [
    --     { "variant_id": "A", "color": "Blue", "position": "top-left", "description": "Blue Tweed Skirt Suit", "crop_image_url": "https://..." },
    --     { "variant_id": "B", "color": "Black", "position": "top-right", "description": "Black Tweed Skirt Suit", "crop_image_url": "https://..." }
    --   ]
    -- }
  END IF;
END $$;

-- Add variant_images: maps color/variant name to a cleaned product image URL
-- This is used during VTON/campaign generation to select the correct variant image
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'variant_images'
  ) THEN
    ALTER TABLE public.products ADD COLUMN variant_images JSONB DEFAULT NULL;
    -- Expected structure:
    -- {
    --   "Blue": "https://storage.supabase.co/.../variant_blue.jpg",
    --   "Black": "https://storage.supabase.co/.../variant_black.jpg",
    --   "Red": "https://storage.supabase.co/.../variant_red.jpg"
    -- }
  END IF;
END $$;

-- Add identity_fingerprint to influencers table for Objective 4
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'influencers' AND column_name = 'identity_fingerprint'
  ) THEN
    ALTER TABLE public.influencers ADD COLUMN identity_fingerprint JSONB DEFAULT NULL;
    -- Expected structure:
    -- {
    --   "locked_at": "ISO timestamp",
    --   "face_shape": "oval",
    --   "skin_tone": "deep brown",
    --   "eye_shape": "almond",
    --   "nose_type": "broad",
    --   "hair_color": "black",
    --   "hair_style": "braids",
    --   "hair_length": "shoulder-length",
    --   "body_build": "slim",
    --   "distinctive_features": ["high cheekbones", "full lips"]
    -- }
  END IF;
END $$;

-- Index on product_dna for fast "DNA locked" product queries
CREATE INDEX IF NOT EXISTS idx_products_has_dna
  ON public.products ((product_dna IS NOT NULL));

-- Index on is_composite for filtering
CREATE INDEX IF NOT EXISTS idx_products_is_composite
  ON public.products (is_composite)
  WHERE is_composite = TRUE;
