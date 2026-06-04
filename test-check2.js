import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
async function test() {
  const { data, error } = await supabase.from('courier_providers').select('*');
  console.log('Error:', error);
  console.log('Data:', JSON.stringify(data, null, 2));
}
test();
