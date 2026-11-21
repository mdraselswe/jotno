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
