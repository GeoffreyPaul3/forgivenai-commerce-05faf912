import { supabase } from "@/integrations/supabase/client";

/**
 * deliveryPaymentService
 * 
 * Responsibilities:
 * - calculate courier charges (via deliveryFeeEngine)
 * - create payable invoice (stubbed for future payment gateway)
 * - record payment
 * - verify payment
 * - unlock parcel creation
 */

export async function recordDeliveryPayment(deliveryOrderId: string, amount: number, reference: string) {
  const { data, error } = await supabase.from('delivery_service_payments').insert({
    delivery_order_id: deliveryOrderId,
    amount,
    status: 'paid',
    transaction_reference: reference
  }).select().single();

  if (error) throw error;

  // Once paid, transition order state to unlocking parcel creation
  const { data: deliveryOrder } = await supabase
    .from('delivery_orders')
    .select('order_id')
    .eq('id', deliveryOrderId)
    .single();

  if (deliveryOrder?.order_id) {
    // Check if the order itself is paid
    const { data: order } = await supabase
      .from('orders')
      .select('status')
      .eq('id', deliveryOrder.order_id)
      .single();

    if (order?.status === 'paid' || order?.status === 'delivery_payment_complete') {
      await supabase.from('orders').update({ status: 'delivery_payment_complete' }).eq('id', deliveryOrder.order_id);
    }
  }

  return data;
}

export async function verifyDeliveryPaymentAndTriggerParcel(deliveryOrderId: string) {
  // Verifies the payment is complete
  const { data: payments } = await supabase
    .from('delivery_service_payments')
    .select('*')
    .eq('delivery_order_id', deliveryOrderId)
    .eq('status', 'paid');

  if (payments && payments.length > 0) {
    // Payment verified, trigger edge function to create parcel
    const { data: deliveryOrder } = await supabase
      .from('delivery_orders')
      .select('order_id')
      .eq('id', deliveryOrderId)
      .single();
    
    if (deliveryOrder) {
      await supabase.functions.invoke('smart-deliveries-create-parcel', {
        body: { orderId: deliveryOrder.order_id, deliveryOrderId }
      });
    }
    return true;
  }
  return false;
}
