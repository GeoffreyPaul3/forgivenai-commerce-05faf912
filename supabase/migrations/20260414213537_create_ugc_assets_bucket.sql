-- Create the ugc-assets bucket and set it to public
DO $$
BEGIN
    -- Insert the bucket if it doesn't exist
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('ugc-assets', 'ugc-assets', true)
    ON CONFLICT (id) DO NOTHING;

    -- Create select policy if it doesn't exist for this specific bucket
    -- We use a specific name to avoid conflicts with global policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Public Access for ugc-assets'
    ) THEN
        CREATE POLICY "Public Access for ugc-assets"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'ugc-assets');
    END IF;
END $$;
