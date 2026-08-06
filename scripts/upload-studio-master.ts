/**
 * One-time setup script to upload canonical flagship studio image (src/assets/studio.jpeg)
 * to Supabase Storage bucket 'ugc-assets/brand/fsc-flagship-studio.jpeg'.
 * 
 * Usage:
 * deno run --allow-read --allow-net --allow-env scripts/upload-studio-master.ts
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function uploadStudioMaster() {
  const localImagePath = "./src/assets/studio.jpeg";
  console.log(`Reading local studio asset from ${localImagePath}...`);

  try {
    const fileBytes = await Deno.readFile(localImagePath);
    const storagePath = "brand/fsc-flagship-studio.jpeg";

    console.log(`Uploading to Supabase Storage bucket 'ugc-assets/${storagePath}'...`);

    const { error: uploadError } = await supabase.storage
      .from("ugc-assets")
      .upload(storagePath, fileBytes, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Failed to upload studio master:", uploadError);
      Deno.exit(1);
    }

    const { data: { publicUrl } } = supabase.storage
      .from("ugc-assets")
      .getPublicUrl(storagePath);

    console.log(`✅ Studio master uploaded successfully!`);
    console.log(`Public URL: ${publicUrl}`);

    // Verify reachability
    const res = await fetch(publicUrl, { method: "HEAD" });
    if (res.ok) {
      console.log(`✅ Verified studio master public URL reachability (HTTP ${res.status}).`);
    } else {
      console.warn(`⚠️ Warning: Public URL returned HTTP ${res.status}`);
    }

  } catch (err) {
    console.error("Error during studio master upload:", err);
    Deno.exit(1);
  }
}

uploadStudioMaster();
