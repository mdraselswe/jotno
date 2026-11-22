import { ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Mishu } from "@/components/brand/mishu";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { business } from "@/config";
import { consultStartPath, ROUTES } from "@/config/routes";
import { getViewer } from "@/features/auth/server";
import { StartConsultForm } from "@/features/consults";
import { listPets } from "@/features/pets/server";
import { VetPhoto } from "@/features/providers";
import { getProviderBySlug } from "@/features/providers/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";

export const metadata = { robots: { index: false } };

async function Start({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const vet = await getProviderBySlug(slug);
  if (!vet) notFound();
  const viewer = await getViewer();
  const pets = viewer ? await listPets(viewer.id) : [];
  const here = localeHref(locale, consultStartPath(slug));
  const fee = taka(fmt, vet.consultFee);

  return (
    <div className="mx-auto grid w-full max-w-xl gap-6">
      <header className="flex items-center gap-4">
        <VetPhoto vet={vet} />
        <div className="grid gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {t("consult.startTitle", { name: vet.displayName })}
          </h1>
          <p className="text-sm text-muted-foreground">{t("consult.startSub")}</p>
        </div>
      </header>

      <ul className="grid gap-2 rounded-(--radius-xl) bg-muted/60 p-4 text-sm">
        <li className="flex gap-2">
          <ShieldCheck aria-hidden="true" className="size-4 shrink-0 translate-y-0.5 text-success" />
          {t("consult.rule1").replace("30", String(business.consult.replyWindowMinutes))}
        </li>
        <li className="flex gap-2">
          <ShieldCheck aria-hidden="true" className="size-4 shrink-0 translate-y-0.5 text-success" />
          {t("consult.rule2")}
        </li>
        <li className="flex gap-2 text-destructive">
          <ShieldCheck aria-hidden="true" className="size-4 shrink-0 translate-y-0.5" />
          {t("consult.rule3")}
        </li>
      </ul>

      {viewer ? (
        <>
          {pets.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("consult.addPetHint")}</p>
          ) : null}
          <StartConsultForm
            providerId={vet.id}
            pets={pets.map((p) => ({ id: p.id, name: p.name }))}
            feeLabel={fee}
          />
          <p className="text-center text-xs text-muted-foreground">{t("pay.secure")}</p>
        </>
      ) : (
        <div className="grid justify-items-center gap-4 rounded-(--radius-xl) bg-card p-6 text-center shadow-(--shadow-control)">
          <Mishu mood="listening" className="size-20" />
          <ButtonLink
            href={`${localeHref(locale, ROUTES.login)}/?next=${encodeURIComponent(here)}` as typeof here}
            size="lg"
          >
            {t("consult.signIn")}
          </ButtonLink>
        </div>
      )}
    </div>
  );
}

export default function StartConsultPage({ params }: PageProps<"/[locale]/vet/[slug]/consult">) {
  return (
    <div className="container-page py-8 md:py-12">
      <Suspense fallback={<Skeleton className="mx-auto h-96 w-full max-w-xl" />}>
        <Start params={params} />
      </Suspense>
    </div>
  );
}
