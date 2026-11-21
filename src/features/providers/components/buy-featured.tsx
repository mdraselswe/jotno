"use client";

import { Sparkles } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/i18n/client";
import { buyFeatured } from "../server/featured";

/** Vet: one featured pack (days + price) with a pay button. */
export function BuyFeaturedButton({
  index,
  label,
  disabled,
}: {
  index: number;
  label: string;
  disabled?: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const [pending, start] = useTransition();
  return (
    <Button
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          const res = await buyFeatured(locale, index);
          if (!res.ok) toast.error(t(res.error));
        })
      }
    >
      <Sparkles aria-hidden="true" />
      {pending ? t("pay.redirecting") : label}
    </Button>
  );
}
