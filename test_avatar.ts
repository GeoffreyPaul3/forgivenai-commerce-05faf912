import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Testing generate-avatar...");
  const { data, error } = await supabase.functions.invoke("ugc-generate", {
    body: {
      action: "generate-avatar",
      gender: "female",
      ethnicity: "caucasian",
      setting: "studio-portrait",
      // Just a dummy image to trigger the useExactPhoto: false branch with an image
      avatarImageBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
      useExactPhoto: false
    }
  });

  if (error) console.error("Error:", error);
  console.log("Response:", data);
}

test();
