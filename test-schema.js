import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
async function test() {
  const { data, error } = await supabase.from('delivery_orders').insert({
    order_id: '00000000-0000-0000-0000-000000000000',
    courier_provider_id: '00000000-0000-0000-0000-000000000000',
    receiver_name: 'Test',
    receiver_phone: '1234',
    receiver_city: 'Lilongwe',
    delivery_address: '123',
    delivery_type: 'door_to_door',
    delivery_fee: 100,
    currency: 'MWK',
    payment_status: 'unpaid',
    parcel_status: 'pending_payment'
  });
  console.log('Error:', error);
}
test();
