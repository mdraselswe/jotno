import { ArrowLeft, BadgeCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { Private } from "@/components/layout/private-page";
import { ROUTES, vetPath } from "@/config/routes";
import { requireVet } from "@/features/providers/server";
import { ensureCode, siteLink } from "@/features/referrals/server";
import { QrCode } from "@/features/share";
import { PrintButton } from "@/features/shop";
import { getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("promote.poster"), robots: { index: false } };
}

async function Poster() {
  const locale = await getLocale();
  const t = await getT();
  const { viewer, provider } = await requireVet(locale, localeHref(locale, ROUTES.vetPoster));
  if (provider.status !== "verified") redirect(localeHref(locale, ROUTES.vetPromote));
  const code = await ensureCode(viewer.id);
  const link = siteLink(localeHref(locale, vetPath(provider.slug)), code);
  const shown = siteLink(localeHref(locale, vetPath(provider.slug))).replace(/^https?:\/\//, "");

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          href={localeHref(locale, ROUTES.vetPromote)}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-card ps-2.5 pe-3.5 text-sm font-medium text-foreground/80 shadow-(--shadow-control) ring-1 ring-foreground/8 transition-colors duration-(--motion-fast) hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
          {t("promote.title")}
        </Link>
        <PrintButton label={t("promote.print")} />
      </div>

      {/* The sheet: plain and high-contrast so it prints well on A4 in black and white. */}
      <article className="grid justify-items-center gap-6 rounded-(--radius-2xl) bg-card p-8 text-center ring-1 ring-foreground/10 sm:p-12 print:rounded-none print:p-0 print:ring-0">
        <Logo locale={locale} className="[&_svg]:size-10 [&>span:last-child]:text-3xl" />
        <h1 className="font-heading text-3xl leading-tight font-extrabold text-balance sm:text-4xl">
          {t("promote.posterTitle", { name: provider.displayName })}
        </h1>
        {provider.clinicName ? (
          <p className="inline-flex items-center gap-1.5 text-lg font-medium">
            <BadgeCheck aria-hidden="true" className="size-5 text-primary" />
            {provider.clinicName}
          </p>
        ) : null}
        <QrCode
          value={link}
          label={t("promote.qr", { name: provider.displayName })}
          className="w-64 sm:w-72"
        />
        <p className="max-w-md text-lg text-pretty">{t("promote.posterSub")}</p>
        <p className="text-base font-semibold">{t("promote.posterSteps")}</p>
        <p className="font-mono text-sm break-all text-muted-foreground">{shown}</p>
      </article>
    </div>
  );
}

export default function PosterPage() {
  return (
    <Private rows={1}>
      <Poster />
    </Private>
  );
}
