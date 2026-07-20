import { createClient } from '@supabase/supabase-js';
const supabase = createClient("https://wzncegnkhybtmybqftbv.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bmNlZ25raHlidG15YnFmdGJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDkzNzcsImV4cCI6MjA5MTcyNTM3N30.tiOdT6E7dYNvx0Tln0N-S_4Yhc6NQKbjPutQCa2tBbQ");
async function run() {
  const { data } = await supabase.from('profiles').select('id, role, full_name, status').order('created_at', { ascending: false }).limit(30);
  console.log("Profiles with status:", JSON.stringify(data?.map(p => ({ role: p.role, name: p.full_name, status: p.status })), null, 2));
}
run();
