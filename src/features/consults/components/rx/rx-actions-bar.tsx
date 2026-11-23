"use client";

import { Printer, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart } from "@/features/shop";
import { useT } from "@/i18n/client";

/** Print, or "Save as PDF" in the print dialog (no PDF library needed). */
export function RxPrintButton() {
  const t = useT();
  return (
    <Button variant="brand" onClick={() => window.print()} className="print:hidden">
      <Printer aria-hidden="true" />
      {t("rx.print")}
    </Button>
  );
}

/** Owner: put the prescribed shop products in the cart (one or all). */
export function RxBuyButton({ productIds, all = false }: { productIds: string[]; all?: boolean }) {
  const t = useT();
  const { add } = useCart();
  if (productIds.length === 0) return null;
  return (
    <Button
      size="sm"
      variant={all ? "default" : "outline"}
      className="print:hidden"
      onClick={() => {
        for (const id of productIds) add(id);
        toast.success(t("rx.added"));
      }}
    >
      <ShoppingCart aria-hidden="true" />
      {t(all ? "rx.buyAll" : "rx.buy")}
    </Button>
  );
}
