import { Check } from "lucide-react";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { Badge } from "@/components/ui/badge";
import { business } from "@/config";
import { ROUTES } from "@/config/routes";
import { districtName } from "@/content/places";
import { BuyFeaturedButton } from "@/features/providers";
import { myFeatured, requireVet } from "@/features/providers/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { isCurrent } from "@/lib/time";
import { taka } from "@/lib/money";

export const metadata = { title: "Featured", robots: { index: false } };

async function Featured() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const { provider } = await requireVet(locale, localeHref(locale, ROUTES.vetFeatured));
  const periods = await myFeatured(provider.id);
  const active = periods.find((p) => isCurrent(p.startsAt, p.endsAt));
  const canBuy = provider.status === "verified" && provider.districtId != null;
  return (
    <div className="grid gap-6">
      <PrivateHeading
        title={t("featured.title")}
        sub={t("featured.sub", { district: districtName(provider.districtId, locale) ?? "—" })}
      />
      <ul className="grid gap-2 text-sm">
        {(["featured.perk1", "featured.perk2", "featured.perk3"] as const).map((k) => (
          <li key={k} className="flex gap-2">
            <Check aria-hidden="true" className="size-4 shrink-0 translate-y-0.5 text-success" />
            {t(k)}
          </li>
        ))}
      </ul>
      {active ? (
        <p className="rounded-(--control-radius) bg-success/10 px-3 py-2 text-sm">
          {t("featured.activeUntil", { date: fmt.date(active.endsAt) })}
        </p>
      ) : null}
      {!canBuy ? (
        <p className="rounded-(--control-radius) bg-warning/10 px-3 py-2 text-sm">
          {t("featured.verifiedOnly")}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {business.featured.packs.map((pack, i) => (
          <div
            key={pack.days}
            className="glow-border relative grid gap-3 rounded-(--radius-2xl) bg-card p-(--card-pad) shadow-(--shadow-card)"
          >
            <p className="font-heading text-lg font-semibold">
              {t("featured.days", { n: fmt.number(pack.days) })}
            </p>
            <p className="font-heading text-3xl font-semibold tabular-nums">{taka(fmt, pack.price)}</p>
            <BuyFeaturedButton index={i} label={t("featured.buy")} disabled={!canBuy} />
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {t("featured.note", { n: business.featured.maxPerDistrict })}
      </p>
      {periods.length > 0 ? (
        <section className="grid gap-2">
          <h2 className="font-heading text-lg font-semibold">{t("admin.history")}</h2>
          <ul className="grid gap-1 text-sm">
            {periods.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                {fmt.date(p.startsAt)} – {fmt.date(p.endsAt)}
                <Badge variant="secondary">{p.source}</Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export default function VetFeaturedPage() {
  return (
    <Private>
      <Featured />
    </Private>
  );
}
