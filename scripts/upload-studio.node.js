import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://wzncegnkhybtmybqftbv.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bmNlZ25raHlidG15YnFmdGJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDkzNzcsImV4cCI6MjA5MTcyNTM3N30.tiOdT6E7dYNvx0Tln0N-S_4Yhc6NQKbjPutQCa2tBbQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function uploadStudioMaster() {
  const localPath = path.resolve(process.cwd(), 'src/assets/studio.jpeg');
  console.log(`Reading local studio asset from ${localPath}...`);

  if (!fs.existsSync(localPath)) {
    console.error(`File not found: ${localPath}`);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(localPath);
  const storagePath = 'brand/fsc-flagship-studio.jpeg';

  console.log(`Uploading to Supabase Storage bucket 'ugc-assets/${storagePath}' at ${SUPABASE_URL}...`);

  const { data, error } = await supabase.storage
    .from('ugc-assets')
    .upload(storagePath, fileBuffer, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (error) {
    console.error('Failed to upload studio master image:', error);
    process.exit(1);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('ugc-assets')
    .getPublicUrl(storagePath);

  console.log('✅ Studio master image uploaded successfully!');
  console.log('Public URL:', publicUrl);
}

uploadStudioMaster();
