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
export function ReportConsultButton({ consultId }: { consultId: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Flag aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">{t("monitor.report")}</span>
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("monitor.reportTitle")}</DialogTitle>
          <DialogDescription>{t("monitor.reportSub")}</DialogDescription>
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
            disabled={pending || reason.trim().length < 10}
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
