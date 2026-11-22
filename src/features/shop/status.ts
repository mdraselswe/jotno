import type { MessageKey } from "@/i18n";

export const ORDER_STATUSES = [
  "pending_payment",
  "placed",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Order status → label key. */
export const ORDER_STATUS: Record<OrderStatus, MessageKey> = {
  pending_payment: "shop.status.pending_payment",
  placed: "shop.status.placed",
  paid: "shop.status.paid",
  processing: "shop.status.processing",
  shipped: "shop.status.shipped",
  delivered: "shop.status.delivered",
  cancelled: "shop.status.cancelled",
  returned: "shop.status.returned",
};

/**
 * What the team can do next with an order:
 * process = confirmed (cash on delivery, after a call) or packing (paid);
 * ship needs a courier and tracking; deliver collects cash on delivery.
 */
export type OrderAction = "process" | "ship" | "deliver" | "cancel" | "return";

export function orderActions(status: OrderStatus): OrderAction[] {
  switch (status) {
    case "pending_payment":
      return ["cancel"];
    case "placed":
    case "paid":
      return ["process", "cancel"];
    case "processing":
      return ["ship", "cancel"];
    case "shipped":
      return ["deliver", "return"];
    case "delivered":
      return ["return"];
    default:
      return [];
  }
}

/** The customer may cancel until the team starts packing. */
export const customerCanCancel = (status: OrderStatus) =>
  status === "pending_payment" || status === "placed" || status === "paid";

/** Progress steps shown on the order page, and how far an order has come (−1 = stopped). */
export const ORDER_STEPS = ["ordered", "processing", "shipped", "delivered"] as const;
export function orderStep(status: OrderStatus): number {
  switch (status) {
    case "pending_payment":
    case "placed":
    case "paid":
      return 0;
    case "processing":
      return 1;
    case "shipped":
      return 2;
    case "delivered":
      return 3;
    default:
      return -1;
  }
}
