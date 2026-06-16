require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Testing generate-avatar...");
  const { data, error } = await supabase.functions.invoke("ugc-generate", {
    body: {
      action: "generate-avatar",
      gender: "female",
      ethnicity: "caucasian",
      setting: "studio-portrait",
      avatarImageBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
      useExactPhoto: false
    }
  });

  if (error) console.error("Error:", error);
  console.log("Response:", data);
}

test();
