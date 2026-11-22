"use client";

import { Ban } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/i18n/client";
import { cancelMyOrder } from "../server/actions";

/** Customer: cancel an order before packing starts (paid orders are queued for a refund). */
export function CancelMyOrder({ id }: { id: string }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(t("shop.cancelMineConfirm"))) return;
        start(async () => {
          const r = await cancelMyOrder(locale, id);
          if (r.ok) {
            toast.success(t("shop.cancelledToast"));
            router.refresh();
          } else toast.error(t(r.error));
        });
      }}
    >
      <Ban aria-hidden="true" />
      {t("shop.cancelMine")}
    </Button>
  );
}
