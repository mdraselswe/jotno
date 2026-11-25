import { Sparkles, Star } from "lucide-react";
import {
  DataTable,
  EmptyState,
  PageHeader,
  SectionCard,
  StatusBadge,
  type Column,
} from "@/components/layout/app-ui";
import { SuspenseReveal } from "@/components/motion/suspense-reveal";
import { business } from "@/config";
import { ROUTES } from "@/config/routes";
import { districtName } from "@/content/places";
import { AdminListSkeleton, EndFeaturedButton, FeaturedForm } from "@/features/admin";
import { activeFeatured, verifiedVetOptions, adminMetadata } from "@/features/admin/server";
import { requireRole } from "@/features/auth/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export async function generateMetadata() {
  return adminMetadata("admin.featured");
}

async function Featured() {
  const [locale, t, fmt] = await Promise.all([getLocale(), getT(), getFormatter()]);
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.adminFeatured));
  const [slots, vets] = await Promise.all([activeFeatured(), verifiedVetOptions()]);
  const now = new Date().getTime();
  type Row = (typeof slots)[number];
  const columns: Column<Row>[] = [
    { key: "vet", header: t("admin.vet"), mobile: "title", cell: (s) => s.name },
    {
      key: "where",
      header: t("common.district"),
      cell: (s) =>
        s.districtId == null ? t("adminui.featured.everywhere") : districtName(s.districtId, locale),
    },
    {
      key: "source",
      header: t("adminui.featured.source"),
      cell: (s) => (
        <StatusBadge tone={s.source === "manual" ? "neutral" : "primary"}>
          {s.source === "manual" ? t("adminui.featured.manual") : t("adminui.featured.paid")}
        </StatusBadge>
      ),
    },
    {
      key: "ends",
      header: t("adminui.featured.ends"),
      className: "whitespace-nowrap",
      cell: (s) => {
        const days = Math.max(0, Math.ceil((s.endsAt.getTime() - now) / 86_400_000));
        return (
          <span className="inline-flex flex-wrap items-center justify-end gap-2">
            {fmt.date(s.endsAt)}
            <StatusBadge tone={days <= 2 ? "warning" : "neutral"}>
              {t("adminui.featured.daysLeft", { n: fmt.number(days) })}
            </StatusBadge>
          </span>
        );
      },
    },
    {
      key: "end",
      header: <span className="sr-only">{t("common.actions")}</span>,
      className: "text-end",
      cell: (s) => <EndFeaturedButton id={s.id} name={s.name} />,
    },
  ];
  return (
    <div className="grid gap-6">
      <PageHeader title={t("admin.featured")} sub={t("adminui.featured.sub")} icon={Sparkles} />
      <SectionCard
        title={t("adminui.featured.addTitle")}
        description={t("adminui.featured.addSub", { n: fmt.number(business.featured.maxPerDistrict) })}
        icon={Star}
      >
        <FeaturedForm vets={vets} />
      </SectionCard>
      <section className="grid gap-3" aria-labelledby="featured-now">
        <h2 id="featured-now" className="font-heading text-lg font-semibold">
          {t("adminui.featured.now")}
        </h2>
        <DataTable
          rows={slots}
          columns={columns}
          rowKey={(s) => s.id}
          caption={t("adminui.featured.now")}
          empty={
            <EmptyState
              icon={Sparkles}
              title={t("adminui.featured.empty")}
              body={t("adminui.featured.emptyBody")}
            />
          }
        />
      </section>
    </div>
  );
}

export default async function AdminFeaturedPage() {
  const t = await getT();
  return (
    <SuspenseReveal
      fallback={<AdminListSkeleton label={t("loading.label")} search={false} filters={false} rows={4} />}
    >
      <Featured />
    </SuspenseReveal>
  );
}
