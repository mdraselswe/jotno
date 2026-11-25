import { Siren } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { breedName, speciesName } from "@/content/places";
import { business, site } from "@/config";
import { adminConsultPath, chatPath, ROUTES, vetPath } from "@/config/routes";
import { requireViewer } from "@/features/auth/server";
import { canWriteRx, ChatRoom, chatDayKey, ReviewForm } from "@/features/consults";
import { adminCanRead, getConsult, rxForVet } from "@/features/consults/server";
import { UpgradeQuickButton } from "@/features/quick";
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

  const now = new Date();
  const isVet = c.role === "vet";
  const participant = c.role !== "admin";
  // The vet writes the prescription from here while they still may.
  const mayRx = isVet && canWriteRx(c, now);
  const rx = mayRx ? await rxForVet(c.id, viewer.id) : null;
  const back = localeHref(
    locale,
    c.role === "vet" ? ROUTES.vetConsults : c.role === "admin" ? adminConsultPath(c.id) : ROUTES.consults,
  );
  const deadline =
    c.status === "active" && !c.firstReplyAt && c.openedAt
      ? new Date(c.openedAt.getTime() + business.consult.replyWindowMinutes * 60_000).toISOString()
      : null;

  const quick = c.kind === "quick";
  // Quick help: the owner has a few follow-ups after the vet's answer.
  const followUpsLeft =
    quick && c.openedAt
      ? Math.max(
          0,
          business.quick.ownerMessages -
            c.messages.filter(
              (m) =>
                m.senderId === c.ownerId && new Date(m.createdAt).getTime() > (c.openedAt?.getTime() ?? 0),
            ).length,
        )
      : null;

  const today = chatDayKey(now, site.i18n.timeZone);
  const stateLine =
    c.status === "active" && c.closesAt
      ? t("consult.closesAt", {
          time:
            chatDayKey(c.closesAt, site.i18n.timeZone) === today
              ? fmt.date(c.closesAt, { timeStyle: "short" })
              : fmt.date(c.closesAt, { weekday: "short", hour: "numeric", minute: "2-digit" }),
        })
      : t(`consult.status.${c.status}`);
  const readOnlyReason = !participant
    ? t("chatui.adminBar")
    : c.status === "active"
      ? null
      : c.status === "refunded"
        ? t("chatui.refundedBar")
        : c.status === "pending_payment"
          ? t("chatui.unpaidBar")
          : t("chatui.closedBar");
  const pet = c.pet
    ? [
        c.pet.name,
        speciesName(c.pet.speciesId, locale),
        breedName(c.pet.breedId, locale),
        c.pet.weightGrams ? `${fmt.number(c.pet.weightGrams / 1000)} kg` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <ChatRoom
      consultId={c.id}
      // The admin reads it from the owner's side: owner on the right, vet on the left.
      viewerId={participant ? viewer.id : c.ownerId}
      selfLabel={participant ? undefined : (c.ownerName ?? undefined)}
      role={c.role}
      status={c.status}
      canWrite={c.status === "active" && participant}
      live={participant}
      callable={c.status === "active" && participant && !quick}
      initial={c.messages}
      today={today}
      other={
        isVet
          ? { name: c.ownerName ?? "—", photoUrl: c.ownerPhotoUrl, href: null }
          : {
              name: c.vet.displayName,
              photoUrl: c.vet.photoUrl,
              href: localeHref(locale, vetPath(c.vet.slug)),
            }
      }
      backHref={back}
      stateLine={stateLine}
      details={{ pet, summary: c.summary, notes: isVet ? (c.pet?.notes ?? null) : null }}
      replyDeadline={isVet ? null : deadline}
      canClose={isVet && c.status === "active" && Boolean(c.firstReplyAt)}
      rx={
        mayRx
          ? {
              initial: rx
                ? {
                    diagnosis: rx.diagnosis,
                    items: rx.items.map((i) => ({ ...i, note: i.note ?? "" })),
                    advice: rx.advice ?? "",
                    followUpDays: rx.followUpDays,
                  }
                : null,
              linkedNames: Object.fromEntries(
                (rx?.items ?? []).flatMap((i) => (i.productId ? [[i.productId, i.name]] : [])),
              ),
            }
          : null
      }
      readOnlyReason={readOnlyReason}
    >
      {quick ? (
        <div className="mb-4 grid gap-3 rounded-(--radius-2xl) bg-destructive/6 p-4 ring-1 ring-destructive/15">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Siren aria-hidden="true" className="size-4 text-destructive" />
            {t("quick.chatBadge")}
          </p>
          <p className="text-sm text-pretty text-muted-foreground">
            {c.role === "owner" && followUpsLeft !== null
              ? t("quick.chatOwnerNote", { n: fmt.number(followUpsLeft) })
              : t("quick.chatVetNote", { n: business.quick.ownerMessages })}
          </p>
          {c.role === "owner" && c.status === "active" ? (
            <div>
              <UpgradeQuickButton consultId={c.id} label={t("quick.upgrade")} />
            </div>
          ) : null}
        </div>
      ) : null}
      {c.role === "owner" && c.firstReplyAt && c.status !== "refunded" && !c.reviewed ? (
        <ReviewForm consultId={c.id} />
      ) : null}
    </ChatRoom>
  );
}

/** Shaped like the chat: top bar, pinned case, a few bubbles, the message box. */
function ChatSkeleton() {
  return (
    <div
      role="status"
      className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background sm:rounded-(--radius-2xl) sm:bg-card sm:ring-1 sm:ring-foreground/6"
    >
      <div className="flex items-center gap-2 border-b px-2 py-2">
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="size-10 rounded-full" />
        <div className="grid flex-1 gap-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="size-10 rounded-full" />
      </div>
      <Skeleton className="m-3 h-7 w-2/3 rounded-full" />
      <div className="grid flex-1 content-end gap-2 bg-muted/35 p-3">
        <Skeleton className="h-10 w-3/5 rounded-(--radius-2xl)" />
        <Skeleton className="h-14 w-2/3 justify-self-end rounded-(--radius-2xl)" />
        <Skeleton className="h-10 w-1/2 rounded-(--radius-2xl)" />
        <Skeleton className="h-10 w-2/5 justify-self-end rounded-(--radius-2xl)" />
      </div>
      <div className="flex items-center gap-2 border-t p-2">
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="h-10 flex-1 rounded-full" />
        <Skeleton className="size-10 rounded-full" />
      </div>
    </div>
  );
}

export default function ChatPage({ params }: PageProps<"/[locale]/chat/[id]">) {
  // Fills the screen under the site header like a messaging app; data-app-fullscreen
  // hides the bottom tab bar and the footer (globals.css).
  return (
    <div
      data-app-fullscreen
      className="container-page flex h-[calc(100dvh-4rem)] flex-col max-sm:px-0 sm:h-[calc(100dvh-4.25rem)] sm:py-3 md:py-4"
    >
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
        <Suspense fallback={<ChatSkeleton />}>
          <Chat params={params} />
        </Suspense>
      </div>
    </div>
  );
}
