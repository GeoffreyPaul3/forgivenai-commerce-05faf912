import { PaymentProvider, InitializePaymentParams, InitializePaymentResponse, VerifyPaymentParams, VerifyPaymentResponse, WebhookResponse } from "./ProviderInterface.ts";

export class PayChanguProvider implements PaymentProvider {
  private secretKey: string;

  constructor() {
    const key = Deno.env.get("PAYCHANGU_SECRET_KEY");
    if (!key) throw new Error("PAYCHANGU_SECRET_KEY not configured");
    this.secretKey = key;
  }

  getProviderName(): string {
    return 'paychangu';
  }

  async initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResponse> {
    const response = await fetch("https://api.paychangu.com/payment", {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: String(params.amount),
        currency: params.currency || "MWK",
        email: params.email || "",
        first_name: params.first_name || "",
        last_name: params.last_name || "",
        callback_url: params.callback_url,
        return_url: params.return_url,
        tx_ref: params.tx_ref,
        customization: {
          title: params.title || "Forgiven Shopping Centre Order",
          description: params.description || "Payment for your order",
        },
        meta: {
          order_id: params.order_id || "",
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("PayChangu error:", data);
      throw new Error(data.message || `PayChangu error [${response.status}]`);
    }

    return {
      success: true,
      checkout_url: data.data?.checkout_url || data.checkout_url,
      tx_ref: data.data?.data?.tx_ref || data.data?.tx_ref || params.tx_ref,
    };
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResponse> {
    const response = await fetch(`https://api.paychangu.com/verify-payment/${params.tx_ref}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.secretKey}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("PayChangu verify error:", data);
      throw new Error(data.message || `Verification error [${response.status}]`);
    }

    const externalStatus = String(data.data?.status || data.status || "unknown").toLowerCase();
    const paymentStatus = externalStatus === "success" ? "paid" : externalStatus as 'paid' | 'pending' | 'failed' | 'cancelled' | 'unknown';

    return {
      status: paymentStatus,
      data: data,
    };
  }

  async handleWebhook(req: Request): Promise<WebhookResponse> {
    // PayChangu uses GET return_url as callback in FSC's existing flow,
    // but if they send a POST webhook we handle it here.
    try {
      const rawBody = await req.text();
      const body = rawBody ? JSON.parse(rawBody) : {};
      
      const tx_ref = body.data?.tx_ref || body.tx_ref;
      const status = String(body.data?.status || body.status || "unknown").toLowerCase();
      const paymentStatus = status === "success" ? "paid" : status as 'paid' | 'pending' | 'failed' | 'cancelled' | 'unknown';

      return {
        success: true,
        tx_ref,
        status: paymentStatus,
        raw_body: rawBody
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
