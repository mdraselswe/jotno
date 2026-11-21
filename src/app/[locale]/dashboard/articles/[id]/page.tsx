import { ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { ButtonLink } from "@/components/ui/button-link";
import { articlePath, vetArticlePath } from "@/config/routes";
import { ArticleForm } from "@/features/articles";
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
    <div className="grid max-w-3xl gap-6">
      <PrivateHeading
        title={t("art.edit")}
        action={
          published ? (
            <ButtonLink href={localeHref(locale, articlePath(a.slug))} variant="outline" size="sm">
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
    <Private rows={6}>
      <EditArticle params={params} />
    </Private>
  );
}
