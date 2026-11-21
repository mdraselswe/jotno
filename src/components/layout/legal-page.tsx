import { PageShell } from "@/components/layout/page-shell";
import { LEGAL_UPDATED, legalContent, type LegalDoc } from "@/content/legal";
import { pickLocale } from "@/i18n";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { pageMetadata } from "@/lib/metadata";

export async function legalMetadata(doc: LegalDoc, route: string) {
  const locale = await getLocale();
  const page = pickLocale(legalContent[doc], locale);
  return pageMetadata(page.title, page.sub, route, locale);
}

/** A legal page from src/content/legal.ts. */
export async function LegalPage({ doc }: { doc: LegalDoc }) {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const page = pickLocale(legalContent[doc], locale);
  return (
    <PageShell title={page.title} sub={page.sub}>
      <div className="grid max-w-prose gap-8">
        <p className="text-sm text-muted-foreground">
          {t("legal.updated", { date: fmt.date(new Date(`${LEGAL_UPDATED}T00:00:00Z`)) })}
        </p>
        {page.sections.map((s) => (
          <section key={s.heading} className="grid gap-2">
            <h2 className="font-heading text-xl font-semibold">{s.heading}</h2>
            {s.body.map((p) => (
              <p key={p} className="leading-relaxed text-pretty">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </PageShell>
  );
}
