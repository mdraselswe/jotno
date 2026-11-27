"use client";

import {
  Ban,
  BadgeCheck,
  CalendarX,
  Eye,
  EyeOff,
  FileText,
  Flag,
  MessageSquareWarning,
  Pause,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  Trash2,
  TriangleAlert,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { DISTRICTS } from "@/content/geo";
import { useFormatter, useLocale, useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n";
import { hasBangla } from "@/lib/bangla-name";
import { taka, toPoisha } from "@/lib/money";
import {
  addFeatured,
  adminCancelAppointment,
  adminDeleteArticle,
  adminDocumentUrl,
  adminRefund,
  changeUserRole,
  endFeatured,
  recordPayout,
  rejectProvider,
  resolveReport,
  restoreHidden,
  setArticlePublished,
  setUserBlocked,
  suspendProvider,
  verifyProvider,
  type AdminResult,
} from "../server/actions";
import { BVC_DIVISIONS } from "../bvc-match";
import type { HiddenContent } from "../restore";
import { removeBvcEntry, saveBvcEntry } from "../server/bvc-actions";
import { VERIFY_CHECKS, verifyBlock, verifyOverrides, type VerifyCheck } from "../status";

type Variant = "default" | "brand" | "outline" | "secondary" | "ghost" | "destructive";
type Size = "default" | "sm" | "lg";

function useAction() {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<AdminResult>, done?: () => void, success: MessageKey = "common.saved") =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(t(success));
        done?.();
        router.refresh();
      } else toast.error(t(r.error));
    });
  return { pending, run, t };
}

/**
 * A button that asks first: a dialog says what will happen (and, when
 * `reason` is set, asks why: the reason goes to the person and the audit
 * log), then runs the action. Used for everything that is hard to undo.
 */
