"use client";

import { useSyncExternalStore } from "react";
import { MAX_QTY, normalizeCart, type CartLine } from "../cart";

/**
 * The cart lives in this browser only (localStorage). Prices are never stored
 * here: the server prices every line at checkout.
 */
const KEY = "jotno-cart";
const EMPTY: CartLine[] = [];
const listeners = new Set<() => void>();
let cache: { raw: string | null; lines: CartLine[] } = { raw: null, lines: EMPTY };

function read(): CartLine[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cache.raw) return cache.lines;
  let lines: CartLine[] = EMPTY;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      lines = normalizeCart(
        parsed.filter(
          (x): x is CartLine =>
            typeof x === "object" &&
            x !== null &&
            typeof (x as CartLine).productId === "string" &&
            typeof (x as CartLine).qty === "number",
        ),
      );
    }
  } catch {
    lines = EMPTY;
  }
  cache = { raw, lines };
  return lines;
}

function write(lines: CartLine[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(normalizeCart(lines)));
  } catch {
    // Storage blocked (private mode): the cart just won't persist.
  }
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart() {
  const lines = useSyncExternalStore(subscribe, read, () => EMPTY);
  return {
    lines,
    count: lines.reduce((n, l) => n + l.qty, 0),
    add: (productId: string, qty = 1) => write([...read(), { productId, qty }]),
    setQty: (productId: string, qty: number) =>
      write(
        read().map((l) =>
          l.productId === productId ? { ...l, qty: Math.max(1, Math.min(qty, MAX_QTY)) } : l,
        ),
      ),
    remove: (productId: string) => write(read().filter((l) => l.productId !== productId)),
    clear: () => write([]),
  };
}
