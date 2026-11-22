import { AlertTriangle, Phone } from "lucide-react";
import { Suspense } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { ButtonAnchor, ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { business } from "@/config";
import { ROUTES } from "@/config/routes";
import { emergencyContent } from "@/content/emergency";
import { VetCard } from "@/features/providers";
import { searchProviders } from "@/features/providers/server";
import { pickLocale } from "@/i18n";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  const t = await getT();
  return pageMetadata(t("emg.title"), t("emg.sub"), ROUTES.emergency, await getLocale());
}

async function EmergencyVets() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const { results } = await searchProviders({ emergency: true, page: 1, pageSize: 6 });
  if (results.length === 0) {
    return (
      <div className="grid justify-items-start gap-3">
        <p className="text-muted-foreground">{t("emg.noVets")}</p>
        <ButtonLink href={localeHref(locale, ROUTES.vets)}>{t("home.findVet")}</ButtonLink>
      </div>
    );
  }
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {results.map((v) => (
        <li key={v.id}>
          <VetCard vet={v} locale={locale} t={t} fmt={fmt} />
        </li>
      ))}
    </ul>
  );
}

export default async function EmergencyPage() {
  const locale = await getLocale();
  const t = await getT();
  const c = pickLocale(emergencyContent, locale);
  return (
    <PageShell title={t("emg.title")} sub={c.intro}>
      <div className="grid gap-10">
        {business.emergencyHotline ? (
          <ButtonAnchor
            href={`tel:${business.emergencyHotline}`}
            variant="destructive"
            size="lg"
            className="h-16 sos-breathe justify-self-start px-8 text-lg"
          >
            <Phone aria-hidden="true" />
            {t("emg.call", { number: business.emergencyHotline })}
          </ButtonAnchor>
        ) : null}

        <section className="grid gap-4" aria-labelledby="emg-vets">
          <h2 id="emg-vets" className="font-heading text-2xl font-semibold">
            {t("emg.vets")}
          </h2>
          <Suspense fallback={<Skeleton className="h-40 rounded-(--radius-xl)" />}>
            <EmergencyVets />
          </Suspense>
        </section>

        <section className="grid gap-4" aria-labelledby="emg-aid">
          <h2 id="emg-aid" className="font-heading text-2xl font-semibold">
            {t("emg.firstAid")}
          </h2>
          <ul className="grid gap-4 md:grid-cols-2">
            {c.cards.map((card) => (
              <li
                key={card.id}
                id={card.id}
                className="grid content-start gap-3 rounded-(--radius-2xl) bg-card p-(--card-pad) shadow-(--shadow-card)"
              >
                <h3 className="font-heading text-lg font-semibold">{card.title}</h3>
                <ol className="grid list-decimal gap-1.5 pl-5 text-sm">
                  {card.steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
                {card.dont ? (
                  <p className="flex gap-2 rounded-(--control-radius) bg-destructive/10 px-3 py-2 text-sm">
                    <AlertTriangle
                      aria-hidden="true"
                      className="size-4 shrink-0 translate-y-0.5 text-destructive"
                    />
                    {card.dont}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{t("footer.notAdvice")}</p>
        </section>
      </div>
    </PageShell>
  );
}
