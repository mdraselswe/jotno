import { Private, PrivateHeading } from "@/components/layout/private-page";
import { ROUTES } from "@/config/routes";
import { ArticleForm, EMPTY_ARTICLE } from "@/features/articles";
import { requireVet } from "@/features/providers/server";
import { getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export const metadata = { title: "New article", robots: { index: false } };

async function NewArticle() {
  const locale = await getLocale();
  const t = await getT();
  const { provider } = await requireVet(locale, localeHref(locale, ROUTES.vetNewArticle));
  return (
    <div className="grid max-w-3xl gap-6">
      <PrivateHeading title={t("art.new")} />
      <ArticleForm
        id={null}
        initial={EMPTY_ARTICLE}
        published={false}
        canPublish={provider.status === "verified"}
      />
    </div>
  );
}

export default function NewArticlePage() {
  return (
    <Private rows={6}>
      <NewArticle />
    </Private>
  );
}
