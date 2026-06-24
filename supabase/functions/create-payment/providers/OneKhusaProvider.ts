import { PaymentProvider, InitializePaymentParams, InitializePaymentResponse, VerifyPaymentParams, VerifyPaymentResponse, WebhookResponse } from "./ProviderInterface.ts";

// Base URLs — switch to live when ONEKHUSA_ENV=live
const SANDBOX_BASE = "https://api.onekhusa.com/sandbox/v1";
const LIVE_BASE    = "https://api.onekhusa.com/live/v1";
const CHECKOUT_BASE = "https://checkout.onekhusa.com";

export class OneKhusaProvider implements PaymentProvider {
  private apiKey: string;
  private apiSecret: string;
  private organisationId: string;
  private merchantAccountNumber: string;
  private baseUrl: string;

  constructor() {
    this.apiKey              = Deno.env.get("ONEKHUSA_API_KEY")    || "";
    this.apiSecret           = Deno.env.get("ONEKHUSA_API_SECRET") || "";
    this.organisationId      = Deno.env.get("ONEKHUSA_ORG_ID")     || "";
    this.merchantAccountNumber = Deno.env.get("ONEKHUSA_MERCHANT_ACCOUNT_NUMBER") || "";
    const isLive             = Deno.env.get("ONEKHUSA_ENV") === "live";
    this.baseUrl             = isLive ? LIVE_BASE : SANDBOX_BASE;
  }

  getProviderName(): string {
    return "onekhusa";
  }

  private validateConfig() {
    const missing: string[] = [];
    if (!this.apiKey)               missing.push("ONEKHUSA_API_KEY");
    if (!this.apiSecret)            missing.push("ONEKHUSA_API_SECRET");
    if (!this.organisationId)       missing.push("ONEKHUSA_ORG_ID");
    if (!this.merchantAccountNumber) missing.push("ONEKHUSA_MERCHANT_ACCOUNT_NUMBER");
    if (missing.length > 0) {
      throw new Error(`OneKhusa configuration missing: ${missing.join(", ")}. Please set these in Supabase Function Secrets.`);
    }
  }

