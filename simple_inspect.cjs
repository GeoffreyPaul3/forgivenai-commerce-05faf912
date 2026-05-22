const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzncegnkhybtmybqftbv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bmNlZ25raHlidG15YnFmdGJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDkzNzcsImV4cCI6MjA5MTcyNTM3N30.tiOdT6E7dYNvx0Tln0N-S_4Yhc6NQKbjPutQCa2tBbQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .ilike('name', '%HILLS%');

  console.log('PRODUCTS MATCHING HILLS:', JSON.stringify(products, null, 2));
}

run();
