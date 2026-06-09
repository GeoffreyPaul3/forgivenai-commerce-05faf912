DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='stock_status') THEN
        ALTER TABLE public.products ADD COLUMN stock_status TEXT DEFAULT 'available';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_stock_status ON public.products (stock_status);