function ConfirmAction({
  label,
  icon: Icon,
  variant = "outline",
  size = "sm",
  title,
  body,
  confirm,
  confirmVariant = "destructive",
  reason,
  onConfirm,
  success,
  className,
  children,
}: {
  label: string;
  icon?: LucideIcon;
  variant?: Variant;
  size?: Size;
  title: string;
  body: ReactNode;
  confirm: string;
  confirmVariant?: Variant;
  reason?: { label: string; hint?: string; min: number; max: number };
  onConfirm: (reason: string) => Promise<AdminResult>;
  success?: MessageKey;
  className?: string;
  children?: ReactNode;
}) {
  const { pending, run, t } = useAction();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const id = useId();
  const short = reason ? text.trim().length < reason.min : false;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={variant} size={size} disabled={pending} className={className}>
            {Icon ? <Icon aria-hidden="true" /> : null}
            {label}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        {children}
        {reason ? (
          <div className="grid gap-2">
            <Label htmlFor={`${id}-reason`}>{reason.label}</Label>
            <Textarea
              id={`${id}-reason`}
              rows={3}
              maxLength={reason.max}
              value={text}
              placeholder={reason.hint}
              aria-describedby={reason.min > 0 ? `${id}-min` : undefined}
              onChange={(e) => setText(e.target.value)}
            />
            {reason.min > 0 ? (
              <p id={`${id}-min`} className="text-xs text-muted-foreground">
                {t("adminui.reasonMin", { n: reason.min })}
              </p>
            ) : null}
          </div>
        ) : null}
        <DialogFooter>
          <DialogClose render={<Button variant="outline">{t("common.cancel")}</Button>} />
          <Button
            variant={confirmVariant}
            disabled={pending || short}
            onClick={() =>
              run(
                () => onConfirm(text.trim()),
                () => {
                  setOpen(false);
                  setText("");
                },
                success,
              )
            }
          >
            {pending ? t("common.saving") : confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Vets ────────────────────────────────────────────────────────────────────

/** The actions panel on a vet's review page: verify, ask for changes, suspend. */
export function ReviewActions({
  providerId,
  status,
  name,
  missingDocs,
}: {
  providerId: string;
  status: string;
  name: string;
  /** Required documents (`bvc_certificate`, `nid`) the vet hasn't uploaded. */
  missingDocs: readonly string[];
}) {
  const t = useT();
  const id = useId();
  const fmt = useFormatter();
  const reason = { label: t("admin.reason"), hint: t("admin.reasonHint"), min: 3, max: 300 };
  // Any vet not verified yet can be verified; the server checks too. Outside the
  // normal review (not sent, sent back, documents missing) the panel says so.
  const block = status === "verified" ? null : verifyBlock(status);
  const canVerify = !block && status !== "verified";
  const overrides = canVerify ? verifyOverrides(status, missingDocs) : [];
  const docNames = missingDocs.map((k) => t(k === "nid" ? "vet.docNid" : "vet.docBvc")).join(", ");
  const [checks, setChecks] = useState<VerifyCheck[]>([]);
  const toggle = (c: VerifyCheck, on: boolean) =>
    setChecks((now) => (on ? [...now.filter((x) => x !== c), c] : now.filter((x) => x !== c)));
  return (
    <div className="grid gap-3">
      {canVerify ? (
        <fieldset className="grid gap-2.5 rounded-(--radius-lg) bg-muted/60 p-3">
          <legend className="sr-only">{t("adminui.vet.checksTitle")}</legend>
          <p aria-hidden="true" className="text-xs font-semibold text-muted-foreground uppercase">
            {t("adminui.vet.checksTitle")}
          </p>
          {VERIFY_CHECKS.map((c) => {
            const box = `${id}-check-${c}`;
            return (
              <div key={c} className="flex items-start gap-2.5">
                <Checkbox
                  id={box}
                  className="mt-0.5"
                  checked={checks.includes(c)}
                  onCheckedChange={(on) => toggle(c, on)}
                />
                <Label htmlFor={box} className="text-sm leading-snug font-normal text-pretty">
                  {t(`adminui.vet.check.${c}`)}
                </Label>
              </div>
            );
          })}
        </fieldset>
      ) : null}
      {overrides.length ? (
        <div
          id={`${id}-override`}
          className="grid gap-1.5 rounded-(--radius-lg) bg-warning/15 px-3 py-2.5 text-sm ring-1 ring-warning/40"
        >
          <p className="flex items-center gap-2 font-semibold">
            <TriangleAlert
              aria-hidden="true"
              className="size-4 shrink-0 text-warning-foreground dark:text-warning"
            />
            {t("adminui.vet.override.title")}
          </p>
          <ul className="grid list-disc gap-0.5 ps-5 text-pretty">
            {overrides.map((o) => (
              <li key={o}>{t(`adminui.vet.override.${o}`, { list: docNames })}</li>
            ))}
          </ul>
          <p className="text-pretty text-muted-foreground">{t("adminui.vet.override.note")}</p>
        </div>
      ) : null}
      {block ? (
        <>
          <p id={`${id}-why`} className="rounded-(--radius-lg) bg-warning/15 px-3 py-2 text-sm text-pretty">
            {t(block)}
          </p>
          <Button variant="brand" className="w-full" disabled aria-describedby={`${id}-why`}>
            <BadgeCheck aria-hidden="true" />
            {t("admin.verify")}
          </Button>
        </>
      ) : status !== "verified" ? (
        <ConfirmAction
          label={t("admin.verify")}
          icon={BadgeCheck}
          variant="brand"
          size="default"
          className="w-full"
          title={t("adminui.vet.verifyTitle", { name })}
          body={[
            t("adminui.vet.verifyBody"),
            t("adminui.vet.checksTicked", {
              n: fmt.number(checks.length),
              total: fmt.number(VERIFY_CHECKS.length),
            }),
            overrides.length ? t("adminui.vet.override.confirm") : "",
          ]
            .filter(Boolean)
            .join(" ")}
          confirm={t("adminui.vet.verifyConfirm")}
          confirmVariant="brand"
          onConfirm={() => verifyProvider(providerId, checks)}
        />
      ) : null}
      {status !== "rejected" ? (
        <ConfirmAction
          label={t("admin.reject")}
          icon={MessageSquareWarning}
          variant="outline"
          size="default"
          className="w-full"
          title={t("adminui.vet.rejectTitle")}
          body={t("adminui.vet.rejectBody")}
          confirm={t("adminui.vet.rejectConfirm")}
          confirmVariant="default"
          reason={reason}
          onConfirm={(r) => rejectProvider(providerId, r)}
        />
      ) : null}
      {status === "verified" ? (
        <ConfirmAction
          label={t("admin.suspend")}
          icon={Pause}
          variant="ghost"
          size="default"
          className="w-full text-destructive hover:text-destructive"
          title={t("adminui.vet.suspendTitle", { name })}
          body={t("adminui.vet.suspendBody")}
          confirm={t("admin.suspend")}
          reason={reason}
          onConfirm={(r) => suspendProvider(providerId, r)}
        />
      ) : null}
    </div>
  );
}

/** Opens a verification document in a new tab (a two-minute signed link; the view is logged). */
export function DocumentButton({ documentId, label }: { documentId: string; label: string }) {
  const t = useT();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      className="h-auto min-h-(--control-h) justify-start py-2 text-start whitespace-normal"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const url = await adminDocumentUrl(documentId);
          if (url) window.open(url, "_blank", "noopener");
          else toast.error(t("common.genericError"));
        })
      }
    >
      <FileText aria-hidden="true" className="text-primary" />
      <span className="min-w-0 flex-1">{label}</span>
      <Eye aria-hidden="true" className="text-muted-foreground" />
      <span className="sr-only">{t("adminui.vet.openDoc")}</span>
    </Button>
  );
}

