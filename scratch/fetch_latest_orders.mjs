import { createClient } from '@supabase/supabase-js';

const supabase = createClient("https://wzncegnkhybtmybqftbv.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bmNlZ25raHlidG15YnFmdGJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDkzNzcsImV4cCI6MjA5MTcyNTM3N30.tiOdT6E7dYNvx0Tln0N-S_4Yhc6NQKbjPutQCa2tBbQ");

async function run() {
  const { data: orders, error: oErr } = await supabase.from('orders').select('id, created_at, notes, customer_name, customer_phone').order('created_at', { ascending: false }).limit(2);
  if (oErr) console.error("orders error:", oErr);
  else console.log("Latest orders:", JSON.stringify(orders, null, 2));
}

run();
