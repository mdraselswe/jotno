import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { Private } from "@/components/layout/private-page";
import { breedName, speciesName } from "@/content/places";
import { chatPath, productPath } from "@/config/routes";
import { requireViewer } from "@/features/auth/server";
import { followUpDay, RxBuyButton, RxPrintButton } from "@/features/consults";
import { getPrescription } from "@/features/consults/server";
import { petAge } from "@/features/pets";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { dhakaDay } from "@/lib/dhaka";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("rx.title"), robots: { index: false } };
}

async function Prescription({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, locale, t, fmt] = await Promise.all([params, getLocale(), getT(), getFormatter()]);
  const viewer = await requireViewer(locale, localeHref(locale, `${chatPath(id)}/prescription`));
  const rx = await getPrescription(id, viewer);
  if (!rx) notFound();

  const today = dhakaDay(new Date());
  const age = rx.pet ? petAge(rx.pet.birthDate, today) : null;
  const follow = followUpDay(rx.updatedAt, rx.followUpDays);
  const buyable =
    rx.role === "owner" ? rx.items.flatMap((i) => (i.product?.inStock ? [i.product.id] : [])) : [];
  const petFacts = rx.pet
    ? [
        rx.pet.name,
        speciesName(rx.pet.speciesId, locale),
        breedName(rx.pet.breedId, locale),
        age ? t(age.unit === "years" ? "pets.age" : "pets.ageMonths", { n: fmt.number(age.n) }) : null,
        rx.pet.weightGrams ? `${fmt.number(rx.pet.weightGrams / 1000)} kg` : null,
      ].filter(Boolean)
    : [];

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          href={localeHref(locale, chatPath(id))}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
          {t("rx.back")}
        </Link>
        <div className="flex flex-wrap gap-2">
          <RxBuyButton productIds={buyable} all />
          <RxPrintButton />
        </div>
      </div>

      {/* The sheet: plain, high-contrast, prints on one A4 page for a short prescription. */}
      <article
        data-no-reveal
        aria-labelledby="rx-heading"
        className="grid gap-6 rounded-(--radius-2xl) bg-card p-6 text-card-foreground shadow-(--shadow-card) sm:p-8 print:rounded-none print:p-0 print:shadow-none"
      >
        <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
          <div className="grid gap-0.5">
            <h1 id="rx-heading" className="font-heading text-xl font-semibold">
              {rx.vet.displayName}
            </h1>
            {rx.vet.qualifications ? <p className="text-sm">{rx.vet.qualifications}</p> : null}
            {rx.vet.title && rx.vet.title !== rx.vet.qualifications ? (
              <p className="text-sm text-muted-foreground">{rx.vet.title}</p>
            ) : null}
            <p className="text-sm font-medium">
              {rx.vet.registrationNo
                ? t("rx.reg", { body: rx.vet.registrationBody, no: rx.vet.registrationNo })
                : t("rx.noReg")}
            </p>
            {rx.vet.clinicName || rx.vet.address ? (
              <p className="text-sm text-muted-foreground">
                {[rx.vet.clinicName, rx.vet.address].filter(Boolean).join(", ")}
              </p>
            ) : null}
            {rx.vet.phonePublic ? (
              <p className="text-sm text-muted-foreground">{rx.vet.phonePublic}</p>
            ) : null}
          </div>
          <div className="grid justify-items-end gap-1 text-end">
            <Logo locale={locale} />
            <span className="text-xs text-muted-foreground">{t("rx.issuedOnline")}</span>
          </div>
        </header>

        <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-muted-foreground">{t("rx.date")}</dt>
          <dd>{fmt.date(rx.updatedAt, { dateStyle: "long" })}</dd>
          {rx.ownerName ? (
            <>
              <dt className="text-muted-foreground">{t("rx.owner")}</dt>
              <dd>{rx.ownerName}</dd>
            </>
          ) : null}
          {petFacts.length > 0 ? (
            <>
              <dt className="text-muted-foreground">{t("rx.patient")}</dt>
              <dd>{petFacts.join(" · ")}</dd>
            </>
          ) : null}
          <dt className="text-muted-foreground">{t("rx.complaint")}</dt>
          <dd className="whitespace-pre-wrap">{rx.summary}</dd>
        </dl>

        <section className="grid gap-1">
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t("rx.diagnosisPrint")}
          </h2>
          <p className="whitespace-pre-wrap">{rx.diagnosis}</p>
        </section>

        <section className="grid gap-3">
          <h2 className="flex items-baseline gap-2">
            <span aria-hidden="true" className="font-heading text-3xl leading-none font-semibold">
              ℞
            </span>
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("rx.medicines")}
            </span>
          </h2>
          {rx.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("rx.noMedicines")}</p>
          ) : (
            <ol className="grid gap-3">
              {rx.items.map((it, i) => (
                <li key={`${it.name}-${i}`} className="grid gap-1 border-b pb-3 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold">
                      {fmt.number(i + 1)}. {it.name}
                    </span>
                    {rx.role === "owner" && it.product ? (
                      it.product.inStock ? (
                        <span className="flex items-center gap-2 print:hidden">
                          <Link
                            href={localeHref(locale, productPath(it.product.slug))}
                            className="text-xs text-primary hover:underline"
                          >
                            {taka(fmt, it.product.price)}
                          </Link>
                          <RxBuyButton productIds={[it.product.id]} />
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground print:hidden">
                          {t("rx.outOfStock")}
                        </span>
                      )
                    ) : null}
                  </div>
                  <p className="text-sm">
                    {it.dose} · {it.frequency}
                    {it.days ? ` · ${t("rx.forDays", { n: fmt.number(it.days) })}` : ""}
                  </p>
                  {it.note ? <p className="text-sm text-muted-foreground">{it.note}</p> : null}
                </li>
              ))}
            </ol>
          )}
        </section>

        {rx.advice ? (
          <section className="grid gap-1">
            <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("rx.advice")}
            </h2>
            <p className="whitespace-pre-wrap">{rx.advice}</p>
          </section>
        ) : null}

        {follow ? (
          <p className="font-medium">
            {t("rx.followUpOn", { date: fmt.date(new Date(`${follow}T00:00:00Z`), { dateStyle: "long" }) })}
          </p>
        ) : null}

        <footer className="grid gap-6 border-t pt-4">
          <div className="justify-self-end text-center">
            <div className="h-10" />
            <div className="border-t px-8 pt-1 text-xs text-muted-foreground">{t("rx.signature")}</div>
            <div className="text-sm">{rx.vet.displayName}</div>
          </div>
          <p className="text-xs text-muted-foreground">{t("rx.disclaimer")}</p>
        </footer>
      </article>
    </div>
  );
}

export default function PrescriptionPage({ params }: PageProps<"/[locale]/chat/[id]/prescription">) {
  return (
    <div className="container-page py-4 md:py-8 print:p-0">
      <Private rows={6}>
        <Prescription params={params} />
      </Private>
    </div>
  );
}
