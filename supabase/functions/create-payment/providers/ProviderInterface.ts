export interface InitializePaymentParams {
  amount: string;
  currency: string;
  email: string;
  first_name: string;
  last_name: string;
  tx_ref: string;
  title: string;
  description: string;
  order_id: string;
  return_url: string;
  callback_url: string;
}

export interface InitializePaymentResponse {
  success: boolean;
  checkout_url?: string;
  tx_ref?: string;
  error?: string;
}

export interface VerifyPaymentParams {
  tx_ref: string;
}

export interface VerifyPaymentResponse {
  status: 'paid' | 'pending' | 'failed' | 'cancelled' | 'unknown';
  external_reference?: string;
  amount?: number;
  currency?: string;
  data: any;
}

export interface WebhookResponse {
  success: boolean;
  tx_ref?: string;
  status?: 'paid' | 'pending' | 'failed' | 'cancelled' | 'unknown';
  external_reference?: string;
  error?: string;
  raw_body?: string;
}

export interface PaymentProvider {
  /**
   * Identifies the provider e.g., 'paychangu' or 'onekhusa'
   */
  getProviderName(): string;

  /**
   * Initializes a payment session and returns a checkout URL
   */
  initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResponse>;

  /**
   * Explicitly verifies a payment via the provider's API
   */
  verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResponse>;

  /**
   * Handles an incoming webhook, validates the signature, and extracts payment status
   */
  handleWebhook(req: Request): Promise<WebhookResponse>;
}
