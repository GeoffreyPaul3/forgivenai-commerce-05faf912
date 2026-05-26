-- Migration: Add unique index on vendor_sku stored inside metadata JSONB
-- Date: 2026-05-26
-- Ensures vendors cannot register the same vendor-assigned SKU more than once.

-- Resolve duplicate vendor_skus by appending product ID suffix to any duplicate vendor_skus
WITH duplicate_skus AS (
  SELECT metadata->>'vendor_sku' as vsku
  FROM public.products
  WHERE metadata->>'vendor_sku' IS NOT NULL AND metadata->>'vendor_sku' != ''
  GROUP BY metadata->>'vendor_sku'
  HAVING COUNT(*) > 1
)
UPDATE public.products p
SET metadata = jsonb_set(
  metadata, 
  '{vendor_sku}', 
  to_jsonb((metadata->>'vendor_sku') || '-DUP-' || substring(id::text, 1, 4))
)
FROM duplicate_skus
WHERE metadata->>'vendor_sku' = duplicate_skus.vsku;

-- Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS products_vendor_sku_unique
  ON public.products ((metadata->>'vendor_sku'))
  WHERE metadata->>'vendor_sku' IS NOT NULL AND metadata->>'vendor_sku' != '';
