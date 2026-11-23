"use client";

import { FilePenLine, Link2, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useFormatter, useLocale, useT } from "@/i18n/client";
import { taka } from "@/lib/money";
import { emptyRxItem, RX_MAX_ITEMS, type RxInput, type RxItemInput } from "../../prescription";
import { savePrescription, searchRxProducts } from "../../server/rx-actions";

type Suggestion = Awaited<ReturnType<typeof searchRxProducts>>[number];

/** Shop products matching what the vet types, to link a medicine line to the shop. */
function ProductSuggestions({ query, onPick }: { query: string; onPick: (s: Suggestion) => void }) {
  const t = useT();
  const fmt = useFormatter();
  const locale = useLocale();
  const [list, setList] = useState<Suggestion[]>([]);
  useEffect(() => {
    let alive = true;
    const term = query.trim();
    const id = window.setTimeout(
      () => {
        if (term.length < 2) {
          setList([]);
          return;
        }
        void searchRxProducts(term).then((r) => {
          if (alive) setList(r);
        });
      },
      term.length < 2 ? 0 : 300,
    );
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, [query]);
  if (list.length === 0) return null;
  return (
    <div className="grid gap-1">
      <span className="text-xs text-muted-foreground">{t("rx.suggestions")}</span>
      <ul className="flex flex-wrap gap-1.5">
        {list.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onPick(s)}
              className="rounded-full bg-muted px-2.5 py-1 text-xs hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {locale === "bn" ? s.nameBn : s.nameEn}
              {s.unit ? ` · ${s.unit}` : ""} · {taka(fmt, s.price)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Vet: write or change the consult's prescription (a side sheet next to the chat). */
export function RxEditor({
  consultId,
  initial,
  linkedNames,
}: {
  consultId: string;
  initial: RxInput | null;
  /** Shop product names for lines already linked (id → name). */
  linkedNames: Record<string, string>;
}) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [diagnosis, setDiagnosis] = useState(initial?.diagnosis ?? "");
  const [items, setItems] = useState<RxItemInput[]>(initial?.items.length ? initial.items : [emptyRxItem()]);
  const [advice, setAdvice] = useState(initial?.advice ?? "");
  const [followUp, setFollowUp] = useState(initial?.followUpDays ? String(initial.followUpDays) : "");
  const [names, setNames] = useState(linkedNames);
  const [pending, start] = useTransition();

  const update = (i: number, patch: Partial<RxItemInput>) =>
    setItems((list) => list.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  function submit(e: FormEvent) {
    e.preventDefault();
    start(async () => {
      const days = Number.parseInt(followUp, 10);
      const r = await savePrescription(locale, consultId, {
        diagnosis,
        items: items.map((it) => ({ ...it, note: it.note ?? "" })),
        advice,
        followUpDays: Number.isFinite(days) && days > 0 ? days : null,
      });
      if (!r.ok) {
        toast.error(t(r.error));
        return;
      }
      toast.success(t("rx.saved"));
      setOpen(false);
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button size="sm" variant="outline">
            <FilePenLine aria-hidden="true" />
            {t(initial ? "rx.edit" : "rx.write")}
          </Button>
        }
      />
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t("rx.title")}</SheetTitle>
          <SheetDescription>{t("rx.formSub")}</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="grid gap-5 px-4 pb-6" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="rx-diagnosis">{t("rx.diagnosis")}</Label>
            <Textarea
              id="rx-diagnosis"
              rows={3}
              maxLength={1000}
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              required
            />
          </div>

          <fieldset className="grid gap-3">
            <legend className="mb-2 font-medium">{t("rx.medicines")}</legend>
            {items.map((it, i) => {
              const n = i + 1;
              const id = `rx-${i}`;
              return (
                <div key={i} className="grid gap-2 rounded-(--control-radius) bg-muted/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{t("rx.medicine", { n })}</span>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={t("rx.removeMedicine", { n })}
                      onClick={() =>
                        setItems((list) =>
                          list.length > 1 ? list.filter((_, j) => j !== i) : [emptyRxItem()],
                        )
                      }
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                  <Label htmlFor={`${id}-name`} className="sr-only">
                    {t("rx.name")}
                  </Label>
                  <Input
                    id={`${id}-name`}
                    placeholder={t("rx.name")}
                    maxLength={120}
                    value={it.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                  />
                  {it.productId ? (
                    <span className="flex items-center gap-1.5 text-xs text-primary">
                      <Link2 aria-hidden="true" className="size-3.5" />
                      {t("rx.linked", { name: names[it.productId] ?? it.name })}
                      <button
                        type="button"
                        className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                        aria-label={t("rx.unlink")}
                        onClick={() => update(i, { productId: null })}
                      >
                        <X aria-hidden="true" className="size-3.5" />
                      </button>
                    </span>
                  ) : (
                    <ProductSuggestions
                      query={it.name}
                      onPick={(s) => {
                        const name = locale === "bn" ? s.nameBn : s.nameEn;
                        setNames((m) => ({ ...m, [s.id]: name }));
                        update(i, { productId: s.id, name: s.unit ? `${name} (${s.unit})` : name });
                      }}
                    />
                  )}
                  <div className="grid grid-cols-[1fr_1fr_5rem] gap-2">
                    <div className="grid gap-1">
                      <Label htmlFor={`${id}-dose`} className="text-xs">
                        {t("rx.dose")}
                      </Label>
                      <Input
                        id={`${id}-dose`}
                        placeholder={t("rx.dosePh")}
                        maxLength={80}
                        value={it.dose}
                        onChange={(e) => update(i, { dose: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor={`${id}-freq`} className="text-xs">
                        {t("rx.frequency")}
                      </Label>
                      <Input
                        id={`${id}-freq`}
                        placeholder={t("rx.frequencyPh")}
                        maxLength={120}
                        value={it.frequency}
                        onChange={(e) => update(i, { frequency: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor={`${id}-days`} className="text-xs">
                        {t("rx.days")}
                      </Label>
                      <Input
                        id={`${id}-days`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={365}
                        value={it.days ?? ""}
                        onChange={(e) => {
                          const v = Number.parseInt(e.target.value, 10);
                          update(i, { days: Number.isFinite(v) && v > 0 ? v : null });
                        }}
                      />
                    </div>
                  </div>
                  <Label htmlFor={`${id}-note`} className="sr-only">
                    {t("rx.note")}
                  </Label>
                  <Input
                    id={`${id}-note`}
                    placeholder={t("rx.note")}
                    maxLength={200}
                    value={it.note ?? ""}
                    onChange={(e) => update(i, { note: e.target.value })}
                  />
                </div>
              );
            })}
            {items.length < RX_MAX_ITEMS ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="justify-self-start"
                onClick={() => setItems((list) => [...list, emptyRxItem()])}
              >
                <Plus aria-hidden="true" />
                {t("rx.addMedicine")}
              </Button>
            ) : null}
          </fieldset>

          <div className="grid gap-2">
            <Label htmlFor="rx-advice">{t("rx.advice")}</Label>
            <Textarea
              id="rx-advice"
              rows={3}
              maxLength={2000}
              value={advice}
              onChange={(e) => setAdvice(e.target.value)}
            />
          </div>
          <div className="grid max-w-48 gap-2">
            <Label htmlFor="rx-follow">{t("rx.followUp")}</Label>
            <Input
              id="rx-follow"
              type="number"
              inputMode="numeric"
              min={1}
              max={180}
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
            />
          </div>
          <Button type="submit" variant="brand" disabled={pending || diagnosis.trim().length < 3}>
            {t("rx.save")}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
