import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_ACCESS_TOKEN || process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function run() {
  const { data: dOrders, error: dErr } = await supabase.from('delivery_orders').select('id, order_id, receiver_city, receiver_address, receiver_name, receiver_phone').order('created_at', { ascending: false }).limit(20);
  if (dErr) console.error("delivery_orders error:", dErr);
  else console.log("Recent delivery_orders:", JSON.stringify(dOrders, null, 2));

  const { data: orders, error: oErr } = await supabase.from('orders').select('id, notes, customer_name, customer_phone').order('created_at', { ascending: false }).limit(20);
  if (oErr) console.error("orders error:", oErr);
  else console.log("Recent orders:", JSON.stringify(orders, null, 2));
}

run();
