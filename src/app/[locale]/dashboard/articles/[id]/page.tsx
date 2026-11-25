import { ArrowLeft, ExternalLink, PenLine } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/app-ui";
import { SuspenseReveal } from "@/components/motion/suspense-reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { articlePath, ROUTES, vetArticlePath } from "@/config/routes";
import { ArticleForm, ArticleFormSkeleton } from "@/features/articles";
import { myArticle } from "@/features/articles/server";
import { requireVet } from "@/features/providers/server";
import { getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export const metadata = { title: "Edit article", robots: { index: false } };

async function EditArticle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getT();
  const { provider } = await requireVet(locale, localeHref(locale, vetArticlePath(id)));
  const a = await myArticle(provider.id, id);
  if (!a) notFound();
  const published = a.status === "published";
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
        title={t("art.edit")}
        sub={t("vetui.art.editorSub")}
        actions={
          published ? (
            <ButtonLink
              href={localeHref(locale, articlePath(a.slug))}
              variant="outline"
              target="_blank"
              className="max-sm:flex-1"
            >
              <ExternalLink aria-hidden="true" />
              {t("common.view")}
            </ButtonLink>
          ) : undefined
        }
      />
      <ArticleForm
        id={a.id}
        initial={{
          title: a.title,
          excerpt: a.excerpt ?? "",
          body: a.body,
          speciesId: a.speciesId ? String(a.speciesId) : "",
        }}
        published={published}
        canPublish={provider.status === "verified"}
      />
    </div>
  );
}

export default function EditArticlePage({ params }: PageProps<"/[locale]/dashboard/articles/[id]">) {
  return (
    <SuspenseReveal fallback={<ArticleFormSkeleton />}>
      <EditArticle params={params} />
    </SuspenseReveal>
  );
}
