-- Allow writes to ugc-assets for decomposed images
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Public Access for ugc-assets'
    ) THEN
        CREATE POLICY "Public Access for ugc-assets" ON storage.objects
            FOR ALL USING (bucket_id = 'ugc-assets');
    END IF;
END $$;
