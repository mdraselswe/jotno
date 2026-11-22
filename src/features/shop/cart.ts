/**
 * Cart totals as plain functions (poisha). The server recomputes them from
 * database prices at checkout; the browser total is only a preview.
 */
export interface CartLine {
  productId: string;
  qty: number;
}

export interface PricedLine extends CartLine {
  price: number;
  stock: number;
}

export interface DeliveryRule {
  /** Inside the home district (Dhaka). */
  inside: number;
  outside: number;
  /** Free delivery from this subtotal (0 = never free). */
  freeFrom: number;
  homeDistrictId: number;
}

export const MAX_QTY = 20;

export function clampQty(qty: number, stock: number): number {
  if (!Number.isFinite(qty)) return 1;
  return Math.max(1, Math.min(Math.floor(qty), MAX_QTY, Math.max(stock, 0)));
}

export function subtotal(lines: PricedLine[]): number {
  return lines.reduce((sum, l) => sum + l.price * l.qty, 0);
}

export function deliveryFee(sub: number, districtId: number | null, rule: DeliveryRule): number {
  if (sub === 0) return 0;
  if (rule.freeFrom > 0 && sub >= rule.freeFrom) return 0;
  return districtId === rule.homeDistrictId ? rule.inside : rule.outside;
}

/** Problems that block checkout: out of stock or more than available. */
export function stockProblems(lines: PricedLine[]): string[] {
  return lines.filter((l) => l.stock <= 0 || l.qty > l.stock).map((l) => l.productId);
}

/** Merges repeated products and drops empty lines. */
export function normalizeCart(lines: CartLine[]): CartLine[] {
  const map = new Map<string, number>();
  for (const l of lines) {
    if (!l.productId || !(l.qty > 0)) continue;
    map.set(l.productId, Math.min((map.get(l.productId) ?? 0) + Math.floor(l.qty), MAX_QTY));
  }
  return [...map].map(([productId, qty]) => ({ productId, qty }));
}

export interface CouponRule {
  kind: "percent" | "flat";
  /** Basis points for percent (1000 = 10%), poisha for flat. */
  value: number;
  minSubtotal: number;
  /** Cap for percent coupons (poisha); null = no cap. */
  maxDiscount: number | null;
}

/** Discount in whole taka for a subtotal; 0 when the order is below the minimum. Never more than the subtotal. */
export function couponDiscount(sub: number, c: CouponRule): number {
  if (sub <= 0 || sub < c.minSubtotal) return 0;
  const raw = c.kind === "percent" ? Math.floor((sub * c.value) / 10_000) : c.value;
  const capped = c.maxDiscount != null ? Math.min(raw, c.maxDiscount) : raw;
  return Math.floor(Math.min(capped, sub) / 100) * 100;
}
