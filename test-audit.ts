import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);
async function run() {
  const { data } = await supabase.from('delivery_audit_logs').select('*').order('created_at', { ascending: false }).limit(5);
  console.log(JSON.stringify(data, null, 2));
}
run();
