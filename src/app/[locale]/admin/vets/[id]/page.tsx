import {
  ExternalLink,
  FileText,
  History,
  IdCard,
  MessageSquareWarning,
  PencilLine,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import type { Route } from "next";
import { notFound } from "next/navigation";
import {
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
  StatGrid,
  StatusBadge,
} from "@/components/layout/app-ui";
import { SuspenseReveal } from "@/components/motion/suspense-reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { adminVetPath, ROUTES, vetPath } from "@/config/routes";
import {
  AdminDetailSkeleton,
  auditActionName,
  auditTone,
  BackLink,
  DocumentButton,
  FactList,
  listHref,
  providerTone,
  ReviewActions,
} from "@/features/admin";
import { providerForReview, vetConsultStats, adminMetadata } from "@/features/admin/server";
import { requireRole } from "@/features/auth/server";
import { VetProfileForm, vetProfileValues } from "@/features/providers";
import { getMyProvider } from "@/features/providers/server";
import type { MessageKey } from "@/i18n";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";

export async function generateMetadata() {
  return adminMetadata("adminui.meta.vet");
}

const DOC_KIND: Record<string, MessageKey> = {
  bvc_certificate: "vet.docBvc",
  degree: "vet.docDegree",
  nid: "vet.docNid",
  other: "vet.docOther",
};

async function Review({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, locale, t, fmt] = await Promise.all([params, getLocale(), getT(), getFormatter()]);
  await requireRole(["admin"], locale, localeHref(locale, adminVetPath(id)));
  const r = await providerForReview(id);
  if (!r) notFound();
  const p = r.p;
  const [editable, stats] = await Promise.all([getMyProvider(p.profileId), vetConsultStats(p.id)]);
  const dash = "—";
  const n = (v: number) => fmt.number(v);

  const facts = [
    { label: t("common.email"), value: r.email ?? dash },
    { label: t("common.phone"), value: r.phone ?? dash },
    { label: t("adminui.vet.publicPhone"), value: p.phonePublic ?? dash },
    { label: t("adminui.vet.bvc"), value: <span className="font-mono">{p.registrationNo ?? dash}</span> },
    { label: t("adminui.vet.degrees"), value: p.qualifications ?? dash },
    {
      label: t("adminui.vet.experience"),
      value: p.experienceYears == null ? dash : t("adminui.vet.years", { n: n(p.experienceYears) }),
    },
    { label: t("adminui.vet.clinic"), value: p.clinicName ?? dash },
    { label: t("adminui.vet.address"), value: p.address ?? dash },
    { label: t("common.area"), value: [r.area, r.district].filter(Boolean).join(", ") || dash },
    { label: t("adminui.vet.chatFee"), value: taka(fmt, p.consultFee) },
    {
      label: t("adminui.vet.completeness"),
      value: fmt.number(p.completeness / 100, { style: "percent" }),
    },
    { label: t("adminui.vet.submitted"), value: p.submittedAt ? fmt.dateTime(p.submittedAt) : dash },
  ];

  const consultsHref = listHref(localeHref(locale, ROUTES.adminConsults), { q: p.displayName }) as Route;

  return (
    <div className="grid gap-6">
      <BackLink href={localeHref(locale, ROUTES.adminVets)}>{t("adminui.vets.title")}</BackLink>
      <PageHeader
        title={p.displayName}
        sub={p.title ?? undefined}
        icon={Stethoscope}
        eyebrow={
          <StatusBadge tone={providerTone(p.status)}>{t(`adminui.vetStatus.${p.status}`)}</StatusBadge>
        }
        actions={
          p.status === "verified" ? (
            <ButtonLink href={localeHref(locale, vetPath(p.slug))} variant="outline" size="sm">
              <ExternalLink aria-hidden="true" />
              {t("adminui.vet.publicProfile")}
            </ButtonLink>
          ) : null
        }
      />

      {p.rejectionReason && (p.status === "rejected" || p.status === "suspended") ? (
        <p className="flex gap-2.5 rounded-(--radius-xl) bg-destructive/8 px-4 py-3 text-sm text-pretty ring-1 ring-destructive/20">
          <MessageSquareWarning aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
          <span>
            <span className="font-semibold">{t("adminui.vet.lastReason")}</span> {p.rejectionReason}
          </span>
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <div className="grid min-w-0 content-start gap-6">
          <SectionCard title={t("adminui.vet.profile")} icon={IdCard}>
            <div className="grid gap-5 sm:grid-cols-[7rem_minmax(0,1fr)]">
              {r.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- storage URL, admin only
                <img
                  src={r.photoUrl}
                  alt={t("adminui.vet.photoOf", { name: p.displayName })}
                  className="aspect-square size-28 rounded-(--radius-xl) object-cover ring-1 ring-foreground/6"
                />
              ) : (
                <span className="grid aspect-square size-28 place-items-center rounded-(--radius-xl) bg-muted text-xs text-muted-foreground">
                  {t("adminui.vet.noPhoto")}
                </span>
              )}
              <FactList items={facts} />
            </div>
            {p.bio ? (
              <p className="mt-5 max-w-prose border-t pt-4 text-sm text-pretty whitespace-pre-wrap">
                {p.bio}
              </p>
            ) : null}
          </SectionCard>

          <SectionCard title={t("admin.documents")} description={t("adminui.vet.docsHint")} icon={FileText}>
            {r.documents.length === 0 ? (
              <EmptyState
                icon={FileText}
                title={t("vet.docEmpty")}
                body={t("adminui.vet.noDocsBody")}
                className="py-8"
              />
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {r.documents.map((d) => (
                  <li key={d.id} className="grid">
                    <DocumentButton
                      documentId={d.id}
                      label={`${DOC_KIND[d.kind] ? t(DOC_KIND[d.kind] as MessageKey) : d.kind} · ${fmt.date(d.createdAt)}`}
                    />
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <section className="grid gap-3" aria-labelledby="vet-stats">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="vet-stats" className="font-heading text-lg font-semibold">
                {t("monitor.stats")}
              </h2>
              <ButtonLink href={consultsHref} variant="link" size="sm" className="px-0">
                {t("monitor.stats.all")}
              </ButtonLink>
            </div>
            <StatGrid className="xl:grid-cols-5">
              <StatCard label={t("monitor.stats.consults")} value={n(stats.consults)} />
              <StatCard
                label={t("monitor.stats.reply")}
                value={
                  stats.avgReplyMinutes === null
                    ? dash
                    : t("monitor.minutes", { n: n(stats.avgReplyMinutes) })
                }
              />
              <StatCard
                label={t("monitor.stats.late")}
                value={n(stats.lateReplies)}
                tone={stats.lateReplies > 0 ? "warning" : "default"}
              />
              <StatCard
                label={t("monitor.stats.noReply")}
                value={n(stats.noReplyRefunds)}
                tone={stats.noReplyRefunds > 0 ? "danger" : "default"}
              />
              <StatCard
                label={t("monitor.stats.vetMessages")}
                value={stats.avgVetMessages === null ? dash : n(stats.avgVetMessages)}
              />
              <StatCard label={t("monitor.stats.calls")} value={n(stats.callsTalked)} />
              <StatCard label={t("monitor.stats.callMinutes")} value={n(stats.callMinutes)} />
              <StatCard
                label={t("monitor.stats.video")}
                value={
                  stats.videoShare === null ? dash : fmt.number(stats.videoShare / 100, { style: "percent" })
                }
              />
              <StatCard
                label={t("monitor.stats.rating")}
                value={
                  stats.rating === null
                    ? dash
                    : t("monitor.stats.ratingValue", { r: n(stats.rating), n: n(stats.ratings) })
                }
              />
              <StatCard
                label={t("monitor.stats.reports")}
                value={n(stats.reports)}
                tone={stats.reports > 0 ? "danger" : "default"}
              />
            </StatGrid>
          </section>

          <SectionCard title={t("admin.history")} icon={History}>
            {r.history.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("adminui.vet.noHistory")}</p>
            ) : (
              <ol className="grid gap-3 border-s ps-4">
                {r.history.map((h) => (
                  <li key={h.id} className="grid gap-1 text-sm">
                    <span className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={auditTone(h.action)}>{auditActionName(t, h.action)}</StatusBadge>
                      <time
                        className="text-xs text-muted-foreground tabular-nums"
                        dateTime={h.createdAt.toISOString()}
                      >
                        {fmt.dateTime(h.createdAt)}
                      </time>
                    </span>
                    {h.meta && typeof h.meta.reason === "string" && h.meta.reason ? (
                      <span className="text-pretty text-muted-foreground">{h.meta.reason}</span>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>
        </div>

        <aside className="grid content-start gap-4 lg:sticky lg:top-24">
          <SectionCard
            title={t("adminui.vet.decision")}
            description={t("adminui.vet.decisionSub")}
            icon={ShieldCheck}
          >
            <ReviewActions providerId={p.id} status={p.status} name={p.displayName} />
          </SectionCard>
        </aside>
      </div>

      {editable ? (
        <SectionCard title={t("manage.editProfile")} icon={PencilLine}>
          <details className="group">
            <summary className="cursor-pointer text-sm font-semibold text-primary marker:text-muted-foreground">
              {t("adminui.vet.editOpen")}
            </summary>
            <p className="mt-3 mb-5 text-sm text-pretty text-muted-foreground">
              {t("manage.editProfileHint")}
            </p>
            <VetProfileForm initial={vetProfileValues(editable)} providerId={p.id} />
          </details>
        </SectionCard>
      ) : null}
    </div>
  );
}

export default async function AdminVetPage({ params }: PageProps<"/[locale]/admin/vets/[id]">) {
  const t = await getT();
  return (
    <SuspenseReveal fallback={<AdminDetailSkeleton label={t("loading.label")} />}>
      <Review params={params} />
    </SuspenseReveal>
  );
}
