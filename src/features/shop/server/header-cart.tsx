import "server-only";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { CartLink } from "../components/add-to-cart";
import { shopIsOpen } from "./queries";

/**
 * The header's cart button, only once the shop sells something: an empty shop
 * means the shop isn't open yet, and a cart button there only confuses people.
 * Read per request (inside the header's Suspense), never baked into the shell.
 */
export async function HeaderCart({ className }: { className?: string }) {
  await connection();
  const open = await shopIsOpen().catch(() => false);
  return open ? <CartLink className={className} /> : null;
}

/** Shows `children` (a shop teaser) only once the shop sells something. Put it inside a Suspense. */
export async function WhenShopOpen({ children }: { children: ReactNode }) {
  await connection();
  const open = await shopIsOpen().catch(() => false);
  return open ? children : null;
}
