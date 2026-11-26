import { ExternalLink, FileCheck2, Lock, UserRoundPen } from "lucide-react";
import { PageHeader, SectionCard, StatusBadge, type BadgeTone } from "@/components/layout/app-ui";
import { SuspenseReveal } from "@/components/motion/suspense-reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES, vetPath } from "@/config/routes";
import { getHours } from "@/features/appointments/server";
import {
  readyForReview,
  SubmitForReviewButton,
  VetChecklist,
  vetChecklist,
  VetDocuments,
  VetProfileForm,
  vetProfileValues,
} from "@/features/providers";
import { requireVet } from "@/features/providers/server";
import type { MessageKey } from "@/i18n";
import { getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { pageMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const t = await getT();
  return pageMetadata(t("vet.profile"), t("vet.completenessHint"), ROUTES.vetProfile, await getLocale());
}

const PILL: Record<string, { key: MessageKey; tone: BadgeTone }> = {
  draft: { key: "vetui.status.draft", tone: "neutral" },
  pending: { key: "vetui.status.pending", tone: "info" },
  verified: { key: "vetui.status.verified", tone: "success" },
  rejected: { key: "vetui.status.rejected", tone: "danger" },
  suspended: { key: "vetui.status.suspended", tone: "danger" },
};

async function Profile() {
  const locale = await getLocale();
  const t = await getT();
  const { provider: p } = await requireVet(locale, localeHref(locale, ROUTES.vetProfile));
  const hours = await getHours(p.id);
  const locked = p.status === "pending";
  const verified = p.status === "verified";
  // Same rule as the dashboard: a draft or a rejected profile can be sent (again).
  const canSubmit = p.status === "draft" || p.status === "rejected";
  const pill = PILL[p.status] ?? { key: "vetui.status.draft", tone: "neutral" };
  const checklist = vetChecklist({
    ...p,
    speciesCount: p.speciesIds.length,
    documentCount: p.documents.length,
    hasHours: hours.length > 0,
  });
  return (
    <div className="grid gap-6">
      <PageHeader
        icon={UserRoundPen}
        title={t("vet.profile")}
        sub={t("vetui.profile.sub")}
        actions={
          verified ? (
            <ButtonLink
              href={localeHref(locale, vetPath(p.slug))}
              variant="outline"
              target="_blank"
              className="max-sm:flex-1"
            >
              <ExternalLink aria-hidden="true" />
              {t("vetui.profile.preview")}
            </ButtonLink>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock aria-hidden="true" className="size-4" />
              {t("vetui.profile.previewLocked")}
            </p>
          )
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 gap-6">
          <VetProfileForm initial={vetProfileValues(p)} />
          <div id="vp-docs" className="scroll-mt-24">
            <SectionCard
              title={t("vet.documents")}
              description={t("vet.documentsHint")}
              icon={FileCheck2}
              actions={<StatusBadge tone={pill.tone}>{t(pill.key)}</StatusBadge>}
            >
              {p.documents.length === 0 && !locked ? (
                <p className="mb-4 text-sm font-medium text-pretty">{t("vetui.doc.need")}</p>
              ) : null}
              <VetDocuments
                locked={locked}
                status={p.status}
                documents={p.documents.map((d) => ({
                  id: d.id,
                  kind: d.kind,
                  createdAt: d.createdAt.toISOString(),
                }))}
              />
            </SectionCard>
          </div>
        </div>
        <aside className="grid gap-4 xl:sticky xl:top-24">
          <SectionCard
            title={t("vet.completeness", { n: p.completeness })}
            actions={<StatusBadge tone={pill.tone}>{t(pill.key)}</StatusBadge>}
          >
            <VetChecklist items={checklist} locale={locale} t={t} />
            {canSubmit ? (
              <div className="mt-4 grid gap-3 border-t pt-4">
                <p className="text-sm text-pretty text-muted-foreground">
                  {t(readyForReview(checklist) ? "vetui.check.submitHint" : "vet.submitMissing")}
                </p>
                <SubmitForReviewButton />
              </div>
            ) : null}
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div role="status" className="grid gap-6">
      <div className="flex items-start gap-3.5">
        <Skeleton className="size-11 shrink-0 rounded-(--radius-xl) max-sm:hidden" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-8 w-48 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-5">
          {["h-24", "h-12", "h-20", "h-10"].map((h, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-(--radius-2xl) bg-card shadow-(--shadow-card) ring-1 ring-foreground/6"
            >
              <div className="flex items-center gap-2.5 border-b px-5 py-3.5">
                <Skeleton className="size-4.5 rounded-full" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="grid gap-3 p-5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className={cn("w-full rounded-(--control-radius)", h)} />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-72 rounded-(--radius-2xl) max-xl:hidden" />
      </div>
    </div>
  );
}

export default function VetProfilePage() {
  return (
    <SuspenseReveal fallback={<ProfileSkeleton />}>
      <Profile />
    </SuspenseReveal>
  );
}
