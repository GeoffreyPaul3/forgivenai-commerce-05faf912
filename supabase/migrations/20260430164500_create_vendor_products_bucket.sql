-- Create storage bucket for vendor products
INSERT INTO storage.buckets (id, name, public)
VALUES ('vendor-products', 'vendor-products', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload vendor products
CREATE POLICY "Authenticated users can upload vendor products"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vendor-products');

-- Allow public read access to vendor products
CREATE POLICY "Public can view vendor products"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'vendor-products');
