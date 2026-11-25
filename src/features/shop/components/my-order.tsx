"use client";

import { Ban, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLocale, useT } from "@/i18n/client";
import { cancelMyOrder } from "../server/actions";

/** Customer: cancel an order before packing starts (paid orders are queued for a refund). */
export function CancelMyOrder({ id }: { id: string }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
      <DialogTrigger
        render={
          <Button variant="outline" disabled={pending}>
            <Ban aria-hidden="true" />
            {t("shop.cancelMine")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{t("shopui.cancelTitle")}</DialogTitle>
          <DialogDescription>{t("shop.cancelMineConfirm")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">{t("shopui.keepOrder")}</Button>} />
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await cancelMyOrder(locale, id);
                if (r.ok) {
                  toast.success(t("shop.cancelledToast"));
                  setOpen(false);
                  router.refresh();
                } else toast.error(t(r.error));
              })
            }
          >
            {pending ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Ban aria-hidden="true" />}
            {t("shop.cancelMine")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
