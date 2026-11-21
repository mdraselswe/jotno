import type { PaymentGateway, VerifiedPayment } from "./types";

/**
 * SSLCommerz (cards, bKash, Nagad, Rocket in one checkout), API v4.
 * Sandbox until the merchant account is live (needs trade licence, e-TIN).
 * Docs: https://developer.sslcommerz.com/doc/v4/
 */
interface Config {
  storeId: string;
  storePassword: string;
  sandbox: boolean;
}

const taka = (poisha: number) => (poisha / 100).toFixed(2);

export function sslcommerzGateway(config: Config): PaymentGateway {
  const host = config.sandbox ? "https://sandbox.sslcommerz.com" : "https://securepay.sslcommerz.com";
  const auth = { store_id: config.storeId, store_passwd: config.storePassword };
  if (!config.storeId || !config.storePassword) {
    throw new Error("SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWORD are required");
  }

  return {
    name: "sslcommerz",

    async createCheckout(input) {
      const body = new URLSearchParams({
        ...auth,
        total_amount: taka(input.amount),
        currency: "BDT",
        tran_id: input.paymentId,
        success_url: input.successUrl,
        fail_url: input.failUrl,
        cancel_url: input.cancelUrl,
        ipn_url: input.ipnUrl,
        cus_name: input.customer.name || "Jotno user",
        cus_email: input.customer.email || "noreply@jotnocare.com",
        cus_phone: input.customer.phone || "01700000000",
        cus_add1: "Bangladesh",
        cus_city: "Dhaka",
        cus_country: "Bangladesh",
        shipping_method: "NO",
        product_name: input.productName,
        product_category: "service",
        product_profile: "non-physical-goods",
        value_a: input.paymentId,
      });
      const res = await fetch(`${host}/gwprocess/v4/api.php`, { method: "POST", body });
      const data = (await res.json()) as {
        status?: string;
        GatewayPageURL?: string;
        sessionkey?: string;
        failedreason?: string;
      };
      if (data.status !== "SUCCESS" || !data.GatewayPageURL) {
        throw new Error(`SSLCommerz init failed: ${data.failedreason ?? res.status}`);
      }
      return { redirectUrl: data.GatewayPageURL, sessionKey: data.sessionkey ?? "" };
    },

    async verify(fields): Promise<VerifiedPayment> {
      const valId = fields.val_id;
      const paymentId = fields.value_a || fields.tran_id || "";
      if (!valId) {
        return {
          paymentId,
          gatewayTxId: "",
          amount: 0,
          status: fields.status === "CANCELLED" ? "cancelled" : "failed",
          raw: fields,
        };
      }
      const url = new URL(`${host}/validator/api/validationserverAPI.php`);
      url.search = new URLSearchParams({ val_id: valId, ...auth, format: "json" }).toString();
      const data = (await (await fetch(url)).json()) as Record<string, string>;
      const ok = data.status === "VALID" || data.status === "VALIDATED";
      return {
        paymentId: data.value_a || data.tran_id || paymentId,
        gatewayTxId: data.bank_tran_id || data.val_id || valId,
        amount: Math.round(Number(data.amount ?? "0") * 100),
        status: ok && data.currency_type === "BDT" ? "paid" : "failed",
        raw: data,
      };
    },

    async refund({ gatewayTxId, amount, reason }) {
      const url = new URL(`${host}/validator/api/merchantTransIDvalidationAPI.php`);
      url.search = new URLSearchParams({
        bank_tran_id: gatewayTxId,
        refund_amount: taka(amount),
        refund_remarks: reason.slice(0, 250),
        ...auth,
        format: "json",
      }).toString();
      const data = (await (await fetch(url)).json()) as { status?: string; refund_ref_id?: string };
      return { ok: data.status === "success", reference: data.refund_ref_id };
    },
  };
}
