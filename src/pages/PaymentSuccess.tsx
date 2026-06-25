import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type PaymentState = "loading" | "success" | "pending" | "error";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const txRef = searchParams.get("tx_ref") ?? "";
  // OneKhusa may pass ?status=success|failed on the redirect URL
  const urlStatus = searchParams.get("status") ?? "";
  const [state, setState] = useState<PaymentState>("loading");
  const [orderDetails, setOrderDetails] = useState<{
    amount?: number;
    items?: string;
    customer?: string;
  }>({});
  const [countdown, setCountdown] = useState(8);
  const retryCount = useRef(0);

  useEffect(() => {
    if (!txRef) {
      setState("error");
      return;
    }

    const verify = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("create-payment", {
          body: { action: "verify_payment", tx_ref: txRef },
        });

        if (error) throw error;

        const status = data?.status ?? "unknown";

        if (status === "paid" || status === "success") {
          setState("success");
          // Try to pull order details for a richer confirmation
          const { data: order } = await supabase
            .from("orders")
            .select("total, items, customer_name")
            .eq("payment_reference", txRef)
            .maybeSingle();

          if (order) {
            setOrderDetails({
              amount: order.total,
              items: Array.isArray(order.items)
                ? order.items.map((i: any) => `${i.name ?? i.title ?? "Item"} x${i.quantity ?? 1}`).join(", ")
                : undefined,
              customer: order.customer_name,
            });
          }
        } else if (status === "pending") {
          setState("pending");
        } else {
          // "unknown" or anything else: retry once after 4 seconds
          // (OneKhusa may not have settled the transaction yet)
          if (retryCount.current < 1) {
            retryCount.current += 1;
            console.log(`Payment status "${status}" — retrying verification in 4s (attempt ${retryCount.current})...`);
            setTimeout(verify, 4000);
          } else {
            console.warn(`Payment status still "${status}" after retry. Showing error.`);
            setState("error");
          }
        }
      } catch (err) {
        console.error("Payment verification error:", err);
        // On network/edge-function error, retry once
        if (retryCount.current < 1) {
          retryCount.current += 1;
          console.log(`Verification threw an error — retrying in 4s...`);
          setTimeout(verify, 4000);
        } else {
          setState("error");
        }
      }
    };

    verify();
  }, [txRef]);

  // Countdown redirect for success state
  useEffect(() => {
    if (state !== "success") return;
    if (countdown <= 0) {
      navigate("/dashboard");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [state, countdown, navigate]);

  const accent =
    state === "success"
      ? "152, 60%, 42%"
      : state === "pending"
      ? "38, 92%, 50%"
      : "0, 72%, 51%";

  const icon =
    state === "loading" ? (
      <svg
        className="spin"
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    ) : state === "success" ? (
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ) : state === "pending" ? (
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ) : (
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    );

  const heading =
    state === "loading"
      ? "Verifying Payment…"
      : state === "success"
      ? "Payment Successful! 🎉"
      : state === "pending"
      ? "Payment Pending"
      : "Verification Failed";

  const body =
    state === "loading"
      ? "Please wait while we confirm your payment with OneKhusa. This may take a few seconds…"
      : state === "success"
      ? `Your payment has been confirmed and your order is now being processed.${
          orderDetails.customer ? ` Thank you, ${orderDetails.customer}!` : ""
        }`
      : state === "pending"
      ? "Your payment is still being processed. You'll receive a WhatsApp confirmation once it clears."
      : "We couldn't verify your payment. Please contact us on WhatsApp and we'll sort it out immediately.";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        .ps-root {
          margin: 0;
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: radial-gradient(circle at top right, hsla(${accent}, 0.08), transparent 60%),
                      radial-gradient(circle at bottom left, hsla(${accent}, 0.04), transparent 60%),
                      #f0f4f8;
          color: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 24px;
        }

        .ps-card {
          width: 100%;
          max-width: 460px;
          background: #ffffff;
          border-radius: 32px;
          padding: 52px 36px 44px;
          box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0,0,0,0.04);
          text-align: center;
          position: relative;
          overflow: hidden;
          animation: slideUp 0.55s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)  scale(1); }
        }

        .ps-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 5px;
          background: linear-gradient(90deg, hsl(${accent}), hsl(${accent}) 60%, transparent);
        }

        .ps-icon-box {
          width: 84px;
          height: 84px;
          background: hsla(${accent}, 0.10);
          border-radius: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 28px;
          color: hsl(${accent});
        }

        .ps-card h1 {
          margin: 0 0 14px;
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }

        .ps-card p {
          margin: 0 0 28px;
          line-height: 1.65;
          color: #64748b;
          font-size: 16px;
        }

        .ps-details {
          background: #f8fafc;
          border-radius: 16px;
          padding: 18px 20px;
          margin-bottom: 28px;
          text-align: left;
          font-size: 14px;
          color: #475569;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .ps-details-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .ps-details-row span:last-child {
          font-weight: 600;
          color: #0f172a;
          text-align: right;
          word-break: break-word;
          max-width: 200px;
        }

        .ps-btn {
          display: inline-block;
          background: hsl(${accent});
          color: white;
          text-decoration: none;
          padding: 15px 32px;
          border-radius: 16px;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          border: none;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 10px 20px -4px hsla(${accent}, 0.35);
          width: 100%;
          font-family: inherit;
        }

        .ps-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 28px -6px hsla(${accent}, 0.45);
        }

        .ps-redirect {
          margin-top: 20px;
          font-size: 13px;
          color: #94a3b8;
        }

        .ps-tx {
          margin-top: 16px;
          font-size: 11px;
          color: #cbd5e1;
          word-break: break-all;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 0.9s linear infinite;
        }
      `}</style>

      <div className="ps-root">
        <div className="ps-card">
          <div className="ps-icon-box">{icon}</div>

          <h1>{heading}</h1>
          <p>{body}</p>

          {state === "success" && (orderDetails.amount || orderDetails.items) && (
            <div className="ps-details">
              {orderDetails.items && (
                <div className="ps-details-row">
                  <span>Items</span>
                  <span>{orderDetails.items}</span>
                </div>
              )}
              {orderDetails.amount && (
                <div className="ps-details-row">
                  <span>Amount Paid</span>
                  <span>MWK {Number(orderDetails.amount).toLocaleString()}</span>
                </div>
              )}
              <div className="ps-details-row">
                <span>Status</span>
                <span style={{ color: `hsl(${accent})` }}>✓ Confirmed</span>
              </div>
            </div>
          )}

          {state !== "loading" && (
            <button
              className="ps-btn"
              onClick={() => navigate("/dashboard")}
            >
              {state === "success" ? "Go to Dashboard" : "Back to Store"}
            </button>
          )}

          {state === "success" && (
            <div className="ps-redirect">
              Redirecting to dashboard in {countdown}s…
            </div>
          )}

          {txRef && (
            <div className="ps-tx">Ref: {txRef}</div>
          )}
        </div>
      </div>
    </>
  );
}
