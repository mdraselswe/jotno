"use client";

import { Ban, CircleCheck, Sparkles } from "lucide-react";
import { useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/i18n/client";
import { MY_REF_COOKIE, readCookie } from "@/lib/ref";
import { claimGoldFeatured, setInviteStatus, syncMyCode } from "../server/actions";

/**
 * Makes sure the share button knows the signed-in person's invite code
 * (people who signed in before invites existed have no cookie yet).
 */
export function MyCodeSync() {
  useEffect(() => {
    if (!readCookie(document.cookie, MY_REF_COOKIE)) void syncMyCode();
  }, []);
  return null;
}

/** Gold vets: turn on the free featured week for this month. */
export function GoldFeaturedButton({ days }: { days: number }) {
  const t = useT();
  const locale = useLocale();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="brand"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await claimGoldFeatured(locale);
          if (r.ok) toast.success(t("grow.goldDone", { n: days }));
          else toast.error(t(r.error));
        })
      }
    >
      <Sparkles aria-hidden="true" />
      {t("grow.goldClaim", { n: days })}
    </Button>
  );
}

/** Admin: flag a suspicious invite (points taken back) or clear it. */
export function InviteStatusButton({ refereeId, flagged }: { refereeId: string; flagged: boolean }) {
  const t = useT();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant={flagged ? "outline" : "ghost"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await setInviteStatus(refereeId, flagged ? "ok" : "flagged");
          if (r.ok) toast.success(t(flagged ? "grow.admin.cleared" : "grow.admin.flaggedDone"));
          else toast.error(t(r.error));
        })
      }
    >
      {flagged ? <CircleCheck aria-hidden="true" /> : <Ban aria-hidden="true" />}
      {t(flagged ? "grow.admin.clear" : "grow.admin.flag")}
    </Button>
  );
}
