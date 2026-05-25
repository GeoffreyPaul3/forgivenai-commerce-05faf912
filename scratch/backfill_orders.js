import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wzncegnkhybtmybqftbv.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bmNlZ25raHlidG15YnFmdGJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjE0OTM3NywiZXhwIjoyMDkxNzI1Mzc3fQ.nm1EK9Q8Yz4Eiq2B6hPpZW0GwWiZ_6U2RdAG8PWyefM";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
  console.log("Starting backfill of orders...");
  
  // 1. Fetch all orders
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, total, status, base_profit, surplus_profit, surplus_type, agent_id, attributed_agent_id');
    
  if (ordersError) {
    console.error("Error fetching orders:", ordersError);
    return;
  }
  
  console.log(`Fetched ${orders.length} orders total.`);
  
  // 2. Fetch all commissions
  const { data: commissions, error: commsError } = await supabase
    .from('commissions')
    .select('order_id, amount');
    
  if (commsError) {
    console.error("Error fetching commissions:", commsError);
    return;
  }
  
  const commissionMap = new Map();
  commissions.forEach(c => commissionMap.set(c.order_id, Number(c.amount)));
  
  // 3. Fetch all agents to get their commission rates
  const { data: agents, error: agentsError } = await supabase
    .from('agents')
    .select('id, commission_rate');
    
  if (agentsError) {
    console.error("Error fetching agents:", agentsError);
    return;
  }
  
  const agentRateMap = new Map();
  agents.forEach(a => agentRateMap.set(a.id, Number(a.commission_rate || 8)));

  let updatedCount = 0;
  
  for (const order of orders) {
    if (order.base_profit === null) {
      const total = Number(order.total || 0);
      const base_profit = total * 0.30;
      const max_commission = total * 0.15;
      
      const agent_id = order.attributed_agent_id || order.agent_id;
      let surplus_profit = 0;
      let surplus_type = 'direct';
      
      if (agent_id) {
        surplus_type = 'agent';
        let commission_amount = commissionMap.get(order.id);
        if (commission_amount === undefined) {
          const rate = agentRateMap.get(agent_id) || 8;
          commission_amount = total * (rate / 100);
          console.log(`Order ${order.id}: No commission record found, using agent rate ${rate}% to estimate commission MWK ${commission_amount}`);
        }
        surplus_profit = max_commission - commission_amount;
      } else {
        surplus_profit = max_commission;
      }
      
      const gross_margin = base_profit + surplus_profit;
      
      console.log(`Updating Order ${order.id}: total=${total}, base_profit=${base_profit}, surplus_profit=${surplus_profit}, type=${surplus_type}`);
      
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          base_profit,
          surplus_profit,
          surplus_type,
          gross_margin
        })
        .eq('id', order.id);
        
      if (updateError) {
        console.error(`Error updating order ${order.id}:`, updateError);
      } else {
        updatedCount++;
      }
    }
  }
  
  console.log(`Backfill completed successfully. Updated ${updatedCount} orders.`);
}

run();
