"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { useT } from "@/i18n/client";

/** Shows the result of a payment once (from ?payment=…) and cleans the URL. */
export function PaymentNotice() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  const status = params.get("payment");

  useEffect(() => {
    if (!status) return;
    if (status === "paid") toast.success(t("pay.paid"));
    else if (status === "cancelled") toast(t("pay.cancelled"));
    else toast.error(t("pay.failed"));
    router.replace(pathname as never, { scroll: false });
  }, [status, t, router, pathname]);

  return null;
}
