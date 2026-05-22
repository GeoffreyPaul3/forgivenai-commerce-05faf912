const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzncegnkhybtmybqftbv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bmNlZ25raHlidG15YnFmdGJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDkzNzcsImV4cCI6MjA5MTcyNTM3N30.tiOdT6E7dYNvx0Tln0N-S_4Yhc6NQKbjPutQCa2tBbQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: allOrders, error } = await supabase
    .from('orders')
    .select('*');

  if (error) {
    console.error('Error fetching orders:', error);
    return;
  }

  const order = allOrders.find(o => o.id.startsWith('5c2a408a'));
  if (!order) {
    console.log('Order NOT found among', allOrders.length, 'orders');
  } else {
    console.log('ORDER:', JSON.stringify(order, null, 2));
  }

  // Find all products
  const { data: products } = await supabase
    .from('products')
    .select('*');
  console.log('ALL PRODUCTS:', JSON.stringify(products.map(p => ({ id: p.id, name: p.name, vendor_id: p.vendor_id })), null, 2));
}

run();
