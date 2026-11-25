"use client";

import { CalendarX, Check, UserX } from "lucide-react";
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
import { cancelMyAppointment, setAppointmentStatus, type BookingResult } from "../server/actions";

function useRun() {
  const t = useT();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<BookingResult>, done?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(t("common.saved"));
        done?.();
      } else toast.error(t(r.error));
    });
  return { t, pending, run };
}

/** "Cancel" with a proper confirmation dialog (it used window.confirm, which some in-app browsers block). */
function CancelDialog({
  body,
  pending,
  onConfirm,
}: {
  body: string;
  pending: boolean;
  onConfirm: (close: () => void) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" disabled={pending}>
            <CalendarX aria-hidden="true" />
            {t("common.cancel")}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <span className="grid size-11 place-items-center rounded-full bg-destructive/10 text-destructive">
            <CalendarX aria-hidden="true" className="size-5" />
          </span>
          <DialogTitle>{t("ownerui.appt.cancelTitle")}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">{t("ownerui.appt.keep")}</Button>} />
          <Button variant="destructive" disabled={pending} onClick={() => onConfirm(() => setOpen(false))}>
            {pending ? t("common.saving") : t("ownerui.appt.confirmCancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Vet: done / no-show / cancel for a confirmed visit. */
export function VetAppointmentActions({ id, past }: { id: string; past: boolean }) {
  const locale = useLocale();
  const { t, pending, run } = useRun();
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="brand"
        disabled={pending}
        onClick={() => run(() => setAppointmentStatus(locale, id, "completed"))}
      >
        <Check aria-hidden="true" />
        {t("appt.markDone")}
      </Button>
      {past ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => setAppointmentStatus(locale, id, "no_show"))}
        >
          <UserX aria-hidden="true" />
          {t("appt.noShow")}
        </Button>
      ) : (
        <CancelDialog
          body={t("appt.vetCancelConfirm")}
          pending={pending}
          onConfirm={(close) => run(() => setAppointmentStatus(locale, id, "cancelled"), close)}
        />
      )}
    </div>
  );
}

/** Owner: cancel a confirmed visit. */
export function CancelAppointmentButton({ id }: { id: string }) {
  const { t, pending, run } = useRun();
  return (
    <CancelDialog
      body={t("ownerui.appt.cancelBody")}
      pending={pending}
      onConfirm={(close) => run(() => cancelMyAppointment(id), close)}
    />
  );
}
