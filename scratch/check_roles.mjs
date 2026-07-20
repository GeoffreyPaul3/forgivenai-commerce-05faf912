import { createClient } from '@supabase/supabase-js';
const supabase = createClient("https://wzncegnkhybtmybqftbv.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bmNlZ25raHlidG15YnFmdGJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDkzNzcsImV4cCI6MjA5MTcyNTM3N30.tiOdT6E7dYNvx0Tln0N-S_4Yhc6NQKbjPutQCa2tBbQ");
async function run() {
  const { data } = await supabase.from('profiles').select('id, role, full_name').order('created_at', { ascending: false }).limit(30);
  const roleCounts = {};
  data?.forEach(p => roleCounts[p.role] = (roleCounts[p.role] || 0) + 1);
  console.log("Role breakdown:", roleCounts);
  console.log("Profiles:", JSON.stringify(data?.map(p => ({ role: p.role, name: p.full_name })), null, 2));
}
run();
