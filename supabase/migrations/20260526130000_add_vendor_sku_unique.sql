-- Migration: Add unique index on vendor_sku stored inside metadata JSONB
-- Date: 2026-05-26
-- Ensures vendors cannot register the same vendor-assigned SKU more than once.

CREATE UNIQUE INDEX IF NOT EXISTS products_vendor_sku_unique
  ON public.products ((metadata->>'vendor_sku'))
  WHERE metadata->>'vendor_sku' IS NOT NULL AND metadata->>'vendor_sku' != '';
