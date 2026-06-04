import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
async function test() {
  const { data: provider } = await supabase.from('courier_providers').select('id').eq('code', 'SMART_DELIVERIES').single();
  const { data: order } = await supabase.from('orders').select('id').limit(1).single();
  
  console.log('Provider:', provider?.id);
  console.log('Order:', order?.id);

  const { data, error } = await supabase.from('delivery_orders').insert({
    order_id: order?.id,
    courier_provider_id: provider?.id,
    receiver_name: 'Test',
    receiver_phone: '123',
    receiver_city: 'Lilongwe',
    receiver_address: '123',
    delivery_type: 'door_to_door',
    delivery_fee: 100,
    parcel_status: 'pending'
  });
  console.log('Error:', error);
}
test();
