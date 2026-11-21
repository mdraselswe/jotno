export interface CheckoutInput {
  /** Our payment id (payments.id); the gateway sends it back. */
  paymentId: string;
  /** Poisha. */
  amount: number;
  productName: string;
  customer: { name: string; email: string; phone: string };
  /** Absolute URLs. */
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  ipnUrl: string;
}

export interface CheckoutSession {
  /** Where to send the browser. */
  redirectUrl: string;
  sessionKey: string;
}

export interface VerifiedPayment {
  paymentId: string;
  /** The gateway's transaction id (unique; protects against double credit). */
  gatewayTxId: string;
  /** Poisha, as the gateway confirmed it. */
  amount: number;
  status: "paid" | "failed" | "cancelled";
  raw: Record<string, unknown>;
}

export interface PaymentGateway {
  name: string;
  createCheckout(input: CheckoutInput): Promise<CheckoutSession>;
  /**
   * Confirms a payment with the gateway's own API (never trust the browser
   * redirect or the IPN body alone). `fields` are the POSTed form fields.
   */
  verify(fields: Record<string, string>): Promise<VerifiedPayment>;
  refund(input: {
    gatewayTxId: string;
    amount: number;
    reason: string;
  }): Promise<{ ok: boolean; reference?: string }>;
}
