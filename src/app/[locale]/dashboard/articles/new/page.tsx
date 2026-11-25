import { ArrowLeft, PenLine } from "lucide-react";
import { PageHeader } from "@/components/layout/app-ui";
import { SuspenseReveal } from "@/components/motion/suspense-reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { ROUTES } from "@/config/routes";
import { ArticleForm, ArticleFormSkeleton, EMPTY_ARTICLE } from "@/features/articles";
import { requireVet } from "@/features/providers/server";
import { getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export const metadata = { title: "New article", robots: { index: false } };

async function NewArticle() {
  const locale = await getLocale();
  const t = await getT();
  const { provider } = await requireVet(locale, localeHref(locale, ROUTES.vetNewArticle));
  return (
    <div className="grid gap-6">
      <PageHeader
        icon={PenLine}
        eyebrow={
          <ButtonLink
            href={localeHref(locale, ROUTES.vetArticles)}
            variant="link"
            size="xs"
            className="h-auto px-0"
          >
            <ArrowLeft aria-hidden="true" className="rtl:rotate-180" />
            {t("vetui.art.all")}
          </ButtonLink>
        }
        title={t("art.new")}
        sub={t("vetui.art.editorSub")}
      />
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
    <SuspenseReveal fallback={<ArticleFormSkeleton />}>
      <NewArticle />
    </SuspenseReveal>
  );
}
