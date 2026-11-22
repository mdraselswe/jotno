import "server-only";
import { isProduction } from "@/config";
import { publicEnv, serverEnv } from "@/config/env";
import { mockGateway } from "./mock";
import { sslcommerzGateway } from "./sslcommerz";
import type { PaymentGateway } from "./types";

export type { CheckoutInput, CheckoutSession, PaymentGateway, VerifiedPayment } from "./types";

/**
 * The payment gateway for this deployment. Features call `payments()` and never
 * a gateway SDK directly, so switching (SSLCommerz → bKash direct) changes only
 * this folder.
 *
 * The mock gateway is allowed only in development, tests and the pre-launch
 * demo (NEXT_PUBLIC_DEMO), never in a real launch.
 */
/** True when a card/wallet gateway takes the money; false for manual bKash/Nagad/COD (checked by an admin). */
export function usesGateway(): boolean {
  return serverEnv().PAYMENT_PROVIDER !== "manual";
}

export function payments(): PaymentGateway {
  const env = serverEnv();
  if (env.PAYMENT_PROVIDER === "sslcommerz") {
    return sslcommerzGateway({
      storeId: env.SSLCOMMERZ_STORE_ID,
      storePassword: env.SSLCOMMERZ_STORE_PASSWORD,
      sandbox: env.SSLCOMMERZ_SANDBOX,
    });
  }
  const mockAllowed = !isProduction || publicEnv.NEXT_PUBLIC_DEMO;
  if (!mockAllowed) throw new Error("PAYMENT_PROVIDER=mock is only allowed in development or the demo");
  return mockGateway;
}
