import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.argv[2], process.argv[3]);
const { data } = await supabase
  .from('delivery_audit_logs')
  .select('*')
  .eq('event_type', 'API_RESPONSE')
  .order('created_at', { ascending: false })
  .limit(1);
console.log(JSON.stringify(data, null, 2));
