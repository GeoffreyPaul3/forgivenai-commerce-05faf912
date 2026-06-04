import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
async function run() {
  const { data } = await supabase.from('delivery_audit_logs').select('*').order('created_at', { ascending: false }).limit(2);
  console.log(JSON.stringify(data, null, 2));
}
run();
