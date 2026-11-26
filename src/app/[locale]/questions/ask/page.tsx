import { ArrowLeft, LogIn, MessageCircleQuestion } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/layout/app-ui";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/routes";
import { getViewer } from "@/features/auth/server";
import { AskForm } from "@/features/questions";
import { getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("qa.ask"), robots: { index: false } };
}

async function Ask() {
  const locale = await getLocale();
  const t = await getT();
  const viewer = await getViewer();
  if (!viewer) {
    const here = localeHref(locale, ROUTES.ask);
    return (
      <EmptyState
        icon={MessageCircleQuestion}
        title={t("pubui.ask.signInTitle")}
        body={t("qa.askSub")}
        className="bg-card"
        action={
          <ButtonLink
            href={`${localeHref(locale, ROUTES.login)}/?next=${encodeURIComponent(here)}` as Route}
            variant="brand"
            size="lg"
          >
            <LogIn aria-hidden="true" />
            {t("nav.signIn")}
          </ButtonLink>
        }
      />
    );
  }
  return <AskForm />;
}

function AskSkeleton() {
  return (
    <div role="status" className="grid gap-4">
      {["h-28", "h-32", "h-72", "h-36"].map((h) => (
        <Skeleton key={h} className={cn("rounded-(--radius-2xl)", h)} />
      ))}
    </div>
  );
}

export default async function AskPage() {
  const t = await getT();
  const locale = await getLocale();
  return (
    <>
      <section data-no-reveal className="surface-soft dots">
        <div className="container-page grid max-w-2xl gap-4 pt-6 pb-10 md:pt-8 md:pb-12">
          <nav>
            <Link
              href={localeHref(locale, ROUTES.questions)}
              className="inline-flex items-center gap-1.5 rounded-full bg-card/80 px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-(--shadow-control) transition-colors hover:text-foreground"
            >
              <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
              {t("qa.title")}
            </Link>
          </nav>
          <h1 className="font-heading text-4xl leading-[1.05] font-extrabold tracking-tight text-balance md:text-5xl">
            {t("qa.ask")}
          </h1>
          <p className="text-lg text-pretty text-muted-foreground">{t("qa.sub")}</p>
        </div>
      </section>
      <div className="container-page max-w-2xl py-8 md:py-10">
        <Suspense fallback={<AskSkeleton />}>
          <Ask />
        </Suspense>
      </div>
    </>
  );
}
