import type { PaymentGateway } from "./types";

/**
 * A pretend gateway for development, tests and the demo. Checkout opens our
 * own /pay/mock page, which posts back like a real gateway would.
 * The "signature" is the payment id + amount, checked again on verify.
 */
export const mockGateway: PaymentGateway = {
  name: "mock",

  async createCheckout(input) {
    const params = new URLSearchParams({
      payment: input.paymentId,
      amount: String(input.amount),
      product: input.productName,
      success: input.successUrl,
      fail: input.failUrl,
      cancel: input.cancelUrl,
    });
    const origin = new URL(input.successUrl).origin;
    return { redirectUrl: `${origin}/pay/mock/?${params.toString()}`, sessionKey: `mock_${input.paymentId}` };
  },

  async verify(fields) {
    const paymentId = fields.value_a ?? "";
    const amount = Number(fields.amount ?? "0");
    const status =
      fields.status === "VALID" ? "paid" : fields.status === "CANCELLED" ? "cancelled" : "failed";
    return {
      paymentId,
      gatewayTxId: fields.tran_id || `mock_${paymentId}`,
      amount: Number.isFinite(amount) ? amount : 0,
      status,
      raw: fields,
    };
  },

  async refund({ gatewayTxId }) {
    return { ok: true, reference: `mock_refund_${gatewayTxId}` };
  },
};