  /**
   * Step 1: Get an access token from OneKhusa.
   * POST /account/getAccessToken
   * Body: { apiKey, apiSecret, organisationId, merchantAccountNumber }
   * Returns: { accessToken, expiresOn, expiryInMinutes }
   */
  private async getAccessToken(): Promise<string> {
    this.validateConfig();

    const body = {
      apiKey: this.apiKey,
      apiSecret: this.apiSecret,
      organisationId: this.organisationId,
      merchantAccountNumber: Number(this.merchantAccountNumber),
    };

    console.log("OneKhusa getAccessToken request body:", JSON.stringify(body));

    const response = await fetch(`${this.baseUrl}/account/getAccessToken`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    console.log("OneKhusa getAccessToken response:", JSON.stringify(data));

    if (!response.ok) {
      const detail = data?.detail || data?.message || data?.error || `Auth failed [${response.status}]`;
      const errors = data?.errors ? ` Errors: ${data.errors.join(", ")}` : "";
      throw new Error(`OneKhusa Auth Error: ${detail}${errors}`);
    }

    const token = data?.accessToken || data?.data?.accessToken;
    if (!token) {
      throw new Error(`OneKhusa Auth: accessToken not found in response. Got: ${JSON.stringify(data)}`);
    }

    return token;
  }

  /**
   * Initiate a checkout payment.
   * POST /checkout/rtp/initiate
   * Docs: https://docs.onekhusa.com/api-reference/collections/request-to-pay-checkout
   *
   * On success, returns paymentTransactionId which is appended to
   * https://checkout.onekhusa.com/requestToPay/initiate?ptid={paymentTransactionId}
   */
  async initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResponse> {
    const accessToken = await this.getAccessToken();

    // Build a unique idempotency key from the tx_ref
    const idempotencyKey = `FSC-${params.tx_ref}`;

    const callbackUrl = params.callback_url || "";
    const successUrl  = params.return_url   || "https://www.forgivenshoppingcentre.com";
    const failureUrl  = params.return_url   || "https://www.forgivenshoppingcentre.com";

    // Checkout RTP endpoint per docs:
    // POST /checkout/rtp/initiate
    // Docs: https://docs.onekhusa.com/api-reference/collections/request-to-pay-checkout
    const rtpBody = {
      authentication: {
        apiKey: this.apiKey,
        apiSecret: this.apiSecret,
      },
      merchant: {
        organisationId: this.organisationId,
        merchantAccountNumber: Number(this.merchantAccountNumber),
      },
      payment: {
        sourceReferenceNumber: params.tx_ref,
        description: params.title || params.description || `Forgiven Shopping Centre Order`,
        amount: Number(params.amount),
      },
      route: {
        successRedirectionUrl: successUrl,
        failureRedirectionUrl: failureUrl,
        callbackApiUrl: callbackUrl || successUrl,
      }
    };

    console.log("OneKhusa checkout/rtp/initiate body:", JSON.stringify(rtpBody));

    const response = await fetch(`${this.baseUrl}/checkout/rtp/initiate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(rtpBody),
    });

    const data = await response.json().catch(() => ({}));
    console.log("OneKhusa requestToPay response:", JSON.stringify(data));

    if (!response.ok) {
      const detail = data?.detail || data?.message || data?.error || `OneKhusa RTP init failed [${response.status}]`;
      const errors = data?.errors ? ` Errors: ${data.errors.join(", ")}` : "";
      console.error("OneKhusa initializePayment error:", JSON.stringify(data));
      throw new Error(`${detail}${errors}`);
    }

    // Response fields:
    // - timedAccountNumber: TAN for direct mobile money / bank transfers
    // - paymentTransactionId: PTID used to redirect to the hosted checkout page
    const timedAccountNumber  = data?.timedAccountNumber  || data?.data?.timedAccountNumber;
    const paymentTransactionId = data?.paymentTransactionId || data?.data?.paymentTransactionId;

    // The hosted checkout URL (per OneKhusa docs):
    // https://checkout.onekhusa.com/requestToPay/initiate?ptid={paymentTransactionId}
    // The TAN is for customers who prefer to pay via their own bank/MNO app directly.
    const checkoutUrl = paymentTransactionId
      ? `${CHECKOUT_BASE}/requestToPay/initiate?ptid=${paymentTransactionId}`
      : timedAccountNumber
        ? `${CHECKOUT_BASE}/requestToPay/initiate?ptid=${timedAccountNumber}`
        : null;

    if (!checkoutUrl) {
      console.error("OneKhusa RTP response missing paymentTransactionId and timedAccountNumber:", JSON.stringify(data));
      throw new Error("OneKhusa did not return a paymentTransactionId or timedAccountNumber to build a checkout URL.");
    }

    console.log(`✅ OneKhusa checkout URL: ${checkoutUrl} (TAN: ${timedAccountNumber}, PTID: ${paymentTransactionId})`);

    return {
      success: true,
      checkout_url: checkoutUrl,
      tx_ref: params.tx_ref,
      extra: {
        timedAccountNumber,
        paymentTransactionId,
        expiryDate: data?.expiryDate,
        expiryInMinutes: data?.expiryInMinutes,
        merchantAccountNumber: data?.merchantAccountNumber,
      },
    };
  }

  /**
   * Verify a payment by its reference.
   * Uses the GET /checkout/rtp/{sourceReferenceNumber} or similar endpoint.
   */
  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResponse> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(`${this.baseUrl}/checkout/rtp/${params.tx_ref}`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.warn(`OneKhusa verifyPayment failed [${response.status}]:`, data);
        return { status: "unknown", data };
      }

      const externalStatus = String(
        data?.data?.status || data?.status || "unknown"
      ).toLowerCase();

      let paymentStatus: VerifyPaymentResponse["status"] = "unknown";
      if (["successful", "success", "paid", "completed"].includes(externalStatus)) {
        paymentStatus = "paid";
      } else if (externalStatus === "failed" || externalStatus === "reversed") {
        paymentStatus = "failed";
      } else if (externalStatus === "pending") {
        paymentStatus = "pending";
      } else if (externalStatus === "cancelled") {
        paymentStatus = "cancelled";
      }

      return {
        status: paymentStatus,
        external_reference: data?.data?.paymentTransactionId || data?.data?.transactionId,
        amount: data?.data?.amount,
        data,
      };
    } catch (err: any) {
      console.error("OneKhusa verifyPayment exception:", err.message);
      return { status: "unknown", data: { error: err.message } };
    }
  }

  /**
   * Handle incoming webhook notification from OneKhusa.
   * OneKhusa sends payrequest.success or similar events.
   */
  async handleWebhook(req: Request): Promise<WebhookResponse> {
    try {
      const rawBody = await req.text();
      const body = rawBody ? JSON.parse(rawBody) : {};

      // OneKhusa webhook payload typically contains event type and data
      const eventType = body?.event || body?.eventType || "";
      const txRef =
        body?.data?.sourceReferenceNumber ||
        body?.sourceReferenceNumber ||
        body?.data?.paymentTransactionId ||
        body?.paymentTransactionId;

      const statusStr = String(
        body?.data?.status || body?.status || "unknown"
      ).toLowerCase();

      let paymentStatus: WebhookResponse["status"] = "unknown";
      if (["successful", "success", "paid", "completed"].includes(statusStr) ||
          eventType === "payrequest.success") {
        paymentStatus = "paid";
      } else if (statusStr === "failed" || eventType === "payrequest.failed") {
        paymentStatus = "failed";
      } else if (statusStr === "pending") {
        paymentStatus = "pending";
      } else if (statusStr === "reversed" || eventType === "payrequest.reversed") {
        paymentStatus = "failed";
      }

      console.log(`OneKhusa webhook received: event=${eventType}, tx_ref=${txRef}, status=${paymentStatus}`);

      return {
        success: true,
        tx_ref: txRef,
        status: paymentStatus,
        external_reference: body?.data?.paymentTransactionId,
        raw_body: rawBody,
      };
    } catch (err: any) {
      console.error("OneKhusa webhook parse error:", err.message);
      return { success: false, error: err.message };
    }
  }
}
