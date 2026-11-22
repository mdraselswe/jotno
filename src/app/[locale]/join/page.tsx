import { Check } from "lucide-react";
import type { Route } from "next";
import { OwnerScene } from "@/components/illustrations/join-scenes";
import { JoinPage } from "@/components/marketing/join-page";
import { business } from "@/config";
import { ROUTES } from "@/config/routes";
import { ownerJoinContent } from "@/content/join";
import { format, pickLocale } from "@/i18n";
import { getFormatter, getLocale } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  const locale = await getLocale();
  const c = pickLocale(ownerJoinContent, locale);
  return pageMetadata(c.title.replace(/[[\]]/g, ""), c.body.replace(/\{\w+\}/g, ""), ROUTES.join, locale);
}

/** Shareable sign-up page for pet owners. */
export default async function JoinOwnerPage() {
  const [locale, fmt] = await Promise.all([getLocale(), getFormatter()]);
  const c = pickLocale(ownerJoinContent, locale);
  const taka = (poisha: number) => fmt.money(poisha / 100, { maximumFractionDigits: 0 });
  const vars = {
    window: fmt.number(business.consult.replyWindowMinutes),
    fee: taka(business.consult.minFee),
    booking: taka(business.appointment.bookingFee),
  };
  const onboarding = `${localeHref(locale, ROUTES.onboarding)}/?as=owner`;
  const signUp = `${localeHref(locale, ROUTES.login)}/?next=${encodeURIComponent(onboarding)}` as Route;
  return (
    <JoinPage
      c={c}
      vars={vars}
      fmt={fmt}
      scene={<OwnerScene />}
      ctaHref={signUp}
      secondaryHref={localeHref(locale, ROUTES.vets)}
      pets={["dog", "cat"]}
      middle={
        <section className="container-page py-20 md:py-24">
          <h2 className="mb-10 font-heading text-3xl font-bold tracking-tight md:text-5xl">
            {c.prices.title}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div
              data-animate
              className="grid content-start gap-4 rounded-(--radius-2xl) bg-card p-7 shadow-(--shadow-card)"
            >
              <p className="justify-self-start rounded-full bg-success px-3 py-1 text-sm font-bold text-success-foreground">
                {c.prices.free}
              </p>
              <ul className="grid gap-3">
                {c.prices.freeItems.map((item) => (
                  <li key={item} className="flex gap-3">
                    <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
                    {format(item, vars)}
                  </li>
                ))}
              </ul>
            </div>
            <div
              data-animate
              className="grid content-start gap-4 rounded-(--radius-2xl) bg-foreground p-7 text-background shadow-(--shadow-card)"
            >
              <p className="justify-self-start rounded-full bg-highlight px-3 py-1 text-sm font-bold text-highlight-foreground">
                {c.prices.paid}
              </p>
              <ul className="grid gap-3">
                {c.prices.paidItems.map((item) => (
                  <li key={item} className="flex gap-3">
                    <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-highlight" />
                    {format(item, vars)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      }
    />
  );
}
