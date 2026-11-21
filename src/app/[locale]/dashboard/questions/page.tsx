import { Private, PrivateHeading } from "@/components/layout/private-page";
import { ROUTES } from "@/config/routes";
import { QuestionList } from "@/features/questions";
import { questionsForVet } from "@/features/questions/server";
import { requireVet } from "@/features/providers/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export const metadata = { title: "Questions", robots: { index: false } };

async function Questions() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const { provider } = await requireVet(locale, localeHref(locale, ROUTES.vetQuestions));
  const items = await questionsForVet(provider.speciesIds);
  return (
    <div className="grid gap-6">
      <PrivateHeading title={t("vet.openQuestions")} sub={t("qa.vetSub")} />
      {provider.status !== "verified" ? (
        <p className="rounded-(--control-radius) bg-warning/10 px-3 py-2 text-sm">{t("qa.verifiedOnly")}</p>
      ) : null}
      {items.length === 0 ? (
        <p className="text-muted-foreground">{t("qa.allAnswered")}</p>
      ) : (
        <QuestionList items={items} locale={locale} t={t} fmt={fmt} />
      )}
    </div>
  );
}

export default function VetQuestionsPage() {
  return (
    <Private>
      <Questions />
    </Private>
  );
}
