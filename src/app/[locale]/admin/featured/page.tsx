import { Private, PrivateHeading } from "@/components/layout/private-page";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/config/routes";
import { districtName } from "@/content/places";
import { EndFeaturedButton, FeaturedForm } from "@/features/admin";
import { activeFeatured, verifiedVetOptions } from "@/features/admin/server";
import { requireRole } from "@/features/auth/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export const metadata = { title: "Admin · Featured", robots: { index: false } };

async function Featured() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.adminFeatured));
  const [slots, vets] = await Promise.all([activeFeatured(), verifiedVetOptions()]);
  return (
    <div className="grid gap-6">
      <PrivateHeading title={t("admin.featured")} />
      <FeaturedForm vets={vets} />
      {slots.length === 0 ? (
        <p className="text-muted-foreground">{t("admin.empty")}</p>
      ) : (
        <ul className="grid gap-2">
          {slots.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center gap-3 rounded-(--control-radius) border-(length:--border-w) bg-card px-4 py-3"
            >
              <span className="grid min-w-0 flex-1">
                <span className="font-medium">{s.name}</span>
                <span className="text-xs text-muted-foreground">
                  {s.districtId == null ? t("common.all") : districtName(s.districtId, locale)} ·{" "}
                  {t("admin.endsOn", { date: fmt.date(s.endsAt) })}
                </span>
              </span>
              <Badge variant="secondary">{s.source}</Badge>
              <EndFeaturedButton id={s.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminFeaturedPage() {
  return (
    <Private>
      <Featured />
    </Private>
  );
}
