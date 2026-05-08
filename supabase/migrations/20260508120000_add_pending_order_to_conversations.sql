-- Add pending_order column to conversations to store order data before customer confirmation
-- This allows the webhook to process payments even when the AI fails to output the ORDER_JSON block
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS pending_order JSONB DEFAULT NULL;

COMMENT ON COLUMN conversations.pending_order IS 
  'Stores the order data (product, price, customer details) when the AI presents the order summary. 
   Used as a fallback to create the order and payment link when the customer confirms with YES, 
   in case the AI does not reliably output the ###ORDER_JSON### block.';
