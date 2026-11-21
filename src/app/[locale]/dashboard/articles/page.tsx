import { Plus } from "lucide-react";
import Link from "next/link";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { ROUTES, vetArticlePath } from "@/config/routes";
import { myArticles } from "@/features/articles/server";
import { requireVet } from "@/features/providers/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export const metadata = { title: "Articles", robots: { index: false } };

async function Articles() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const { provider } = await requireVet(locale, localeHref(locale, ROUTES.vetArticles));
  const items = await myArticles(provider.id);
  return (
    <div className="grid gap-6">
      <PrivateHeading
        title={t("vet.articles")}
        sub={t("art.vetSub")}
        action={
          <ButtonLink href={localeHref(locale, ROUTES.vetNewArticle)} size="sm">
            <Plus aria-hidden="true" />
            {t("art.new")}
          </ButtonLink>
        }
      />
      {items.length === 0 ? (
        <p className="text-muted-foreground">{t("art.mineEmpty")}</p>
      ) : (
        <ul className="grid gap-2">
          {items.map((a) => (
            <li key={a.id}>
              <Link
                href={localeHref(locale, vetArticlePath(a.id))}
                className="flex items-center gap-3 rounded-(--control-radius) border-(length:--border-w) bg-card px-4 py-3 hover:bg-muted/40"
              >
                <span className="min-w-0 flex-1 truncate font-medium">{a.title}</span>
                <span className="text-xs text-muted-foreground">{fmt.date(a.updatedAt)}</span>
                <Badge variant={a.status === "published" ? "default" : "secondary"}>
                  {t(a.status === "published" ? "art.statusPublished" : "art.statusDraft")}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function VetArticlesPage() {
  return (
    <Private>
      <Articles />
    </Private>
  );
}
