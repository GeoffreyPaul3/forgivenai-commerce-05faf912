-- Fix get_vendor_orders RPC to support fallback case-insensitive product name matching when product_id is null
CREATE OR REPLACE FUNCTION public.get_vendor_orders(p_vendor_id UUID)
RETURNS SETOF public.orders
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT o.* 
  FROM public.orders o
  WHERE EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(o.items) AS item
    WHERE (
      item->>'product_id' IS NOT NULL
      AND item->>'product_id' IN (
        SELECT id::text FROM public.products WHERE vendor_id = p_vendor_id
      )
    ) OR (
      (item->>'product_id' IS NULL OR item->>'product_id' = '')
      AND LOWER(regexp_replace(item->>'name', '\s*\([^)]*\)\s*$', '')) IN (
        SELECT LOWER(name) FROM public.products WHERE vendor_id = p_vendor_id
      )
    )
  )
  ORDER BY o.created_at DESC;
$$;
