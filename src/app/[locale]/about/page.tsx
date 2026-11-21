import { PageShell } from "@/components/layout/page-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { ROUTES } from "@/config/routes";
import { aboutContent } from "@/content/pages";
import { pickLocale } from "@/i18n";
import { getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  const t = await getT();
  return pageMetadata(t("about.title"), t("about.sub"), ROUTES.about, await getLocale());
}

export default async function AboutPage() {
  const locale = await getLocale();
  const t = await getT();
  const c = pickLocale(aboutContent, locale);
  return (
    <PageShell title={c.title} sub={c.sub}>
      <div className="grid max-w-3xl gap-10">
        <div className="grid gap-4">
          {c.paragraphs.map((p) => (
            <p key={p} className="text-lg leading-relaxed text-pretty">
              {p}
            </p>
          ))}
        </div>
        <ul className="grid gap-4 md:grid-cols-3">
          {c.values.map((v) => (
            <li
              key={v.title}
              className="grid gap-2 rounded-(--radius-xl) border-(length:--border-w) bg-card p-(--card-pad)"
            >
              <h2 className="font-heading font-semibold">{v.title}</h2>
              <p className="text-sm text-muted-foreground">{v.body}</p>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={localeHref(locale, ROUTES.vets)}>{t("home.findVet")}</ButtonLink>
          <ButtonLink href={localeHref(locale, ROUTES.forVets)} variant="outline">
            {t("nav.forVets")}
          </ButtonLink>
        </div>
      </div>
    </PageShell>
  );
}
