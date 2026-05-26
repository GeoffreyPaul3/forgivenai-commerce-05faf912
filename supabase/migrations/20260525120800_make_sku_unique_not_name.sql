-- Migration: Make SKU unique instead of name
-- Date: 2026-05-25
-- Enables multiple products to share the same name (e.g. from different vendors or different variations)
-- while ensuring SKU-level uniqueness.

-- 1. Drop the unique constraint on product name
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_name_unique;

-- 2. Create a unique index on the SKU stored inside the metadata JSONB column
-- This index only applies when a SKU is present in metadata, allowing multiple products
-- without a SKU (or null SKU) to co-exist.
CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique ON public.products ((metadata->>'sku'));
