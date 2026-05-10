-- Add courier_name column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_name TEXT;

-- Update the comments for clarity
COMMENT ON COLUMN public.orders.courier_name IS 'The preferred courier service chosen by the customer (e.g., CTS, Smart Deliveries, Speed)';