// ── Featured ────────────────────────────────────────────────────────────────

export function FeaturedForm({ vets }: { vets: { id: string; name: string; districtId: number | null }[] }) {
  const { pending, run, t } = useAction();
  const locale = useLocale();
  const id = useId();
  const [providerId, setProviderId] = useState(vets[0]?.id ?? "");
  const [districtId, setDistrictId] = useState<string>("");
  const [days, setDays] = useState("7");
  const daysN = Number(days);
  const daysOk = Number.isInteger(daysN) && daysN >= 1 && daysN <= 90;
  const districts = [...DISTRICTS].sort((a, b) =>
    (locale === "bn" ? a.bn : a.en).localeCompare(locale === "bn" ? b.bn : b.en, locale),
  );
  if (vets.length === 0)
    return <p className="text-sm text-muted-foreground">{t("adminui.featured.noVets")}</p>;
  return (
    <form
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_7rem_auto] lg:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => addFeatured({ providerId, districtId: districtId ? Number(districtId) : null, days: daysN }),
          () => setDays("7"),
        );
      }}
    >
      <div className="grid gap-2 sm:col-span-2 lg:col-span-1">
        <Label htmlFor={`${id}-vet`}>{t("admin.vet")}</Label>
        <NativeSelect id={`${id}-vet`} value={providerId} onChange={(e) => setProviderId(e.target.value)}>
          {vets.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-district`}>{t("common.district")}</Label>
        <NativeSelect
          id={`${id}-district`}
          value={districtId}
          onChange={(e) => setDistrictId(e.target.value)}
        >
          <option value="">{t("adminui.featured.everywhere")}</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {locale === "bn" ? d.bn : d.en}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-days`}>{t("admin.days")}</Label>
        <Input
          id={`${id}-days`}
          type="number"
          inputMode="numeric"
          min={1}
          max={90}
          value={days}
          aria-invalid={!daysOk || undefined}
          onChange={(e) => setDays(e.target.value)}
        />
      </div>
      <Button
        type="submit"
        variant="brand"
        disabled={pending || !providerId || !daysOk}
        className="sm:col-span-2 lg:col-span-1"
      >
        <Sparkles aria-hidden="true" />
        {t("adminui.featured.add")}
      </Button>
    </form>
  );
}

export function EndFeaturedButton({ id, name }: { id: string; name: string }) {
  const t = useT();
  return (
    <ConfirmAction
      label={t("admin.end")}
      variant="ghost"
      title={t("adminui.featured.endTitle", { name })}
      body={t("adminui.featured.endBody")}
      confirm={t("admin.end")}
      onConfirm={() => endFeatured(id)}
    />
  );
}

// ── Money ───────────────────────────────────────────────────────────────────

