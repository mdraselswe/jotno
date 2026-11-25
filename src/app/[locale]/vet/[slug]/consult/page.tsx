import { CircleAlert, Clock, LogIn, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Spot } from "@/components/illustrations/spots";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { business } from "@/config";
import { consultStartPath, ROUTES } from "@/config/routes";
import { getViewer } from "@/features/auth/server";
import { StartConsultForm } from "@/features/consults";
import { listPets } from "@/features/pets/server";
import { chatPointsCap } from "@/features/referrals/server";
import { VetOfflineNotice, VetPhoto } from "@/features/providers";
import { getProviderBySlug } from "@/features/providers/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata = { robots: { index: false } };

const CARD = "rounded-(--radius-2xl) bg-card shadow-(--shadow-card) ring-1 ring-foreground/6";

async function Start({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const vet = await getProviderBySlug(slug);
  if (!vet) notFound();
  const viewer = await getViewer();
  const pets = viewer ? await listPets(viewer.id) : [];
  const maxPoints = viewer ? await chatPointsCap(viewer.id, vet.id, vet.consultFee) : 0;
  const here = localeHref(locale, consultStartPath(slug));
  const fee = taka(fmt, vet.consultFee);
  const rules = [
    {
      icon: ShieldCheck,
      tone: "bg-success/12 text-success",
      text: t("consult.rule1", { n: fmt.number(business.consult.replyWindowMinutes) }),
    },
    { icon: Clock, tone: "bg-primary/10 text-primary", text: t("consult.rule2") },
    { icon: CircleAlert, tone: "bg-destructive/10 text-destructive", text: t("consult.rule3") },
  ];

  return (
    <div className="mx-auto grid w-full max-w-xl gap-4">
      <header className={cn(CARD, "flex items-center gap-4 p-4 sm:p-5")}>
        <VetPhoto vet={vet} className="size-16 ring-2 ring-primary/15" />
        <div className="grid min-w-0 gap-1">
          <h1 className="font-heading text-xl leading-tight font-bold tracking-tight text-balance sm:text-2xl">
            {t("consult.startTitle", { name: vet.displayName })}
          </h1>
          <p className="text-sm text-pretty text-muted-foreground">{t("consult.startSub")}</p>
        </div>
      </header>

      <div
        className={cn(
          CARD,
          "flex items-center justify-between gap-4 bg-primary/6 p-4 ring-primary/15 sm:p-5",
        )}
      >
        <div className="grid gap-0.5">
          <p className="text-sm font-semibold">{t("chatui.start.fee")}</p>
          <p className="text-xs text-muted-foreground">{t("chatui.start.feeSub")}</p>
        </div>
        <p className="font-heading text-2xl font-bold text-primary tabular-nums">{fee}</p>
      </div>

      {vet.availableNow ? null : <VetOfflineNotice t={t} fmt={fmt} />}

      <section className={cn(CARD, "grid gap-3 p-4 sm:p-5")} aria-labelledby="sc-how">
        <h2 id="sc-how" className="font-heading text-base font-bold">
          {t("chatui.start.how")}
        </h2>
        <ul className="grid gap-3 text-sm">
          {rules.map((r) => (
            <li key={r.text} className="flex items-start gap-3">
              <span className={cn("grid size-8 shrink-0 place-items-center rounded-(--radius-md)", r.tone)}>
                <r.icon aria-hidden="true" className="size-4" />
              </span>
              <span className="pt-1 text-pretty">{r.text}</span>
            </li>
          ))}
        </ul>
      </section>

      {viewer ? (
        <>
          {pets.length === 0 ? (
            <p className="rounded-(--radius-xl) bg-info/10 px-4 py-3 text-sm text-info">
              {t("consult.addPetHint")}
            </p>
          ) : null}
          <StartConsultForm
            providerId={vet.id}
            pets={pets.map((p) => ({ id: p.id, name: p.name }))}
            feeLabel={fee}
            maxPhotos={business.consult.intakePhotos}
            maxPoints={maxPoints}
          />
          <p className="text-center text-xs text-pretty text-muted-foreground">{t("pay.secure")}</p>
        </>
      ) : (
        <div className={cn(CARD, "grid justify-items-center gap-4 p-6 text-center")}>
          <Spot name="chat" className="w-32" />
          <p className="max-w-xs text-sm text-pretty text-muted-foreground">{t("chatui.start.signInSub")}</p>
          <ButtonLink
            href={`${localeHref(locale, ROUTES.login)}/?next=${encodeURIComponent(here)}` as typeof here}
            size="lg"
            variant="brand"
          >
            <LogIn aria-hidden="true" />
            {t("consult.signIn")}
          </ButtonLink>
        </div>
      )}
    </div>
  );
}

/** Shaped like the page: vet card, fee, rules, the form. */
function StartSkeleton() {
  return (
    <div role="status" className="mx-auto grid w-full max-w-xl gap-4">
      <Skeleton className="h-24 rounded-(--radius-2xl)" />
      <Skeleton className="h-20 rounded-(--radius-2xl)" />
      <Skeleton className="h-36 rounded-(--radius-2xl)" />
      <Skeleton className="h-72 rounded-(--radius-2xl)" />
    </div>
  );
}

export default function StartConsultPage({ params }: PageProps<"/[locale]/vet/[slug]/consult">) {
  return (
    <div className="container-page py-6 md:py-12">
      <Suspense fallback={<StartSkeleton />}>
        <Start params={params} />
      </Suspense>
    </div>
  );
}
