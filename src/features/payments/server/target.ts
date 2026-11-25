import "server-only";
import { chatPath, quickRequestPath, ROUTES } from "@/config/routes";
import { localePath } from "@/config/locale";
import type { SettleResult } from "./payments";

/** Where the person lands after a payment, by what they paid for. */
export function afterPaymentPath(result: SettleResult, locale: string): string {
  const status = result.status === "paid" ? "paid" : result.status;
  const route =
    result.purpose === "consult" && result.refId
      ? chatPath(result.refId)
      : result.purpose === "appointment"
        ? ROUTES.appointments
        : result.purpose === "featured"
          ? ROUTES.vetFeatured
          : result.purpose === "order"
            ? ROUTES.orders
            : result.purpose === "quick" && result.refId
              ? quickRequestPath(result.refId)
              : ROUTES.home;
  const path = localePath(locale, route);
  // "/" + "/?…" would be "//?…", a protocol-relative URL.
  return `${path.endsWith("/") ? path : `${path}/`}?payment=${status}`;
}
