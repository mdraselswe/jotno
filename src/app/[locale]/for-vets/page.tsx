import type { Route } from "next";
import { VetScene } from "@/components/illustrations/join-scenes";
import { EarningsCalc } from "@/components/marketing/join-parts";
import { JoinPage } from "@/components/marketing/join-page";
import { business } from "@/config";
import { ROUTES } from "@/config/routes";
import { vetJoinContent } from "@/content/join";
import { format, pickLocale } from "@/i18n";
import { getFormatter, getLocale } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  const locale = await getLocale();
  const c = pickLocale(vetJoinContent, locale);
  const pct = business.consult.commissionBps / 100;
  return pageMetadata(
    c.title.replace(/[[\]]/g, ""),
    format(c.body, { keep: 100 - pct }),
    ROUTES.forVets,
    locale,
  );
}

/** Shareable sign-up page for vets. */
export default async function ForVetsPage() {
  const [locale, fmt] = await Promise.all([getLocale(), getFormatter()]);
  const c = pickLocale(vetJoinContent, locale);
  const taka = (poisha: number) => fmt.money(poisha / 100, { maximumFractionDigits: 0 });
  const pct = business.consult.commissionBps / 100;
  const vars = {
    pct: fmt.number(pct),
    keep: fmt.number(100 - pct),
    window: fmt.number(business.consult.replyWindowMinutes),
    booking: taka(business.appointment.bookingFee),
    minPayout: taka(business.payout.minimum),
    minFee: taka(business.consult.minFee),
    maxFee: taka(business.consult.maxFee),
    quickMin: fmt.number(business.quick.answerMinutes),
    quickVet: taka(business.quick.vetShare),
    ownPct: fmt.number(business.referral.vetOwnClientBps / 100),
  };
  const onboarding = `${localeHref(locale, ROUTES.onboarding)}/?as=vet`;
  const signUp = `${localeHref(locale, ROUTES.login)}/?next=${encodeURIComponent(onboarding)}` as Route;
  const f = (s: string) => format(s, vars);
  return (
    <JoinPage
      c={c}
      vars={vars}
      fmt={fmt}
      scene={<VetScene />}
      ctaHref={signUp}
      secondaryHref={"#earnings" as Route}
      pets={["cat", "dog"]}
      middle={
        <section id="earnings" className="container-page scroll-mt-24 pb-12 md:pb-16">
          <div
            data-animate
            className="grid gap-6 rounded-(--radius-3xl) bg-card p-6 shadow-(--shadow-card) sm:p-10"
          >
            <div className="grid gap-2">
              <h2 className="font-heading text-3xl font-bold tracking-tight md:text-4xl">{c.calc.title}</h2>
              <p className="text-muted-foreground">{f(c.calc.sub)}</p>
            </div>
            <EarningsCalc
              minFee={business.consult.minFee}
              maxFee={business.consult.maxFee}
              commissionBps={business.consult.commissionBps}
              labels={{
                chats: c.calc.chats,
                fee: c.calc.fee,
                perDay: c.calc.perDay,
                monthly: c.calc.monthly,
                keep: f(c.calc.keep),
                note: c.calc.note,
              }}
            />
          </div>
        </section>
      }
    />
  );
}
