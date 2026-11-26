import type { Route } from "next";
import { OwnerScene } from "@/components/illustrations/join-scenes";
import { JoinPage } from "@/components/marketing/join-page";
import { business } from "@/config";
import { ROUTES } from "@/config/routes";
import { ownerJoinContent } from "@/content/join";
import { pickLocale } from "@/i18n";
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
    hours: fmt.number(business.consult.openHours),
    quickMin: fmt.number(business.quick.answerMinutes),
    quickFee: taka(business.quick.fee),
    // Points are worth ৳1 each.
    welcome: taka(business.referral.welcomePoints * 100),
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
    />
  );
}
