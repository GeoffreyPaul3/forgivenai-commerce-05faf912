import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wzncegnkhybtmybqftbv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bmNlZ25raHlidG15YnFmdGJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDkzNzcsImV4cCI6MjA5MTcyNTM3N30.tiOdT6E7dYNvx0Tln0N-S_4Yhc6NQKbjPutQCa2tBbQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, total, status, base_profit, surplus_profit, surplus_type, created_at, agent_id, attributed_agent_id');
  
  if (error) {
    console.error("Error fetching orders:", error);
    return;
  }
  
  console.log("Total orders found:", data.length);
  console.log("Orders:", JSON.stringify(data, null, 2));
}

run();
