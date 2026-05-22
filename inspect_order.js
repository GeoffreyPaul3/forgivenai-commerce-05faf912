const { createClient } = require('@supabase/supabase-client');

const supabaseUrl = 'https://wzncegnkhybtmybqftbv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bmNlZ25raHlidG15YnFmdGJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDkzNzcsImV4cCI6MjA5MTcyNTM3N30.tiOdT6E7dYNvx0Tln0N-S_4Yhc6NQKbjPutQCa2tBbQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .ilike('id', '%5c2a408a%')
    .single();

  if (error) {
    console.error('Error fetching order:', error);
    return;
  }

  console.log('ORDER:', JSON.stringify(order, null, 2));

  // Find all products
  const { data: products } = await supabase
    .from('products')
    .select('*');
  console.log('ALL PRODUCTS:', JSON.stringify(products.map(p => ({ id: p.id, name: p.name, vendor_id: p.vendor_id })), null, 2));
}

run();
