import { ArrowLeft, Stethoscope } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Private } from "@/components/layout/private-page";
import { Badge } from "@/components/ui/badge";
import { breedName, speciesName } from "@/content/places";
import { business } from "@/config";
import { adminConsultPath, chatPath, ROUTES, vetPath } from "@/config/routes";
import { requireViewer } from "@/features/auth/server";
import {
  canWriteRx,
  ChatRoom,
  CloseConsultButton,
  ReplyCountdown,
  ReportConsultButton,
  ReviewForm,
  RxEditor,
} from "@/features/consults";
import { adminCanRead, getConsult, rxForVet } from "@/features/consults/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("nav.chat"), robots: { index: false } };
}

async function Chat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const viewer = await requireViewer(locale, localeHref(locale, chatPath(id)));
  const c = await getConsult(id, viewer);
  if (!c) notFound();
  // The team reads a conversation only after giving a reason (logged).
  if (c.role === "admin" && !(await adminCanRead(viewer.id, c.id)))
    redirect(localeHref(locale, adminConsultPath(c.id)) as never);

  const isVet = c.role === "vet";
  // The vet writes the prescription from here while they still may.
  const rx = isVet && canWriteRx(c, new Date()) ? { current: await rxForVet(c.id, viewer.id) } : null;
  const otherName = isVet ? (c.ownerName ?? "—") : c.vet.displayName;
  const back = localeHref(
    locale,
    c.role === "vet" ? ROUTES.vetConsults : c.role === "admin" ? adminConsultPath(c.id) : ROUTES.consults,
  );
  const deadline =
    c.status === "active" && !c.firstReplyAt && c.openedAt
      ? new Date(c.openedAt.getTime() + business.consult.replyWindowMinutes * 60_000).toISOString()
      : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header className="flex items-center gap-3 border-b pb-3">
        <Link
          href={back}
          aria-label={t("common.back")}
          className="grid size-9 place-items-center rounded-full hover:bg-muted"
        >
          <ArrowLeft aria-hidden="true" className="size-5 rtl:rotate-180" />
        </Link>
        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-primary">
          {!isVet && c.vet.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- storage URL at a small fixed size
            <img src={c.vet.photoUrl} alt="" className="size-full object-cover" />
          ) : (
            <Stethoscope aria-hidden="true" className="size-5" />
          )}
        </span>
        <div className="grid min-w-0 flex-1">
          {isVet ? (
            <span className="truncate font-medium">{otherName}</span>
          ) : (
            <Link
              href={localeHref(locale, vetPath(c.vet.slug))}
              className="truncate font-medium hover:underline"
            >
              {otherName}
            </Link>
          )}
          <span className="text-xs text-muted-foreground">
            {c.status === "active" && c.closesAt
              ? t("consult.closesAt", { time: fmt.dateTime(c.closesAt) })
              : t(`consult.status.${c.status}`)}
          </span>
        </div>
        <Badge variant={c.status === "active" ? "default" : "secondary"}>
          {t(`consult.status.${c.status}`)}
        </Badge>
        {isVet && c.status === "active" && c.firstReplyAt ? <CloseConsultButton consultId={c.id} /> : null}
        {c.role !== "admin" ? <ReportConsultButton consultId={c.id} /> : null}
      </header>

      {c.role === "admin" ? <p className="text-sm text-muted-foreground">{t("consult.adminView")}</p> : null}

      <section
        className="grid gap-1 rounded-(--radius-xl) bg-muted/60 p-4 text-sm"
        aria-label={t("consult.petInfo")}
      >
        {c.pet ? (
          <p className="font-medium">
            {c.pet.name} ·{" "}
            {[
              speciesName(c.pet.speciesId, locale),
              breedName(c.pet.breedId, locale),
              c.pet.weightGrams ? `${fmt.number(c.pet.weightGrams / 1000)} kg` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
        <p className="whitespace-pre-wrap text-muted-foreground">{c.summary}</p>
        {isVet && c.pet?.notes ? <p className="text-muted-foreground">{c.pet.notes}</p> : null}
      </section>

      {!isVet && deadline ? <ReplyCountdown deadline={deadline} /> : null}

      <ChatRoom
        consultId={c.id}
        viewerId={viewer.id}
        canWrite={c.status === "active" && c.role !== "admin"}
        live={c.role !== "admin"}
        callable={c.status === "active" && c.role !== "admin"}
        initial={c.messages}
        otherName={otherName}
      >
        {rx ? (
          <div className="flex justify-end">
            <RxEditor
              consultId={c.id}
              initial={
                rx.current
                  ? {
                      diagnosis: rx.current.diagnosis,
                      items: rx.current.items.map((i) => ({ ...i, note: i.note ?? "" })),
                      advice: rx.current.advice ?? "",
                      followUpDays: rx.current.followUpDays,
                    }
                  : null
              }
              linkedNames={Object.fromEntries(
                (rx.current?.items ?? []).flatMap((i) => (i.productId ? [[i.productId, i.name]] : [])),
              )}
            />
          </div>
        ) : null}
      </ChatRoom>

      {c.role === "owner" && c.firstReplyAt && c.status !== "refunded" && !c.reviewed ? (
        <ReviewForm consultId={c.id} />
      ) : null}
      {c.status !== "active" ? (
        <p className="text-center text-sm text-muted-foreground">{t("consult.closedNote")}</p>
      ) : null}
    </div>
  );
}

export default function ChatPage({ params }: PageProps<"/[locale]/chat/[id]">) {
  return (
    <div className="container-page py-4 md:py-8">
      <Private rows={4}>
        <Chat params={params} />
      </Private>
    </div>
  );
}
