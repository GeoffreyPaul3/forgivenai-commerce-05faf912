-- Migration: Reset all vendor products to draft status
-- Date: 2026-05-26

UPDATE public.products
SET status = 'draft'
WHERE vendor_id IS NOT NULL;
