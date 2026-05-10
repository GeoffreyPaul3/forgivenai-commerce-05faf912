-- Create bucket for delivery proofs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('delivery-proofs', 'delivery-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for delivery proofs
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'delivery-proofs' );

CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'delivery-proofs' );

CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'delivery-proofs' );