const PAYOUT_METHODS = ["bkash", "nagad", "bank"] as const;
type PayoutMethod = (typeof PAYOUT_METHODS)[number];
const METHOD_LABEL: Record<PayoutMethod, MessageKey> = {
  bkash: "pay.method.bkash",
  nagad: "pay.method.nagad",
  bank: "adminui.payout.bank",
};

/** Record money sent by hand: amount (taka, up to what's ready), method, transaction id; confirms first. */
export function PayoutForm({ providerId, max, name }: { providerId: string; max: number; name: string }) {
  const { pending, run, t } = useAction();
  const fmt = useFormatter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(max / 100));
  const [method, setMethod] = useState<PayoutMethod>("bkash");
  const [reference, setReference] = useState("");
  const poisha = toPoisha(amount);
  const amountOk = poisha !== null && poisha > 0 && poisha <= max;
  const refOk = reference.trim().length >= 3;
  return (
    <form
      className="grid gap-3 sm:grid-cols-[8rem_9rem_minmax(0,1fr)_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        if (amountOk && refOk) setOpen(true);
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-amount`} className="text-xs">
          {t("adminui.payout.amount")}
        </Label>
        <Input
          id={`${id}-amount`}
          inputMode="decimal"
          value={amount}
          aria-invalid={!amountOk || undefined}
          aria-describedby={`${id}-max`}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-method`} className="text-xs">
          {t("admin.method")}
        </Label>
        <NativeSelect
          id={`${id}-method`}
          value={method}
          onChange={(e) => setMethod(e.target.value as PayoutMethod)}
        >
          {PAYOUT_METHODS.map((m) => (
            <option key={m} value={m}>
              {t(METHOD_LABEL[m])}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-ref`} className="text-xs">
          {t("admin.reference")}
        </Label>
        <Input
          id={`${id}-ref`}
          value={reference}
          maxLength={80}
          autoComplete="off"
          onChange={(e) => setReference(e.target.value)}
        />
      </div>
      <Button type="submit" variant="brand" disabled={pending || !amountOk || !refOk}>
        <Send aria-hidden="true" />
        {t("admin.markPaid")}
      </Button>
      <p id={`${id}-max`} className="text-xs text-muted-foreground sm:col-span-4">
        {t("adminui.payout.max", { amount: taka(fmt, max) })}
      </p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">{t("adminui.payout.confirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("adminui.payout.confirmBody", {
                amount: amountOk ? taka(fmt, poisha) : "—",
                name,
                method: t(METHOD_LABEL[method]),
                ref: reference.trim(),
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">{t("common.cancel")}</Button>} />
            <Button
              variant="brand"
              disabled={pending || !amountOk || !refOk}
              onClick={() => {
                if (poisha === null) return;
                run(
                  () => recordPayout({ providerId, amount: poisha, method, reference }),
                  () => {
                    setOpen(false);
                    setReference("");
                  },
                );
              }}
            >
              {pending ? t("common.saving") : t("adminui.payout.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}

/** Full refund of an open chat (asks first; an optional note goes to the audit log). */
export function RefundButton({ consultId, amount }: { consultId: string; amount: string }) {
  const t = useT();
  return (
    <ConfirmAction
      label={t("admin.refund")}
      icon={Undo2}
      variant="outline"
      className="text-destructive hover:text-destructive"
      title={t("adminui.refund.title", { amount })}
      body={t("admin.refundConfirm")}
      confirm={t("adminui.refund.confirm")}
      reason={{ label: t("adminui.refund.reason"), min: 0, max: 200 }}
      onConfirm={(r) => adminRefund(consultId, r || "admin")}
    />
  );
}

// ── Reports ─────────────────────────────────────────────────────────────────

/**
 * Hide the reported content (asks first: answers and reviews are deleted, with
 * a copy kept in the audit log to restore from) or dismiss the report. Consult
 * complaints have nothing to hide: they are only marked as handled (refunds and
 * warnings happen on the consult page).
 */
export function ReportActions({ id, entity }: { id: string; entity: string }) {
  const { pending, run, t } = useAction();
  const hideable = entity === "question" || entity === "answer" || entity === "review";
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {hideable ? (
        <ConfirmAction
          label={t("admin.hide")}
          icon={EyeOff}
          variant="destructive"
          title={t("adminui.report.hideTitle")}
          body={t(
            entity === "question"
              ? "adminui.report.hideQuestion"
              : entity === "answer"
                ? "adminui.report.hideAnswer"
                : "adminui.report.hideDelete",
          )}
          confirm={t("admin.hide")}
          onConfirm={() => resolveReport(id, true)}
        />
      ) : null}
      <Button
        variant={hideable ? "ghost" : "outline"}
        size="sm"
        disabled={pending}
        onClick={() => run(() => resolveReport(id, false))}
      >
        <Flag aria-hidden="true" />
        {hideable ? t("admin.dismiss") : t("adminui.report.handled")}
      </Button>
    </div>
  );
}

/** Audit log: put back content a report hid (asks first; the server says why when it can't). */
export function RestoreButton({ auditId, entity }: { auditId: number; entity: HiddenContent["entity"] }) {
  const t = useT();
  return (
    <ConfirmAction
      label={t("adminui.restore.button")}
      icon={RotateCcw}
      title={t("adminui.restore.title")}
      body={t(`adminui.restore.${entity}`)}
      confirm={t("adminui.restore.confirm")}
      confirmVariant="brand"
      success="adminui.restore.done"
      onConfirm={() => restoreHidden(auditId)}
    />
  );
}

// ── People ──────────────────────────────────────────────────────────────────

/** Admin: someone's role and whether they can sign in. */
export function UserControls({
  userId,
  role,
  blocked,
  self,
  name,
}: {
  userId: string;
  role: "owner" | "vet" | "admin";
  blocked: boolean;
  self: boolean;
  name: string;
}) {
  const { pending, run, t } = useAction();
  const [next, setNext] = useState(role);
  const id = useId();
  if (self) return <span className="text-xs text-muted-foreground">{t("manage.you")}</span>;
  const save = () => run(() => changeUserRole(userId, next));
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Label htmlFor={`${id}-role`} className="sr-only">
        {t("adminui.users.roleFor", { name })}
      </Label>
      <div className="w-36">
        <NativeSelect
          id={`${id}-role`}
          value={next}
          onChange={(e) => setNext(e.target.value as typeof role)}
          className="h-(--control-h-sm) text-sm"
        >
          <option value="owner">{t("manage.role.owner")}</option>
          <option value="vet">{t("manage.role.vet")}</option>
          <option value="admin">{t("manage.role.admin")}</option>
        </NativeSelect>
      </div>
      {next !== role ? (
        next === "admin" ? (
          <ConfirmAction
            label={t("common.save")}
            icon={Save}
            variant="brand"
            title={t("adminui.users.adminTitle", { name })}
            body={t("manage.makeAdminConfirm")}
            confirm={t("adminui.users.adminConfirm")}
            onConfirm={() => changeUserRole(userId, next)}
          />
        ) : (
          <Button size="sm" variant="brand" disabled={pending} onClick={save}>
            <Save aria-hidden="true" />
            {t("common.save")}
          </Button>
        )
      ) : null}
      {blocked ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => setUserBlocked(userId, false))}
        >
          <RotateCcw aria-hidden="true" />
          {t("manage.unblock")}
        </Button>
      ) : (
        <ConfirmAction
          label={t("manage.block")}
          icon={Ban}
          variant="ghost"
          className="text-destructive hover:text-destructive"
          title={t("adminui.users.blockTitle", { name })}
          body={t("manage.blockConfirm")}
          confirm={t("manage.block")}
          onConfirm={() => setUserBlocked(userId, true)}
        />
      )}
    </div>
  );
}

// ── Articles ────────────────────────────────────────────────────────────────

/** Admin: take an article down (asks first, the vet is told), put it back, or delete it. */
export function ArticleControls({ id, published, title }: { id: string; published: boolean; title: string }) {
  const { pending, run, t } = useAction();
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {published ? (
        <ConfirmAction
          label={t("manage.unpublish")}
          icon={EyeOff}
          title={t("adminui.articles.takeDownTitle", { title })}
          body={t("adminui.articles.takeDownBody")}
          confirm={t("manage.unpublish")}
          confirmVariant="default"
          onConfirm={() => setArticlePublished(id, false)}
        />
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => setArticlePublished(id, true))}
        >
          <Eye aria-hidden="true" />
          {t("manage.publish")}
        </Button>
      )}
      <ConfirmAction
        label={t("common.delete")}
        icon={Trash2}
        variant="ghost"
        className="text-destructive hover:text-destructive"
        title={t("adminui.articles.deleteTitle", { title })}
        body={t("adminui.articles.deleteBody")}
        confirm={t("common.delete")}
        onConfirm={() => adminDeleteArticle(id)}
      />
    </div>
  );
}

// ── Visits ──────────────────────────────────────────────────────────────────

/** Admin: cancel a visit with a reason both sides see (a paid booking fee goes to the refund queue). */
export function CancelAppointmentButton({ id, when }: { id: string; when: string }) {
  const t = useT();
  return (
    <ConfirmAction
      label={t("manage.cancelVisit")}
      icon={CalendarX}
      variant="outline"
      className="text-destructive hover:text-destructive"
      title={t("adminui.visits.cancelTitle", { when })}
      body={t("adminui.visits.cancelBody")}
      confirm={t("manage.cancelVisit")}
      reason={{ label: t("manage.cancelReason"), min: 3, max: 200 }}
      onConfirm={(r) => adminCancelAppointment(id, r)}
    />
  );
}

// ── BVC register ────────────────────────────────────────────────────────────

/** Add a vet from a registration notice, or correct a row (same number). */
export function BvcEntryForm() {
  const { pending, run, t } = useAction();
  const id = useId();
  const [regNo, setRegNo] = useState("");
  const [nameBn, setNameBn] = useState("");
  const [division, setDivision] = useState("");
  const [url, setUrl] = useState("");
  const numberOk = /[0-9\u09E6-\u09EF]/.test(regNo);
  const nameOk = hasBangla(nameBn) && nameBn.trim().length >= 3;
  const urlOk = !url.trim() || URL.canParse(url.trim());
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () =>
            saveBvcEntry({
              regNo,
              nameBn,
              division: (BVC_DIVISIONS as readonly string[]).includes(division)
                ? (division as (typeof BVC_DIVISIONS)[number])
                : null,
              url: url.trim() || null,
            }),
          () => {
            setRegNo("");
            setNameBn("");
            setUrl("");
          },
        );
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor={`${id}-no`}>{t("adminui.bvc.regNo")}</Label>
        <Input
          id={`${id}-no`}
          inputMode="numeric"
          maxLength={12}
          required
          value={regNo}
          onChange={(e) => setRegNo(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-div`}>{t("adminui.bvc.division")}</Label>
        <NativeSelect id={`${id}-div`} value={division} onChange={(e) => setDivision(e.target.value)}>
          <option value="">{t("adminui.bvc.anyDivision")}</option>
          {BVC_DIVISIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor={`${id}-name`}>{t("adminui.bvc.nameBn")}</Label>
        <Input
          id={`${id}-name`}
          lang="bn"
          maxLength={100}
          required
          value={nameBn}
          aria-invalid={(nameBn !== "" && !nameOk) || undefined}
          onChange={(e) => setNameBn(e.target.value)}
        />
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor={`${id}-url`}>{t("adminui.bvc.url")}</Label>
        <Input
          id={`${id}-url`}
          type="url"
          inputMode="url"
          maxLength={300}
          placeholder="https://bvc.gov.bd/…"
          value={url}
          aria-invalid={!urlOk || undefined}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>
      <Button
        type="submit"
        variant="brand"
        disabled={pending || !numberOk || !nameOk || !urlOk}
        className="sm:col-span-2 sm:justify-self-start"
      >
        <Save aria-hidden="true" />
        {t("adminui.bvc.save")}
      </Button>
    </form>
  );
}

export function RemoveBvcButton({ regKey, regNo }: { regKey: string; regNo: string }) {
  const t = useT();
  return (
    <ConfirmAction
      label={t("adminui.bvc.remove")}
      icon={Trash2}
      variant="ghost"
      className="text-destructive hover:text-destructive"
      title={t("adminui.bvc.removeTitle", { no: regNo })}
      body={t("adminui.bvc.removeBody")}
      confirm={t("adminui.bvc.remove")}
      onConfirm={() => removeBvcEntry(regKey)}
    />
  );
}
