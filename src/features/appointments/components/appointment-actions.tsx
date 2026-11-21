"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/i18n/client";
import { cancelMyAppointment, setAppointmentStatus, type BookingResult } from "../server/actions";

function useRun() {
  const t = useT();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<BookingResult>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) toast.success(t("common.saved"));
      else toast.error(t(r.error));
    });
  return { t, pending, run };
}

/** Vet: done / no-show / cancel for a confirmed visit. */
export function VetAppointmentActions({ id, past }: { id: string; past: boolean }) {
  const locale = useLocale();
  const { t, pending, run } = useRun();
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() => run(() => setAppointmentStatus(locale, id, "completed"))}
      >
        {t("appt.markDone")}
      </Button>
      {past ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => setAppointmentStatus(locale, id, "no_show"))}
        >
          {t("appt.noShow")}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            if (window.confirm(t("appt.vetCancelConfirm")))
              run(() => setAppointmentStatus(locale, id, "cancelled"));
          }}
        >
          {t("common.cancel")}
        </Button>
      )}
    </div>
  );
}

/** Owner: cancel a confirmed visit. */
export function CancelAppointmentButton({ id }: { id: string }) {
  const { t, pending, run } = useRun();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => {
        if (window.confirm(t("appt.ownerCancelConfirm"))) run(() => cancelMyAppointment(id));
      }}
    >
      {t("common.cancel")}
    </Button>
  );
}
