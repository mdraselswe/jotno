"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLocale, useT } from "@/i18n/client";
import { deleteHealthRecord, deletePet } from "../server/actions";

export function DeletePetButton({ petId, name }: { petId: string; name: string }) {
  const t = useT();
  const locale = useLocale();
  const [pending, start] = useTransition();
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="destructive" size="sm">
            <Trash2 aria-hidden="true" />
            {t("common.delete")}
          </Button>
        }
      />
      <DialogContent>
        <DialogTitle>{t("pets.deleteTitle", { name })}</DialogTitle>
        <DialogDescription>{t("pets.deleteBody")}</DialogDescription>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">{t("common.cancel")}</Button>} />
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await deletePet(locale, petId);
                if (r && !r.ok) toast.error(t(r.error));
              })
            }
          >
            {t("common.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteRecordButton({ petId, recordId }: { petId: string; recordId: string }) {
  const t = useT();
  const locale = useLocale();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={t("common.delete")}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await deleteHealthRecord(locale, petId, recordId);
          if (!r.ok) toast.error(t(r.error));
        })
      }
    >
      <Trash2 aria-hidden="true" />
    </Button>
  );
}
