"use client";

import { Flag } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/i18n/client";
import { reportConsult } from "../server/actions";

/** Owner or vet: tell the team something went wrong in this consult. */
export function ReportConsultButton({
  consultId,
  open: openProp,
  onOpenChange,
}: {
  consultId: string;
  /** Controlled from outside (the chat menu): no trigger button is drawn then. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useT();
  const [ownOpen, setOwnOpen] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : ownOpen;
  const setOpen = (next: boolean) => {
    if (!controlled) setOwnOpen(next);
    onOpenChange?.(next);
  };
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const short = reason.trim().length < 10;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlled ? null : (
        <DialogTrigger
          render={
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Flag aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">{t("monitor.report")}</span>
            </Button>
          }
        />
      )}
      <DialogContent className="gap-5 rounded-(--radius-2xl) p-5 sm:max-w-md">
        <DialogHeader className="flex-row items-start gap-3 pe-8">
          <span className="grid size-10 shrink-0 place-items-center rounded-(--radius-lg) bg-destructive/10 text-destructive">
            <Flag aria-hidden="true" className="size-5" />
          </span>
          <div className="grid gap-1">
            <DialogTitle className="font-heading text-lg font-bold tracking-tight">
              {t("monitor.reportTitle")}
            </DialogTitle>
            <DialogDescription>{t("monitor.reportSub")}</DialogDescription>
          </div>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="consult-report">{t("monitor.reportReason")}</Label>
          <Textarea
            id="consult-report"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            maxLength={1000}
          />
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={pending || short}
            aria-busy={pending}
            onClick={() =>
              start(async () => {
                const r = await reportConsult(consultId, reason);
                if (r.ok) {
                  toast.success(t("monitor.reported"));
                  setOpen(false);
                  setReason("");
                } else toast.error(t(r.error));
              })
            }
          >
            {t("monitor.reportSend")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
