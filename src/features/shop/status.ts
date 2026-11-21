import type { MessageKey } from "@/i18n";

/** Order status → label key. */
export const ORDER_STATUS: Record<string, MessageKey> = {
  pending_payment: "shop.status.pending_payment",
  paid: "shop.status.paid",
  shipped: "shop.status.shipped",
  delivered: "shop.status.delivered",
  cancelled: "shop.status.cancelled",
};
