"use client";

import { Trash2 } from "lucide-react";
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
import { deleteHealthRecord, deletePet } from "../server/actions";

function DangerIcon() {
  return (
    <span className="grid size-11 place-items-center rounded-full bg-destructive/10 text-destructive">
      <Trash2 aria-hidden="true" className="size-5" />
    </span>
  );
}

export function DeletePetButton({ petId, name }: { petId: string; name: string }) {
  const t = useT();
  const locale = useLocale();
  const [pending, start] = useTransition();
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" className="text-destructive hover:text-destructive">
            <Trash2 aria-hidden="true" />
            {t("common.delete")}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DangerIcon />
          <DialogTitle>{t("pets.deleteTitle", { name })}</DialogTitle>
          <DialogDescription>{t("pets.deleteBody")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">{t("common.cancel")}</Button>} />
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                // Success redirects to the pets list on the server.
                const r = await deletePet(locale, petId);
                if (r && !r.ok) toast.error(t(r.error));
              })
            }
          >
            <Trash2 aria-hidden="true" />
            {pending ? t("common.saving") : t("common.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Deletes one health record after a confirmation (it used to delete on the first tap). */
export function DeleteRecordButton({
  petId,
  recordId,
  title,
}: {
  petId: string;
  recordId: string;
  title?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={title ? `${t("common.delete")}: ${title}` : t("common.delete")}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 aria-hidden="true" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DangerIcon />
          <DialogTitle>{t("ownerui.health.deleteTitle")}</DialogTitle>
          {title ? <DialogDescription>{t("ownerui.health.deleteBody", { title })}</DialogDescription> : null}
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">{t("common.cancel")}</Button>} />
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await deleteHealthRecord(locale, petId, recordId);
                if (!r.ok) toast.error(t(r.error));
                else setOpen(false);
              })
            }
          >
            <Trash2 aria-hidden="true" />
            {t("common.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
